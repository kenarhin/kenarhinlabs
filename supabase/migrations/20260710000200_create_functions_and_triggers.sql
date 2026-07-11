-- Lifecycle, RBAC, immutable history, and transactional outbox behavior.
begin;

create or replace function app.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function app.set_updated_at() is 'Maintains updated_at in the database so every writer has identical semantics.';

create or replace function app.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into app.profiles (id, display_name, status)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'User'
    ),
    case when new.invited_at is null then 'active' else 'invited' end
  )
  on conflict (id) do update
    set display_name = excluded.display_name,
        updated_at = now();
  return new;
end;
$$;

comment on function app.handle_new_auth_user() is 'Creates the application profile paired with each Supabase Auth user.';

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function app.handle_new_auth_user();

create or replace function app.has_permission(required_permission text, subject_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select subject_user_id is not null
    and exists (
      select 1
      from app.user_roles ur
      join app.roles r on r.id = ur.role_id
      left join app.role_permissions rp on rp.role_id = r.id
      left join app.permissions p on p.id = rp.permission_id
      join app.profiles profile on profile.id = ur.user_id
      where ur.user_id = subject_user_id
        and profile.status = 'active'
        and (r.key = 'owner' or p.key = required_permission)
    );
$$;

comment on function app.has_permission(text, uuid) is 'RLS-safe RBAC predicate; owner is an explicit super-role.';

create or replace function content.capture_content_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_revision integer;
begin
  select coalesce(max(revision_number), 0) + 1
    into next_revision
    from content.content_revisions
   where content_id = new.id;

  insert into content.content_revisions (content_id, revision_number, snapshot, change_note, created_by)
  values (
    new.id,
    next_revision,
    to_jsonb(new) - 'search_vector',
    case when tg_op = 'INSERT' then 'Initial revision' else null end,
    new.updated_by
  );
  return new;
end;
$$;

comment on function content.capture_content_revision() is 'Captures an immutable snapshot after every canonical content insert or update.';

create trigger capture_content_revision
after insert or update on content.content_items
for each row execute function content.capture_content_revision();

create or replace function app.reject_row_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% rows are append-only', tg_table_schema || '.' || tg_table_name
    using errcode = '55000';
end;
$$;

create trigger protect_content_revisions
before update or delete on content.content_revisions
for each row execute function app.reject_row_mutation();

create trigger protect_audit_logs
before update or delete on audit.audit_logs
for each row execute function app.reject_row_mutation();

create or replace function app.protect_system_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.is_system and (tg_op = 'DELETE' or new.key <> old.key or not new.is_system) then
    raise exception 'System role % cannot be removed or de-systemized', old.key
      using errcode = '55000';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger protect_system_roles
before update or delete on app.roles
for each row execute function app.protect_system_role();

create or replace function sync.enqueue_projection_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_record jsonb;
  aggregate_uuid uuid;
begin
  current_record := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  aggregate_uuid := (current_record ->> 'id')::uuid;

  insert into sync.outbox_events (event_type, aggregate_type, aggregate_id, payload)
  values (
    lower(tg_table_schema || '.' || tg_table_name || '.' || tg_op),
    tg_table_schema || '.' || tg_table_name,
    aggregate_uuid,
    jsonb_build_object('operation', lower(tg_op), 'record', current_record)
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

comment on function sync.enqueue_projection_event() is 'Writes projection work inside the same transaction as canonical mutations.';

create or replace function sync.claim_outbox_events(batch_size integer default 50)
returns setof sync.outbox_events
language plpgsql
security definer
set search_path = ''
as $$
begin
  if batch_size < 1 or batch_size > 500 then
    raise exception 'batch_size must be between 1 and 500' using errcode = '22023';
  end if;

  return query
  with candidates as (
    select event.id
      from sync.outbox_events event
     where event.available_at <= now()
       and (
         event.status in ('pending', 'failed')
         or (event.status = 'processing' and event.locked_at < now() - interval '15 minutes')
       )
     order by event.created_at
     for update skip locked
     limit batch_size
  )
  update sync.outbox_events event
     set status = 'processing',
         attempts = event.attempts + 1,
         locked_at = now(),
         last_error = null,
         updated_at = now()
    from candidates
   where event.id = candidates.id
  returning event.*;
end;
$$;

comment on function sync.claim_outbox_events(integer) is 'Atomically claims retryable outbox work with SKIP LOCKED and stale-lock recovery.';

create or replace function sync.complete_outbox_event(event_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  with changed as (
    update sync.outbox_events
       set status = 'processed', processed_at = now(), locked_at = null, updated_at = now()
     where id = event_id and status = 'processing'
    returning 1
  )
  select exists(select 1 from changed);
$$;

create or replace function sync.fail_outbox_event(event_id uuid, error_message text, retry_at timestamptz default now())
returns boolean
language sql
security definer
set search_path = ''
as $$
  with changed as (
    update sync.outbox_events
       set status = case when attempts >= 10 then 'dead_lettered' else 'failed' end,
           last_error = left(error_message, 4000),
           available_at = retry_at,
           locked_at = null,
           updated_at = now()
     where id = event_id and status = 'processing'
    returning 1
  )
  select exists(select 1 from changed);
$$;

-- Updated-at triggers are generated consistently for every mutable table with that column.
do $$
declare
  relation text;
  schema_name text;
  table_name text;
begin
  foreach relation in array array[
    'app.profiles', 'app.settings', 'media.assets',
    'content.content_items', 'content.redirects', 'content.navigation_items',
    'crm.clients', 'crm.contacts', 'crm.leads', 'crm.projects', 'crm.project_milestones', 'crm.project_tasks',
    'commerce.vendors', 'commerce.tools', 'commerce.offers', 'commerce.affiliate_links',
    'comms.email_templates', 'comms.email_threads', 'sync.outbox_events',
    'system.feature_flags', 'system.integrations'
  ] loop
    schema_name := split_part(relation, '.', 1);
    table_name := split_part(relation, '.', 2);
    execute format('create trigger set_updated_at before update on %I.%I for each row execute function app.set_updated_at()', schema_name, table_name);
  end loop;
end;
$$;

-- Only public/read-model source tables emit projection work automatically.
do $$
declare
  relation text;
  schema_name text;
  table_name text;
begin
  foreach relation in array array[
    'content.content_items', 'content.categories', 'content.tags', 'content.redirects', 'content.navigation_items',
    'commerce.vendors', 'commerce.tools', 'commerce.offers'
  ] loop
    schema_name := split_part(relation, '.', 1);
    table_name := split_part(relation, '.', 2);
    execute format('create trigger enqueue_projection_event after insert or update or delete on %I.%I for each row execute function sync.enqueue_projection_event()', schema_name, table_name);
  end loop;
end;
$$;

commit;

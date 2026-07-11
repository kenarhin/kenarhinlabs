-- Least-privilege Data API grants and row-level authorization policies.
begin;

revoke all on schema app, media, content, crm, commerce, comms, sync, audit, analytics, system from public, anon, authenticated;
grant usage on schema content, commerce, crm to anon;
grant usage on schema app, media, content, crm, commerce, comms, sync, audit, analytics, system to authenticated, service_role;

revoke all on all tables in schema app, media, content, crm, commerce, comms, sync, audit, analytics, system from public, anon, authenticated;
revoke all on all sequences in schema app, media, content, crm, commerce, comms, sync, audit, analytics, system from public, anon, authenticated;
grant all privileges on all tables in schema app, media, content, crm, commerce, comms, sync, audit, analytics, system to service_role;
grant all privileges on all sequences in schema app, media, content, crm, commerce, comms, sync, audit, analytics, system to service_role;

-- Anonymous Data API access is intentionally limited to public material and lead intake.
grant select on content.content_items, content.categories, content.tags, content.content_categories,
  content.content_tags, content.redirects, content.navigation_items to anon;
grant select on commerce.vendors, commerce.tools, commerce.offers, commerce.affiliate_links,
  commerce.pricing_snapshots to anon;
grant insert (name, email, phone, company, source, message, interest, metadata) on crm.leads to anon;

grant select on app.profiles, app.roles, app.permissions, app.user_roles, app.role_permissions, app.settings to authenticated;
grant update (display_name, avatar_asset_id, bio, timezone) on app.profiles to authenticated;
grant insert, update, delete on app.roles, app.permissions, app.user_roles, app.role_permissions, app.settings to authenticated;

grant select, insert, update, delete on all tables in schema media, content, crm, commerce, comms to authenticated;
grant select on all tables in schema sync, audit to authenticated;
grant select, insert, update on all tables in schema analytics to authenticated;
grant select, insert, update, delete on all tables in schema system to authenticated;

-- SQL-created tables do not automatically receive RLS; enable it for every application table.
do $$
declare
  target record;
begin
  for target in
    select schemaname, tablename
      from pg_tables
     where schemaname in ('app','media','content','crm','commerce','comms','sync','audit','analytics','system')
  loop
    execute format('alter table %I.%I enable row level security', target.schemaname, target.tablename);
  end loop;
end;
$$;

-- Profile access combines safe self-service with explicit user administration.
create policy profiles_read on app.profiles for select to authenticated
  using (id = (select auth.uid()) or app.has_permission('users.read'));
create policy profiles_self_update on app.profiles for update to authenticated
  using (id = (select auth.uid()) and status = 'active')
  with check (id = (select auth.uid()) and status = 'active');
create policy profiles_manage on app.profiles for all to authenticated
  using (app.has_permission('users.manage')) with check (app.has_permission('users.manage'));

create policy roles_read on app.roles for select to authenticated using (app.has_permission('users.read'));
create policy roles_manage on app.roles for all to authenticated using (app.has_permission('system.manage')) with check (app.has_permission('system.manage'));
create policy permissions_read on app.permissions for select to authenticated using (app.has_permission('users.read'));
create policy permissions_manage on app.permissions for all to authenticated using (app.has_permission('system.manage')) with check (app.has_permission('system.manage'));
create policy user_roles_read on app.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or app.has_permission('users.read'));
create policy user_roles_manage on app.user_roles for all to authenticated
  using (app.has_permission('users.manage')) with check (app.has_permission('users.manage'));
create policy role_permissions_read on app.role_permissions for select to authenticated using (app.has_permission('users.read'));
create policy role_permissions_manage on app.role_permissions for all to authenticated
  using (app.has_permission('system.manage')) with check (app.has_permission('system.manage'));
create policy settings_read on app.settings for select to authenticated using (app.has_permission('system.manage'));
create policy settings_manage on app.settings for all to authenticated
  using (app.has_permission('system.manage')) with check (app.has_permission('system.manage'));

-- Published canonical content is readable directly; private/draft operations require RBAC.
create policy content_items_public_read on content.content_items for select to anon, authenticated
  using (status = 'published' and published_at <= now() and deleted_at is null);
create policy content_items_admin_read on content.content_items for select to authenticated using (app.has_permission('content.read'));
create policy content_items_create on content.content_items for insert to authenticated
  with check (
    app.has_permission('content.write')
    and (status <> 'published' or app.has_permission('content.publish'))
    and (status <> 'scheduled' or app.has_permission('content.schedule'))
  );
create policy content_items_update on content.content_items for update to authenticated
  using (app.has_permission('content.write'))
  with check (
    app.has_permission('content.write')
    and (status <> 'published' or app.has_permission('content.publish'))
    and (status <> 'scheduled' or app.has_permission('content.schedule'))
  );
create policy content_items_delete on content.content_items for delete to authenticated using (app.has_permission('content.delete'));

create policy content_revisions_read on content.content_revisions for select to authenticated using (app.has_permission('content.read'));
create policy categories_public_read on content.categories for select to anon, authenticated using (true);
create policy categories_manage on content.categories for all to authenticated using (app.has_permission('content.write')) with check (app.has_permission('content.write'));
create policy tags_public_read on content.tags for select to anon, authenticated using (true);
create policy tags_manage on content.tags for all to authenticated using (app.has_permission('content.write')) with check (app.has_permission('content.write'));
create policy content_categories_public_read on content.content_categories for select to anon, authenticated
  using (exists (select 1 from content.content_items item where item.id = content_id and item.status = 'published' and item.deleted_at is null));
create policy content_categories_manage on content.content_categories for all to authenticated using (app.has_permission('content.write')) with check (app.has_permission('content.write'));
create policy content_tags_public_read on content.content_tags for select to anon, authenticated
  using (exists (select 1 from content.content_items item where item.id = content_id and item.status = 'published' and item.deleted_at is null));
create policy content_tags_manage on content.content_tags for all to authenticated using (app.has_permission('content.write')) with check (app.has_permission('content.write'));
create policy redirects_public_read on content.redirects for select to anon, authenticated using (is_active);
create policy redirects_manage on content.redirects for all to authenticated using (app.has_permission('content.write')) with check (app.has_permission('content.write'));
create policy navigation_public_read on content.navigation_items for select to anon, authenticated using (is_active);
create policy navigation_manage on content.navigation_items for all to authenticated using (app.has_permission('content.write')) with check (app.has_permission('content.write'));

-- Public commerce policies expose only active directory records and valid offers.
create policy vendors_public_read on commerce.vendors for select to anon, authenticated using (status = 'active');
create policy vendors_admin_read on commerce.vendors for select to authenticated using (app.has_permission('commerce.read'));
create policy vendors_manage on commerce.vendors for all to authenticated using (app.has_permission('commerce.write')) with check (app.has_permission('commerce.write'));
create policy tools_public_read on commerce.tools for select to anon, authenticated using (status = 'active');
create policy tools_admin_read on commerce.tools for select to authenticated using (app.has_permission('commerce.read'));
create policy tools_manage on commerce.tools for all to authenticated using (app.has_permission('commerce.write')) with check (app.has_permission('commerce.write'));
create policy offers_public_read on commerce.offers for select to anon, authenticated
  using (status = 'active' and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()));
create policy offers_admin_read on commerce.offers for select to authenticated using (app.has_permission('commerce.read'));
create policy offers_manage on commerce.offers for all to authenticated using (app.has_permission('commerce.write')) with check (app.has_permission('commerce.write'));
create policy affiliate_links_public_read on commerce.affiliate_links for select to anon, authenticated using (status = 'active');
create policy affiliate_links_admin_read on commerce.affiliate_links for select to authenticated using (app.has_permission('commerce.read'));
create policy affiliate_links_manage on commerce.affiliate_links for all to authenticated using (app.has_permission('commerce.write')) with check (app.has_permission('commerce.write'));
create policy pricing_public_read on commerce.pricing_snapshots for select to anon, authenticated
  using (exists (select 1 from commerce.tools tool where tool.id = tool_id and tool.status = 'active'));
create policy pricing_admin_read on commerce.pricing_snapshots for select to authenticated using (app.has_permission('commerce.read'));
create policy pricing_manage on commerce.pricing_snapshots for all to authenticated using (app.has_permission('commerce.write')) with check (app.has_permission('commerce.write'));

-- Public lead intake can only create untouched, unassigned new leads.
create policy leads_public_insert on crm.leads for insert to anon
  with check (status = 'new' and assigned_to is null);

-- Private domain tables use read/write permission pairs.
do $$
declare
  relation text;
  schema_name text;
  table_name text;
  permission_prefix text;
begin
  foreach relation in array array[
    'crm.clients:crm', 'crm.contacts:crm', 'crm.leads:crm', 'crm.projects:crm',
    'crm.project_milestones:crm', 'crm.project_tasks:crm',
    'comms.email_threads:email', 'comms.email_messages:email'
  ] loop
    schema_name := split_part(split_part(relation, ':', 1), '.', 1);
    table_name := split_part(split_part(relation, ':', 1), '.', 2);
    permission_prefix := split_part(relation, ':', 2);
    execute format(
      'create policy admin_read on %I.%I for select to authenticated using (app.has_permission(%L))',
      schema_name, table_name, permission_prefix || '.read'
    );
    execute format(
      'create policy admin_write on %I.%I for all to authenticated using (app.has_permission(%L)) with check (app.has_permission(%L))',
      schema_name, table_name, permission_prefix || case when permission_prefix = 'email' then '.send' else '.write' end,
      permission_prefix || case when permission_prefix = 'email' then '.send' else '.write' end
    );
  end loop;
end;
$$;

create policy asset_folders_read on media.asset_folders for select to authenticated using (app.has_permission('media.read'));
create policy asset_folders_write on media.asset_folders for insert to authenticated with check (app.has_permission('media.upload'));
create policy asset_folders_update on media.asset_folders for update to authenticated
  using (app.has_permission('media.upload')) with check (app.has_permission('media.upload'));
create policy asset_folders_delete on media.asset_folders for delete to authenticated using (app.has_permission('media.delete'));
create policy assets_read on media.assets for select to authenticated using (app.has_permission('media.read'));
create policy assets_write on media.assets for insert to authenticated with check (app.has_permission('media.upload'));
create policy assets_update on media.assets for update to authenticated
  using (app.has_permission('media.upload')) with check (app.has_permission('media.upload'));
create policy assets_delete on media.assets for delete to authenticated using (app.has_permission('media.delete'));
create policy asset_usages_read on media.asset_usages for select to authenticated using (app.has_permission('media.read'));
create policy asset_usages_write on media.asset_usages for insert to authenticated with check (app.has_permission('media.upload'));
create policy asset_usages_delete on media.asset_usages for delete to authenticated using (app.has_permission('media.delete'));

create policy email_templates_read on comms.email_templates for select to authenticated using (app.has_permission('email.read'));
create policy email_templates_manage on comms.email_templates for all to authenticated
  using (app.has_permission('email.manage')) with check (app.has_permission('email.manage'));

create policy outbox_read on sync.outbox_events for select to authenticated using (app.has_permission('sync.read'));
create policy projection_runs_read on sync.projection_runs for select to authenticated using (app.has_permission('sync.read'));
create policy audit_logs_read on audit.audit_logs for select to authenticated using (app.has_permission('audit.read'));
create policy events_daily_read on analytics.events_daily for select to authenticated using (app.has_permission('analytics.read'));
create policy events_daily_write on analytics.events_daily for all to authenticated
  using (app.has_permission('analytics.write')) with check (app.has_permission('analytics.write'));
create policy feature_flags_read on system.feature_flags for select to authenticated using (app.has_permission('system.manage'));
create policy feature_flags_manage on system.feature_flags for all to authenticated
  using (app.has_permission('system.manage')) with check (app.has_permission('system.manage'));
create policy integrations_read on system.integrations for select to authenticated using (app.has_permission('system.manage'));
create policy integrations_manage on system.integrations for all to authenticated
  using (app.has_permission('system.manage')) with check (app.has_permission('system.manage'));

-- Functions are deny-by-default because SECURITY DEFINER functions bypass caller RLS.
revoke execute on all functions in schema app, content, sync from public, anon, authenticated;
grant execute on function app.has_permission(text, uuid) to authenticated, service_role;
grant execute on function sync.claim_outbox_events(integer), sync.complete_outbox_event(uuid),
  sync.fail_outbox_event(uuid, text, timestamptz) to service_role;

-- Future objects remain closed until a migration deliberately grants them.
alter default privileges for role postgres in schema app, media, content, crm, commerce, comms, sync, audit, analytics, system
  revoke all on tables from public, anon, authenticated;
alter default privileges for role postgres in schema app, media, content, crm, commerce, comms, sync, audit, analytics, system
  revoke all on sequences from public, anon, authenticated;
alter default privileges for role postgres in schema app, media, content, crm, commerce, comms, sync, audit, analytics, system
  revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema app, media, content, crm, commerce, comms, sync, audit, analytics, system
  grant all on tables to service_role;
alter default privileges for role postgres in schema app, media, content, crm, commerce, comms, sync, audit, analytics, system
  grant all on sequences to service_role;

commit;

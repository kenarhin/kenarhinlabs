-- Channel-aware unified inbox for website intake, direct email, and admin replies.
begin;

create table comms.email_mailboxes (
  id uuid primary key,
  channel text not null unique check (channel in ('general','projects','support','privacy')),
  address text not null unique,
  display_name text not null,
  is_public boolean not null default false,
  receives_email boolean not null default true,
  sends_email boolean not null default true,
  status text not null default 'active' check (status in ('active','paused','retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (address = lower(address) and address ~ '^[^@[:space:]]+@[^@[:space:]]+$')
);

insert into comms.email_mailboxes (
  id, channel, address, display_name, is_public, receives_email, sends_email
) values
  ('30000000-0000-4000-8000-000000000001', 'general', 'hello@kenarhinlabs.com', 'Ken Arhin Labs', true, true, true),
  ('30000000-0000-4000-8000-000000000002', 'projects', 'projects@kenarhinlabs.com', 'Ken Arhin Labs Projects', true, true, true),
  ('30000000-0000-4000-8000-000000000003', 'support', 'support@kenarhinlabs.com', 'Ken Arhin Labs Support', false, true, true),
  ('30000000-0000-4000-8000-000000000004', 'privacy', 'privacy@kenarhinlabs.com', 'Ken Arhin Labs Privacy', true, true, true)
on conflict (id) do update set
  channel = excluded.channel,
  address = excluded.address,
  display_name = excluded.display_name,
  is_public = excluded.is_public,
  receives_email = excluded.receives_email,
  sends_email = excluded.sends_email,
  status = 'active',
  updated_at = now();

alter table comms.email_threads
  add column mailbox_id uuid references comms.email_mailboxes(id) on delete restrict,
  add column participant_email text,
  add column participant_name text,
  add column source text not null default 'email',
  add column priority text not null default 'normal',
  add column assigned_to uuid references auth.users(id) on delete set null,
  add column unread_count integer not null default 0,
  add column last_message_at timestamptz,
  add column last_inbound_at timestamptz,
  add column last_outbound_at timestamptz;

-- Existing website-contact rows were project intake and therefore belong to
-- the Projects mailbox. Lead data supplies the external participant safely.
update comms.email_threads thread
   set mailbox_id = '30000000-0000-4000-8000-000000000002',
       participant_email = coalesce(
         (select lead.email from crm.leads lead where lead.id = thread.lead_id),
         'unknown@invalid.local'
       ),
       participant_name = (
         select lead.name from crm.leads lead where lead.id = thread.lead_id
       ),
       source = 'legacy_project_intake',
       last_message_at = thread.updated_at,
       last_outbound_at = thread.updated_at
 where mailbox_id is null;

alter table comms.email_threads
  alter column mailbox_id set not null,
  alter column participant_email set not null,
  alter column last_message_at set not null,
  alter column last_message_at set default now(),
  drop constraint if exists email_threads_check,
  drop constraint if exists email_threads_parent_check,
  add constraint email_threads_priority_check check (priority in ('low','normal','high','urgent')),
  add constraint email_threads_unread_count_check check (unread_count >= 0),
  add constraint email_threads_participant_email_check
    check (participant_email = lower(participant_email) and participant_email ~ '^[^@[:space:]]+@[^@[:space:]]+$');

create index email_threads_mailbox_status_last_idx
  on comms.email_threads (mailbox_id, status, last_message_at desc);
create index email_threads_participant_idx
  on comms.email_threads (lower(participant_email), last_message_at desc);
create index email_threads_assigned_to_idx
  on comms.email_threads (assigned_to, status, last_message_at desc)
  where assigned_to is not null;

alter table comms.email_messages
  add column reply_to_email text,
  add column rfc_message_id text,
  add column in_reply_to text,
  add column "references" jsonb not null default '[]'::jsonb,
  add column created_by uuid references auth.users(id) on delete set null,
  add column received_at timestamptz,
  add column provider_accepted_at timestamptz,
  add column delivered_at timestamptz,
  add column bounced_at timestamptz;

alter table comms.email_messages
  drop constraint email_messages_status_check;

update comms.email_messages
   set status = 'provider_accepted',
       provider_accepted_at = coalesce(sent_at, updated_at, created_at)
 where status = 'sent';

alter table comms.email_messages
  add constraint email_messages_status_check
    check (status in ('queued','processing','provider_accepted','delivered','bounced','failed','received')),
  add constraint email_messages_references_check check (jsonb_typeof("references") = 'array');

create unique index email_messages_rfc_message_id_unique
  on comms.email_messages (provider, rfc_message_id)
  where rfc_message_id is not null;
create index email_messages_thread_received_idx
  on comms.email_messages (thread_id, received_at desc)
  where direction = 'inbound';

create table comms.email_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references comms.email_messages(id) on delete cascade,
  bucket text not null,
  object_key text not null,
  filename text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  content_id text,
  disposition text not null default 'attachment' check (disposition in ('attachment','inline')),
  created_at timestamptz not null default now()
);
create unique index email_attachments_bucket_object_unique
  on comms.email_attachments (bucket, object_key);
create index email_attachments_message_idx on comms.email_attachments (message_id, created_at);

create trigger set_updated_at
before update on comms.email_mailboxes
for each row execute function app.set_updated_at();

grant select on comms.email_mailboxes to authenticated;
grant select, insert, update, delete on comms.email_attachments to authenticated;

alter table comms.email_mailboxes enable row level security;
alter table comms.email_attachments enable row level security;

create policy email_mailboxes_read on comms.email_mailboxes for select to authenticated
  using (app.has_permission('email.read'));
create policy email_mailboxes_insert on comms.email_mailboxes for insert to authenticated
  with check (app.has_permission('email.manage'));
create policy email_mailboxes_update on comms.email_mailboxes for update to authenticated
  using (app.has_permission('email.manage')) with check (app.has_permission('email.manage'));
create policy email_mailboxes_delete on comms.email_mailboxes for delete to authenticated
  using (app.has_permission('email.manage'));

create policy email_attachments_read on comms.email_attachments for select to authenticated
  using (app.has_permission('email.read'));
create policy email_attachments_insert on comms.email_attachments for insert to authenticated
  with check (app.has_permission('email.send'));
create policy email_attachments_update on comms.email_attachments for update to authenticated
  using (app.has_permission('email.send')) with check (app.has_permission('email.send'));
create policy email_attachments_delete on comms.email_attachments for delete to authenticated
  using (app.has_permission('email.send'));

comment on table comms.email_mailboxes is
  'Canonical sender and recipient identities displayed as channels in one administration inbox.';
comment on column comms.email_threads.participant_email is
  'External conversation participant; never trusted as an outbound From identity.';
comment on column comms.email_messages.provider_accepted_at is
  'Time Cloudflare accepted the send request; this is not proof of final SMTP delivery.';
comment on table comms.email_attachments is
  'Private attachment metadata; bytes remain in the configured private R2 bucket.';

commit;

begin;

-- Durable delivery identity and lease state make Queue retries idempotent and
-- recoverable without treating Cloudflare Queue acknowledgement as persistence.
alter table comms.email_messages
  add column job_id uuid,
  add column idempotency_key text,
  add column attempts integer not null default 0,
  add column retryable boolean not null default true,
  add column last_error_code text,
  add column last_error text,
  add column last_attempt_at timestamptz,
  add column next_attempt_at timestamptz,
  add column sent_at timestamptz,
  add column updated_at timestamptz not null default now();

-- Existing rows predate Queue jobs. Backfill deterministic one-row identities
-- so the new constraints are safe even when a non-empty database is upgraded.
update comms.email_messages
   set job_id = id,
       idempotency_key = 'legacy:' || id::text
 where job_id is null or idempotency_key is null;

alter table comms.email_messages
  alter column job_id set not null,
  alter column idempotency_key set not null,
  drop constraint email_messages_status_check,
  add constraint email_messages_status_check
    check (status in ('queued','processing','sent','failed','received')),
  add constraint email_messages_attempts_check check (attempts >= 0);

create unique index email_messages_job_id_unique
  on comms.email_messages (job_id);

create unique index email_messages_idempotency_key_unique
  on comms.email_messages (idempotency_key);

create index email_messages_delivery_claim_idx
  on comms.email_messages (status, retryable, next_attempt_at);

create trigger set_updated_at
before update on comms.email_messages
for each row execute function app.set_updated_at();

commit;

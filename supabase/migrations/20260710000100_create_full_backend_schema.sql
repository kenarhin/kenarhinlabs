-- Canonical Ken Arhin Labs domain model. Supabase Postgres is the source of truth.
begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create schema if not exists app;
create schema if not exists media;
create schema if not exists content;
create schema if not exists crm;
create schema if not exists commerce;
create schema if not exists comms;
create schema if not exists sync;
create schema if not exists audit;
create schema if not exists analytics;
create schema if not exists system;

comment on schema sync is 'Transactional outbox and projection execution state.';
comment on schema audit is 'Append-only security and business audit records.';
comment on schema analytics is 'Bounded aggregate analytics, not raw event payload storage.';

create table app.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_asset_id uuid,
  bio text,
  timezone text not null default 'Africa/Accra',
  status text not null default 'active' check (status in ('active', 'invited', 'suspended', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table app.roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

create table app.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  "group" text not null,
  description text,
  created_at timestamptz not null default now()
);

create table app.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references app.roles(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create table app.role_permissions (
  role_id uuid not null references app.roles(id) on delete cascade,
  permission_id uuid not null references app.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table app.settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  description text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table media.asset_folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_id uuid references media.asset_folders(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (parent_id is null or parent_id <> id)
);

create table media.assets (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid references media.asset_folders(id) on delete set null,
  bucket text not null,
  object_key text not null,
  filename text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  alt_text text,
  caption text,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (bucket, object_key)
);

alter table app.profiles
  add constraint profiles_avatar_asset_id_fkey
  foreign key (avatar_asset_id) references media.assets(id) on delete set null;

create table media.asset_usages (
  asset_id uuid not null references media.assets(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  usage_type text not null,
  created_at timestamptz not null default now(),
  primary key (asset_id, entity_type, entity_id, usage_type)
);

create index assets_folder_idx on media.assets(folder_id) where deleted_at is null;
create index asset_usages_entity_idx on media.asset_usages(entity_type, entity_id);

create table content.content_items (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('post','case_study','stack_guide','lab_note','service_page','landing_page','tool_page','offer_page','legal_page','product_update')),
  status text not null default 'draft' check (status in ('draft','review','scheduled','published','archived')),
  title text not null,
  slug text not null,
  excerpt text,
  body_format text not null default 'markdown' check (body_format in ('markdown','blocks','html_sanitized')),
  body_markdown text,
  body_blocks jsonb,
  cover_asset_id uuid references media.assets(id) on delete set null,
  author_id uuid not null references auth.users(id) on delete restrict,
  seo_title text,
  seo_description text,
  canonical_url text,
  og_asset_id uuid references media.assets(id) on delete set null,
  published_at timestamptz,
  scheduled_for timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  published_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  search_vector tsvector generated always as (
    to_tsvector('english'::regconfig, coalesce(title, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(body_markdown, ''))
  ) stored,
  check (body_blocks is null or jsonb_typeof(body_blocks) = 'array'),
  check (status <> 'published' or published_at is not null),
  check (status <> 'scheduled' or scheduled_for is not null)
);

create unique index content_items_type_slug_active_unique
  on content.content_items(type, slug) where deleted_at is null;
create index content_items_status_published_idx on content.content_items(status, published_at desc);
create index content_items_type_status_published_idx on content.content_items(type, status, published_at desc);
create index content_items_search_idx on content.content_items using gin(search_vector);

create table content.content_revisions (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references content.content_items(id) on delete cascade,
  revision_number integer not null check (revision_number > 0),
  snapshot jsonb not null,
  change_note text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (content_id, revision_number)
);

create table content.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table content.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table content.content_categories (
  content_id uuid not null references content.content_items(id) on delete cascade,
  category_id uuid not null references content.categories(id) on delete cascade,
  primary key (content_id, category_id)
);

create table content.content_tags (
  content_id uuid not null references content.content_items(id) on delete cascade,
  tag_id uuid not null references content.tags(id) on delete cascade,
  primary key (content_id, tag_id)
);

create table content.redirects (
  id uuid primary key default gen_random_uuid(),
  source_path text not null unique,
  target_path text not null,
  status_code integer not null default 301 check (status_code in (301, 302)),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (source_path like '/%'),
  check (target_path like '/%' or target_path ~ '^https://')
);

create table content.navigation_items (
  id uuid primary key default gen_random_uuid(),
  location text not null,
  label text not null,
  href text not null,
  parent_id uuid references content.navigation_items(id) on delete cascade,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (parent_id is null or parent_id <> id)
);
create index navigation_items_location_sort_idx on content.navigation_items(location, sort_order);

create table crm.clients (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('individual','company','organization')),
  name text not null,
  slug text,
  website_url text,
  industry text,
  status text not null default 'lead' check (status in ('lead','active','paused','completed','archived')),
  source text,
  notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index clients_slug_active_unique on crm.clients(slug) where slug is not null and deleted_at is null;
create index clients_status_idx on crm.clients(status) where deleted_at is null;

create table crm.contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references crm.clients(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  role_title text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (email is not null or phone is not null)
);
create unique index contacts_one_primary_per_client on crm.contacts(client_id) where is_primary;

create table crm.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  company text,
  source text not null,
  message text,
  interest text,
  status text not null default 'new' check (status in ('new','contacted','qualified','won','lost','spam')),
  metadata jsonb not null default '{}'::jsonb,
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (email is not null or phone is not null)
);
create index leads_status_created_idx on crm.leads(status, created_at desc);

create table crm.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references crm.clients(id) on delete restrict,
  name text not null,
  slug text,
  type text not null,
  status text not null default 'planned' check (status in ('planned','active','paused','launched','completed','cancelled')),
  description text,
  start_date date,
  target_launch_date date,
  completed_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_date is null or target_launch_date is null or start_date <= target_launch_date)
);
create unique index projects_client_slug_unique on crm.projects(client_id, slug) where slug is not null;
create index projects_client_status_idx on crm.projects(client_id, status);

create table crm.project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references crm.projects(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'pending' check (status in ('pending','active','done','blocked')),
  due_date date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index project_milestones_project_sort_idx on crm.project_milestones(project_id, sort_order);

create table crm.project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references crm.projects(id) on delete cascade,
  milestone_id uuid references crm.project_milestones(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo','doing','review','done','blocked')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  assigned_to uuid references auth.users(id) on delete set null,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index project_tasks_project_status_idx on crm.project_tasks(project_id, status);
create index project_tasks_assignee_status_idx on crm.project_tasks(assigned_to, status) where assigned_to is not null;

create table commerce.vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  website_url text,
  description text,
  logo_asset_id uuid references media.assets(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table commerce.tools (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid references commerce.vendors(id) on delete set null,
  name text not null,
  slug text not null unique,
  category text not null,
  description text,
  website_url text,
  status text not null default 'draft' check (status in ('draft','active','archived')),
  is_recommended boolean not null default false,
  setup_difficulty text not null default 'beginner' check (setup_difficulty in ('beginner','intermediate','advanced')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tools_category_status_idx on commerce.tools(category, status);

create table commerce.offers (
  id uuid primary key default gen_random_uuid(),
  tool_id uuid references commerce.tools(id) on delete set null,
  title text not null,
  slug text not null unique,
  description text,
  offer_type text not null check (offer_type in ('discount','free_trial','credit','coupon','bundle','internal_service')),
  code text,
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'draft' check (status in ('draft','active','expired','archived')),
  terms text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at is null or ends_at is null or starts_at < ends_at)
);
create index offers_status_window_idx on commerce.offers(status, starts_at, ends_at);

create table commerce.affiliate_links (
  id uuid primary key default gen_random_uuid(),
  tool_id uuid references commerce.tools(id) on delete cascade,
  offer_id uuid references commerce.offers(id) on delete cascade,
  label text not null,
  url text not null,
  disclosure text,
  status text not null default 'active' check (status in ('active','paused','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (tool_id is not null or offer_id is not null)
);

create table commerce.pricing_snapshots (
  id uuid primary key default gen_random_uuid(),
  tool_id uuid not null references commerce.tools(id) on delete cascade,
  plan_name text not null,
  price_amount numeric(18,4) check (price_amount is null or price_amount >= 0),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  billing_interval text not null check (billing_interval in ('monthly','yearly','one_time','usage_based')),
  source_url text,
  captured_at timestamptz not null default now()
);
create index pricing_snapshots_tool_captured_idx on commerce.pricing_snapshots(tool_id, captured_at desc);

create table comms.email_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  subject text not null,
  html_body text not null,
  text_body text,
  variables jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table comms.email_threads (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references crm.clients(id) on delete set null,
  lead_id uuid references crm.leads(id) on delete set null,
  subject text not null,
  status text not null default 'open' check (status in ('open','waiting','closed','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (client_id is not null or lead_id is not null)
);

create table comms.email_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references comms.email_threads(id) on delete cascade,
  direction text not null check (direction in ('inbound','outbound')),
  from_email text not null,
  to_emails jsonb not null check (jsonb_typeof(to_emails) = 'array'),
  cc_emails jsonb check (cc_emails is null or jsonb_typeof(cc_emails) = 'array'),
  bcc_emails jsonb check (bcc_emails is null or jsonb_typeof(bcc_emails) = 'array'),
  subject text not null,
  html_body text,
  text_body text,
  provider text not null,
  provider_message_id text,
  status text not null default 'queued' check (status in ('queued','sent','failed','received')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (html_body is not null or text_body is not null)
);
create unique index email_messages_provider_id_unique
  on comms.email_messages(provider, provider_message_id) where provider_message_id is not null;
create index email_messages_thread_created_idx on comms.email_messages(thread_id, created_at);

create table sync.outbox_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  aggregate_type text not null,
  aggregate_id uuid not null,
  sync_version bigint generated always as identity (sequence name sync.outbox_events_sync_version_seq),
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending','processing','processed','failed','dead_lettered')),
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  processed_at timestamptz,
  locked_at timestamptz,
  last_error text,
  dedupe_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index outbox_events_poll_idx on sync.outbox_events(status, available_at);
create index outbox_events_aggregate_version_idx on sync.outbox_events(aggregate_type, aggregate_id, sync_version);
create unique index outbox_events_dedupe_key_unique on sync.outbox_events(dedupe_key) where dedupe_key is not null;

create table sync.projection_runs (
  id uuid primary key default gen_random_uuid(),
  projection text not null,
  status text not null default 'started' check (status in ('started','completed','failed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error text,
  metadata jsonb,
  check (status = 'started' or completed_at is not null)
);

create table audit.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_entity_created_idx on audit.audit_logs(entity_type, entity_id, created_at desc);
create index audit_logs_actor_created_idx on audit.audit_logs(actor_id, created_at desc);
create index audit_logs_created_brin_idx on audit.audit_logs using brin(created_at);

create table analytics.events_daily (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  event_name text not null,
  entity_type text,
  entity_id uuid,
  count bigint not null default 0 check (count >= 0),
  metadata jsonb not null default '{}'::jsonb
);
create unique index events_daily_dimensions_unique
  on analytics.events_daily(date, event_name, entity_type, entity_id) nulls not distinct;

create table system.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  description text,
  rules jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table system.integrations (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  name text not null,
  status text not null default 'active' check (status in ('active','paused','broken','archived')),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, name)
);

comment on table sync.outbox_events is 'Transactional source of work for rebuildable D1 projections and other background jobs.';
comment on table media.assets is 'Metadata for R2 objects; object bytes never live in Postgres.';
comment on table analytics.events_daily is 'Daily aggregates only; private message/content bodies are prohibited.';
comment on column system.integrations.config is 'Non-secret configuration only. Credentials belong in managed secret stores.';

commit;

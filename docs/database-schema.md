# Ken Arhin Labs Database Schema

This document defines the long-term database model for Ken Arhin Labs. It is not an MVP-only schema. It is the intended domain model for a scalable backend using Supabase Postgres as the source of truth and Cloudflare D1 as the public/edge read model.

## Core Decisions

- **Primary source of truth:** Supabase Postgres.
- **ORM and migrations:** Drizzle ORM + Drizzle Kit.
- **Runtime database access from Cloudflare Workers:** Cloudflare Hyperdrive + Drizzle + `pg` / `node-postgres`.
- **Public read model:** Cloudflare D1 for published, non-sensitive, frequently-read public data.
- **File/object storage:** Cloudflare R2. Store file metadata in Supabase Postgres, not file blobs.
- **Auth identity:** Supabase Auth. Application roles and permissions live in Postgres.
- **API exposure:** Hono is the official application API. Supabase Data API can exist, but should not become the main app API surface.
- **Security:** RLS and explicit grants should be part of migrations for any exposed schema/table.

## Database Layer Roles

```txt
Supabase Postgres
  Canonical private/business data
  Draft and published source content
  Auth-linked profiles, roles, permissions
  CRM, projects, offers, emails, audit logs, media metadata

Cloudflare D1
  Public read projections only
  Published content copies
  Public tool/offer/directory copies
  SEO, sitemap, navigation, redirects
  Lightweight public search index

Cloudflare R2
  Images
  Documents
  Downloads
  Client files
  Case study media
  Blog/editor uploads
```

## Postgres Schema Namespaces

Do not put everything in the default `public` schema. Use Postgres schemas to keep the system clean.

```txt
auth      # Supabase-managed auth schema
app       # users/profiles/roles/settings/core app data
crm       # clients, contacts, projects, proposals
content   # CMS, articles, case studies, stack guides, pages
commerce  # vendors, tools, offers, affiliate links, pricing snapshots
media     # R2 asset metadata and asset usage tracking
comms     # email threads, notifications, templates
sync      # outbox events and D1 projection state
audit     # audit/security/business logs
analytics # summarized events and reporting tables
system    # feature flags, integrations, system settings
```

## Naming Conventions

- Tables: plural snake_case, for example `content_items`.
- Columns: snake_case.
- IDs: UUID primary keys unless there is a strong reason otherwise.
- Timestamps: `created_at`, `updated_at`, `deleted_at` for soft-deletable records.
- Publishing timestamps: `published_at`, `scheduled_for`, `archived_at`.
- Actor tracking: `created_by`, `updated_by`, `published_by` referencing `auth.users(id)` where useful.
- Public slugs: unique per content type when required.

## Schema: `app`

### `app.profiles`

Application profile linked to Supabase Auth users.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key; references `auth.users(id)` |
| `display_name` | text | Public/admin display name |
| `avatar_asset_id` | uuid | Nullable; references `media.assets(id)` |
| `bio` | text | Nullable |
| `timezone` | text | Default `Africa/Accra` |
| `status` | text | `active`, `invited`, `suspended`, `deleted` |
| `created_at` | timestamptz | Required |
| `updated_at` | timestamptz | Required |

### `app.roles`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `key` | text | Unique, for example `owner`, `admin`, `editor`, `viewer` |
| `name` | text | Human-readable role name |
| `description` | text | Nullable |
| `is_system` | boolean | Prevent accidental deletion |
| `created_at` | timestamptz | Required |

### `app.permissions`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `key` | text | Unique, for example `content.publish` |
| `name` | text | Human-readable permission |
| `group` | text | `content`, `crm`, `commerce`, `media`, `system`, etc. |
| `description` | text | Nullable |
| `created_at` | timestamptz | Required |

### `app.user_roles`

| Column | Type | Notes |
|---|---|---|
| `user_id` | uuid | References `auth.users(id)` |
| `role_id` | uuid | References `app.roles(id)` |
| `assigned_by` | uuid | References `auth.users(id)` |
| `assigned_at` | timestamptz | Required |

Primary key: `(user_id, role_id)`.

### `app.role_permissions`

| Column | Type | Notes |
|---|---|---|
| `role_id` | uuid | References `app.roles(id)` |
| `permission_id` | uuid | References `app.permissions(id)` |

Primary key: `(role_id, permission_id)`.

### `app.settings`

For system-level settings that are not secrets.

| Column | Type | Notes |
|---|---|---|
| `key` | text | Primary key |
| `value` | jsonb | Setting value |
| `description` | text | Nullable |
| `updated_by` | uuid | References `auth.users(id)` |
| `updated_at` | timestamptz | Required |

## Schema: `content`

The content system should support blog posts, case studies, stack guides, lab notes, service pages, landing pages, tool pages, and future documentation pages.

### `content.content_items`

Canonical content record.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `type` | text | `post`, `case_study`, `stack_guide`, `lab_note`, `service_page`, `landing_page`, `tool_page`, `legal_page` |
| `status` | text | `draft`, `review`, `scheduled`, `published`, `archived` |
| `title` | text | Required |
| `slug` | text | Required |
| `excerpt` | text | Nullable |
| `body_format` | text | `markdown`, `blocks`, or `html_sanitized` |
| `body_markdown` | text | Nullable if using block editor |
| `body_blocks` | jsonb | Nullable; structured editor output |
| `cover_asset_id` | uuid | Nullable; references `media.assets(id)` |
| `author_id` | uuid | References `auth.users(id)` |
| `seo_title` | text | Nullable |
| `seo_description` | text | Nullable |
| `canonical_url` | text | Nullable |
| `og_asset_id` | uuid | Nullable; references `media.assets(id)` |
| `published_at` | timestamptz | Nullable |
| `scheduled_for` | timestamptz | Nullable |
| `created_by` | uuid | References `auth.users(id)` |
| `updated_by` | uuid | References `auth.users(id)` |
| `published_by` | uuid | References `auth.users(id)` |
| `created_at` | timestamptz | Required |
| `updated_at` | timestamptz | Required |
| `deleted_at` | timestamptz | Nullable |

Recommended constraints/indexes:

- Unique `(type, slug)` where `deleted_at is null`.
- Index `(status, published_at desc)`.
- Index `(type, status, published_at desc)`.
- Full-text search index on `title`, `excerpt`, and body/search vector.

### `content.content_revisions`

Immutable revision snapshots.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `content_id` | uuid | References `content.content_items(id)` |
| `revision_number` | integer | Incrementing per content item |
| `snapshot` | jsonb | Full content snapshot |
| `change_note` | text | Nullable |
| `created_by` | uuid | References `auth.users(id)` |
| `created_at` | timestamptz | Required |

Unique `(content_id, revision_number)`.

### `content.categories`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `name` | text | Required |
| `slug` | text | Unique |
| `description` | text | Nullable |
| `created_at` | timestamptz | Required |

### `content.tags`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `name` | text | Required |
| `slug` | text | Unique |
| `created_at` | timestamptz | Required |

### `content.content_categories`

Join table.

| Column | Type | Notes |
|---|---|---|
| `content_id` | uuid | References `content.content_items(id)` |
| `category_id` | uuid | References `content.categories(id)` |

Primary key: `(content_id, category_id)`.

### `content.content_tags`

Join table.

| Column | Type | Notes |
|---|---|---|
| `content_id` | uuid | References `content.content_items(id)` |
| `tag_id` | uuid | References `content.tags(id)` |

Primary key: `(content_id, tag_id)`.

### `content.redirects`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `source_path` | text | Unique |
| `target_path` | text | Required |
| `status_code` | integer | 301 or 302 |
| `is_active` | boolean | Required |
| `created_at` | timestamptz | Required |
| `updated_at` | timestamptz | Required |

### `content.navigation_items`

Managed navigation for public site sections.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `location` | text | `header`, `footer`, `sidebar`, etc. |
| `label` | text | Required |
| `href` | text | Required |
| `parent_id` | uuid | Nullable self-reference |
| `sort_order` | integer | Required |
| `is_active` | boolean | Required |
| `created_at` | timestamptz | Required |
| `updated_at` | timestamptz | Required |

## Schema: `crm`

### `crm.clients`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `type` | text | `individual`, `company`, `organization` |
| `name` | text | Required |
| `slug` | text | Unique nullable |
| `website_url` | text | Nullable |
| `industry` | text | Nullable |
| `status` | text | `lead`, `active`, `paused`, `completed`, `archived` |
| `source` | text | Nullable; e.g. `website`, `referral`, `manual` |
| `notes` | text | Nullable |
| `created_by` | uuid | References `auth.users(id)` |
| `created_at` | timestamptz | Required |
| `updated_at` | timestamptz | Required |
| `deleted_at` | timestamptz | Nullable |

### `crm.contacts`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `client_id` | uuid | References `crm.clients(id)` |
| `name` | text | Required |
| `email` | text | Nullable |
| `phone` | text | Nullable |
| `role_title` | text | Nullable |
| `is_primary` | boolean | Default false |
| `created_at` | timestamptz | Required |
| `updated_at` | timestamptz | Required |

### `crm.leads`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `name` | text | Required |
| `email` | text | Nullable |
| `phone` | text | Nullable |
| `company` | text | Nullable |
| `source` | text | Required; e.g. `contact_form`, `stack_finder`, `manual` |
| `message` | text | Nullable |
| `interest` | text | Nullable; `website`, `ai_agent`, `hosting`, `automation`, etc. |
| `status` | text | `new`, `contacted`, `qualified`, `won`, `lost`, `spam` |
| `metadata` | jsonb | Raw form/tool data |
| `assigned_to` | uuid | Nullable; references `auth.users(id)` |
| `created_at` | timestamptz | Required |
| `updated_at` | timestamptz | Required |

### `crm.projects`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `client_id` | uuid | References `crm.clients(id)` |
| `name` | text | Required |
| `slug` | text | Nullable |
| `type` | text | `website`, `platform`, `automation`, `agent`, `mobile_app`, `consulting`, etc. |
| `status` | text | `planned`, `active`, `paused`, `launched`, `completed`, `cancelled` |
| `description` | text | Nullable |
| `start_date` | date | Nullable |
| `target_launch_date` | date | Nullable |
| `completed_at` | timestamptz | Nullable |
| `created_by` | uuid | References `auth.users(id)` |
| `created_at` | timestamptz | Required |
| `updated_at` | timestamptz | Required |

### `crm.project_milestones`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `project_id` | uuid | References `crm.projects(id)` |
| `title` | text | Required |
| `description` | text | Nullable |
| `status` | text | `pending`, `active`, `done`, `blocked` |
| `due_date` | date | Nullable |
| `sort_order` | integer | Required |
| `created_at` | timestamptz | Required |
| `updated_at` | timestamptz | Required |

### `crm.project_tasks`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `project_id` | uuid | References `crm.projects(id)` |
| `milestone_id` | uuid | Nullable; references `crm.project_milestones(id)` |
| `title` | text | Required |
| `description` | text | Nullable |
| `status` | text | `todo`, `doing`, `review`, `done`, `blocked` |
| `priority` | text | `low`, `normal`, `high`, `urgent` |
| `assigned_to` | uuid | Nullable; references `auth.users(id)` |
| `due_at` | timestamptz | Nullable |
| `created_at` | timestamptz | Required |
| `updated_at` | timestamptz | Required |

## Schema: `commerce`

This schema powers the stack directory, tool listings, offers, affiliate links, pricing snapshots, and monetization metadata.

### `commerce.vendors`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `name` | text | Required |
| `slug` | text | Unique |
| `website_url` | text | Nullable |
| `description` | text | Nullable |
| `logo_asset_id` | uuid | Nullable; references `media.assets(id)` |
| `status` | text | `draft`, `active`, `archived` |
| `created_at` | timestamptz | Required |
| `updated_at` | timestamptz | Required |

### `commerce.tools`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `vendor_id` | uuid | Nullable; references `commerce.vendors(id)` |
| `name` | text | Required |
| `slug` | text | Unique |
| `category` | text | `hosting`, `domain`, `ai_tool`, `automation`, `developer_tool`, etc. |
| `description` | text | Nullable |
| `website_url` | text | Nullable |
| `status` | text | `draft`, `active`, `archived` |
| `is_recommended` | boolean | Default false |
| `setup_difficulty` | text | `beginner`, `intermediate`, `advanced` |
| `metadata` | jsonb | Flexible attributes |
| `created_at` | timestamptz | Required |
| `updated_at` | timestamptz | Required |

### `commerce.offers`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `tool_id` | uuid | Nullable; references `commerce.tools(id)` |
| `title` | text | Required |
| `slug` | text | Unique |
| `description` | text | Nullable |
| `offer_type` | text | `discount`, `free_trial`, `credit`, `coupon`, `bundle`, `internal_service` |
| `code` | text | Nullable coupon code |
| `starts_at` | timestamptz | Nullable |
| `ends_at` | timestamptz | Nullable |
| `status` | text | `draft`, `active`, `expired`, `archived` |
| `terms` | text | Nullable |
| `created_at` | timestamptz | Required |
| `updated_at` | timestamptz | Required |

### `commerce.affiliate_links`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `tool_id` | uuid | Nullable; references `commerce.tools(id)` |
| `offer_id` | uuid | Nullable; references `commerce.offers(id)` |
| `label` | text | Required |
| `url` | text | Required; destination URL |
| `disclosure` | text | Nullable |
| `status` | text | `active`, `paused`, `archived` |
| `created_at` | timestamptz | Required |
| `updated_at` | timestamptz | Required |

### `commerce.pricing_snapshots`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `tool_id` | uuid | References `commerce.tools(id)` |
| `plan_name` | text | Required |
| `price_amount` | numeric | Nullable |
| `currency` | text | Nullable |
| `billing_interval` | text | `monthly`, `yearly`, `one_time`, `usage_based` |
| `source_url` | text | Nullable |
| `captured_at` | timestamptz | Required |

## Schema: `media`

### `media.asset_folders`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `name` | text | Required |
| `parent_id` | uuid | Nullable self-reference |
| `created_at` | timestamptz | Required |

### `media.assets`

Metadata for R2 objects.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `folder_id` | uuid | Nullable; references `media.asset_folders(id)` |
| `bucket` | text | R2 bucket name/logical bucket |
| `object_key` | text | Unique per bucket |
| `filename` | text | Original filename |
| `mime_type` | text | Required |
| `size_bytes` | bigint | Required |
| `width` | integer | Nullable for images |
| `height` | integer | Nullable for images |
| `alt_text` | text | Nullable |
| `caption` | text | Nullable |
| `uploaded_by` | uuid | References `auth.users(id)` |
| `created_at` | timestamptz | Required |
| `updated_at` | timestamptz | Required |
| `deleted_at` | timestamptz | Nullable |

Unique `(bucket, object_key)`.

### `media.asset_usages`

Tracks where assets are used.

| Column | Type | Notes |
|---|---|---|
| `asset_id` | uuid | References `media.assets(id)` |
| `entity_type` | text | `content_item`, `project`, `tool`, etc. |
| `entity_id` | uuid | ID of the entity |
| `usage_type` | text | `cover`, `inline`, `download`, `logo`, etc. |
| `created_at` | timestamptz | Required |

## Schema: `comms`

### `comms.email_templates`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `key` | text | Unique, for example `lead_received` |
| `name` | text | Required |
| `subject` | text | Required |
| `html_body` | text | Required |
| `text_body` | text | Nullable |
| `variables` | jsonb | Template variable metadata |
| `status` | text | `draft`, `active`, `archived` |
| `created_at` | timestamptz | Required |
| `updated_at` | timestamptz | Required |

### `comms.email_threads`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `client_id` | uuid | Nullable; references `crm.clients(id)` |
| `lead_id` | uuid | Nullable; references `crm.leads(id)` |
| `subject` | text | Required |
| `status` | text | `open`, `waiting`, `closed`, `archived` |
| `created_at` | timestamptz | Required |
| `updated_at` | timestamptz | Required |

### `comms.email_messages`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `thread_id` | uuid | References `comms.email_threads(id)` |
| `direction` | text | `inbound`, `outbound` |
| `from_email` | text | Required |
| `to_emails` | jsonb | Array of recipients |
| `cc_emails` | jsonb | Nullable |
| `bcc_emails` | jsonb | Nullable |
| `subject` | text | Required |
| `html_body` | text | Nullable |
| `text_body` | text | Nullable |
| `provider` | text | `cloudflare_email`, `smtp`, etc. |
| `provider_message_id` | text | Nullable |
| `status` | text | `queued`, `sent`, `failed`, `received` |
| `metadata` | jsonb | Delivery data |
| `created_at` | timestamptz | Required |

## Schema: `sync`

This schema implements an outbox pattern so Supabase Postgres can safely publish public projections into D1.

### `sync.outbox_events`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `event_type` | text | e.g. `content.published`, `offer.updated` |
| `aggregate_type` | text | e.g. `content_item`, `offer`, `navigation` |
| `aggregate_id` | uuid | Source entity ID |
| `payload` | jsonb | Event payload |
| `status` | text | `pending`, `processing`, `processed`, `failed`, `dead_lettered` |
| `attempts` | integer | Default 0 |
| `available_at` | timestamptz | For delayed processing |
| `processed_at` | timestamptz | Nullable |
| `created_at` | timestamptz | Required |
| `updated_at` | timestamptz | Required |

Indexes:

- `(status, available_at)` for queue polling.
- `(aggregate_type, aggregate_id)` for event history.

### `sync.projection_runs`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `projection` | text | e.g. `public_content`, `public_offers` |
| `status` | text | `started`, `completed`, `failed` |
| `started_at` | timestamptz | Required |
| `completed_at` | timestamptz | Nullable |
| `error` | text | Nullable |
| `metadata` | jsonb | Nullable |

## Schema: `audit`

### `audit.audit_logs`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `actor_id` | uuid | Nullable; references `auth.users(id)` |
| `action` | text | Required |
| `entity_type` | text | Required |
| `entity_id` | uuid | Nullable |
| `ip_address` | inet | Nullable |
| `user_agent` | text | Nullable |
| `metadata` | jsonb | Required default `{}` |
| `created_at` | timestamptz | Required |

## Schema: `analytics`

Keep raw analytics lightweight. Do not let analytics explode the main database unless the product direction requires it.

### `analytics.events_daily`

| Column | Type | Notes |
|---|---|---|
| `date` | date | Part of primary key |
| `event_name` | text | Part of primary key |
| `entity_type` | text | Nullable |
| `entity_id` | uuid | Nullable |
| `count` | bigint | Required |
| `metadata` | jsonb | Optional summary details |

Composite primary key can include `date`, `event_name`, `entity_type`, and `entity_id` depending on implementation.

## Schema: `system`

### `system.feature_flags`

| Column | Type | Notes |
|---|---|---|
| `key` | text | Primary key |
| `enabled` | boolean | Required |
| `description` | text | Nullable |
| `rules` | jsonb | Optional targeting rules |
| `updated_by` | uuid | References `auth.users(id)` |
| `updated_at` | timestamptz | Required |

### `system.integrations`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `provider` | text | e.g. `cloudflare`, `supabase`, `google`, `github` |
| `name` | text | Required |
| `status` | text | `active`, `paused`, `broken`, `archived` |
| `config` | jsonb | Non-secret config only |
| `created_at` | timestamptz | Required |
| `updated_at` | timestamptz | Required |

Secrets should live in Cloudflare/Supabase secret stores, not in the database.

## D1 Public Read Model

D1 should be a projection/cache, not the source of truth.

### D1 tables

```txt
public_content
public_content_blocks
public_content_search
public_case_studies
public_stack_guides
public_tools
public_offers
public_navigation
public_homepage_sections
public_sitemap_urls
public_redirects
public_seo_metadata
```

### `public_content`

| Column | Type | Notes |
|---|---|---|
| `id` | text | UUID from Supabase as text |
| `type` | text | Content type |
| `slug` | text | Public slug |
| `title` | text | Required |
| `excerpt` | text | Nullable |
| `body_html` | text | Sanitized/rendered body |
| `cover_url` | text | Public R2 URL or proxied asset URL |
| `author_name` | text | Denormalized |
| `seo_title` | text | Nullable |
| `seo_description` | text | Nullable |
| `published_at` | text | ISO datetime |
| `updated_at` | text | ISO datetime |
| `sync_version` | integer | Incremented projection version |

Recommended D1 indexes:

- `(type, slug)` unique.
- `(type, published_at)`.
- `(published_at)`.

### Public read flow

```txt
Astro public route
  → read from D1 projection
  → if missing/stale and route allows fallback, call Hono API
  → Hono reads Supabase through Hyperdrive
  → refresh D1 projection asynchronously
```

## Security Rules

- Enable RLS on exposed Supabase tables.
- Use explicit grants in migrations for `anon`, `authenticated`, and `service_role`.
- Hono should verify Supabase JWTs for admin/private requests.
- Service role keys must never be exposed to frontend apps.
- Admin should be protected by Cloudflare Access before app-level Supabase Auth.
- D1 should never contain private client data, email bodies, internal notes, invoices, or private project details.
- R2 private objects should be served through signed URLs or controlled Worker routes.

## Drizzle Package Layout

```txt
packages/db/
  src/
    schema/
      app.ts
      content.ts
      crm.ts
      commerce.ts
      media.ts
      comms.ts
      sync.ts
      audit.ts
      analytics.ts
      system.ts
      index.ts
    d1-schema/
      public-content.ts
      public-commerce.ts
      public-site.ts
      index.ts
    client/
      worker.ts      # Drizzle + pg + Hyperdrive binding
      node.ts        # Drizzle Kit/local scripts
      d1.ts          # Drizzle/D1 client for projections
    queries/
      content.queries.ts
      clients.queries.ts
      offers.queries.ts
      media.queries.ts
      users.queries.ts
    migrations/
```

## Migration Rules

Every schema migration should consider:

```txt
1. Table definition
2. Foreign keys
3. Indexes
4. RLS enablement where relevant
5. Grants for exposed roles where relevant
6. Policies
7. Seed/system data if needed
8. D1 projection changes if public data is affected
```

## References

- Supabase API overview: https://supabase.com/docs/guides/api
- Supabase API security and grants: https://supabase.com/docs/guides/api/securing-your-api
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Drizzle guide: https://supabase.com/docs/guides/database/drizzle
- Drizzle with Supabase: https://orm.drizzle.team/docs/tutorials/drizzle-with-supabase
- Cloudflare Hyperdrive with Supabase: https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-database-providers/supabase/
- Cloudflare Hyperdrive with Drizzle: https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-drivers-and-libraries/drizzle-orm/
- Cloudflare D1 limits: https://developers.cloudflare.com/d1/platform/limits/
- Cloudflare D1 pricing: https://developers.cloudflare.com/d1/platform/pricing/
- Cloudflare D1 read replication: https://developers.cloudflare.com/d1/best-practices/read-replication/

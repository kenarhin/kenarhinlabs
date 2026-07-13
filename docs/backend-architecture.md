# Ken Arhin Labs Backend Architecture

This document defines the long-term backend architecture for Ken Arhin Labs. It covers the full
system we are designing, not only the first launch version.

## Architecture Summary

```txt
Public website:      Astro on Cloudflare Workers
Admin app:           TanStack Start on Cloudflare Workers
Main API:            Hono on Cloudflare Workers
Primary database:    Supabase Postgres
Database connection: Cloudflare Hyperdrive
ORM/migrations:      Drizzle ORM + Drizzle Kit
Auth identity:       Supabase Auth
Admin perimeter:     Cloudflare Access
Public read model:   Cloudflare D1
Object storage:      Cloudflare R2
Email:               Cloudflare Email Service + SMTP for Supabase Auth
Background jobs:     Cloudflare Queues + Workflows
Validation:          Zod
Shared business:     packages/core
```

## Main Principle

Ken Arhin Labs should not become a random collection of Cloudflare and Supabase features. The
backend should follow a clear division of responsibility.

```txt
Hono API
  Official backend API and business logic layer.

Supabase Postgres
  Canonical source of truth for business, content, CRM, users, and system data.

Supabase Auth
  Identity provider for admins, future client portal users, and internal users.

Cloudflare Hyperdrive
  Efficient Worker-to-Supabase Postgres connection pooling and query acceleration.

Cloudflare D1
  Public edge read model for non-sensitive published data.

Cloudflare R2
  File and media storage.

Cloudflare Queues/Workflows
  Background processing, sync, retries, emails, publishing, and durable multi-step operations.
```

## Why Hyperdrive Is Required

Cloudflare Workers run globally and can create pressure on traditional database connection limits if
each request connects directly to Postgres. Hyperdrive sits between Workers and Supabase Postgres
and handles connection setup, connection pooling, and query caching across Cloudflare’s network.

Runtime path:

```txt
Cloudflare Worker
  → Hyperdrive binding
  → Supabase Postgres direct connection
```

Important rule:

```txt
For Workers runtime access, use Hyperdrive with the Supabase direct connection string.
Do not use Supabase pooler behind Hyperdrive because Hyperdrive itself is the pooling layer.
```

## Why Use Drizzle

Drizzle gives the project a typed database layer, schema-as-code, migrations, and reusable queries.
It keeps the database design inside the monorepo instead of relying on manual dashboard changes.

Use Drizzle in two modes:

```txt
Workers runtime:
  drizzle-orm/node-postgres
  pg / node-postgres
  Cloudflare Hyperdrive binding

Local/dev/migrations:
  Drizzle Kit
  Supabase direct connection or appropriate migration connection string
```

## Backend Request Topology

```txt
Browser / PWA / Future mobile app
  ↓
Astro public site or TanStack Start admin
  ↓
Hono API on Cloudflare Workers
  ↓
Domain services in packages/core
  ↓
Drizzle queries in packages/db
  ↓
Hyperdrive
  ↓
Supabase Postgres
```

Public read-heavy content can bypass Supabase when safe:

```txt
Astro public route
  ↓
D1 public read model
  ↓ fallback if needed
Hono API
  ↓
Hyperdrive
  ↓
Supabase Postgres
```

## Monorepo Backend Structure

```txt
apps/
  api/                      # Hono API on Cloudflare Workers
  web/                      # Astro public site, reads public API/D1 projections
  admin/                    # TanStack Start admin app

packages/
  core/                     # Business/domain logic
  db/                       # Drizzle schemas, migrations, queries, DB clients
  auth/                     # Supabase Auth helpers, JWT verification, RBAC helpers
  validators/               # Zod schemas shared by API/admin/web
  storage/                  # R2 helpers and signed URL utilities
  email/                    # Email templates and sending helpers
  sync/                     # Supabase → D1 projection logic
  config/                   # Shared TS/Prettier/ESLint/Biome/etc. configs

docs/
  context.md
  tech-stack.md
  database-schema.md
  backend-architecture.md
  tasks/
```

## `apps/api` Design

The Hono API should be modular by domain.

```txt
apps/api/src/
  index.ts
  env.ts
  middleware/
    auth.ts
    errors.ts
    request-id.ts
    rate-limit.ts
    validate.ts
  routes/
    health.routes.ts
    auth.routes.ts
    public.routes.ts
    content.routes.ts
    crm.routes.ts
    commerce.routes.ts
    media.routes.ts
    comms.routes.ts
    admin.routes.ts
    webhooks.routes.ts
  modules/
    auth/
    content/
    crm/
    commerce/
    media/
    comms/
    sync/
    analytics/
```

## API Route Groups

### Public routes

```txt
GET  /health
GET  /public/navigation
GET  /public/homepage
GET  /public/content/:type/:slug
GET  /public/tools
GET  /public/offers
POST /public/leads
POST /public/contact
```

Public routes should read from D1 where possible and fall back to Supabase through the API only when
necessary.

### Admin routes

```txt
GET    /admin/me
GET    /admin/dashboard
GET    /admin/content
POST   /admin/content
PATCH  /admin/content/:id
POST   /admin/content/:id/publish
POST   /admin/content/:id/schedule
GET    /admin/clients
POST   /admin/clients
PATCH  /admin/clients/:id
GET    /admin/projects
POST   /admin/projects
GET    /admin/offers
POST   /admin/offers
GET    /admin/media
POST   /admin/media/upload-url
GET    /admin/emails
POST   /admin/emails/send
```

Admin routes require Supabase Auth JWT verification and permission checks.

### Webhook routes

```txt
POST /webhooks/supabase
POST /webhooks/cloudflare-email
POST /webhooks/internal/queue
```

Webhook routes must verify signatures or shared secrets.

## Auth Flow

### Admin login

```txt
1. Admin opens admin.kenarhinlabs.com.
2. Cloudflare Access checks perimeter access.
3. TanStack Start app loads.
4. User signs in with Supabase Auth.
5. Admin app receives Supabase session/JWT.
6. Admin app calls Hono API with Authorization: Bearer <jwt>.
7. Hono verifies JWT.
8. Hono loads profile, roles, and permissions from Supabase Postgres.
9. Hono authorizes request at route and domain-service level.
```

### Permission model

Permissions should be checked in backend code, not only in the UI.

Examples:

```txt
content.read
content.write
content.publish
content.schedule
content.delete
crm.read
crm.write
commerce.read
commerce.write
media.upload
media.delete
email.send
system.manage
```

## Supabase Auth Email Strategy

Supabase has Auth email templates/flows, but the default Supabase sender is not the production email
strategy. Configure custom SMTP.

Use Cloudflare Email Service SMTP for Supabase Auth emails:

```txt
Supabase Auth custom SMTP
  Host: smtp.mx.cloudflare.net
  Port: 465
  Security: Implicit TLS / SMTPS
  Username: api_token
  Password: Cloudflare API token with Email Sending permission
  Sender: no-reply@kenarhinlabs.com
```

Use Cloudflare Email Service Workers binding/REST API for Hono transactional emails:

```txt
contact form confirmations
lead notifications
client project updates
admin alerts
content workflow emails
manual admin-sent emails
```

Sender responsibilities:

```txt
no-reply@kenarhinlabs.com   Supabase Auth and automated system delivery
hello@kenarhinlabs.com      General business and website correspondence
projects@kenarhinlabs.com   Contact confirmations, leads, and project correspondence
support@kenarhinlabs.com    Existing-client and technical support
```

`contact@kenarhinlabs.com` remains the inbound privacy, legal, security, rights, and policy address.
It is not an approved outbound API sender unless a future reviewed workflow requires it. The
complete public channel rules live in
[`docs/frontend-contact-channels.md`](frontend-contact-channels.md).

## Content Publishing Flow

```txt
1. Admin creates/edits content in TanStack Start admin.
2. Admin app calls Hono API.
3. Hono validates input with Zod.
4. Hono calls packages/core content service.
5. Drizzle writes canonical content to Supabase Postgres.
6. On publish, Hono writes sync.outbox_events row.
7. Cloudflare Queue/Workflow processes content.published event.
8. Projection worker renders/sanitizes public content.
9. Projection worker writes public copy to D1.
10. Cloudflare cache is purged or revalidated where needed.
11. Astro public site reads the published version from D1.
```

## D1 Projection Strategy

D1 should contain only public, denormalized, non-sensitive data.

Examples:

```txt
published blog posts
published stack guides
published case studies
published tool listings
published offers
public navigation
homepage sections
SEO metadata
sitemap URLs
redirects
public search index
```

D1 should not contain:

```txt
client private data
email bodies
admin notes
private project records
invoices/payments
raw auth/user records
private media metadata
service role data
```

## Sync and Outbox Pattern

Do not try to write to Supabase and D1 randomly in the same request. Use an outbox pattern.

```txt
Supabase transaction:
  update canonical table
  insert sync.outbox_events row

Background processing:
  queue consumes pending event
  projector reads canonical Supabase data
  projector writes D1 projection
  projector marks event processed
```

This gives better retry behavior, traceability, and resilience.

## Media Upload Flow

```txt
1. Admin requests upload URL from Hono API.
2. Hono verifies permissions.
3. Hono creates/returns a signed R2 upload URL or handles direct upload through Worker.
4. Client uploads file to R2.
5. Hono stores metadata in media.assets.
6. Content/project/tool records reference media.assets(id).
7. Public pages use public R2 URLs, proxied URLs, or signed URLs depending on privacy.
```

## Email Flow

### Outbound transactional email

```txt
1. Domain action triggers email requirement.
2. Hono writes comms.email_messages row with status queued.
3. Queue/Workflow sends email through Cloudflare Email Service.
4. Delivery result updates comms.email_messages.
5. Audit log records the action.
```

### Inbound email routing

```txt
1. Email arrives through Cloudflare Email Routing/Email Service.
2. Worker email handler parses message.
3. Hono/comms module matches lead/client/thread.
4. Message is stored in comms.email_messages.
5. Admin notification is queued if needed.
```

## Background Jobs

Use Cloudflare Queues for decoupled jobs:

```txt
content projection
email sending
R2 media processing
lead enrichment
offer expiry checks
analytics rollups
cache invalidation
```

Use Cloudflare Workflows for durable multi-step operations:

```txt
client onboarding
project launch checklist
scheduled publication
multi-step content publishing
email sequences
manual approval flows
retryable external API operations
```

## API Validation and Error Handling

- Use Zod schemas from `packages/validators` for request validation.
- Use shared error classes in `packages/core`.
- Use consistent API response envelopes.
- Include request IDs in logs and responses.
- Never leak database errors or secret values to clients.

Example response shape:

```ts
// success
{
  ok: true,
  data: {},
  requestId: "req_..."
}

// error
{
  ok: false,
  error: {
    code: "CONTENT_NOT_FOUND",
    message: "Content item not found"
  },
  requestId: "req_..."
}
```

## `packages/core`

Business logic belongs here so Hono route handlers stay thin.

```txt
packages/core/src/
  content/
    create-content.ts
    update-content.ts
    publish-content.ts
    schedule-content.ts
  crm/
    create-client.ts
    create-lead.ts
    update-project-status.ts
  commerce/
    create-offer.ts
    expire-offer.ts
    track-affiliate-click.ts
  media/
    register-asset.ts
    delete-asset.ts
  permissions/
    can.ts
    require-permission.ts
  errors/
    app-error.ts
```

## `packages/db`

```txt
packages/db/src/
  schema/             # Supabase Postgres Drizzle schemas
  d1-schema/          # D1 projection schemas
  client/
    worker.ts         # Hyperdrive runtime client
    node.ts           # local scripts and migrations
    d1.ts             # D1 binding client
  queries/            # reusable typed queries
  migrations/         # generated migrations
```

## `packages/auth`

```txt
packages/auth/src/
  verify-jwt.ts
  get-session-user.ts
  get-user-permissions.ts
  require-auth.ts
  require-permission.ts
  supabase-client.ts
```

## `packages/sync`

```txt
packages/sync/src/
  outbox.ts
  projectors/
    content.projector.ts
    commerce.projector.ts
    navigation.projector.ts
    sitemap.projector.ts
  cache/
    purge.ts
    tags.ts
```

## Environment Variables and Bindings

### Cloudflare Worker bindings

```txt
HYPERDRIVE            # Hyperdrive binding to Supabase Postgres
D1_PUBLIC             # D1 public read model database
R2_MEDIA              # R2 media bucket
EMAIL                 # Cloudflare Email Service binding
CONTENT_QUEUE         # Queue for content projection
EMAIL_QUEUE           # Queue for email sending
SYNC_WORKFLOW         # Workflow binding for durable sync jobs
```

### Secrets

```txt
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY         # public clients only; sb_publishable_... format
SUPABASE_SECRET_KEY              # backend only when elevated Data API access is required
SUPABASE_JWT_AUDIENCE            # asymmetric Auth token verification through project JWKS
DATABASE_URL                     # local Drizzle Kit/migrations only
CLOUDFLARE_EMAIL_SMTP_TOKEN
```

## Security Model

- Supabase secret keys must only exist in backend environments that need elevated Data API access.
- Browser and admin bundles receive only a publishable key, never `sb_secret_...` credentials.
- The built-in Postgres roles remain `anon`, `authenticated`, and `service_role`; modern API keys
  map to those roles and do not rename them.
- Cloudflare Access protects admin perimeter.
- Supabase Auth handles identity.
- Hono handles authorization and business permissions.
- RLS and grants protect Supabase exposed schemas/tables.
- D1 only stores public projection data.
- R2 private files require signed URLs or controlled Worker routes.
- Audit logs should record sensitive admin actions.

## Observability

Track:

```txt
request IDs
API errors
auth failures
publish/sync failures
email delivery status
D1 projection lag
queue retry/dead-letter counts
R2 upload failures
slow database queries
admin actions
```

## Backend Build Order

This is not a separate MVP architecture. It is the order for building the permanent architecture
safely.

```txt
1. packages/config and TypeScript foundation
2. packages/db with Drizzle, schemas, clients, migrations
3. Supabase project setup and database roles/RLS conventions
4. Hyperdrive connection from Workers to Supabase
5. packages/auth with Supabase JWT verification and RBAC helpers
6. apps/api Hono scaffold
7. content module + D1 projection path
8. media module + R2 upload flow
9. comms module + Cloudflare Email Service
10. crm and commerce modules
11. analytics/audit/sync hardening
```

## References

- Hono on Cloudflare Workers: https://hono.dev/docs/getting-started/cloudflare-workers
- Cloudflare Workers Hono guide:
  https://developers.cloudflare.com/workers/framework-guides/web-apps/more-web-frameworks/hono/
- Cloudflare Hyperdrive with Supabase:
  https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-database-providers/supabase/
- Cloudflare Hyperdrive with Drizzle:
  https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-drivers-and-libraries/drizzle-orm/
- Supabase Drizzle guide: https://supabase.com/docs/guides/database/drizzle
- Drizzle with Supabase: https://orm.drizzle.team/docs/tutorials/drizzle-with-supabase
- Supabase API security: https://supabase.com/docs/guides/api/securing-your-api
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Cloudflare D1 pricing: https://developers.cloudflare.com/d1/platform/pricing/
- Cloudflare D1 limits: https://developers.cloudflare.com/d1/platform/limits/
- Cloudflare D1 read replication:
  https://developers.cloudflare.com/d1/best-practices/read-replication/
- Cloudflare R2 pricing: https://developers.cloudflare.com/r2/pricing/
- Cloudflare Email Service Workers API:
  https://developers.cloudflare.com/email-service/api/send-emails/workers-api/
- Cloudflare Email Service SMTP:
  https://developers.cloudflare.com/email-service/api/send-emails/smtp/
- Cloudflare Workflows: https://developers.cloudflare.com/workflows/

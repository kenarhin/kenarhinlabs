# Ken Arhin Labs — Tech Stack

_Last updated: 2026-07-10_

## 1. Final stack summary

```txt
Monorepo:          pnpm workspace
Public site:       Astro + Cloudflare Workers
Admin app:         TanStack Start + Cloudflare Workers
API:               Hono + Cloudflare Workers
Primary backend:   Supabase Postgres + Supabase Auth + RLS
Read/cache layer:  Cloudflare D1
Storage:           Cloudflare R2
Email:             Cloudflare Email Service + Email Routing
PWA:               @vite-pwa/astro + vite-plugin-pwa
UI:                Tailwind CSS + shadcn/ui + Radix primitives
Motion:            GSAP + ScrollTrigger + Astro View Transitions + CSS transitions
Async jobs:        Cloudflare Queues + Workflows
Security:          Supabase Auth + Cloudflare Access + Turnstile + RLS
```

The stack should be treated as the long-term architecture, not a temporary v1 stack. Features can be
phased, but the technical foundation should not be throwaway.

## 2. Public site

App path:

```txt
apps/web
```

Domain:

```txt
kenarhinlabs.com
```

Framework:

```txt
Astro
```

Runtime/deployment:

```txt
Cloudflare Workers
```

Public site stack:

```txt
Astro
TypeScript
Tailwind CSS
shadcn/ui selectively
GSAP
Astro View Transitions
@vite-pwa/astro
Cloudflare Workers adapter
```

Why Astro:

- The public site will be content-heavy.
- Astro is designed for content-heavy websites such as blogs, docs, and stores.
- Astro ships minimal client-side JavaScript by default.
- It supports islands of interactivity only where needed.
- It can run on Cloudflare Workers and use Cloudflare bindings when configured for server/on-demand
  rendering.

Use Astro for:

- Homepage
- Services pages
- Work/case studies
- Field notes/blog
- Stack guides
- Tool/offer pages
- Labs pages
- SEO/AEO-friendly content
- Public PWA shell

Avoid turning the whole public site into a React-heavy app. Use React/shadcn islands only where they
improve UX.

## 3. Admin app

App path:

```txt
apps/admin
```

Domain:

```txt
admin.kenarhinlabs.com
```

Framework:

```txt
TanStack Start
```

Runtime/deployment:

```txt
Cloudflare Workers
```

Admin stack:

```txt
TanStack Start
React
TypeScript
TanStack Router
TanStack Query
Tailwind CSS
shadcn/ui
React Hook Form
Zod
Plate editor or similar editor
vite-plugin-pwa
Cloudflare Workers
```

Why TanStack Start:

- It is a full-stack React framework.
- It supports SSR, streaming, server functions, and bundling.
- It fits an admin/business operating system better than a simple SPA.
- It can be deployed to Cloudflare Workers.
- It pairs naturally with TanStack Router and TanStack Query.

Use the admin for:

- Content publishing
- Client/project management
- Lead management
- Tool/offer management
- Media uploads
- Email workflows
- Business dashboard
- Future client portal support

## 4. API layer

App path:

```txt
apps/api
```

Framework:

```txt
Hono
```

Runtime:

```txt
Cloudflare Workers
```

The Hono API is the official backend API for the entire project, not just the admin.

Consumers:

- Public Astro site
- Admin TanStack Start app
- Future client portal
- Future mobile apps
- Future internal tools

API responsibilities:

- Auth/session verification
- Authorization/permissions
- Business validation
- Content publishing
- Supabase access
- D1 sync
- R2 signed uploads/access
- Email sending
- Queue producers
- Webhooks
- Audit logging

Use TanStack Start server functions only for admin-specific local needs. Shared business logic
should live in Hono and/or `packages/core`.

## 5. Supabase role

Supabase is the primary backend platform.

Use Supabase for:

```txt
Postgres database
Auth
RLS policies
SQL migrations
Generated database types
Optional Realtime later
```

Do not use Supabase Edge Functions as the main runtime. Cloudflare Workers + Hono is the chosen
runtime/API layer.

Supabase Data API note:

- Supabase provides an auto-generated REST API over Postgres.
- The frontend should generally call the Hono API instead of directly calling tables from
  everywhere.
- Hono may use Supabase APIs/server clients where appropriate.
- Migrations must include explicit grants and RLS policies for any tables exposed through Supabase's
  Data API.

Important Supabase security rule:

```txt
GRANT controls whether a role can access a table/function.
RLS controls which rows that role can access.
Both matter.
```

For new tables, include:

```sql
-- Example only
alter table public.example enable row level security;

grant select on public.example to anon;
grant select, insert, update, delete on public.example to authenticated;

a create policy statement that matches the intended access rules;
```

## 6. Supabase Auth

Use Supabase Auth for app identity.

Auth use cases:

- Admin login
- Team members
- Future client portal users
- Future user accounts
- Role/permission mapping

Auth emails:

Supabase supports email-based auth flows, but the default Supabase email sender is for testing/demo
use and is not production-ready. Configure custom SMTP for production.

Use custom SMTP for:

- Signup confirmation
- Password reset
- Magic link / OTP
- Email change
- User invite
- Reauthentication/security messages

Recommended production SMTP provider:

```txt
Cloudflare Email Service
```

Fallback options if needed:

```txt
Resend
Postmark
Brevo
AWS SES
```

## 7. Cloudflare Email Service

Use Cloudflare Email Service for:

1. Supabase Auth custom SMTP
2. Hono/Workers transactional emails
3. Business emails triggered from the admin
4. Contact form confirmations
5. Internal notifications

Cloudflare SMTP settings:

```txt
Host: smtp.mx.cloudflare.net
Port: 465
Security: Implicit TLS / SMTPS
Username: api_token
Password: Cloudflare API token with Email Sending: Edit permission
```

Possible sender addresses:

```txt
no-reply@kenarhinlabs.com
hello@kenarhinlabs.com
projects@kenarhinlabs.com
support@kenarhinlabs.com
```

Also use Cloudflare Email Routing for inbound routing where useful.

## 8. Database architecture

Primary source of truth:

```txt
Supabase Postgres
```

Edge/read/cache layer:

```txt
Cloudflare D1
```

Storage:

```txt
Cloudflare R2
```

Rule:

> Supabase stores authoritative business data. D1 stores read-optimized public copies. R2 stores
> files/media.

## 9. Supabase + D1 architecture

D1 should complement Supabase, not compete with it.

Correct pattern:

```txt
Write/update in Supabase
  -> publish/sync event
  -> Queue/Workflow job
  -> write public read model to D1
  -> Astro reads D1 for public pages
```

Wrong pattern:

```txt
Sometimes write to Supabase, sometimes write to D1, with no clear source of truth.
```

Use D1 for public, frequent, non-sensitive read data:

```txt
published blog posts
published stack guides
published case studies
published tools/offers
homepage content sections
navigation config
SEO metadata
sitemap data
public search index
```

Keep these in Supabase only or primarily:

```txt
users
roles
permissions
clients
projects
private leads
private notes
content drafts
email logs
audit logs
billing/payment records later
unpublished content
```

Sync/rebuild principle:

> Anything in D1 should be rebuildable from Supabase.

## 10. File/media storage

Use Cloudflare R2 for:

- Blog images
- Case study screenshots
- Tool logos
- Downloadable files
- Brand assets
- Client-uploaded files
- Generated exports
- Public media

Store file metadata in Supabase:

```txt
id
bucket/key
filename
mime_type
size
owner_id
visibility
created_at
updated_at
```

Store public file references in D1 only where needed for published pages.

## 11. PWA stack

Public site PWA:

```txt
@vite-pwa/astro
manifest.webmanifest
service worker
offline fallback
install icons
cache strategy
update prompt
```

Admin app PWA:

```txt
vite-plugin-pwa
manifest.webmanifest
service worker
app shell cache
offline draft storage
safe retry queue
update prompt
```

Public PWA caching:

- App shell
- Homepage assets
- Icons
- Fonts
- CSS/JS
- Recent public content
- Offline fallback page

Admin PWA caching:

- App shell
- Icons
- CSS/JS
- Safe UI assets
- Local draft state

Do not cache sensitive admin data casually.

## 12. UI/design system

Use:

```txt
Tailwind CSS
shadcn/ui
Radix primitives
class-variance-authority
lucide-react
Sonner for toasts
```

Public site:

- Use shadcn/ui selectively.
- Use Astro components first.
- Add React islands for interactive components.
- Prioritize performance and content clarity.

Admin app:

- Use shadcn/ui heavily.
- Build a consistent internal design system.
- Use tables, forms, dialogs, command menu, toasts, keyboard shortcuts, and dashboard cards.

## 13. Animation/motion stack

Use:

```txt
GSAP
ScrollTrigger
Astro View Transitions
CSS transitions
```

Use GSAP for:

- Homepage hero motion
- Premium scroll storytelling
- Case study reveals
- Service section animation
- Labs/project showcase
- Animated diagrams
- Stack visualizations

Use lighter motion for the admin:

- CSS transitions
- Small component transitions
- Loading/skeleton states
- Toasts
- Dialog transitions

Avoid making the admin flashy. The admin should feel smooth, fast, and professional.

## 14. Content editor

Recommended editor:

```txt
Plate editor
```

Possible alternative:

```txt
TipTap
```

Editor requirements:

- Rich writing experience
- Markdown or structured JSON output
- Controlled embeds/components
- Image upload to R2
- Draft autosave
- Publish workflow
- SEO fields
- Preview mode

Recommended content fields:

```txt
id
type
status
title
slug
excerpt
body_markdown or body_json
cover_image_key
author_id
seo_title
seo_description
canonical_url
published_at
created_at
updated_at
```

## 15. Forms and validation

Use:

```txt
React Hook Form
Zod
Shared schemas in packages/core
```

Validation rule:

> Client-side validation is for UX. Server-side validation in Hono is required for trust.

Shared schemas should live in:

```txt
packages/core/src/schemas
```

## 16. Shared core package

Path:

```txt
packages/core
```

Purpose:

- Shared types
- Zod schemas
- Constants
- Permissions
- Content model helpers
- Client/project domain helpers
- Offer/tool domain helpers
- Shared utilities

Do not put deployment/runtime-specific code in `packages/core`. Keep it portable.

## 17. Shared db package

Path:

```txt
packages/db
```

Purpose:

- Supabase migrations
- Seed SQL
- Generated database types
- Database table constants
- Local development helpers

Primary migration path:

```txt
Reviewed repository SQL migrations + Drizzle schema
Remote inspection/application through the Supabase MCP connector only
```

Do not use the Supabase CLI for this project. Before any remote query or migration, retrieve and
verify the MCP connector's project URL against the intended Ken Arhin Labs Supabase project. Stop
when the connector targets a different or ambiguous project.

Drizzle is the selected typed schema/query layer and is already part of the permanent backend
architecture. Reviewed SQL migrations under the root `supabase/` directory remain the canonical,
auditable database-change artifacts; Drizzle schema and query code must stay consistent with them.

## 18. Security stack

Use:

```txt
Supabase Auth
Supabase RLS
Cloudflare Access
Cloudflare Turnstile
Cloudflare WAF/rate limiting
Hono auth middleware
Audit logs
```

Security layers:

```txt
Cloudflare Access:
  protects admin perimeter

Supabase Auth:
  handles user identity

Hono middleware:
  validates sessions and permissions

Supabase RLS:
  protects data at database level

Turnstile:
  protects public forms
```

## 19. Cloudflare services

Use Cloudflare for:

```txt
Workers
R2
D1
Email Service
Email Routing
Queues
Workflows
Access
Turnstile
Cache
WAF / rate limiting
```

Avoid using Cloudflare and Supabase for the same job without a clear reason.

## 20. Async/background jobs

Use Cloudflare Queues for:

- Content sync jobs
- Email jobs
- Webhook processing
- Media processing triggers
- Retryable tasks

Use Cloudflare Workflows for:

- Multi-step publishing flows
- Client onboarding workflows
- Long-running task orchestration
- Processes that need durable state/retries

## 21. Suggested environment variables and bindings

Public site:

```txt
PUBLIC_SITE_URL
API_BASE_URL
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
R2_PUBLIC_BASE_URL
```

Admin app:

```txt
ADMIN_SITE_URL
API_BASE_URL
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
```

API Worker secrets/bindings:

```txt
SUPABASE_URL
SUPABASE_SECRET_KEY when elevated Data API access is required
SUPABASE_JWKS_URL and SUPABASE_JWT_AUDIENCE
CLOUDFLARE_EMAIL_API_TOKEN
R2_BUCKET binding
D1_DATABASE binding
QUEUE bindings
WORKFLOW bindings
TURNSTILE_SECRET_KEY
```

Use current `sb_publishable_...` keys in public clients and separately rotatable `sb_secret_...`
keys only in protected backend components. The legacy JWT-based `anon` and `service_role` API keys
are not application configuration. Their names still correctly identify Supabase's built-in Postgres
roles in grants and RLS policies.

## 22. Source references

Official docs checked while preparing this stack:

- Cloudflare Workers Astro guide:
  https://developers.cloudflare.com/workers/framework-guides/web-apps/astro/
- Cloudflare Workers TanStack Start guide:
  https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/
- Cloudflare Workers Hono guide:
  https://developers.cloudflare.com/workers/framework-guides/web-apps/more-web-frameworks/hono/
- Supabase API docs: https://supabase.com/docs/guides/api
- Supabase changelog: https://supabase.com/changelog
- Supabase custom SMTP docs: https://supabase.com/docs/guides/auth/auth-smtp
- Cloudflare Email Service SMTP docs:
  https://developers.cloudflare.com/email-service/api/send-emails/smtp/
- Vite PWA Astro integration: https://vite-pwa-org.netlify.app/frameworks/astro
- Vite PWA docs: https://vite-pwa-org.netlify.app/
- GSAP docs: https://gsap.com/docs/v3/

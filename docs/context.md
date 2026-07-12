# Ken Arhin Labs — Project Context

_Last updated: 2026-07-10_

## 1. Project identity

**Ken Arhin Labs** is a registered sole proprietorship and the main brand behind a growing digital
ecosystem. The public domain is:

```txt
kenarhinlabs.com
```

The project should not be treated as a simple portfolio website. The agreed direction is to build
Ken Arhin Labs as a **global-facing AI-native digital systems lab** that builds, documents,
recommends, and manages modern digital systems.

Recommended positioning:

> Ken Arhin Labs designs, builds, and documents AI-ready digital systems for brands, startups,
> creators, and modern businesses.

Alternative short positioning:

> We build digital ecosystems, not just websites.

## 2. Strategic direction

The site should become a living platform, not a static brochure.

It should combine:

- Public brand site
- Portfolio/case studies
- Content/media engine
- Tool-stack directory
- Offers/deals directory
- Labs/experiments section
- Services/productized offers
- Admin/business operating system
- Future client portal
- Future product ecosystem

The site should be built with the **final target architecture from day one**, while features are
delivered in phases. The goal is to avoid choosing a throwaway stack that must be migrated later.

## 3. Audience strategy

Ken Arhin Labs should be global-facing, but it can use local proof as credibility.

Agreed direction:

> Build globally, prove locally.

This means the brand can target global customers, while case studies and early traction can come
from Ghana/Africa-based work.

The site should not market to only one narrow audience. Instead, it should organize by **problems
and needs**:

- I need a website
- I need hosting/domain/email setup
- I need an AI agent or automation
- I need a storefront or marketplace
- I need help choosing my digital tool stack
- I need a web/mobile app MVP
- I need a digital system for my business

## 4. Existing proof/projects to reference

Ken Arhin Labs has already built or contributed to ecosystem-style projects, including:

- `menelygroup.com`
- `233digital.com`
- `agents.233digital.com`
- `233shops`
- DailyVrs, a planned React Native project

These should be presented as **case studies** or **labs/projects**, not only as portfolio
screenshots.

Each case study should explain:

- Background
- Problem
- Solution
- Stack
- Features built
- Business/system outcome
- Screenshots/media
- What Ken Arhin Labs handled

## 5. Main product concept

Ken Arhin Labs should not be only a blog, portfolio, domain store, or deals directory.

The agreed concept is:

> A digital stack and AI systems lab where people can discover tools, read guides, study real
> builds, request implementation, and eventually use products built by Ken Arhin Labs.

Key public sections:

1. **Home** — brand positioning and main conversion paths
2. **Services** — productized offers and custom project paths
3. **Work / Case Studies** — proof of digital ecosystems built
4. **Stacks** — recommended tool stacks, comparisons, and offers
5. **Field Notes / Journal / Insights** — blog/content engine
6. **Labs** — experiments, AI agents, MCP-related work, app/product updates
7. **Start a Project** — lead capture and project request flow
8. **Contact** — contact options and inquiry routing

## 6. Blog/content decision

A blog/content section should exist, but it should not be built primarily for AdSense.

Agreed purpose:

- Build authority
- Support SEO/AEO and AI discovery
- Document what Ken Arhin Labs builds
- Feed the services pipeline
- Support affiliate/tool-stack monetization
- Build trust through practical guides and case studies
- Create content that can later support ads, sponsorships, and products

Recommended name options:

- Field Notes
- Journal
- Insights
- Lab Notes

Content types:

- Field notes
- Stack guides
- Tool reviews
- Case studies
- Labs/experiments
- Service/product pages
- Product updates

AdSense can be added later, but the primary monetization should be services, productized packages,
affiliate/tool-stack recommendations, templates, and eventually products.

## 7. Admin/business OS decision

The admin site is not just for content. It should become the operating system for Ken Arhin Labs.

Admin domain:

```txt
admin.kenarhinlabs.com
```

The admin should eventually manage:

- Clients
- Leads
- Projects
- Services/offers
- Blog posts
- Field notes
- Stack guides
- Case studies
- Tool listings
- Deals/offers
- Emails
- Files/media
- Internal notes
- Analytics snapshots
- Product updates
- Future invoices/payments
- Future client portal data

The public website should read and display content published from the admin.

Publishing flow:

```txt
Admin editor
  -> Hono API
  -> Supabase Postgres source of truth
  -> Cloudflare Queue/Workflow sync
  -> D1 public read model
  -> Astro public site renders published content
```

## 8. Content publishing model

The admin should be able to write and publish blog posts, case studies, stack guides, tool pages,
and lab notes.

Recommended storage strategy:

- Content source of truth: Supabase Postgres
- Public read/cached content: Cloudflare D1
- Images and files: Cloudflare R2
- Content body format: Markdown or structured JSON blocks
- Rich editor: Plate editor or a similar React editor

Avoid unrestricted user/admin-written MDX execution from the CMS. If rich components are needed
inside articles, use a controlled allowlist such as:

```txt
<Callout />
<ToolCard />
<StackComparison />
<ProjectGallery />
<PricingTable />
```

Suggested content types:

```txt
post
case_study
stack_guide
lab_note
tool_page
offer_page
service_page
landing_page
product_update
```

Suggested content status values:

```txt
draft
review
published
archived
```

## 9. PWA decision

Both the public site and admin app should support Progressive Web App features from day one.

Public PWA goals:

- Installable Ken Arhin Labs site
- Offline fallback page
- Cached homepage shell
- Cached recent articles/guides
- Cached icons, fonts, and core assets
- Update prompt when new content/assets are available

Admin PWA goals:

- Installable admin dashboard
- Cached app shell
- Fast repeat visits
- Offline draft autosave
- Retry failed publish/save actions where safe
- Update prompt

Admin PWA caution:

Do not blindly cache sensitive private data such as full client records, email contents, private
notes, or auth/session responses.

## 10. Database decision

Agreed database approach:

```txt
Supabase Postgres = source of truth
Cloudflare D1 = public/edge read model and cache layer
Cloudflare R2 = files/media/assets
```

Why this model:

- Supabase is familiar and provides a full backend platform.
- Supabase Postgres avoids future migration pain compared with making D1 the only database.
- D1 can reduce frequent public reads against Supabase.
- D1 should not become a second uncontrolled source of truth.
- R2 should handle files to reduce database/storage/bandwidth pressure.

Rule:

> Important business data is written to Supabase first. D1 receives public, non-sensitive,
> read-optimized copies.

## 11. Email decision

Supabase Auth email flows exist, but Supabase's default email sender is not production-ready.
Production auth emails should use a custom SMTP provider.

Agreed email direction:

- Use Supabase Auth for identity/auth.
- Configure Supabase Auth custom SMTP using Cloudflare Email Service if deliverability and limits
  are acceptable.
- Use Cloudflare Email Service from Hono/Workers for transactional business emails.
- Keep a future fallback option such as Resend, Postmark, Brevo, or AWS SES if Cloudflare Email
  Service limits/deliverability become a problem.

Auth-related email examples:

- Signup confirmation
- Password reset
- Magic link / OTP
- Email change
- User invite
- Reauthentication/security messages

Business email examples:

- Contact form confirmations
- Project inquiry notifications
- Client updates
- Internal admin alerts
- Blog/content workflow notifications

## 12. Intended monorepo structure

The project should use a pnpm workspace monorepo.

Important root folders:

- `apps/` — deployable applications
- `packages/` — shared internal packages
- `packages/core/` — core shared domain logic and utilities
- `docs/` — project documentation, planning files, task files, and architecture notes

Recommended structure:

```txt
ken-arhin-labs/
├── apps/
│   ├── web/                         # Astro public site: kenarhinlabs.com
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── common/
│   │   │   │   ├── marketing/
│   │   │   │   ├── content/
│   │   │   │   ├── stacks/
│   │   │   │   ├── labs/
│   │   │   │   └── ui/              # public-site UI wrappers/components
│   │   │   ├── layouts/
│   │   │   ├── pages/
│   │   │   │   ├── index.astro
│   │   │   │   ├── services/
│   │   │   │   ├── work/
│   │   │   │   ├── stacks/
│   │   │   │   ├── field-notes/
│   │   │   │   ├── labs/
│   │   │   │   ├── start/
│   │   │   │   └── contact.astro
│   │   │   ├── lib/
│   │   │   │   ├── api.ts           # calls Hono API
│   │   │   │   ├── seo.ts
│   │   │   │   ├── pwa.ts
│   │   │   │   └── r2.ts
│   │   │   ├── styles/
│   │   │   └── content/             # optional seed/static content only
│   │   ├── public/
│   │   │   ├── icons/
│   │   │   └── offline.html
│   │   ├── astro.config.ts
│   │   ├── wrangler.jsonc
│   │   └── package.json
│   │
│   ├── admin/                       # TanStack Start admin app: admin.kenarhinlabs.com
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── __root.tsx
│   │   │   │   ├── index.tsx
│   │   │   │   ├── login.tsx
│   │   │   │   ├── dashboard.tsx
│   │   │   │   ├── clients/
│   │   │   │   ├── projects/
│   │   │   │   ├── leads/
│   │   │   │   ├── content/
│   │   │   │   ├── case-studies/
│   │   │   │   ├── stack-guides/
│   │   │   │   ├── tools/
│   │   │   │   ├── offers/
│   │   │   │   ├── emails/
│   │   │   │   ├── media/
│   │   │   │   └── settings/
│   │   │   ├── components/
│   │   │   │   ├── app-shell/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── forms/
│   │   │   │   ├── tables/
│   │   │   │   ├── editor/
│   │   │   │   └── ui/              # shadcn/ui components
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   │   ├── api.ts           # calls Hono API
│   │   │   │   ├── auth.ts          # Supabase Auth client helpers
│   │   │   │   ├── query.ts         # TanStack Query client
│   │   │   │   ├── pwa.ts
│   │   │   │   └── permissions.ts
│   │   │   ├── styles/
│   │   │   └── main.tsx
│   │   ├── public/
│   │   │   ├── icons/
│   │   │   └── offline.html
│   │   ├── app.config.ts
│   │   ├── vite.config.ts
│   │   ├── wrangler.jsonc
│   │   └── package.json
│   │
│   └── api/                         # Hono API on Cloudflare Workers
│       ├── src/
│       │   ├── index.ts
│       │   ├── env.ts
│       │   ├── middleware/
│       │   │   ├── auth.ts
│       │   │   ├── cors.ts
│       │   │   ├── rate-limit.ts
│       │   │   └── error-handler.ts
│       │   ├── routes/
│       │   │   ├── health.ts
│       │   │   ├── auth.ts
│       │   │   ├── clients.ts
│       │   │   ├── projects.ts
│       │   │   ├── leads.ts
│       │   │   ├── content.ts
│       │   │   ├── case-studies.ts
│       │   │   ├── stack-guides.ts
│       │   │   ├── tools.ts
│       │   │   ├── offers.ts
│       │   │   ├── media.ts
│       │   │   ├── emails.ts
│       │   │   └── webhooks.ts
│       │   ├── services/
│       │   │   ├── supabase.ts
│       │   │   ├── d1-sync.ts
│       │   │   ├── r2.ts
│       │   │   ├── email.ts
│       │   │   ├── content-publisher.ts
│       │   │   └── audit-log.ts
│       │   └── queues/
│       │       ├── content-sync.ts
│       │       ├── email-jobs.ts
│       │       └── media-processing.ts
│       ├── wrangler.jsonc
│       └── package.json
│
├── packages/
│   ├── core/                        # Shared core domain package
│   │   ├── src/
│   │   │   ├── constants/
│   │   │   ├── types/
│   │   │   ├── schemas/             # shared Zod schemas
│   │   │   ├── permissions/
│   │   │   ├── content/
│   │   │   ├── clients/
│   │   │   ├── projects/
│   │   │   ├── offers/
│   │   │   ├── utils/
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── auth/                        # Supabase JWT verification and RBAC helpers
│   │   ├── src/
│   │   └── package.json
│   │
│   ├── validators/                  # Shared backend request/response Zod schemas
│   │   ├── src/
│   │   └── package.json
│   │
│   ├── design/                          # Shared design primitives if needed
│   │   ├── src/
│   │   └── package.json
│   │
│   ├── config/                      # Shared TypeScript, ESLint, Prettier config
│   │   ├── eslint/
│   │   ├── prettier/
│   │   ├── tailwind/
│   │   └── tsconfig/
│   │
│   ├── email/                       # Shared email templates/components
│   │   ├── src/
│   │   │   ├── templates/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── storage/                     # Typed R2 helpers and media job contracts
│   │   ├── src/
│   │   └── package.json
│   │
│   ├── sync/                        # Transactional outbox to D1 projection logic
│   │   ├── src/
│   │   └── package.json
│   │
│   └── db/                          # Drizzle schemas, clients, D1 migrations, database validation
│       ├── src/
│       │   ├── schema/
│       │   ├── d1-schema/
│       │   ├── client/
│       │   ├── queries/
│       │   └── index.ts
│       ├── d1/migrations/
│       ├── scripts/
│       └── package.json
│
├── supabase/                        # Canonical Postgres migrations, seed, config, and SQL tests
│   ├── migrations/
│   ├── tests/database/
│   ├── config.toml
│   └── seed.sql
│
├── docs/                            # Project docs and planning files
│   ├── context.md                   # This file
│   ├── tech-stack.md                # Stack decisions and architecture
│   ├── backend-architecture.md
│   ├── database-schema.md
│   ├── backend-platform-provisioning.md
    ├── pwa/
│   ├── tasks/
│   │   ├── backend/
│   │   │   ├── backend.md           # Overall backend program and verification gates
│   │   │   ├── 01-monorepo-foundation.md
│   │   │   ├── 02-full-database.md
│   │   │   ├── 03-api-runtime.md
│   │   │   └── 04-platform-and-docs.md
│   │   └── README.md                # Discipline/task-folder conventions
│   ├── architecture/
│   │   ├── data-flow.md
│   │   ├── auth.md
│   │   ├── content-publishing.md
│   │   ├── supabase-d1-sync.md
│   │   └── email.md
│   ├── product/
│   │   ├── services.md
│   │   ├── content-types.md
│   │   ├── monetization.md
│   │   └── admin-modules.md
│   └── decisions/
│       ├── 001-astro-public-site.md
│       ├── 002-tanstack-start-admin.md
│       ├── 003-supabase-source-of-truth.md
│       ├── 004-d1-read-model.md
│       └── 005-cloudflare-email.md
│
├── tooling/
│   ├── scripts/
│   └── generators/
│
├── package.json
├── pnpm-workspace.yaml
├── eslint.config.mjs
├── prettier.config.mjs
├── .gitignore
└── README.md
```

## 13. Suggested top-level public routes

```txt
/
/services
/services/website-launch
/services/ai-business-setup
/services/hosting-rescue
/services/mvp-build
/work
/work/[slug]
/stacks
/stacks/[slug]
/tools
/tools/[slug]
/offers
/field-notes
/field-notes/[slug]
/labs
/labs/[slug]
/start
/contact
/legal/privacy
/legal/terms
/offline
```

## 14. Suggested admin modules/routes

```txt
/login
/dashboard
/clients
/clients/[id]
/leads
/projects
/projects/[id]
/content
/content/new
/content/[id]
/case-studies
/stack-guides
/tools
/offers
/media
/emails
/settings
/settings/team
/settings/roles
/settings/integrations
```

## 15. Monetization model

Priority order:

1. Client services
2. Productized packages
3. Affiliate/tool-stack recommendations
4. Templates/downloadables
5. Sponsorships and featured listings
6. AdSense/display ads later
7. Own products/SaaS later

The blog/content engine should support monetization, but not depend entirely on AdSense.

## 16. Non-goals for now

These are not part of the current build docs unless a later task says otherwise:

- Building MCP servers
- Building DailyVrs itself
- Building full SaaS products under Ken Arhin Labs
- Building a complete client portal from day one
- Using Supabase Edge Functions as the main backend runtime
- Making D1 the only primary database
- Treating the site as a simple personal portfolio

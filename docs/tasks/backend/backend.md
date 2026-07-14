# Backend Implementation Plan

_Created: 2026-07-10_

## Purpose

This is the authoritative implementation plan for the Ken Arhin Labs backend. It converts
`docs/context.md`, `docs/tech-stack.md`, `docs/backend-architecture.md`, and
`docs/database-schema.md` into independently owned work lanes with explicit evidence and progress
logs.

The target is the long-term backend architecture, not an MVP-only subset. Frontend features and
frontend application code are out of scope.

## Planning decisions

- `docs/tasks/` is organized by discipline. Backend work lives in `docs/tasks/backend/`, with one
  overall plan and one append-only task log per lane. Future frontend, product, operations, or
  content programs should use their own sibling folders instead of sharing a flat numbered task
  list.
- Supabase Postgres remains the canonical source of truth. D1 stores only public, non-sensitive read
  projections.
- Cloudflare Workers and Hono remain the API runtime. Hyperdrive is the production database
  connection path.
- The root workspace uses pnpm v11 without Turborepo. Root scripts use pnpm workspace filtering and
  recursive execution directly.
- Each lane must research current official documentation before implementation, record material
  decisions and sources in its task file, and log verification results before claiming completion.
- Supabase CLI commands are prohibited. Supabase interactions use repository SQL/Drizzle artifacts
  plus the Supabase MCP server; Cloudflare account interactions use the Cloudflare API MCP server.
- No lane may edit `apps/web/` or `apps/admin/` application code. Shared root configuration may
  include those workspaces without changing their frontend behavior.

## Lane ownership

| Lane                                              | Owner          | Files owned                                                                                                                                                                        | Task log                    |
| ------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| 01 — Monorepo foundation                          | Primary agent  | Root workspace/configuration files, shared config package, CI, root README integration review                                                                                      | `01-monorepo-foundation.md` |
| 02 — Full database                                | Database agent | `packages/db/**`, `supabase/**` if selected, database migrations, seeds, generated/type-safe schema exports                                                                        | `02-full-database.md`       |
| 03 — API and domain runtime                       | API agent      | `apps/api/**`, `packages/auth/**`, `packages/validators/**`, backend-safe additions under `packages/core/**`                                                                       | `03-api-runtime.md`         |
| 04 — Cloudflare backend services and project docs | Platform agent | `packages/storage/**`, `packages/email/**`, `packages/sync/**`, backend-only Worker resources outside frontend apps, `README.md`, backend-related corrections to `docs/context.md` | `04-platform-and-docs.md`   |

When a required file falls outside a lane's ownership, the owner records the need in its task log
and asks the primary agent to integrate it. Agents do not overwrite one another's files.

## Phase 0 — Evidence and documentation

- [x] Read the four authoritative project documents.
- [x] Inspect the current clean worktree, workspace manifests, app scaffolds, and root README.
- [x] Identify the stale flat task-tree proposal and adopt discipline-specific task folders.
- [x] Record current official documentation for pnpm v11, Supabase database/RLS/migrations, Drizzle,
      Hono, and relevant Cloudflare products in the owning lane logs.
- [x] Inspect the connected Supabase project before any remote mutation. Repository migrations are
      the default deliverable; remote application requires separate evidence and safe project
      targeting.

## Phase 1 — Monorepo foundation

- [x] Enforce one root pnpm v11 workspace and remove accidental nested workspace/lockfile
      boundaries.
- [x] Normalize workspace package names to the `@labs/*` scope and align package metadata.
- [x] Add root scripts for build, test, lint, typecheck, format, clean-safe validation, workspace
      listing, and backend-specific checks without Turborepo.
- [x] Add shared TypeScript and ESLint configuration suitable for Workers and reusable packages.
- [x] Align Node/pnpm version declarations and package-manager enforcement.
- [x] Centralize safe dependency versions through pnpm catalogs where useful, while preserving
      framework-specific constraints.
- [x] Add CI that installs with a frozen lockfile and runs repository checks.
- [x] Ensure generated files, local secrets, Wrangler state, and Supabase local state are ignored
      appropriately.

## Phase 2 — Complete canonical database

- [x] Implement every namespace and table in `docs/database-schema.md`: `app`, `content`, `crm`,
      `commerce`, `media`, `comms`, `sync`, `audit`, `analytics`, and `system`.
- [x] Implement UUID/default/timestamp conventions, foreign keys, checks, partial uniqueness, search
      indexes, updated-at behavior, and deletion rules.
- [x] Implement role/permission seed data and other deterministic reference data.
- [x] Implement explicit grants and RLS policies appropriate to service, authenticated, and
      anonymous access. Public access must be narrowly scoped.
- [x] Implement auth-user profile lifecycle support without weakening the `auth` schema.
- [x] Implement the transactional outbox required for reliable D1 projection and background
      processing.
- [x] Implement Drizzle schema/config/runtime clients for local migrations and Workers through
      Hyperdrive.
- [x] Implement and validate the D1 public read-model schema separately from canonical Postgres
      migrations.
- [x] Add database tests or repeatable validation covering migrations, constraints, policies, and
      representative access paths.

## Phase 3 — API and domain foundation

- [x] Build the modular Hono application structure defined in `docs/backend-architecture.md`.
- [x] Add typed environment handling, request IDs, structured errors/logging, CORS, security
      headers, body limits, and rate-limit integration points.
- [x] Add Supabase JWT verification and database-backed RBAC authorization helpers.
- [x] Add health/readiness endpoints that distinguish Worker health from dependency readiness.
- [x] Implement public route contracts for navigation, published content, tools/offers, leads, and
      contact intake.
- [x] Implement admin route foundations for content, CRM, commerce, media, communications, and
      dashboard data with permission enforcement.
- [x] Add verified webhook boundaries and idempotency support.
- [x] Add shared Zod validators and framework-independent domain rules.
- [x] Add unit/integration tests for middleware, authorization, validation, and representative
      routes.

## Phase 4 — Cloudflare backend services

- [x] Configure Hyperdrive, D1, R2, Queues, Workflows, Email Service, and observability bindings
      using non-secret placeholders and environment conventions.
- [x] Implement typed storage helpers and safe upload/fetch metadata flows.
- [x] Implement transactional email abstractions and templates without hardcoding credentials.
- [ ] Implement Supabase-to-D1 projection processing from the transactional outbox, including
      retries and idempotency.
- [x] Implement queue/workflow handlers for content projection, email delivery, and media processing
      foundations.
- [x] Document local, preview, and production resource provisioning without deploying or mutating
      cloud resources implicitly.
- [x] Generate Worker binding types and validate Wrangler configuration.

## Phase 5 — Documentation and handoff

- [x] Replace the stale root README with project purpose, architecture, actual repository layout,
      prerequisites, setup, environment conventions, commands, database workflow, backend
      development workflow, testing, deployment boundaries, and contribution guidance.
- [x] Update the task-layout portion of `docs/context.md` to the discipline-specific structure and
      remove the optional Turborepo implication.
- [x] Ensure every lane log lists files changed, decisions, documentation consulted, commands run,
      results, remaining work, and blockers.
- [x] Reconcile architecture docs with actual code where implementation exposes contradictions.

## Verification gates

The backend program is complete only when all applicable gates pass from the repository root:

1. A frozen `pnpm install` succeeds from the single root lockfile.
2. Workspace discovery returns every intended app/package and no nested workspace boundary remains.
3. Formatting, linting, typechecking, tests, and builds pass for backend-owned code.
4. Drizzle schema generation/checks and SQL migration validation pass.
5. A clean database can apply the full Postgres migration chain and seed data.
6. RLS/grant tests prove public, authenticated, admin, and service access boundaries.
7. D1 migrations apply to a disposable local database and representative projection queries pass.
8. Wrangler type generation and dry-run validation pass for backend Workers.
9. No secrets, production identifiers, or accidental frontend changes are introduced.
10. The final requirement audit maps every requested deliverable to current file or command
    evidence.

## Program log

### 2026-07-10 — Planning baseline

- Worktree was clean at audit time.
- `docs/tasks/backend/` did not exist, so this plan and the four lane logs were created before
  implementation.
- Existing app scaffolds are present, contradicting the root README's claim that they have not been
  created.
- `apps/web/` contains its own `pnpm-workspace.yaml` and `pnpm-lock.yaml`; these are candidates for
  removal after pnpm v11 documentation verification because the repository is intended to have one
  workspace root.
- Context7 was invoked for pnpm v11 as required. The first invocation was rejected because npm
  honored the repository's pnpm-only `devEngines`; subsequent out-of-workspace invocations returned
  no documentation payload. The monorepo lane must therefore record direct official pnpm
  documentation evidence before changing settings.

### 2026-07-11 — MCP safety audit

- Supabase MCP is connected, but its table comments and migration history identify the target as
  DailyVrs rather than Ken Arhin Labs. Remote database migrations are therefore blocked for safety;
  no mutation was attempted.
- Cloudflare API MCP read-only inventory found no existing `kenarhinlabs-*` backend resources.
- Remote provisioning remains separate from repository completion and must use the correct Supabase
  MCP project plus Cloudflare API MCP after local verification.

### 2026-07-11 — Correct-project deployment and final audit

- The user reconnected Supabase. The target was verified as
  `https://mbscfzccmomwqdybnlbq.supabase.co`, after which six reviewed repository migrations were
  applied using Supabase MCP only.
- The live database contains 37 application tables with RLS on all 37, 139 policies, 106 indexes,
  four seeded roles, 22 permissions, and three feature flags. The security advisor reports zero
  findings. Missing foreign-key indexes and overlapping permissive policies were remediated; only
  expected unused-index informational notices remain on the empty database.
- The Cloudflare API MCP inventory confirmed no existing Ken Arhin Labs resources. No partial
  resource graph was created because Hyperdrive credentials, Email configuration, and the final
  outbox projection adapter remain deployment inputs.
- Frozen installation, the combined `pnpm check` gate, database validation, Wrangler type
  generation/dry-run, and `git diff --check` all pass.
- The end-to-end D1 projection adapter and identity-backed RLS integration tests remain explicitly
  open; repository foundations are not misreported as a live production deployment.

### 2026-07-11 — Cloudflare provisioning and API-key modernization

- With explicit user authorization, created production D1, R2, three primary Queues, and three
  dead-letter Queues through the Cloudflare API MCP. Applied the tracked D1 read-model migration and
  verified the remote schema in WEUR.
- Verified Email Sending is already active for `kenarhinlabs.com` and retained the restricted Worker
  send binding.
- Replaced the D1 sentinel UUID in Wrangler with the live database UUID. At this checkpoint,
  Hyperdrive was the only missing data binding because its Supabase direct database password was
  unavailable.
- Updated configuration guidance from legacy JWT-based `anon`/`service_role` API keys to modern,
  separately rotatable `sb_publishable_...` and `sb_secret_...` keys. SQL grants and RLS continue to
  use the correctly named built-in Postgres roles.

### 2026-07-11 — Production API deployment

- Bound the user-created `kenarhinlabs-supabase` Hyperdrive configuration, added production runtime
  variables, and installed three independently generated encrypted webhook secrets.
- Deployed `kenarhinlabs-api` to `https://api.kenarhinlabs.com`. Cloudflare registered the Workflow,
  Queue producers/consumers, dead-letter queues, Hyperdrive, D1, R2, Email, rate limits, logs, and
  traces from the reviewed Wrangler configuration.
- Verified HTTP 200 liveness and readiness. The readiness response proves Supabase Auth,
  Hyperdrive/Postgres, and rate-limit bindings are operational.
- Verified CORS allows `https://kenarhinlabs.com` while omitting an allow-origin header for
  `https://api.kenarhinlabs.com`, which is the API destination rather than a browser application.

### 2026-07-13 — Contact intake implementation and runtime completeness audit

- Expanded the durable Contact implementation into four canonical channels: General (`hello@`),
  Projects (`projects@`), Support (`support@`), and Privacy (`privacy@`). `contact@` is an inbound
  General alias and `no-reply@` remains outbound-only.
- Added `/public/inquiries`, `/public/project-intake`, and `/public/support`; retained the deployed
  `/public/contact` contract as deprecated Projects intake. Only Projects creates a CRM lead.
- Implemented the inbound Email Routing handler, signed plus-address thread tokens, participant-
  constrained RFC matching, MIME parsing, duplicate safety, and private R2 attachment cleanup.
- Implemented permission-gated thread list/detail/reply/update/attachment admin APIs. Sender and
  recipient identities are derived from the stored thread, and reply/status changes are audited.
- Applied `add_unified_email_inbox` and `add_email_message_actor_index` through Supabase MCP to the
  verified project. The post-apply security advisor reports no findings.
- Created and bound `kenarhinlabs-email-attachments`, installed the non-retrievable reply-token
  secret, enabled subaddressing, and routed `hello@`, `contact@`, `projects@`, `support@`, and
  `privacy@` to the API Worker while preserving the existing `admin@` forwarding rule and disabled
  catch-all.
- Deployed Worker version `ea569614-133b-46ef-9440-57843bf5bbd1`; live health and readiness both
  returned HTTP 200 after deployment.
- All backend workspaces typecheck and all backend suites pass. Targeted backend lint passes; the
  broad command still reports the unrelated pre-existing PWA example `console.log` warning.
- Communications is deployed, but the overall backend is not fully built. Unrelated admin domain
  adapters, homepage/tools reads, generic webhook/idempotency persistence, media processing, and
  public projection work remain incomplete or fail-closed.

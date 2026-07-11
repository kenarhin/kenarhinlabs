# Lane 04 — Cloudflare Backend Services and Project Docs

## Owner and scope

Owner: platform/documentation agent.

Owned scope: backend Cloudflare integration packages (`packages/storage/**`, `packages/email/**`,
and `packages/sync/**`), backend-only Worker resources outside frontend apps, root `README.md`, and
backend/task-layout corrections to `docs/context.md`.

Do not edit `apps/web/**` or `apps/admin/**`.

## Required research before implementation

- Current Cloudflare documentation for R2, D1, Queues, Workflows, Hyperdrive, Email Service, service
  bindings, secrets, Wrangler configuration, and observability.
- Supabase documentation MCP for transactional outbox and database integration details where
  relevant.
- Current official guidance for repository README structure and developer onboarding; prefer primary
  platform/vendor sources.

Record source URLs and material conclusions below before implementation.

## Checklist

- [x] Design non-secret environment and binding conventions.
- [x] Implement typed R2 storage helpers.
- [x] Implement email abstractions/templates and queue-safe payloads.
- [ ] Implement idempotent Supabase-to-D1 projection processing.
- [x] Implement queue/workflow backend foundations where repository ownership allows.
- [x] Add tests for storage, email, and projection logic.
- [x] Replace the stale root README with an accurate onboarding and architecture guide.
- [x] Correct the task-tree proposal in `docs/context.md` and remove Turborepo implications.
- [x] Record all commands and verification results.

The projection item remains open deliberately. `@labs/sync` implements the D1 writer, projector
registry, Queue consumer, Workflow step, and tests, but the current canonical outbox schema and API
runtime do not yet provide its required source adapter and versioned public-event contract. Package
foundations are not equivalent to an end-to-end publishing path.

## Progress log

### 2026-07-10 — Assigned

- Lane created before implementation.

### 2026-07-11 — Recovered implementation and audit

- Recovered the storage, email, sync, README, and provisioning work written before the previous
  agent reached its usage limit; no surviving work was discarded.
- Read `AGENTS.md`, all four authoritative project documents, the overall backend plan, and this
  lane file completely before changing recovered files.
- Audited current Cloudflare documentation through the Cloudflare API MCP and official web pages,
  and searched current Supabase documentation through Supabase MCP. No remote resource was mutated.
- Hardened conditional/ranged R2 responses and delete limits against the current R2 contract.
- Hardened email queue parsing so malformed template variables and recipient lists above Email
  Service's 50-recipient limit are rejected before provider delivery.
- Added the missing task-folder convention document and reconciled the context database tree with
  the actual root `supabase/` plus `packages/db/` layout.
- Applied the user's hard rule: do not use the Supabase CLI. Supabase inspection and mutation must
  use MCP after verifying that its project URL belongs to Ken Arhin Labs.
- Kept frontend application code, root configuration, the lockfile, API files, and database files
  untouched.

### 2026-07-11 — Primary-agent integration

- The user reconnected the intended Supabase project. The primary agent verified its URL and applied
  the complete database migration chain through MCP.
- Added the monotonic outbox `sync_version` in both SQL and Drizzle, integrated D1/R2/Email/Queue/
  Workflow bindings into the API Worker, regenerated binding types, and passed the Wrangler dry-run.
- The Cloudflare API MCP inventory still shows no live `kenarhinlabs-*` resources. No partial remote
  resource set was created because Hyperdrive credentials and the final projection source adapter
  are not ready.

### 2026-07-11 — Authorized Cloudflare provisioning

- After explicit user authorization, created the production D1 database, private R2 media bucket,
  three primary Queues, and three dead-letter Queues through the Cloudflare API MCP.
- Applied and verified the D1 public-read-model migration remotely. Wrangler now contains the real
  D1 UUID instead of the provisioning sentinel.
- Verified Cloudflare Email Sending was already enabled for `kenarhinlabs.com`; no duplicate domain
  onboarding or email test was performed.
- Attempted to create the Workflow resource directly, but Cloudflare requires the owning Worker
  script/version. It will be created with the first deployment after Hyperdrive is configured.
- Confirmed Hyperdrive cannot be created from the Supabase MCP project URL or publishable key. It
  requires the direct Postgres password, which is not present in the environment or `.dev.vars`.
- Reviewed Supabase's current API-key documentation. Project configuration now uses
  `SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY`; SQL retains the built-in `anon`,
  `authenticated`, and `service_role` Postgres roles as required.

### 2026-07-11 — Hyperdrive integration and API deployment

- Retrieved the user-created `kenarhinlabs-supabase` Hyperdrive configuration through the Cloudflare
  API MCP and replaced the final Wrangler sentinel with its live ID.
- Added production-safe runtime variables and declared the three webhook secrets as required.
  Generated independent random secrets and stored them only as encrypted Worker secrets.
- Deployed `kenarhinlabs-api` and attached `api.kenarhinlabs.com` as a Custom Domain. The API's own
  hostname was correctly not added as a CORS caller origin; production CORS accepts the public and
  admin application origins.
- Cloudflare created the `kenarhinlabs-sync` Workflow version and registered all three Queue
  consumers with their configured batch, retry, and dead-letter settings.
- Live `/health` and `/ready` requests returned HTTP 200. Readiness confirmed Supabase Auth,
  Hyperdrive/Postgres, and both rate-limit bindings.
- Resolved the D1 Wrangler editor diagnostics by using the version-pinned SchemaStore URL and a
  targeted Prettier override that preserves strict JSONC without trailing commas.

## Documentation and decisions

### Current official sources

- Cloudflare Workers best practices:
  <https://developers.cloudflare.com/workers/best-practices/workers-best-practices/>
- Wrangler configuration and non-inheritable environment keys:
  <https://developers.cloudflare.com/workers/wrangler/configuration/>
- Workers TypeScript/binding generation:
  <https://developers.cloudflare.com/workers/languages/typescript/>
- R2 Workers API reference:
  <https://developers.cloudflare.com/r2/api/workers/workers-api-reference/>
- D1 `batch()` transaction behavior: <https://developers.cloudflare.com/d1/worker-api/d1-database/>
- Queues JavaScript acknowledgement/retry APIs:
  <https://developers.cloudflare.com/queues/configuration/javascript-apis/>
- Queue consumer configuration:
  <https://developers.cloudflare.com/workers/wrangler/configuration/#queues>
- Workflows Workers API: <https://developers.cloudflare.com/workflows/build/workers-api/>
- Email Service Workers API and error codes:
  <https://developers.cloudflare.com/email-service/api/send-emails/workers-api/>
- Email send-binding restrictions:
  <https://developers.cloudflare.com/email-service/configuration/send-bindings/>
- Hyperdrive with Supabase:
  <https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-database-providers/supabase/>
- Workers observability: <https://developers.cloudflare.com/workers/observability/>
- Supabase secure database access: <https://supabase.com/docs/guides/database/secure-data>
- Supabase API keys: <https://supabase.com/docs/guides/getting-started/api-keys>
- Supabase API-key migration:
  <https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys>
- Supabase Postgres connection modes:
  <https://supabase.com/docs/guides/database/connecting-to-postgres>
- Supabase database webhooks: <https://supabase.com/docs/guides/database/webhooks>
- GitHub repository README guidance:
  <https://docs.github.com/en/repositories/creating-and-managing-repositories/best-practices-for-repositories>
- GitHub project/onboarding communication guidance:
  <https://docs.github.com/en/issues/tracking-your-work-with-issues/learning-about-issues/planning-and-tracking-work-for-your-team-or-project>

Context7 resolution for Cloudflare Workers was attempted from `/tmp` as required by repository
instructions, but it returned no documentation payload. The audit therefore used the official
Cloudflare docs MCP plus Cloudflare's current first-party pages instead of relying on model memory.

### Material conclusions

- Use generated Worker bindings and direct platform bindings instead of REST calls inside Workers.
  Keep the compatibility date current, enable `nodejs_compat`, and configure logs/traces before
  deployment.
- R2 `get()` returns metadata without a body when a precondition fails; this is not proof of a 304
  response. The storage contract names it `precondition-failed`, and the HTTP example returns 412.
- R2 object bodies remain streams. Ranged responses now include a correct `Content-Range`, and one
  native delete call is limited to 1-1,000 keys.
- Queue delivery is handled per message with explicit `ack()`/`retry()` and capped exponential retry
  delays. Poison structural payloads are acknowledged after safe rejection so they do not consume
  every retry.
- D1 `batch()` executes prepared statements sequentially as one transaction and rolls back the full
  sequence on failure. Projection mutations and their receipt therefore share one atomic boundary.
- Email uses the structured `SendEmail.send()` binding, always renders text plus HTML, contains no
  provider credential, and classifies only documented transient provider codes for retry.
- `vars` and resource bindings are non-inheritable across Wrangler environments; preview and
  production must repeat their full declarations and use physically separate resources.
- Supabase is canonical, D1 is rebuildable/public only, and Hyperdrive must point to Supabase's
  direct Postgres endpoint rather than stacking Hyperdrive on Supavisor.
- Supabase CLI use is prohibited. Before any MCP query or migration, retrieve and verify the MCP
  project URL; a different or ambiguous project is a hard stop.
- The root README is an onboarding document rather than a volatile status report. It now explains
  project purpose, architecture, actual layout, setup, commands, security boundaries, and where
  detailed operational documentation lives.

## Files changed

- `packages/storage/package.json`
- `packages/storage/tsconfig.json`
- `packages/storage/README.md`
- `packages/storage/src/index.ts`
- `packages/storage/src/keys.ts`
- `packages/storage/src/media-jobs.ts`
- `packages/storage/src/r2-storage.ts`
- `packages/storage/src/types.ts`
- `packages/storage/test/storage.test.ts`
- `packages/email/package.json`
- `packages/email/tsconfig.json`
- `packages/email/README.md`
- `packages/email/src/cloudflare-transport.ts`
- `packages/email/src/index.ts`
- `packages/email/src/job.ts`
- `packages/email/src/queue-consumer.ts`
- `packages/email/src/templates.ts`
- `packages/email/src/types.ts`
- `packages/email/test/email.test.ts`
- `packages/sync/package.json`
- `packages/sync/tsconfig.json`
- `packages/sync/README.md`
- `packages/sync/src/d1-writer.ts`
- `packages/sync/src/index.ts`
- `packages/sync/src/payload.ts`
- `packages/sync/src/processor.ts`
- `packages/sync/src/projectors.ts`
- `packages/sync/src/queue-consumer.ts`
- `packages/sync/src/registry.ts`
- `packages/sync/src/types.ts`
- `packages/sync/src/workflow.ts`
- `packages/sync/test/sync.test.ts`
- `README.md`
- `docs/context.md`
- `docs/tech-stack.md`
- `docs/backend-platform-provisioning.md`
- `docs/tasks/README.md`
- `docs/tasks/backend/04-platform-and-docs.md`

## Verification evidence

Commands were run from the repository root on 2026-07-11 unless noted otherwise.

| Command                                                                           | Result                                                                                         |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `pnpm --filter @labs/storage typecheck`                                           | Passed                                                                                         |
| `pnpm --filter @labs/storage test`                                                | Passed: 1 file, 8 tests                                                                        |
| `pnpm --filter @labs/email typecheck`                                             | Passed                                                                                         |
| `pnpm --filter @labs/email test`                                                  | Passed: 1 file, 6 tests                                                                        |
| `pnpm --filter @labs/sync typecheck`                                              | Passed                                                                                         |
| `pnpm --filter @labs/sync test`                                                   | Passed: 1 file, 4 tests                                                                        |
| `pnpm exec eslint packages/storage packages/email packages/sync --max-warnings=0` | Passed with zero warnings                                                                      |
| Prettier checks for the owned packages and documentation                          | Passed after formatting the recovered/edited files                                             |
| `git diff --check -- <Lane 04 files>`                                             | Passed                                                                                         |
| `pnpm list:workspaces`                                                            | Passed; found root, 3 apps, and 9 `@labs/*` packages                                           |
| `rg` audit for nested task layout and Turborepo references                        | Correct task tree present; only intentional statements that Turborepo is not used remain       |
| `rg` audit for Supabase CLI instructions                                          | No command/instruction to use it remains; only explicit prohibition statements remain          |
| `pnpm view @cloudflare/workers-types version`                                     | Registry reports `5.20260711.1`; catalog handoff sent because root config is outside this lane |
| `pnpm view vitest version`                                                        | Registry reports `4.1.10`, matching the catalog                                                |
| `pnpm view typescript version`                                                    | Registry reports `7.0.2`; catalog handoff sent because root config is outside this lane        |

No Supabase CLI command, Worker deployment, email send, Queue message, or Workflow instance was
executed. The later authorized provisioning entry supersedes the original read-only Cloudflare
inventory: D1, R2, and Queue resources were created through the API MCP, and the D1 migration was
applied remotely.

## Blockers or handoff notes

1. **The canonical event producer still does not match `@labs/sync`.** The outbox now has monotonic
   ordering, but `sync.enqueue_projection_event()` emits generic nested row-change payloads while
   the projector registry accepts explicit sanitized public events. An application-owned adapter
   must render safe HTML, resolve author/media data, map event names, and implement the
   `OutboxEventSource` lifecycle before the end-to-end projection checkbox can close.
2. **Application adapters remain incomplete.** The live deployment is healthy, but lead/contact
   intake, admin mutations, webhook persistence, email-delivery state, media processing, and the
   outbox source still fail closed until the API persistence ports are implemented.

# Lane 03 — API and Domain Runtime

## Owner and scope

Owner: API agent.

Owned scope: Hono Worker API under `apps/api/**`, backend authentication/RBAC helpers under
`packages/auth/**`, shared request/domain validators under `packages/validators/**`, and
framework-independent backend domain logic under `packages/core/**`.

Do not edit frontend application code.

## Required research before implementation

- Current Hono and relevant library documentation through Context7.
- Current Supabase documentation MCP for JWT verification and Auth token claims.
- Current Cloudflare documentation for Workers request handling, bindings, and production best
  practices.

Record source URLs and material conclusions below before implementation.

## Checklist

- [x] Build the modular Hono app structure and typed environment boundary.
- [x] Implement request, error, logging, CORS, security, and validation middleware.
- [x] Implement Supabase JWT verification and database-backed RBAC foundations.
- [x] Implement health/readiness routes.
- [x] Implement documented public route contracts.
- [x] Implement documented admin route foundations with permissions.
- [x] Implement verified/idempotent webhook boundaries.
- [x] Add shared domain validators and rules.
- [x] Add representative middleware and route tests.
- [x] Record all commands and verification results.

## Progress log

### 2026-07-10 — Assigned

- Lane created before implementation.

### 2026-07-11 — Recovered and integrated

- Recovered and reviewed the Hono Worker, auth/RBAC, validators, and framework-independent domain
  foundations after the original implementation agent exhausted its usage limit.
- Integrated generated Cloudflare binding types and the Queue/Workflow entrypoints from the platform
  lane without introducing frontend dependencies.
- Wired the production Hyperdrive database probe, profile/permission resolution, published content,
  navigation, and current-offer reads. Adapters that need unresolved platform/domain contracts
  remain explicitly fail-closed instead of returning mock success.
- Verified route behavior under workerd for liveness/readiness separation, validation, intake,
  authentication, signed webhooks, and idempotency.

## Documentation and decisions

- Hono on Cloudflare Workers: <https://hono.dev/docs/getting-started/cloudflare-workers>
- Hono middleware: <https://hono.dev/docs/guides/middleware>
- Hono validation: <https://hono.dev/docs/guides/validation>
- Supabase JWT claims: <https://supabase.com/docs/guides/auth/jwts>
- Cloudflare Workers bindings: <https://developers.cloudflare.com/workers/runtime-apis/bindings/>
- Cloudflare Workers best practices:
  <https://developers.cloudflare.com/workers/best-practices/workers-best-practices/>

The API is organized around injected ports so tests do not require cloud resources and production
adapters can fail closed. Supabase Auth establishes identity; application RBAC is loaded from
Postgres. The Worker applies request IDs, structured errors/logs, security headers, CORS, body
limits, validation, and binding-backed rate limits before domain work. Webhook secrets are isolated
by source and verified before JSON parsing or idempotency claims.

## Files changed

- `apps/api/**`
- `packages/auth/**`
- `packages/validators/**`
- `packages/core/src/content/**`
- `packages/core/src/errors/**`
- `packages/core/src/permissions/**`

## Verification evidence

| Command                               | Result                                                                                |
| ------------------------------------- | ------------------------------------------------------------------------------------- |
| `pnpm --filter @labs/api typecheck`   | Passed.                                                                               |
| `pnpm --filter @labs/api test`        | Passed: 1 workerd test file, 6 tests.                                                 |
| `pnpm --filter @labs/auth test`       | Passed: 1 source test file, 4 tests.                                                  |
| `pnpm --filter @labs/validators test` | Passed: 1 source test file, 4 tests.                                                  |
| `pnpm lint:backend`                   | Passed with zero warnings.                                                            |
| `pnpm --filter @labs/api cf-typegen`  | Generated bindings for Hyperdrive, D1, R2, Email, Queues, Workflows, and rate limits. |
| `pnpm --filter @labs/api build`       | Passed Wrangler 4.110.0 deployment dry-run.                                           |

## Blockers or handoff notes

- The route and authorization foundation is complete, but production persistence is intentionally
  not claimed end to end. Lead/contact intake, admin mutations, webhook storage, media upload
  issuance, email delivery state, and the outbox source adapter still use fail-closed ports until
  their persistence contracts are implemented and integration-tested.
- No live Worker deployment occurred. `wrangler.jsonc` contains reviewed binding contracts and safe
  placeholders; actual Cloudflare resource IDs and secrets must be provisioned per the platform
  runbook.

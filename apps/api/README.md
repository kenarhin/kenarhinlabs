# Ken Arhin Labs API

The official Ken Arhin Labs backend API is a modular Hono application deployed to Cloudflare
Workers. Supabase Postgres remains the canonical data store, reached through Hyperdrive, while
shared validation, authentication, and domain rules live in workspace packages.

## Local commands

Run these commands from the repository root:

```sh
pnpm --filter @labs/api dev
pnpm --filter @labs/api typecheck
pnpm --filter @labs/api test
pnpm --filter @labs/api build
```

`build` is a Wrangler deployment dry run; it validates and bundles the Worker without deploying it.
Tests run in workerd through `@cloudflare/vitest-pool-workers` and inject test doubles for external
persistence and platform ports.

## Environment and bindings

Copy `.dev.vars.example` to `.dev.vars` and replace every sentinel with a local-only secret. Never
commit `.dev.vars`. The production Worker also requires provisioned Hyperdrive and Rate Limiting
bindings declared in `wrangler.jsonc`; placeholder resource identifiers are intentionally not
deployable production configuration.

Regenerate binding and runtime types after any Wrangler configuration change:

```sh
pnpm --filter @labs/api cf-typegen
pnpm --filter @labs/api cf-typegen:check
```

## Route groups

- `/health` and `/ready` expose liveness and dependency readiness separately.
- `/public/*` contains published reads plus rate-limited lead/contact intake contracts.
- `/admin/*` requires a verified Supabase JWT and database-resolved permissions.
- `/webhooks/*` requires replay-bounded HMAC verification and an idempotency claim.

Production persistence and Cloudflare resource provisioning are separate backend lanes. Until a
required adapter or resource is wired, the API fails closed with `DEPENDENCY_UNAVAILABLE` instead of
returning fabricated success.

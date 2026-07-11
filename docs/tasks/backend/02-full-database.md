# Lane 02 — Full Database

## Owner and scope

Owner: database agent.

Owned scope: complete Supabase Postgres schema, SQL migrations, grants, RLS, seeds, Drizzle schema
and clients, database tests, and D1 read-model migrations under `packages/db/**` and `supabase/**`
if required.

The lane must implement the complete design in `docs/database-schema.md`, not an MVP subset.

## Required research before implementation

- Supabase documentation MCP: schemas, migrations, RLS, grants, Auth user references, database
  functions/triggers, and local testing.
- Current Drizzle documentation through Context7.
- Current Cloudflare documentation for Hyperdrive and D1 where database client or D1 migration
  decisions depend on it.

Record source URLs and material conclusions below before implementation.

## Checklist

- [x] Inspect connected Supabase project state read-only before assuming a blank database.
- [x] Map every documented table, constraint, index, and relation to implementation.
- [x] Implement full Postgres migration chain.
- [x] Implement grants, RLS, helper functions, and policies.
- [x] Implement deterministic seed/reference data.
- [x] Implement Drizzle schema, clients, configuration, and exports.
- [x] Implement D1 read-model schema/migrations.
- [x] Add migration, policy, and query validation.
- [x] Record all commands and verification results.

## Progress log

### 2026-07-10 — Assigned

- Lane created before implementation.

### 2026-07-11 — Recovered, deployed, and hardened

- Recovered the complete database implementation after the original agent reached its usage limit
  and audited every schema/migration against `docs/database-schema.md`.
- Refused to mutate the initially connected DailyVrs project. After the user reconnected Supabase,
  verified the intended project URL before applying any DDL.
- Applied the six ordered migrations through Supabase MCP only; no Supabase CLI command was used.
- Added the monotonic `sync_version` identity required for ordered outbox processing and aligned the
  Drizzle declaration with the exported PostgreSQL DDL.
- Used the live performance advisor to identify 29 uncovered foreign keys, added source-aligned
  indexes, and re-ran the advisor to prove those findings were eliminated.
- Split overlapping `FOR ALL` RLS policies into command-specific policies and consolidated public
  plus authenticated reads. The live advisor now reports no security findings and no overlapping
  permissive-policy warnings.
- Hardened the D1 validator so SQLite FTS5 shadow tables are excluded from canonical application
  table counts while the actual FTS index remains tested.

## Documentation and decisions

- Supabase RLS: <https://supabase.com/docs/guides/database/postgres/row-level-security>
- Supabase secure database access: <https://supabase.com/docs/guides/database/secure-data>
- Supabase user-data triggers: <https://supabase.com/docs/guides/auth/managing-user-data>
- Supabase database functions: <https://supabase.com/docs/guides/database/functions>
- Supabase database linter: <https://supabase.com/docs/guides/database/database-linter>
- Drizzle PostgreSQL column types and identities: <https://orm.drizzle.team/docs/column-types/pg>
- Drizzle indexes and constraints: <https://orm.drizzle.team/docs/indexes-constraints>
- Cloudflare Hyperdrive with Supabase:
  <https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-database-providers/supabase/>
- Cloudflare D1 Worker API: <https://developers.cloudflare.com/d1/worker-api/d1-database/>

Context7 was invoked as required but returned no usable documentation payload. Per the user's
instruction, current first-party documentation and the Supabase/Cloudflare documentation MCP tools
were used instead.

The canonical model uses ten application schemas and 37 tables. PostgreSQL remains authoritative; D1
contains only a rebuildable public read model. All application tables use explicit grants and RLS.
Auth lifecycle, immutable revisions/audit rows, timestamps, RBAC, outbox claim/retry functions,
stable seed IDs, full-text search, and foreign-key indexes are database-owned invariants.

## Files changed

- `packages/db/**`
- `supabase/config.toml`
- `supabase/seed.sql`
- `supabase/migrations/20260710000100_create_full_backend_schema.sql`
- `supabase/migrations/20260710000200_create_functions_and_triggers.sql`
- `supabase/migrations/20260710000300_secure_grants_and_rls.sql`
- `supabase/migrations/20260710000400_seed_reference_data.sql`
- `supabase/migrations/20260711000500_add_foreign_key_indexes.sql`
- `supabase/migrations/20260711000600_optimize_rls_policies.sql`

## Verification evidence

| Check                               | Result                                                                                                                                                                                                      |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @labs/db check`      | Passed TypeScript, Drizzle, PostgreSQL migration, and disposable D1 validation.                                                                                                                             |
| Drizzle export audit                | Passed for all 37 canonical PostgreSQL tables.                                                                                                                                                              |
| D1 disposable migration/query audit | Passed, including FTS5 and projection receipt behavior.                                                                                                                                                     |
| Supabase MCP migration history      | Six migrations present in order.                                                                                                                                                                            |
| Live schema inventory               | 37 application tables; all 37 have RLS; 139 policies; 106 indexes.                                                                                                                                          |
| Live deterministic seed inventory   | 4 roles, 22 permissions, and 3 feature flags.                                                                                                                                                               |
| Supabase security advisor           | Zero findings.                                                                                                                                                                                              |
| Supabase performance advisor        | No missing-FK-index or multiple-permissive-policy findings. The 50 remaining informational notices are unused indexes on a newly empty database and require real workload history before removal decisions. |

## Blockers or handoff notes

- Supabase MCP type generation currently returns only the remotely exposed `public` schema, which is
  intentionally empty. Runtime database types therefore remain Drizzle-generated from the ten
  canonical schemas instead of committing a misleading empty Data API type file.
- Functional role-by-role RLS integration tests still require authenticated test identities or a
  disposable Supabase branch. Static migration validation plus the live security advisor pass, but
  they are not represented as a substitute for those identity-bound tests.

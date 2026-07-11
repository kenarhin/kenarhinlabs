# Ken Arhin Labs

Ken Arhin Labs is an AI-native digital systems lab building websites, platforms, automations,
content engines, and the operating infrastructure behind modern businesses. This repository is the
long-term product and business platform for `kenarhinlabs.com`, not a standalone portfolio template.

The monorepo contains the public website, internal admin application, official backend API,
canonical database layer, Cloudflare integration packages, and architecture/task documentation used
to build the system.

## Architecture

```txt
Astro public site / TanStack Start admin / future clients
                         |
                  Hono API on Workers
                         |
        +----------------+----------------+
        |                |                |
Supabase Postgres   Cloudflare R2   Email Service
 source of truth      media/files   transactional mail
        |
transactional outbox -> Queues / Workflows -> D1 public read model
```

Key rules:

- Supabase Postgres is authoritative for business, identity-linked, draft, and private data.
- Cloudflare D1 contains rebuildable, public, non-sensitive projections only.
- Cloudflare R2 stores object bodies; Postgres stores their metadata and ownership.
- The Hono Worker is the official API and authorization boundary.
- Queue consumers are idempotent because Cloudflare Queues uses at-least-once delivery.
- The workspace uses pnpm directly and does not use Turborepo.

See [project context](docs/context.md), [technical decisions](docs/tech-stack.md),
[backend architecture](docs/backend-architecture.md), and [database model](docs/database-schema.md)
for the complete design.

## Repository layout

```txt
apps/
  web/          Astro public site
  admin/        TanStack Start business/admin application
  api/          Hono API and Cloudflare Worker entrypoint

packages/
  auth/         Supabase JWT, webhook verification, and RBAC helpers
  config/       Shared TypeScript, ESLint, and Prettier configuration
  core/         Framework-independent domain rules and errors
  db/           Drizzle schemas, Postgres/D1 clients, migrations, and queries
  email/        Transactional templates, Email Service transport, queue consumer
  storage/      Typed R2 helpers and media job contracts
  sync/         Transactional outbox to D1 projectors and consumers
  validators/   Shared Zod request/response contracts
  ui/           Shared frontend UI package

docs/
  tasks/backend/               Backend plan and lane work logs
  backend-platform-provisioning.md
```

Applications are deployable surfaces. Reusable business and infrastructure logic belongs in a
focused `@labs/*` package so it can be tested independently and shared without copying runtime code.

## Prerequisites

- Node.js `24.15.0` (recorded in `.node-version` and `.nvmrc`)
- pnpm `11.10.0` (enforced by the root manifest)
- Git
- Docker for disposable local Postgres/database validation where required
- Access to the Ken Arhin Labs Supabase project through the configured Supabase MCP connector
- A Cloudflare account and Wrangler authentication only for remote integration or deployment

Confirm the local toolchain before installing:

```sh
# Both versions must satisfy the root package policy.
node --version
pnpm --version
```

## First-time setup

From the repository root:

```sh
# Install the single workspace from the root lockfile.
pnpm install --frozen-lockfile

# Create API development values; replace placeholders locally.
cp apps/api/.dev.vars.example apps/api/.dev.vars

# Verify package discovery and the backend baseline.
pnpm list:workspaces
pnpm check
```

Never commit `.dev.vars`, `.env` files, API tokens, service-role keys, database passwords, or
production resource IDs. Browser applications may use a Supabase publishable/anonymous key;
`SUPABASE_SERVICE_ROLE_KEY` is backend-only.

## Development commands

Run applications from their existing scaffold directories:

```sh
# Public website.
pnpm --dir apps/web dev

# Admin application.
pnpm --dir apps/admin dev

# Hono API with Wrangler's local bindings.
pnpm --dir apps/api dev
```

Repository-wide checks:

| Command                  | Purpose                                            |
| ------------------------ | -------------------------------------------------- |
| `pnpm format`            | Format tracked project files                       |
| `pnpm format:check`      | Verify formatting without changing files           |
| `pnpm lint:backend`      | Lint backend apps and packages                     |
| `pnpm typecheck:backend` | Type-check backend workspaces                      |
| `pnpm test:backend`      | Run backend tests                                  |
| `pnpm build:backend`     | Build backend-owned workspaces that define a build |
| `pnpm check`             | Run the complete backend quality gate              |
| `pnpm list:workspaces`   | Show the pnpm workspace graph                      |

Filter one package while iterating:

```sh
# Examples: focused storage, email, sync, and database validation.
pnpm --filter @labs/storage test
pnpm --filter @labs/email typecheck
pnpm --filter @labs/sync test
pnpm --filter @labs/db check
```

## Database workflow

The permanent database model is implemented as code in `packages/db`:

- Supabase Postgres schemas and migrations own canonical application data.
- Drizzle provides typed schema and query contracts.
- Workers connect to Supabase through Hyperdrive.
- D1 migrations define the public read model separately.
- `projection_receipts` makes outbox projection retries and replay ordering observable.

Use a direct Supabase Postgres connection for migration tooling. The Worker runtime uses the
Hyperdrive binding instead of embedding a database URL.

```sh
# Check Drizzle schema consistency and the local D1 migration contract.
pnpm --filter @labs/db db:check
pnpm --filter @labs/db d1:validate

# Generate migration artifacts only after reviewing the schema diff.
pnpm --filter @labs/db db:generate
pnpm --filter @labs/db d1:generate
```

Database migrations are reviewed repository artifacts. Do not make untracked production schema
changes through a dashboard.

All Supabase inspection and mutation for this repository must use the Supabase MCP connector; do not
use the Supabase CLI. Before any remote query or migration, retrieve the connector's project URL and
confirm it is the intended Ken Arhin Labs project. Stop if the target is missing, ambiguous, or
belongs to another project. Apply a reviewed repository migration through MCP only after that target
check and an explicit decision to mutate the selected environment.

## Cloudflare resources and environments

Local Wrangler storage is the default for development. Preview and production must use separate
Hyperdrive, D1, R2, Queue, Workflow, and Email Service resources. The complete binding contract,
naming convention, provisioning order, and validation commands are in
[Backend Platform Provisioning](docs/backend-platform-provisioning.md).

Important deployment boundaries:

- Setup and tests do not provision or deploy cloud resources.
- `wrangler.jsonc` is the Worker configuration source of truth.
- Generate Worker binding types after every binding change.
- Use Wrangler secrets for deployed credentials and `.dev.vars` for local credentials.
- Run a Wrangler dry run before deployment.
- Apply D1 migrations locally before applying them to a selected remote database.

## Backend task workflow

Backend implementation is tracked in [docs/tasks/backend/backend.md](docs/tasks/backend/backend.md).
Each lane owns a separate append-only task log containing research, decisions, files changed,
commands, verification, blockers, and handoff notes.

When contributing:

1. Read the four authoritative project documents linked above.
2. Choose the owning backend lane before editing shared code.
3. Verify current official documentation for external APIs and tools.
4. Keep public, private, and deployment concerns in their designated packages.
5. Add tests for behavior and failure/retry paths.
6. Run focused checks, then `pnpm check` before handoff.
7. Update the owning task log with reproducible evidence.

Frontend tasks belong in their own discipline folder and must not be mixed into backend lane logs.

## Security and operations

- Cloudflare Access protects the admin perimeter; Supabase Auth identifies users; Hono and Postgres
  permissions authorize actions.
- RLS and explicit grants are required for Supabase-exposed relations.
- Webhooks require signature or shared-secret verification and idempotency.
- Private R2 objects are served through controlled Worker routes or time-limited signed access.
- Logs use structured identifiers and must omit secrets, email bodies, private records, and raw
  binding objects.
- Email Service is reserved for transactional mail; marketing campaigns require a dedicated
  bulk-email system.

## Project status and support

The platform is in active early development. Source code, migrations, and the backend task logs are
authoritative; this README explains how to enter and work in the repository rather than duplicating
a volatile feature checklist.

For architecture questions or onboarding gaps, open an issue with the relevant document, command,
and error output. Ken Arhin Labs maintains this private workspace.

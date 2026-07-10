# Ken Arhin Labs

Ken Arhin Labs is a global-facing digital systems lab for building AI-ready websites, platforms, admin systems, automations, content engines, and business infrastructure.

The goal of this repository is not to become a basic portfolio site. It is the foundation for a full Ken Arhin Labs operating system: the public website, admin/business dashboard, backend API, shared packages, project documentation, and future product surfaces.

## Project direction

Ken Arhin Labs is being designed as a long-term digital ecosystem with these major parts:

- **Public website** — a content-heavy Astro site for services, case studies, stack guides, tool listings, field notes, lab updates, and public brand pages.
- **Admin app** — a TanStack Start admin system for managing content, clients, leads, offers, tools, files, email workflows, and internal business operations.
- **API layer** — a Hono API on Cloudflare Workers that acts as the official backend API for the whole project.
- **Primary backend** — Supabase Postgres and Supabase Auth for source-of-truth business data and identity.
- **Cloudflare platform** — Workers, Hyperdrive, D1, R2, Email Service, Queues, Workflows, Turnstile, Access, and cache features where they make sense.
- **Shared packages** — reusable code, configuration, validators, database logic, email helpers, storage helpers, and core business rules.
- **Documentation** — project context, stack decisions, tasks, architecture notes, and implementation plans inside `docs/`.

## Current scaffold scope

This scaffold is only the **pnpm monorepo foundation**. It intentionally does not create the applications yet.

The apps will be scaffolded later:

```txt
apps/
  web/      # Astro public site; not created yet
  admin/    # TanStack Start admin app; not created yet
  api/      # Hono Cloudflare Workers API; not created yet
```

The current foundation includes:

```txt
.
├── .agents/                 # Existing local agent skills; not managed by this scaffold
├── .codex/                  # Existing Codex/tooling config; not managed by this scaffold
├── docs/                    # Existing project documentation folder
│   ├── context.md
│   └── tech-stack.md
├── packages/
│   ├── config/              # Shared monorepo configuration package
│   └── core/                # Shared framework-independent business/domain logic
├── .gitignore
├── .node-version
├── .npmrc
├── .nvmrc
├── .prettierignore
├── package.json
├── pnpm-workspace.yaml
├── prettier.config.mjs
├── opencode.jsonc           # Existing tool config; not managed by this scaffold
└── README.md
```

## Package naming

The root package uses:

```txt
kenarhinlabs
```

Internal workspace packages use the `@labs` scope:

```txt
@labs/core
@labs/config
```

This keeps internal imports clean while avoiding the overly common `@repo/*` pattern.

## Required local tools

This repo is configured around:

```txt
Node.js: 24.15.0
pnpm:    11.10.0
```

The local Node version is recorded in both `.node-version` and `.nvmrc`.

## Install

From the repository root:

```sh
pnpm install
```

## Useful commands

```sh
pnpm format
pnpm format:check
pnpm check
pnpm list:workspaces
```

## Workspace layout

The workspace currently supports these package locations:

```txt
apps/*
packages/*
tooling/*
```

`apps/*` is reserved for the public site, admin app, and API. `packages/*` is for shared internal packages. `tooling/*` is reserved for future repo-level tooling packages if needed.

## Current packages

### `@labs/core`

Shared, framework-independent business logic.

This package should eventually hold domain services and business rules such as:

- content publishing logic
- project/client workflows
- permission helpers
- offer/tool publishing rules
- shared business constants
- reusable backend-safe utilities

### `@labs/config`

Shared project configuration.

Current export:

```txt
@labs/config/prettier
```

Future config exports may include:

- TypeScript base configs
- ESLint configs
- app/package conventions
- build presets
- testing conventions

## Formatting

Prettier is installed at the root and versioned through the pnpm catalog in `pnpm-workspace.yaml`.

The root `prettier.config.mjs` re-exports the shared config from:

```txt
packages/config/prettier.config.mjs
```

The `.prettierignore` file intentionally ignores generated files, dependency folders, build outputs, and existing root tooling folders such as `.agents/` and `.codex/`.

## Documentation

Project documentation belongs in `docs/`.

Current agreed docs:

```txt
docs/context.md
docs/tech-stack.md
```

Future docs may include:

```txt
docs/backend-database.md
docs/frontend-architecture.md
docs/content-system.md
docs/tasks/
```

Do not scatter planning files randomly across the repo root. Keep project docs in `docs/` unless a tool specifically requires a root-level config file.

## Planned architecture summary

The long-term project architecture is:

```txt
Public site:
  Astro + Cloudflare Workers + PWA support

Admin app:
  TanStack Start + shadcn/ui + TanStack Query + PWA support

API:
  Hono on Cloudflare Workers

Primary database/auth:
  Supabase Postgres + Supabase Auth

Database access from Workers:
  Cloudflare Hyperdrive + Drizzle ORM

Edge/public read layer:
  Cloudflare D1

Files/media:
  Cloudflare R2

Email:
  Cloudflare Email Service

Async/background:
  Cloudflare Queues + Workflows
```

## Development principle

The repo should be built as the real long-term architecture from the beginning, but implemented in controlled phases.

That means:

- no throwaway stack
- no random package sprawl
- no app scaffolding until the foundation is clean
- no duplicate backend sources of truth
- shared logic should move into packages instead of being copied between apps
- project decisions should be documented in `docs/`

## Next implementation direction

After this pnpm foundation, the next steps should be:

1. Add TypeScript and shared TypeScript config.
2. Add linting/code-quality config.
3. Add Drizzle/Supabase database package structure.
4. Add Cloudflare environment/config conventions.
5. Scaffold the Hono API.
6. Scaffold the Astro public site.
7. Scaffold the TanStack Start admin app.

The apps are intentionally not included in this setup step.

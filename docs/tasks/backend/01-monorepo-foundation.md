# Lane 01 — Monorepo Foundation

## Owner and scope

Owner: primary agent.

Owned scope: root pnpm v11 workspace, root scripts and dependency policy, shared
TypeScript/ESLint/Prettier configuration, CI, workspace hygiene, and final integration review of the
root README.

Frontend application behavior is out of scope.

## Checklist

- [x] Research current pnpm v11 workspace guidance and record sources.
- [x] Audit all workspace manifests and dependency/version drift.
- [x] Establish a single root workspace and lockfile.
- [x] Normalize workspace package names and metadata.
- [x] Add shared config and backend-safe root scripts.
- [x] Add CI and environment/version conventions.
- [x] Install/update the lockfile and run all available checks.
- [x] Review the root README and cross-lane integration.

## Progress log

### 2026-07-10 — Started

- Read the authoritative project documents and inspected all current workspace manifests.
- Confirmed the repository is clean and contains three app scaffolds plus three shared packages.
- Found accidental nested pnpm workspace and lock files under `apps/web/`.
- Found missing `.node-version` and `.nvmrc` despite README claims that both exist.
- Found inconsistent unscoped app/package names and large version drift across local Wrangler
  dependencies.
- Invoked Context7 three times for pnpm v11. The repository invocation failed because npm correctly
  rejected itself under `devEngines.packageManager`; out-of-workspace invocations returned empty
  output. Direct official pnpm docs verification remains required before edits.

### 2026-07-10 — Official documentation fallback and initial configuration

- The user approved using official web and dedicated documentation tools because Context7 returned
  no usable payload.
- Read pnpm 11.x official documentation for workspaces, `pnpm-workspace.yaml` settings, recursive
  commands, package metadata, CI, and dependency review.
- Confirmed pnpm requires one root `pnpm-workspace.yaml`; `sharedWorkspaceLockfile` defaults to one
  root lockfile, `workspace:` gives deterministic local-package resolution, and recursive/filter
  commands provide native workspace orchestration without Turborepo.
- Confirmed pnpm v11 uses `allowBuilds` for reviewed dependency lifecycle scripts, `pmOnFail` for
  package-manager enforcement behavior, and a default one-day minimum release age.
- Confirmed CI automatically freezes the lockfile and pnpm v11 rejects incompatible newer-major
  lockfiles; the workflow still passes `--frozen-lockfile` explicitly for clarity.
- Read official ESLint, typescript-eslint, and TypeScript guidance before adding shared flat ESLint
  and strict TypeScript configs.
- Added package-manager/runtime enforcement, one-lockfile workspace settings, reviewed dependency
  builds, version catalogs, native pnpm backend scripts, shared configs, runtime version files,
  editor settings, and backend CI.
- Removed the tracked nested `apps/web/pnpm-workspace.yaml` and `apps/web/pnpm-lock.yaml` so the
  root is the only pnpm workspace boundary.
- A registry-wide `pnpm outdated --recursive --format json` audit hit a pnpm 11.10.0 internal error
  while reading optional dependencies. Latest versions are therefore being verified through package
  metadata queries and lane-specific documentation, with compatibility exceptions recorded.
- The user requested latest stable packages. The catalog now uses current stable versions, except
  TypeScript remains on the newest 6.0.x because current `typescript-eslint@8.63.0` declares
  `typescript >=4.8.4 <6.1.0`; TypeScript 7.0.2 would violate that peer range.

### 2026-07-11 — Workspace and connected-platform audit

- Verified the active runtime is pnpm `11.10.0` on Node.js `24.15.0`.
- Verified all thirteen workspaces resolve from the one root workspace and use the `@labs/*` naming
  convention.
- Verified no nested `pnpm-lock.yaml` or `pnpm-workspace.yaml` remains below `apps/` or `packages/`,
  and no Turborepo configuration or installed Turbo package exists.
- Verified the shared ESLint flat configuration imports successfully.
- Ran a registry-backed recursive outdated audit. Backend and root dependencies are current stable
  releases; TypeScript remains the documented compatibility exception. Only pre-existing frontend
  dependencies are outdated, and frontend dependency upgrades remain outside this backend-only
  program.
- Added exact, reviewed `minimumReleaseAgeExclude` entries for same-day stable releases required by
  the user (`@cloudflare/workers-types@5.20260711.1`, `eslint@10.7.0`, and `hono@4.12.29`) while
  retaining the one-day maturity rule for every other package.
- The user prohibited the Supabase CLI. No Supabase CLI command will be used; repository SQL/Drizzle
  artifacts and the Supabase MCP server are the supported workflow.
- The initial Supabase MCP connector targeted DailyVrs, so no mutation was attempted. After the user
  reconnected it, the target was re-verified as `mbscfzccmomwqdybnlbq.supabase.co` before any
  migration was applied.
- Read-only Cloudflare API MCP inspection succeeded. The Ken Arhin Labs account currently has no
  `kenarhinlabs-*` Worker, D1, R2, Queue, Workflow, or Hyperdrive resources, so repository bindings
  remain placeholders until explicit provisioning and the correct Supabase project are available.

## Decisions

- No Turborepo dependency or configuration will be introduced.
- Root orchestration will use pnpm recursive/filter commands.
- The single root lockfile will be authoritative.
- Internal workspace dependencies will use `workspace:` explicitly because pnpm 11 defaults
  `linkWorkspacePackages` to false.
- Root orchestration will use recursive and filtered pnpm scripts with topological ordering.
- Dependency install scripts remain deny-by-default through `allowBuilds`; only reviewed packages
  are allowed.

## Documentation sources

- https://pnpm.io/workspaces
- https://pnpm.io/settings
- https://pnpm.io/cli/recursive
- https://pnpm.io/continuous-integration
- https://pnpm.io/package_json
- https://pnpm.io/cli/outdated
- https://typescript-eslint.io/getting-started/
- https://typescript-eslint.io/users/configs/
- https://eslint.org/docs/latest/use/configure/migration-guide
- https://www.typescriptlang.org/tsconfig/strict.html
- https://github.com/pnpm/action-setup
- https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching

## Verification evidence

Commands were run from the repository root on 2026-07-11.

| Command                          | Result                                                              |
| -------------------------------- | ------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile` | Passed for all 13 workspaces with pnpm 11.10.0.                     |
| `pnpm list:workspaces`           | Passed; root, 3 apps, and 9 packages discovered from one workspace. |
| `pnpm format:check`              | Passed.                                                             |
| `pnpm lint:backend`              | Passed with zero warnings.                                          |
| `pnpm typecheck:backend`         | Passed for all backend-owned workspaces.                            |
| `pnpm test:backend`              | Passed: 6 source test files and 32 tests.                           |
| `pnpm build:backend`             | Passed; Wrangler 4.110.0 dry-run completed.                         |
| `pnpm check`                     | Passed as the combined backend quality gate.                        |
| `git diff --check`               | Passed.                                                             |

The recursive registry audit found backend dependencies current at the time of verification. The
only intentional compatibility exception is TypeScript 6.0.x because the current stable
`typescript-eslint@8.63.0` peer range excludes TypeScript 7.

## Blockers or handoff notes

None.

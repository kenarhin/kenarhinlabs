# Task Documentation Conventions

Project work is organized by discipline so backend, frontend, product, operations, and future
programs can evolve without competing for one flat sequence of task numbers.

## Folder contract

Each active discipline owns a folder under `docs/tasks/`:

```txt
docs/tasks/
  backend/
    backend.md                 # Program plan, ownership, phases, and shared gates
    01-monorepo-foundation.md # One bounded lane with its own evidence log
    02-full-database.md
    03-api-runtime.md
    04-platform-and-docs.md
```

Do not add unrelated tasks to another discipline's folder. Create a sibling folder and its own
program plan when that work is authorized.

## Lane log contract

Every lane file should record:

- owner, boundaries, and files owned;
- dependencies and cross-lane handoffs;
- current official documentation consulted;
- decisions and material assumptions;
- files changed;
- commands run with results;
- remaining limitations and precise blockers; and
- truthful checklist state.

Check a task only when repository or runtime evidence proves it. A passing unit test is not evidence
that cloud resources were provisioned, a migration was remotely applied, or another lane completed
its integration work.

## Remote operations

Repository setup and task completion do not imply permission to deploy or mutate remote services.
Supabase work must use the configured Supabase MCP connector after verifying its project target;
Cloudflare agent interactions must use the Cloudflare API MCP. Record any remote action and its
target in the owning lane log.

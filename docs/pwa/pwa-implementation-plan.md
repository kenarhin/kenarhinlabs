# PWA Implementation Plan

_Last updated: 2026-07-11_

This plan integrates the shared package into the permanent frontend architecture. It is not a separate throwaway PWA prototype.

## Phase 0 — Accept shared package

Deliverables:

```txt
packages/pwa
PWA documentation in docs/
root workspace dependency recognition
root check script
```

Verification:

```sh
pnpm install
pnpm --filter @labs/pwa check
```

Gate:

- no generated build artifacts or `node_modules` committed inside the package;
- package exports resolve;
- tests pass under the repository's selected Node and pnpm versions;
- version mismatch decisions are documented.

## Phase 1 — Brand assets and manifests

Deliverables:

```txt
approved square source mark
public PWA icon set
admin PWA icon set
public manifest review
admin manifest review
mobile and desktop screenshots
```

Gate:

- icons have correct dimensions and maskable safe area;
- installed public and admin apps are distinguishable;
- shortcuts point to implemented routes;
- brand and app names are approved;
- no temporary placeholder logos remain.

## Phase 2 — Public integration

Deliverables:

```txt
@vite-pwa/astro integration
public offline.html
manual virtual-module registration
install interface
update interface
offline/stale banner
public cache configuration
```

Gate:

- Astro compatibility path approved;
- public build and Cloudflare dry run pass;
- API/auth/preview routes are network-only;
- visited public content works offline;
- unvisited content reaches offline fallback;
- Astro navigation lifecycle does not duplicate registration;
- cached freshness is communicated.

## Phase 3 — Admin shell integration

Deliverables:

```txt
vite-plugin-pwa integration
admin offline.html
React registration component
update-safety wiring
installed-mode shell
```

Gate:

- navigation is network-only;
- Hono and Supabase are network-only;
- Cache Storage contains no private responses;
- Cloudflare Access and Supabase Auth work in installed mode;
- update prompts do not interrupt unsafe states.

## Phase 4 — First draft workflow

Start with the first complete admin content workflow.

Deliverables:

```txt
content draft payload schema
DraftStore adapter
local-save status
restore/discard UI
server revision comparison
logout cleanup
schema migration handling
```

Gate:

- draft belongs to stable auth user ID;
- no tokens or unrestricted private data are stored;
- server/newer local conflicts are resolved explicitly;
- multi-account shared-device test passes;
- expired and excess drafts are pruned.

## Phase 5 — Retry recovery inbox

Do not begin with automatic replay.

Deliverables:

```txt
manual retry queue integration
retry status UI
blocked/dead error presentation
owner-scoped cleanup
API error normalization
```

Gate:

- operations are domain-named;
- payloads are minimal;
- auth is reacquired at execution time;
- manual retry cannot duplicate a server operation;
- no publish, email-send, delete, permission, or financial action auto-runs.

## Phase 6 — First automatic operation

Select one low-risk idempotent operation, likely draft save.

Deliverables:

```txt
Hono Idempotency-Key handling
server idempotency persistence
client automatic queue allowlist
conflict/revision checks
retry telemetry
```

Gate:

- duplicate execution test passes;
- expired permissions block replay;
- 401/403/409 classification is correct;
- tab crash and lease expiry tests pass;
- server idempotency retention exceeds client retry window.

## Phase 7 — Storage and resilience

Deliverables:

```txt
persistent-storage request UX
quota estimate monitoring
local storage warning
cleanup jobs
browser-specific fallback behavior
```

Gate:

- denial or unsupported API does not break the app;
- near-quota behavior is clear;
- local-only work is never described as permanent;
- payload and record limits are tested.

## Phase 8 — Operational hardening

Deliverables:

```txt
PWA telemetry
release/version diagnostics
preview update tests
rollback runbook
CSP enforcement
header verification
cross-browser matrix
```

Gate:

- update from previous production version passes;
- generated worker route inspection is automated;
- service-worker script is not served immutable;
- rollback build is available;
- security review signs off on all runtime cache rules.

## Pull-request checklist

Any PWA-related pull request should answer:

```txt
Which origin is affected?
Does this change Cache Storage?
Does this change IndexedDB schema or payload?
Can stale data cause harm?
Does logout cleanup change?
Does update behavior change?
What browser and offline scenarios were tested?
Does generated sw.js route order remain safe?
Is a cache schema version bump required?
Are docs updated?
```

## Definition of done

A PWA feature is complete only when:

- behavior is useful in browser and installed modes;
- offline state is explicit;
- private data remains outside HTTP caches;
- local data has owner, schema, expiry, and cleanup behavior;
- retries are idempotent and permission-aware;
- update behavior protects user work;
- accessibility and browser fallback work;
- package, build, browser, and deployment tests pass;
- documentation reflects the implementation.

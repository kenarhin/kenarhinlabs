# PWA Testing and Operations

_Last updated: 2026-07-11_

## Test layers

```txt
Unit tests
  Config factories, URL patterns, security helpers, IndexedDB stores

Build integration tests
  Actual plugin output and generated service-worker route policy

Browser integration tests
  Registration, update, offline fallback, install behavior

End-to-end tests
  Real public and admin workflows under network changes

Operational checks
  Deployment headers, cache versions, telemetry, rollback
```

## Package checks

From the monorepo root:

```sh
pnpm --filter @labs/pwa typecheck
pnpm --filter @labs/pwa test
pnpm --filter @labs/pwa check
```

The package tests use `fake-indexeddb` for deterministic browser-storage behavior.

## Config tests

Required assertions:

### Public

- plugin strategy is `generateSW`;
- registration type is `prompt`;
- `injectRegister` is null;
- `navigateFallback` is null;
- API origins precede broad public routes and use `NetworkOnly`;
- public navigation uses `NetworkFirst`;
- offline fallback is `/offline.html`;
- public images use bounded `StaleWhileRevalidate`;
- fonts use bounded `CacheFirst`.

### Admin

- API and Supabase origins use `NetworkOnly`;
- sensitive same-origin paths use `NetworkOnly`;
- admin navigation uses `NetworkOnly`;
- no broad image or document cache exists;
- safe asset caching exists only when explicitly configured;
- offline fallback exists.

## Generated service-worker inspection

A build test must inspect generated `sw.js` and fail when:

```txt
createHandlerBoundToURL("index.html")
```

or an equivalent unintended SPA navigation fallback appears.

Also verify route ordering in generated output. A configuration object can look correct while plugin defaults change final output.

## Browser matrix

Minimum manual matrix:

```txt
Chrome desktop current
Edge desktop current
Firefox desktop current
Safari macOS current
Chrome Android current
Safari iOS current
```

Not every browser supports the same install prompt API or standalone behavior. Test graceful degradation rather than forcing identical UI.

## Public test scenarios

1. First online visit installs and registers successfully.
2. Second visit loads build assets from precache.
3. A visited public article opens while offline.
4. An unvisited route shows `offline.html`.
5. API and preview requests fail offline rather than returning cached private data.
6. Cached offer/pricing content shows a stale warning.
7. A new deployment shows an update prompt.
8. Accepting the prompt activates the new worker and reloads once.
9. Dismissing the prompt leaves the current page usable.
10. Astro view transitions do not duplicate registration or event listeners.
11. Icon, shortcut, and start URL behavior work in installed mode.
12. Reduced-motion mode remains coherent.

## Admin test scenarios

1. App shell loads online and registers.
2. Admin navigation fails to generic offline page when offline.
3. No private document response appears in Cache Storage.
4. No Hono or Supabase response appears in Cache Storage.
5. Draft autosave survives tab close and browser restart.
6. Draft is visible only to the matching owner.
7. Logout clears the owner's drafts and retry records.
8. Account B cannot restore account A's local draft.
9. Expired drafts are pruned.
10. Retry queue defaults to manual.
11. Automatic queue processes only allowlisted operations.
12. 401/403/conflict failures become blocked, not silently replayed.
13. Idempotency prevents duplicates after tab crash or lease expiry.
14. An update is blocked while a draft is dirty or upload active.
15. After state becomes safe, update activation succeeds.
16. Cloudflare Access still protects installed-mode launch.
17. Session expiry does not reveal cached private screens.

## Network simulation

Test more than browser "Offline" mode:

```txt
high latency
packet loss
API origin failure while shell origin is online
Supabase unavailable while API is reachable
request timeout
HTTP 429
HTTP 500/503
connection restored during editing
connection lost during save
```

`navigator.onLine` may say online while the API is unreachable. Use the health probe for critical state decisions.

## Update testing

Maintain two locally or preview-deployed build versions.

```txt
Version A installed and controlling client
Version B deployed
```

Verify:

- B downloads without taking control immediately;
- the app receives `needRefresh`;
- admin safety blockers work;
- acceptance sends `SKIP_WAITING` through plugin integration;
- the page reloads once;
- old caches are cleaned;
- drafts survive compatible updates;
- incompatible draft schema is handled deliberately.

## Storage tests

Test:

```txt
persistence granted
persistence denied
storage API unsupported
near-quota state
browser eviction simulation where possible
private browsing restrictions
large payload rejection at feature boundary
expired record cleanup
maximum per-owner pruning
```

The package does not enforce byte-level draft size. Each feature should set and test a reasonable serialized payload limit.

## Accessibility tests

Install, update, offline, and retry interfaces require:

- keyboard navigation;
- visible focus;
- live-region announcements that do not repeat excessively;
- clear action labels;
- non-color status meaning;
- touch target sizing;
- no forced countdown or automatic reload while unsafe;
- reduced-motion behavior.

## Lighthouse and browser tools

Use Lighthouse as one signal, not the complete acceptance test. Also inspect:

```txt
Application > Manifest
Application > Service Workers
Application > Cache Storage
Application > IndexedDB
Network > Offline and throttling
Storage usage
Console registration errors
```

## Observability

Track coarse counts and outcomes:

```txt
registration success/failure
worker version/update ready/update accepted
install prompt shown/accepted/dismissed
offline fallback views
draft save/restore/prune failures
retry claimed/succeeded/failed/blocked/dead
storage persistence result
quota warning
```

Include an application release ID and package cache schema version. Do not include private payloads.

## Service-worker version diagnostics

Expose a non-sensitive build identifier in the application UI or diagnostics page:

```txt
app release
service-worker build hash
PWA package version
cache schema version
environment
```

This helps support determine whether a client is controlled by an outdated worker.

## Incident response

### Bad cache rule

1. disable or narrow the rule;
2. increment cache schema if necessary;
3. deploy corrective worker;
4. verify old cache deletion;
5. assess whether private data entered caches;
6. document scope and remediation.

### Broken service worker

1. confirm script and header delivery;
2. deploy previous known-good configuration as a new build;
3. avoid removing the worker URL without a cleanup plan;
4. add a temporary diagnostics message if clients are stranded;
5. test update from the broken version.

### Private data cached

Treat as a security incident:

- stop the offending route;
- issue corrective cache deletion;
- evaluate affected origins, users, and devices;
- rotate credentials if secrets were involved;
- document and prevent recurrence.

## Release gate

A PWA release is ready only when:

```txt
package tests pass
both application builds pass
generated worker inspection passes
preview HTTPS deployment passes
manifest and icons pass
public offline scenarios pass
admin privacy scenarios pass
update from previous version passes
installed-mode auth passes
headers and CSP pass
rollback build is available
```

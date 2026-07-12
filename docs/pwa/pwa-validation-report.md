# PWA Package Validation Report

_Last updated: 2026-07-11_

This report records the checks performed while producing the initial `packages/pwa` deliverable.

## Delivered scope

```txt
Shared public/admin configuration factories
Manifest factories
Cache names and URL matchers
Install prompt controller
Connectivity and network probe helpers
Storage persistence/quota helpers
Update-safety helpers
IndexedDB database wrapper
DraftStore
RetryQueue
Request/response safety helpers
Unit tests
Astro and Vite/React integration examples
Full PWA documentation set
```

## Static validation

The package was checked with:

```sh
npm run typecheck
npm test
npm run check
```

Result:

```txt
TypeScript: passed
Test files: 4 passed
Tests: 13 passed
```

Tests cover:

- public and admin configuration policy;
- explicit `navigateFallback: null`;
- URL/origin pattern generation;
- request and response safety classification;
- compound `(ownerId, key)` draft isolation, expiry, pruning, updates, and cleanup;
- retry queue behavior and status transitions.

## Generated worker validation

Temporary Vite builds using `vite-plugin-pwa` 1.3.0 were generated for both policies.

Public output confirmed:

```txt
NetworkOnly sensitive origins/routes
NetworkFirst public navigation
StaleWhileRevalidate public media
CacheFirst fonts
offline fallback
```

Admin output confirmed:

```txt
NetworkOnly API origin
NetworkOnly Supabase origin
NetworkOnly admin navigation
offline fallback
no broad page or image runtime cache
```

The generated worker was inspected to ensure it did not contain an unintended SPA fallback equivalent to:

```js
createHandlerBoundToURL('index.html')
```

The explicit `navigateFallback: null` setting was added and verified because an early integration build showed that the plugin's default SPA navigation fallback could otherwise precede the intended route policy.

## Astro integration validation

A local build was attempted using:

```txt
Astro 7.0.7
@vite-pwa/astro 1.2.0
```

The build succeeded when installation proceeded with a peer-dependency override. However, the published `@vite-pwa/astro` 1.2.0 package metadata officially declares Astro peer support only through major version 5.

Conclusion:

```txt
Local technical build: passed
Official Astro 7 compatibility: not established by package peer metadata
Production approval: blocked pending compatibility decision and preview/browser tests
```

This must remain visible in project documentation and dependency configuration.

## Security design decisions validated

- service-worker registration is manual and prompt-based;
- `skipWaiting` and `clientsClaim` are false;
- public and admin have different runtime policies;
- admin navigation is not cached;
- API and Supabase origins are network-only;
- additional runtime rules cannot replace the package-owned route array;
- no generic Workbox Background Sync queue is included;
- retry items default to manual;
- automatic retries require explicit mode and should require server idempotency;
- draft and retry records are owner-scoped and expiring;
- logout cleanup methods exist for both stores.

## Known limitations

The package does not yet provide:

- application UI components;
- a custom `injectManifest` worker;
- push notifications;
- periodic background sync;
- raw file/blob persistence;
- cryptographic protection for local drafts;
- cross-tab leader election;
- server idempotency implementation;
- application-specific draft schemas;
- end-to-end browser tests;
- deployed Cloudflare header verification;
- final icons or screenshots.

These are intentionally outside the shared package or remain future work.

## Repository integration checks still required

After copying into the real monorepo:

```sh
pnpm install
pnpm --filter @labs/pwa check
pnpm --filter @labs/web build
pnpm --filter @labs/admin build
pnpm lint
pnpm typecheck
pnpm test
```

Also verify:

- workspace TypeScript module resolution;
- exact TanStack Start Vite plugin composition;
- exact Astro integration version;
- Cloudflare Worker output paths;
- CSP and response headers;
- generated service-worker source;
- preview registration and updates;
- installed-mode auth flows;
- browser matrix.

## Acceptance status

```txt
Shared package architecture: ready for repository integration
Unit-tested implementation: passed
Vite generated-worker policy: passed
Astro 7 production compatibility: conditional / unresolved official peer support
App-level UI and workflow integration: not included, as designed
Production deployment approval: requires app integration and preview gates
```

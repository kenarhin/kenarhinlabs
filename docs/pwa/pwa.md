# Ken Arhin Labs PWA Program

_Last updated: 2026-07-11_

This document is the entry point for Progressive Web App work across Ken Arhin Labs. It defines the source-of-truth order, the boundary between the shared `@labs/pwa` package and application-owned code, and the documents that govern implementation.

## Executive decision

Ken Arhin Labs has two installable applications with different security and offline requirements:

```txt
kenarhinlabs.com
  Public Astro application
  Content-oriented PWA

admin.kenarhinlabs.com
  TanStack Start administration application
  Secure operational PWA
```

The applications share PWA policy and browser-resilience utilities through:

```txt
packages/pwa
```

They do **not** share a single deployed service worker. A service worker, Cache Storage, IndexedDB, and install identity are scoped to an origin. Each application therefore owns its own manifest output, service-worker registration, install/update UI, offline page, and application integration.

The architecture principle is:

> Share policy, factories, types, storage primitives, and tests. Keep runtime registration and product behavior app-local.

## Source-of-truth order

When PWA documents or implementation details disagree, use this order:

1. `docs/pwa-security-and-caching.md`
2. `docs/pwa-architecture.md`
3. `docs/pwa-admin-app.md` or `docs/pwa-public-site.md`
4. `packages/pwa/src/**`
5. `docs/pwa-package-reference.md`
6. older general frontend or stack notes

Security rules always take precedence over convenience or caching performance.

## Document map

| Document | Purpose |
| --- | --- |
| `pwa.md` | Program index and governing decisions |
| `pwa-architecture.md` | Cross-application architecture and ownership boundaries |
| `pwa-package-reference.md` | API and configuration reference for `@labs/pwa` |
| `pwa-public-site.md` | Astro public PWA integration and behavior |
| `pwa-admin-app.md` | TanStack Start admin PWA integration and behavior |
| `pwa-offline-data-and-retries.md` | IndexedDB drafts, retry queues, logout cleanup, and idempotency |
| `pwa-security-and-caching.md` | Mandatory cache allowlists, denylists, and threat controls |
| `pwa-platform-provisioning.md` | Files, dependencies, icons, headers, CSP, and deployment setup |
| `pwa-testing-and-operations.md` | Test matrix, observability, updates, rollback, and incident checks |
| `pwa-implementation-plan.md` | Ordered project work and verification gates |
| `pwa-validation-report.md` | What was validated in the delivered package and known compatibility gates |

## Shared package responsibility

`packages/pwa` owns:

```txt
Manifest factories
Public and admin Vite PWA option factories
Cache naming and versioning
Runtime request matchers
Security-oriented request classification
Install prompt controller
Connectivity observation and active network probing
Storage persistence and quota helpers
Update-safety evaluation
Periodic service-worker update checks
IndexedDB draft storage
Explicit retry queue primitives
Unit tests and integration examples
```

It does not own:

```txt
Astro layouts or components
React components
Application routes
Offline-page content
Brand icon source artwork
Authentication state
Editor state
Upload state
API calls
Server idempotency
Analytics and logging providers
Cloudflare deployment configuration
```

## Product-level PWA goals

### Public application

- installable brand and content experience;
- fast repeat visits;
- bounded caching of public pages, images, fonts, and compiled assets;
- useful offline fallback;
- clear indication when content is cached or the device is offline;
- prompt-based updates without blocking primary content or navigation.

### Admin application

- installable administration shell;
- reliable draft preservation;
- explicit recovery of safe failed actions;
- update prompts that do not discard unsaved work;
- strict avoidance of private HTTP response caching;
- explicit cleanup when an account logs out or changes.

## Non-goals

The current PWA program does not attempt to:

- make the entire admin system usable offline;
- cache Supabase sessions or authentication responses;
- replay arbitrary mutations in the background;
- store raw client databases, full email bodies, payments, or credentials locally;
- deploy one service worker for both domains;
- turn the public website into a fully client-rendered SPA;
- hide freshness or network failures from users.

## Required app-local deliverables

Each application must eventually contain:

```txt
public/offline.html
public/favicon.ico
public/favicon.svg
public/apple-touch-icon-180x180.png
public/pwa-64x64.png
public/pwa-192x192.png
public/pwa-512x512.png
public/maskable-icon-512x512.png
```

Each application also needs:

- PWA plugin configuration consuming `@labs/pwa/config`;
- virtual-module service-worker registration;
- install and update interface;
- offline and stale-data interface states;
- installed-mode checks;
- accessibility and keyboard behavior;
- app-specific analytics and error reporting;
- production and preview verification.

## Current compatibility gate

The repository baseline lists Astro 7.0.7, while the currently published `@vite-pwa/astro` 1.2.0 package metadata officially declares peer support only through Astro 5. A local build can succeed with a reviewed peer-dependency override, but that is not the same as official support.

Before public PWA production rollout, choose one of these paths:

1. use a newer `@vite-pwa/astro` release whose peer range explicitly includes the installed Astro major;
2. keep the reviewed override and add preview, browser, install, update, and navigation lifecycle tests;
3. integrate `vite-plugin-pwa` through Astro's Vite configuration only after proving that route registration and the virtual module work correctly for the selected Astro version.

Do not suppress this mismatch silently.

## Official reference set

- Vite PWA documentation: https://vite-pwa-org.netlify.app/
- Astro integration: https://vite-pwa-org.netlify.app/frameworks/astro
- React integration: https://vite-pwa-org.netlify.app/frameworks/react
- Service-worker update behavior: https://vite-pwa-org.netlify.app/guide/service-worker-strategies-and-behaviors
- Workbox strategies: https://developer.chrome.com/docs/workbox/modules/workbox-strategies
- Workbox precaching: https://developer.chrome.com/docs/workbox/modules/workbox-precaching
- Service Worker API: https://developer.mozilla.org/docs/Web/API/Service_Worker_API
- Web app manifest: https://developer.mozilla.org/docs/Web/Progressive_web_apps/Manifest
- IndexedDB: https://developer.mozilla.org/docs/Web/API/IndexedDB_API
- Storage persistence: https://developer.mozilla.org/docs/Web/API/StorageManager/persist

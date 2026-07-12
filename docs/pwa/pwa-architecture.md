# Ken Arhin Labs PWA Architecture

_Last updated: 2026-07-11_

## Architecture summary

```txt
packages/pwa
  Shared TypeScript policy and browser-resilience package

apps/web
  Astro integration
  Public manifest
  Public service worker
  Public install/update UI
  Public offline page

apps/admin
  TanStack Start integration
  Admin manifest
  Admin service worker
  Admin install/update UI
  Admin offline page
  Draft and retry integration
```

The package produces configuration consumed by the two build systems. The generated service workers remain independent because the applications are served from separate origins.

## Origin and scope model

```txt
https://kenarhinlabs.com/
  Service worker: /sw.js
  Scope: /
  Manifest id: /
  Cache Storage: public-origin only
  IndexedDB: public-origin only

https://admin.kenarhinlabs.com/
  Service worker: /sw.js
  Scope: /
  Manifest id: /
  Cache Storage: admin-origin only
  IndexedDB: admin-origin only
```

A service worker registered on one origin cannot control pages on another origin. The two origins may use equivalent source code and naming conventions, but they never share browser storage or runtime control.

## Build-time and runtime topology

### Public

```txt
apps/web/astro.config.ts
  -> @vite-pwa/astro
  -> createPublicPwaOptions()
  -> Workbox generateSW
  -> dist/sw.js + manifest.webmanifest

Astro root layout/client component
  -> virtual:pwa-register
  -> register public service worker
  -> public update/offline UI
```

### Admin

```txt
apps/admin/vite.config.ts
  -> vite-plugin-pwa
  -> createAdminPwaOptions()
  -> Workbox generateSW
  -> build/sw.js + manifest.webmanifest

React app shell
  -> virtual:pwa-register/react
  -> register admin service worker
  -> update safety check
  -> admin update/offline UI
```

## Why `generateSW`

The delivered package uses Workbox `generateSW` rather than a custom `injectManifest` worker.

This is intentional for the current requirements:

- runtime rules can be expressed through Workbox configuration;
- the package can keep security-critical route ordering centralized;
- there is no current need for push, sync-event handlers, custom fetch pipelines, or bespoke service-worker messaging;
- generated workers reduce the amount of lifecycle code the project must maintain.

Move an application to `injectManifest` only when a real requirement cannot be represented safely by plugin configuration. That decision must be documented and tested because it increases lifecycle and security responsibility.

## Registration model

Both factories set:

```txt
registerType: prompt
injectRegister: null
skipWaiting: false
clientsClaim: false
```

The applications register manually through Vite PWA virtual modules. This allows the product UI to decide when to activate an update.

The service worker must not force-refresh an admin editor while:

- a draft is unsaved;
- an upload is active;
- a critical operation is running;
- retries require review;
- a server mutation is awaiting confirmation.

## Navigation model

The package explicitly sets:

```txt
navigateFallback: null
```

This disables Vite PWA's default SPA-style `index.html` navigation route. Both applications use deliberate navigation policies instead.

### Public navigation

```txt
same-origin document navigation
  -> NetworkFirst
  -> bounded public page cache
  -> /offline.html when both network and cache fail
```

### Admin navigation

```txt
same-origin document navigation
  -> NetworkOnly
  -> /offline.html when the network fails
```

This prevents private server-rendered admin HTML from entering runtime caches.

## Precache model

The shared default glob is intentionally narrow:

```txt
**/*.{js,css,woff,woff2}
```

Explicit assets include:

```txt
favicon.ico
favicon.svg
apple-touch-icon-180x180.png
pwa-64x64.png
pwa-192x192.png
pwa-512x512.png
maskable-icon-512x512.png
offline.html
```

The package does not automatically precache all generated HTML, images, JSON, or source maps.

## Public runtime cache model

| Request | Strategy | Default retention |
| --- | --- | --- |
| API, auth, preview, `.well-known` | `NetworkOnly` | none |
| Public document navigation | `NetworkFirst` | 40 entries / 7 days |
| Same-origin images | `StaleWhileRevalidate` | 120 entries / 30 days |
| Approved public media origins | `StaleWhileRevalidate` | 120 entries / 30 days |
| Same-origin fonts | `CacheFirst` | 16 entries / 365 days |
| Compiled JS/CSS/fonts | precache | build revision |

All limits are configurable.

## Admin runtime cache model

| Request | Strategy | Default retention |
| --- | --- | --- |
| API origin | `NetworkOnly` | none |
| Supabase origin | `NetworkOnly` | none |
| Sensitive same-origin paths | `NetworkOnly` | none |
| Admin navigation | `NetworkOnly` | none |
| Explicit safe asset origins | optional `StaleWhileRevalidate` | 40 entries / 30 days |
| Compiled JS/CSS/fonts | precache | build revision |

No broad image rule exists for the admin. An image can contain client, project, media-library, or email information and must not be considered safe merely because its MIME type is an image.

## Data-resilience model

HTTP caching and business-data resilience are separate.

```txt
Cache Storage
  Build assets and explicitly public runtime resources

IndexedDB DraftStore
  User-authored local draft snapshots

IndexedDB RetryQueue
  Explicit metadata/payload for reviewed replayable operations
```

The admin must never use Cache Storage as a hidden database for private application state.

## Dependency direction

```txt
apps/web -------> @labs/pwa/config
apps/web -------> @labs/pwa/client

apps/admin -----> @labs/pwa/config
apps/admin -----> @labs/pwa/client
apps/admin -----> @labs/pwa/storage
apps/admin -----> @labs/pwa/security

@labs/pwa -X-> application components
@labs/pwa -X-> authentication clients
@labs/pwa -X-> Hono API client
@labs/pwa -X-> Cloudflare bindings
```

## Failure-state design

The applications must distinguish:

```txt
Browser believes it is offline
Active API probe failed
A route was served from cache
Only the offline fallback is available
A mutation failed and can be retried
A mutation failed and requires human review
A new service-worker version is ready
Persistent storage was denied
Local storage is near quota
```

Do not collapse all failures into a generic "offline" toast.

## Lifecycle ownership

### Shared package

- evaluates whether an update is safe;
- observes connectivity hints;
- performs optional active probes;
- exposes installation state;
- stores drafts and retry records;
- defines cache policies.

### Applications

- know whether a draft is semantically dirty;
- know whether an upload or mutation is active;
- show and dismiss update prompts;
- perform retry API calls;
- display freshness and offline states;
- clear account-scoped local data;
- log failures and metrics.

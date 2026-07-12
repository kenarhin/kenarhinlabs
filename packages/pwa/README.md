# `@labs/pwa`

Shared Progressive Web App policy and browser-resilience utilities for Ken Arhin Labs.

The package deliberately shares **build-time configuration, security policy, install/connectivity helpers, and IndexedDB primitives**. It does not attempt to deploy one service worker across `kenarhinlabs.com` and `admin.kenarhinlabs.com`; each origin has its own manifest, service worker registration, caches, update lifecycle, and app-specific interface.

## Exports

```ts
import { createPublicPwaOptions, createAdminPwaOptions } from '@labs/pwa/config'
import {
  createInstallPromptController,
  observeConnectivity,
  evaluateUpdateSafety,
} from '@labs/pwa/client'
import { createDraftStore, createRetryQueue } from '@labs/pwa/storage'
import { classifyRequest } from '@labs/pwa/security'
```

## Public app

```ts
import AstroPWA from '@vite-pwa/astro'
import { createPublicPwaOptions } from '@labs/pwa/config'

AstroPWA(
  createPublicPwaOptions({
    siteUrl: 'https://kenarhinlabs.com',
    apiBaseUrl: 'https://api.kenarhinlabs.com',
    publicMediaOrigins: ['https://media.kenarhinlabs.com'],
  }),
)
```

Public defaults:

- no implicit SPA `index.html` navigation fallback (`navigateFallback: null`);

- prompt-based updates;
- API, auth, preview, and explicitly sensitive routes are `NetworkOnly`;
- public document navigations are `NetworkFirst` with a bounded cache and `/offline.html` fallback;
- same-origin/public media use bounded stale-while-revalidate caching;
- self-hosted fonts use bounded cache-first behavior;
- only compiled JS, CSS, fonts, icons, and the offline page are precached.

## Admin app

```ts
import { createAdminPwaOptions } from '@labs/pwa/config'
import { VitePWA } from 'vite-plugin-pwa'

VitePWA(
  createAdminPwaOptions({
    siteUrl: 'https://admin.kenarhinlabs.com',
    apiBaseUrl: 'https://api.kenarhinlabs.com',
    supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
  }),
)
```

Admin defaults:

- no implicit SPA `index.html` navigation fallback (`navigateFallback: null`);

- prompt-based updates to protect unsaved work;
- API and Supabase requests are `NetworkOnly`;
- navigation HTML is not runtime-cached;
- offline navigation receives `/offline.html`;
- no broad image, API, session, email, client, or private-record cache;
- optional runtime caching is limited to explicitly approved safe asset origins;
- drafts and retry metadata are stored explicitly in IndexedDB rather than hidden inside HTTP caches.

## Storage safety

`DraftStore` and `RetryQueue` are local resilience tools, not secure vaults. Never store access tokens, refresh tokens, cookies, service-role credentials, raw email bodies, payment information, or unrestricted client records. Every record is namespaced by `ownerId`, expires, and should be cleared on logout.

Retry items default to `manual`. Only operations explicitly marked `automatic` are processed by `RetryQueue.process()`. Automatic retries require an API idempotency key and a server endpoint designed for replay.

## Required app-local work

Each app still owns:

- icon source artwork and generated icons;
- `public/offline.html`;
- service-worker registration through the appropriate Vite PWA virtual module;
- update and installation UI;
- offline/stale indicators;
- logout cleanup;
- real editor autosave integration;
- API idempotency enforcement;
- observability and analytics;
- installed-mode and offline testing.

See the PWA documents in the project `docs/` folder for the full architecture and integration guide.

## Astro compatibility gate

The repository baseline currently uses Astro 7.0.7, while the published `@vite-pwa/astro` 1.2.0 peer range officially covers Astro through major version 5. A local build was validated with a reviewed peer override, but production integration still requires either an officially compatible package release or an explicit override plus preview/browser testing. See `docs/pwa-validation-report.md`.

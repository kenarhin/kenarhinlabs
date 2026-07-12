# Public Website PWA

_Last updated: 2026-07-11_

Application:

```txt
apps/web
```

Origin:

```txt
https://kenarhinlabs.com
```

Framework:

```txt
Astro on Cloudflare Workers
```

## Purpose

The public PWA is an installable content and brand experience. It may cache public, non-sensitive resources to improve repeat visits and provide useful offline access. It must preserve Astro's content-first architecture and must not convert the site into a broad client-side SPA.

## Dependency setup

```sh
pnpm --filter @labs/web add @labs/pwa@workspace:* @vite-pwa/astro
```

The current repository baseline and current published Astro PWA integration have an official peer-version mismatch. Resolve the compatibility gate in `pwa-validation-report.md` before treating the integration as production-approved.

## Astro configuration

```ts
import cloudflare from '@astrojs/cloudflare'
import AstroPWA from '@vite-pwa/astro'
import { createPublicPwaOptions } from '@labs/pwa/config'
import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://kenarhinlabs.com',
  adapter: cloudflare(),
  integrations: [
    AstroPWA(
      createPublicPwaOptions({
        siteUrl: 'https://kenarhinlabs.com',
        apiBaseUrl: 'https://api.kenarhinlabs.com',
        publicMediaOrigins: ['https://media.kenarhinlabs.com'],
      }),
    ),
  ],
})
```

Use the real production and preview origins. Do not put preview API origins into production configuration.

## Registration

Because the package sets `injectRegister: null`, register the service worker from an app-local client script or Astro component.

```ts
import {
  startPeriodicServiceWorkerUpdateChecks,
} from '@labs/pwa/client'

export async function registerPublicPwa() {
  if (typeof window === 'undefined') return

  const { registerSW } = await import('virtual:pwa-register')
  let stopPeriodicChecks: (() => void) | undefined

  const updateServiceWorker = registerSW({
    immediate: true,
    onNeedRefresh() {
      window.dispatchEvent(new CustomEvent('kal:pwa-update-ready'))
    },
    onOfflineReady() {
      window.dispatchEvent(new CustomEvent('kal:pwa-offline-ready'))
    },
    onRegisteredSW(_url, registration) {
      if (registration) {
        stopPeriodicChecks = startPeriodicServiceWorkerUpdateChecks(registration)
      }
    },
    onRegisterError(error) {
      console.error('Public PWA registration failed', error)
    },
  })

  return {
    updateServiceWorker,
    stop: () => stopPeriodicChecks?.(),
  }
}
```

When Astro client-side navigation is enabled, initialize the registration once at the application shell level. Do not register a second worker on every `astro:page-load` event.

## Public update interface

The update prompt should:

- use `role="status"` or an appropriate dialog pattern;
- announce that a new version is ready;
- provide `Update now` and `Later` actions;
- avoid covering primary navigation or the main CTA;
- not refresh while a multi-step project form has unsaved local progress;
- call the registered `updateServiceWorker(true)` only after approval.

Although the public application has less sensitive state than the admin, it may still contain an active project request or comparison flow. Use the same update-safety concept where necessary.

## Public install interface

Use `createInstallPromptController()` in a small focused island or client script.

Display an install action only when:

```txt
controller state.available = true
and controller state.installed = false
```

Do not display a disabled install button permanently on unsupported browsers. On iOS and browsers without `beforeinstallprompt`, provide contextual instructions only when helpful.

## Manifest requirements

Before launch, review:

```txt
name
short_name
description
id
start_url
scope
display
theme_color
background_color
icons
shortcuts
screenshots
categories
```

Recommended public manifest additions:

- one narrow/mobile screenshot;
- one wide/desktop screenshot;
- localized descriptions if additional languages are introduced;
- final icon artwork derived from the approved brand mark.

Do not claim capabilities in shortcuts or screenshots that do not exist.

## Public caching policy

### Network only

The following must bypass runtime caches:

```txt
API origins
authentication endpoints
preview routes
personalized routes
request-aware lead routes where responses vary by user
signed media URLs
`.well-known` responses
any response containing private or session-specific information
```

### Network first

Public document navigation uses `NetworkFirst` with a default four-second network timeout. The strategy:

1. tries the current network version;
2. uses a cached public page when the network fails or times out;
3. uses `/offline.html` when no cached page exists.

Cached pages must display a global offline indicator. Do not claim that dates, offers, prices, or availability are current while offline.

### Stale while revalidate

Use for:

```txt
public project screenshots
published article images
public tool logos
public R2 media with stable URLs
```

Do not include private R2 origins or signed URLs in `publicMediaOrigins`.

### Cache first

Use for self-hosted immutable or slowly changing fonts. The font URLs should be versioned by the build or package filename.

## Offline page

Create:

```txt
apps/web/public/offline.html
```

Requirements:

- standalone HTML with inline minimal CSS;
- no dependency on the main JS bundle;
- brand colors and approved fonts only when locally reliable;
- clear message that the network is unavailable;
- retry action using normal navigation or reload;
- link to `/` where useful;
- no promise that uncached content is available;
- accessible focus, headings, and contrast;
- no animation required to understand it.

Suggested content structure:

```txt
Ken Arhin Labs
You’re offline
Previously visited public pages may still be available.
[Try again] [Go to homepage]
```

## Offline and stale UI

The site shell should subscribe to `observeConnectivity()`. Treat its result as a hint, not proof.

Show a persistent but quiet banner when offline:

```txt
You appear to be offline. Some pages may be cached and may not reflect recent updates.
```

For freshness-sensitive content, render a visible timestamp and offline qualifier.

Examples:

```txt
Offer information cached on 11 July 2026
Pricing may have changed while you were offline
```

## Analytics behavior

- queueing analytics is not enabled by the package;
- do not introduce offline analytics without a documented privacy and duplication policy;
- installation, update, offline-fallback, and cache-hit metrics should be low-cardinality;
- never put query strings, form content, email addresses, or client identifiers into PWA telemetry.

## Public launch gate

- manifest passes browser application checks;
- every icon resolves with correct MIME type and dimensions;
- service worker is registered only once;
- navigation uses explicit `NetworkFirst`, not an SPA index fallback;
- public API and preview routes are `NetworkOnly`;
- cached pages clearly indicate offline state;
- new service-worker update is prompt-based;
- Astro page transitions do not duplicate listeners;
- install and update prompts are keyboard accessible;
- installed and normal browser modes are both tested;
- preview deployment passes Lighthouse PWA and manual offline tests.

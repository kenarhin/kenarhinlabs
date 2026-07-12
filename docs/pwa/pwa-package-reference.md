# `@labs/pwa` Package Reference

_Last updated: 2026-07-11_

Package path:

```txt
packages/pwa
```

Package name:

```txt
@labs/pwa
```

## Installation in the workspace

Add the package to both applications:

```sh
pnpm --filter @labs/web add @labs/pwa@workspace:*
pnpm --filter @labs/admin add @labs/pwa@workspace:*
```

Install application-specific PWA integrations:

```sh
pnpm --filter @labs/web add @vite-pwa/astro
pnpm --filter @labs/admin add vite-plugin-pwa
```

The package declares `vite-plugin-pwa` as a peer dependency because its exported option types and factories target that plugin's configuration model. The workspace should keep one reviewed compatible version.

## Exports

```ts
import { PWA_PACKAGE_VERSION } from '@labs/pwa'

import {
  createPublicPwaOptions,
  createAdminPwaOptions,
  createPublicManifest,
  createAdminManifest,
} from '@labs/pwa/config'

import {
  createInstallPromptController,
  observeConnectivity,
  probeNetwork,
  requestPersistentStorage,
  getStorageEstimate,
  evaluateUpdateSafety,
  startPeriodicServiceWorkerUpdateChecks,
} from '@labs/pwa/client'

import {
  createDraftStore,
  createRetryQueue,
  deletePwaDatabase,
} from '@labs/pwa/storage'

import {
  classifyRequest,
  isResponseSafeToCache,
} from '@labs/pwa/security'
```

## Configuration factories

### `createPublicPwaOptions(config)`

Required:

```ts
siteUrl: string
```

Common options:

```ts
interface PublicPwaConfig {
  siteUrl: string
  apiBaseUrl?: string
  publicMediaOrigins?: string[]
  networkOnlyOrigins?: string[]
  networkOnlyPathPrefixes?: string[]
  pageCacheMaxEntries?: number
  pageCacheMaxAgeSeconds?: number
  mediaCacheMaxEntries?: number
  mediaCacheMaxAgeSeconds?: number
  fontCacheMaxEntries?: number
  fontCacheMaxAgeSeconds?: number
  navigationNetworkTimeoutSeconds?: number

  name?: string
  shortName?: string
  description?: string
  appId?: string
  startUrl?: string
  scope?: string
  lang?: string
  themeColor?: string
  backgroundColor?: string
  offlineFallbackUrl?: string
  includeAssets?: string[]
  maximumFileSizeToCacheInBytes?: number
  devEnabled?: boolean
  disabled?: boolean
  advanced?: PwaAdvancedOptions
}
```

Example:

```ts
createPublicPwaOptions({
  siteUrl: 'https://kenarhinlabs.com',
  apiBaseUrl: 'https://api.kenarhinlabs.com',
  publicMediaOrigins: ['https://media.kenarhinlabs.com'],
  networkOnlyPathPrefixes: ['/api', '/auth', '/preview', '/.well-known'],
})
```

### `createAdminPwaOptions(config)`

Required:

```ts
siteUrl: string
apiBaseUrl: string
supabaseUrl: string
```

Common options:

```ts
interface AdminPwaConfig {
  siteUrl: string
  apiBaseUrl: string
  supabaseUrl: string
  sensitiveOrigins?: string[]
  sensitivePathPrefixes?: string[]
  safeAssetOrigins?: string[]
  safeAssetCacheMaxEntries?: number
  safeAssetCacheMaxAgeSeconds?: number

  // shared options are also available
}
```

Example:

```ts
createAdminPwaOptions({
  siteUrl: 'https://admin.kenarhinlabs.com',
  apiBaseUrl: 'https://api.kenarhinlabs.com',
  supabaseUrl: 'https://project.supabase.co',
  sensitivePathPrefixes: [
    '/api',
    '/_server',
    '/__server',
    '/_tanstack',
    '/auth/callback',
  ],
})
```

## Advanced overrides

The `advanced` option exists for reviewed exceptions without allowing an application to replace core safety settings.

```ts
advanced: {
  additionalRuntimeCaching: [],
  workbox: {},
  manifest: {},
  plugin: {},
}
```

The package intentionally prevents advanced overrides from replacing:

```txt
runtimeCaching
navigateFallback
skipWaiting
clientsClaim
cacheId
strategies
registerType
injectRegister
includeAssets
includeManifestIcons
```

Arrays in manifest overrides replace defaults rather than being concatenated. This avoids accidental duplicate icons, screenshots, or shortcuts.

Security-critical route order is:

```txt
1. sensitive origins: NetworkOnly
2. sensitive same-origin paths: NetworkOnly
3. reviewed additional rules
4. broad app-specific navigation/media rules
```

An added rule must not broaden caching for private responses.

## Manifest defaults

### Public

```txt
Name: Ken Arhin Labs
Short name: KAL Labs
Start URL: /
Display: standalone
Theme: Lab Ink
Background: Warm Canvas
Shortcuts: Start a project, Work, Field Notes
```

### Admin

```txt
Name: Ken Arhin Labs Admin
Short name: KAL Admin
Start URL: /dashboard
Display: window-controls-overlay / standalone / minimal-ui
Theme and background: Lab Ink
Shortcuts: Dashboard, New content, Leads
```

Review every shortcut before launch. A shortcut may be retained only if its route exists and its target behavior is valid when the user is logged out or offline.

## Install prompt controller

```ts
const controller = createInstallPromptController()
controller.start()

const unsubscribe = controller.subscribe((state) => {
  // state.available, state.installed, state.dismissed
})

const result = await controller.prompt()
// accepted | dismissed | unavailable

unsubscribe()
controller.stop()
```

The browser controls whether `beforeinstallprompt` is available. The application must not assume every browser provides a programmable prompt. Always provide platform-neutral installation guidance where appropriate.

## Connectivity helpers

```ts
const stop = observeConnectivity((snapshot) => {
  console.log(snapshot.status, snapshot.effectiveType, snapshot.saveData)
})

const apiReachable = await probeNetwork({
  url: 'https://api.kenarhinlabs.com/health',
  method: 'HEAD',
  timeoutMs: 5_000,
})
```

`navigator.onLine` is only a connectivity hint. Use a no-store probe when an operation truly depends on API reachability.

## Storage helpers

```ts
const persistence = await requestPersistentStorage()
// granted | denied | unsupported

const estimate = await getStorageEstimate()
// usage, quota, usageRatio when available
```

Persistence is a request, not a guarantee. The user agent may deny it or later evict data.

## Update safety

```ts
const decision = evaluateUpdateSafety({
  unsavedDrafts: 1,
  activeUploads: 0,
  pendingAutomaticRetries: 0,
  pendingManualRetries: 0,
  criticalOperationInProgress: false,
})
```

Use the decision before calling:

```ts
updateServiceWorker(true)
```

A blocked update should remain visible and explain what must be completed or saved first.

## Draft store

```ts
const drafts = createDraftStore<MyJsonPayload>()

await drafts.save({
  key: 'content:new:local-123',
  ownerId: authUserId,
  kind: 'content',
  schemaVersion: 1,
  payload: { title: 'Draft', body: [] },
})

const draft = await drafts.get('content:new:local-123', authUserId)
const list = await drafts.list(authUserId, 'content')
await drafts.delete('content:new:local-123', authUserId)
await drafts.clearOwner(authUserId)
```

Defaults:

```txt
TTL: 30 days
Maximum records per owner: 50
Database: ken-arhin-labs-pwa
```

The key must be stable and unique for the draft. The `ownerId` must come from the authenticated identity, not a display name or email address.

## Retry queue

```ts
const queue = createRetryQueue<MyJsonPayload>()

await queue.enqueue({
  ownerId: authUserId,
  operation: 'content.save-draft',
  mode: 'manual',
  idempotencyKey: crypto.randomUUID(),
  payload: { contentId, revision, changes },
})
```

Processing explicitly automatic records:

```ts
await queue.process({
  ownerId: authUserId,
  execute: async (item) => {
    await api.saveDraft(item.payload, {
      idempotencyKey: item.idempotencyKey,
    })
  },
})
```

Defaults:

```txt
Mode: manual
TTL: 7 days
Maximum attempts: 5
Lease: 60 seconds
Base backoff: 5 seconds
Maximum backoff: 30 minutes
```

A queue item includes a lease, attempt counter, next-attempt time, expiry, and normalized last error. Non-retryable failures become `blocked`; exhausted retryable failures become `dead`.

## Request policy helpers

```ts
const classification = classifyRequest(request, {
  sensitiveOrigins: [apiBaseUrl, supabaseUrl],
  sensitivePathPrefixes: ['/api', '/auth'],
})
```

A request is cacheable only when it is a safe GET and does not match a sensitive origin, path, or header.

```ts
isResponseSafeToCache(response)
```

This rejects failed, opaque, `Set-Cookie`, `private`, and `no-store` responses. It is a defensive helper for custom integrations; the main service-worker policies remain the primary control.

## Package commands

From `packages/pwa`:

```sh
pnpm typecheck
pnpm test
pnpm check
```

The final repository may use root scripts such as:

```json
{
  "scripts": {
    "check:pwa": "pnpm --filter @labs/pwa check"
  }
}
```

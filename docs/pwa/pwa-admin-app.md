# Admin Application PWA

_Last updated: 2026-07-11_

Application:

```txt
apps/admin
```

Origin:

```txt
https://admin.kenarhinlabs.com
```

Framework:

```txt
TanStack Start on Cloudflare Workers
```

## Purpose

The admin PWA is an installable operational interface with resilient local drafts and explicit recovery paths. It is not an offline mirror of the Ken Arhin Labs database.

The primary safety rule is:

> Cache the application shell, not private business responses.

## Dependency setup

```sh
pnpm --filter @labs/admin add @labs/pwa@workspace:* vite-plugin-pwa
```

## Vite configuration

Integrate the plugin into the final TanStack Start Vite configuration without removing the framework's required plugins.

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

Use environment-resolved values. Do not hard-code a preview Supabase or API origin into production.

## Registration and update prompt

Use the React virtual module:

```tsx
/// <reference types="vite-plugin-pwa/react" />

import { evaluateUpdateSafety } from '@labs/pwa/client'
import { useRegisterSW } from 'virtual:pwa-register/react'

export function AdminPwaStatus() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW()

  const safety = evaluateUpdateSafety({
    unsavedDrafts: 0,
    activeUploads: 0,
    pendingAutomaticRetries: 0,
    pendingManualRetries: 0,
    criticalOperationInProgress: false,
  })

  if (!needRefresh && !offlineReady) return null

  return (
    <section role="status" aria-live="polite">
      <p>{needRefresh ? 'An admin update is ready.' : 'The admin shell is available offline.'}</p>
      {needRefresh && (
        <button
          type="button"
          disabled={!safety.canUpdateImmediately}
          onClick={() => void updateServiceWorker(true)}
        >
          Update now
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          setNeedRefresh(false)
          setOfflineReady(false)
        }}
      >
        Later
      </button>
    </section>
  )
}
```

Replace placeholder counts with real editor, upload, queue, and mutation state. When update is blocked, tell the user why and provide a path to save, cancel, or review the operation.

## Admin cache policy

### Always network only

```txt
Hono API origin
Supabase project origin
Supabase Auth endpoints
TanStack server-function endpoints
session and callback routes
admin document navigation
lead and client data
projects and private notes
emails and message content
roles and permissions
media library results
signed R2 URLs
uploads and upload metadata
billing or payment information
all mutations
```

### Precache only

The generated build may precache:

```txt
hashed JavaScript
hashed CSS
self-hosted font files
explicit PWA icons
offline.html
```

Review build output. If the framework emits HTML or data files matching broadened patterns, do not add them casually.

### Optional safe asset origins

`safeAssetOrigins` is empty by default. Add an origin only when every cached GET response from that origin is demonstrably public and non-sensitive.

Bad example:

```txt
private-media.kenarhinlabs.com
```

Potentially acceptable example:

```txt
public-brand-assets.kenarhinlabs.com
```

A mixed public/private origin should not be allowlisted as a whole.

## Offline behavior

When offline, the admin navigation route falls back to:

```txt
/offline.html
```

The offline page should not imitate a fully available dashboard. It should explain:

- the network connection is unavailable;
- private server records cannot be loaded;
- drafts saved on this device may still exist;
- the user can retry, inspect local draft status, or return later;
- queued actions are not proof of server completion.

Do not render cached client names, email subjects, project details, or account state on the offline page.

## Draft autosave integration

Use `DraftStore` at the feature boundary, not inside generic shadcn primitives.

Recommended flow:

```txt
Editor becomes dirty
  -> debounce 1–3 seconds
  -> serialize only the permitted draft model
  -> save with authenticated ownerId
  -> show local-saved timestamp

Server save succeeds
  -> update canonical revision
  -> delete or replace local draft

Editor opens
  -> load server record
  -> check local draft for same owner/entity
  -> compare revision and updated time
  -> ask user whether to restore when needed
```

Do not silently overwrite a newer server version with an older local draft.

## Retry integration

Retry only actions with a deliberate server contract.

Good candidates, after API design:

```txt
idempotent draft save
non-destructive metadata update with version check
upload-finalization acknowledgement when object identity is stable
```

Manual-review candidates:

```txt
publishing
sending email
client-visible project updates
changing roles or permissions
deleting records
bulk actions
financial or billing operations
```

Never enqueue Supabase access or refresh tokens. Re-authenticate when replaying an action.

## Authentication and account changes

On logout:

```ts
await drafts.clearOwner(user.id)
await retries.clearOwner(user.id)
```

Then clear app-local in-memory state. Decide whether local drafts should be exported or explicitly retained before logout only through a conscious product flow.

On account switch, never show one user's local records to another. Every read must provide the authenticated `ownerId`.

Do not use email address as the namespace because addresses can change. Use the stable Supabase Auth user ID.

## Storage persistence

The admin may ask for persistent browser storage only after the user has meaningfully used draft functionality. A denial must not block the app.

Show clear language:

```txt
This browser may remove local drafts when storage is low. Server-saved work is unaffected.
```

Monitor quota using `getStorageEstimate()` and warn before local storage is critically full. The browser's reported quota is approximate.

## Admin installed-mode behavior

Installed mode should preserve:

- the same authentication and Cloudflare Access controls;
- normal deep links;
- logout and session-expiry behavior;
- visible online/offline state;
- update prompts;
- browser-compatible external-link behavior.

Do not weaken Cloudflare Access because the application is installed.

## Admin launch gate

- service worker never runtime-caches admin navigation HTML;
- Hono and Supabase origins are `NetworkOnly`;
- auth/session responses are not stored in Cache Storage or IndexedDB;
- draft payload review is complete for each feature;
- logout clears owner-scoped drafts and retries;
- replayed operations require fresh auth and idempotency keys;
- update activation is blocked during dirty, upload, retry, or critical states;
- offline page does not reveal private records;
- installed-mode Cloudflare Access and Supabase Auth flows pass;
- browser back/forward and TanStack navigation do not duplicate registration;
- tests cover multi-account behavior on a shared device.

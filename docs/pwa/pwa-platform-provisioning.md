# PWA Platform Provisioning

_Last updated: 2026-07-11_

This guide describes repository files, dependencies, icons, headers, environments, and Cloudflare-facing configuration. It does not deploy resources automatically.

## Repository structure

```txt
packages/pwa/
  package.json
  tsconfig.json
  README.md
  src/
  tests/
  examples/

apps/web/
  astro.config.ts
  public/
    offline.html
    favicon.ico
    favicon.svg
    apple-touch-icon-180x180.png
    pwa-64x64.png
    pwa-192x192.png
    pwa-512x512.png
    maskable-icon-512x512.png
  src/
    components/pwa/
    lib/pwa/

apps/admin/
  vite.config.ts
  public/
    offline.html
    favicon.ico
    favicon.svg
    apple-touch-icon-180x180.png
    pwa-64x64.png
    pwa-192x192.png
    pwa-512x512.png
    maskable-icon-512x512.png
  src/
    components/pwa/
    lib/pwa/
    lib/drafts/
    lib/retries/
```

## Workspace package registration

Ensure `pnpm-workspace.yaml` includes:

```yaml
packages:
  - apps/*
  - packages/*
```

Install from repository root:

```sh
pnpm install
```

## Version policy

Pin or constrain reviewed versions through the workspace and lockfile. At the time this package was produced:

```txt
vite-plugin-pwa   1.3.0
@vite-pwa/astro   1.2.0
```

Do not automatically accept major updates. Review:

- Vite compatibility;
- Workbox changes;
- virtual module types;
- manifest output;
- generated service-worker route order;
- framework peer dependencies.

## Astro peer compatibility

The currently published `@vite-pwa/astro` 1.2.0 metadata does not officially include Astro 7 in its peer range. If the repository remains on Astro 7:

- prefer a newer officially compatible integration when available;
- otherwise document a pnpm peer-dependency override;
- test preview and production builds;
- test registration after Astro view transitions;
- test installability and update prompts;
- retain the override as an explicit architecture exception.

Do not add a global `strict-peer-dependencies=false` setting merely to hide the mismatch. Use the narrowest reviewed pnpm peer rule supported by the chosen pnpm version.

## Icon generation

Use one approved high-resolution square source mark with safe padding. Generate at minimum:

```txt
64x64 PNG
180x180 Apple touch icon
192x192 PNG
512x512 PNG
512x512 maskable PNG
favicon SVG
favicon ICO
```

The maskable icon must keep essential artwork inside the safe zone. Do not create it by merely renaming the ordinary 512px icon.

A stable CLI workflow can use the Vite PWA assets generator and its `minimal-2023` preset after reviewing output. Keep source artwork in the brand-assets source location; commit generated application assets, not private font files or temporary generator outputs.

Run image checks for:

- exact dimensions;
- alpha/background behavior;
- maskable safe area;
- no blurred rasterization;
- correct MIME type;
- readable appearance at 64px;
- light and dark device surfaces.

Public and admin may share the same core mark but should have distinguishable application treatment if both can be installed side by side.

## Offline HTML

Each application owns its own `offline.html` because the message and privacy boundary differ.

Keep it:

- self-contained;
- small;
- accessible;
- free of remote dependencies;
- free of private data;
- usable without JavaScript;
- styled with brand tokens copied as literal fallback values only within this standalone file.

## Environment configuration

### Public

```txt
PUBLIC_SITE_URL
PUBLIC_API_BASE_URL
PUBLIC_R2_BASE_URL
PUBLIC_ENVIRONMENT
```

### Admin

```txt
VITE_ADMIN_SITE_URL or final framework equivalent
VITE_API_BASE_URL
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

The exact exposure prefixes must follow the installed framework versions. Never expose secrets.

PWA factories should receive environment-resolved origins:

```ts
createAdminPwaOptions({
  siteUrl: publicAdminOrigin,
  apiBaseUrl: publicApiOrigin,
  supabaseUrl: publicSupabaseOrigin,
})
```

## Environment separation

Use separate builds and origins for:

```txt
Local
Preview
Production
```

Service workers are persistent. Developers should not register a production worker on a local origin or use production API writes during routine local PWA testing.

Recommended preview domains:

```txt
web-preview.kenarhinlabs.com or deployment URL
admin-preview.kenarhinlabs.com or deployment URL
api-preview.kenarhinlabs.com
```

Preview configurations must use preview API and Supabase resources.

## Development service worker

`devEnabled` defaults to false. Enable it only for deliberate service-worker debugging because development workers can obscure normal hot reload behavior and leave stale caches.

When enabled:

- use a clean browser profile;
- inspect Application > Service Workers and Cache Storage;
- unregister and clear site data after tests;
- do not treat development behavior as production proof.

## Cloudflare response headers

Configure or verify response headers for generated files:

| File | Recommended cache behavior |
| --- | --- |
| `/sw.js` | `no-cache` / revalidate |
| `/manifest.webmanifest` | short cache or revalidate |
| hashed JS/CSS/font | one year immutable |
| `/offline.html` | no-cache or short cache |
| icons | long cache only when filenames change on replacement |

Also verify:

```txt
Content-Type for manifest
Content-Type for service worker
X-Content-Type-Options: nosniff
Referrer-Policy
Permissions-Policy
HSTS on production HTTPS
CSP
frame-ancestors
```

## HTTPS

Production service workers require a secure context. Cloudflare production and preview deployments must use HTTPS. Localhost is treated specially for development.

## CORS for public media

Approved cross-origin public media used by runtime caching should send CORS and cache headers that match intended use. Avoid opaque caching.

Example considerations:

```txt
Access-Control-Allow-Origin: https://kenarhinlabs.com
Cache-Control: public, max-age=...
Vary: Origin when needed
```

Do not enable permissive CORS on private media.

## Content Security Policy

Add:

```txt
worker-src 'self'
manifest-src 'self'
```

Then maintain explicit `connect-src`, `img-src`, and `font-src` origins. Test CSP in report-only mode before enforcement when integrating the first production worker.

## Deployment checks

After each production build:

```sh
pnpm --filter @labs/pwa check
pnpm --filter @labs/web build
pnpm --filter @labs/admin build
```

Then inspect generated artifacts:

```txt
sw.js exists
manifest.webmanifest exists
offline.html exists
all icon URLs resolve
precache manifest contains only expected files
runtime route order is correct
navigateFallback is not an unintended index.html route
```

Cloudflare dry-run checks remain required for both applications.

## Rollback preparation

Keep the previous production build deployable. A rollback must publish a service worker that can replace the bad version and clean incompatible caches.

Do not simply delete `sw.js` during an incident; already-installed workers may continue controlling clients. Ship a corrective worker or an intentional unregister/cleanup flow after understanding the impact.

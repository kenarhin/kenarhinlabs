# PWA Security and Caching Policy

_Last updated: 2026-07-11_

This document is mandatory. Its rules override performance preferences and generic PWA recommendations.

## Threat model

PWA features introduce durable browser state that can outlive a tab, route, deployment, or session. Risks include:

```txt
Private responses remaining in Cache Storage
Old service workers serving stale application code
One account seeing another account's local drafts
Automatic mutation replay after permissions changed
Signed URLs remaining available after intended expiry
Stale offers or operational state being shown as current
Offline fallback revealing sensitive context
Tokens or headers being persisted in retry data
Overbroad route patterns bypassing NetworkOnly rules
```

## Absolute prohibitions

Never cache or persist:

```txt
Supabase access tokens
Supabase refresh tokens
session cookies
authorization headers
service-role keys
Cloudflare API tokens
SMTP tokens
signed upload credentials
password reset or magic-link data
raw authentication responses
payment information
private email bodies
full private client records
role/permission responses
private notes
private analytics exports
```

## Route ordering

Workbox uses first-match routing. Therefore:

```txt
NetworkOnly sensitive-origin rules
  must appear before
additional reviewed rules
  which must appear before
broad navigation, image, or font rules
```

Do not prepend application rules ahead of package security rules.

## Public allowlist

The public application may cache only resources that are both:

1. public to any visitor; and
2. safe to show stale.

Examples:

```txt
published Field Notes
published case studies
public service pages
public navigation
public project screenshots
public logos and brand assets
self-hosted fonts
versioned JS and CSS
```

Freshness-sensitive public resources require explicit design:

```txt
offers
pricing
availability
legal notices
security notices
service status
```

A cached copy must include a timestamp or stale warning where a visitor could make a decision based on it.

## Admin denylist

The admin application's cache policy is deny-by-default for runtime data.

```txt
all navigation HTML        NetworkOnly
Hono API                   NetworkOnly
Supabase                   NetworkOnly
auth callbacks             NetworkOnly
TanStack server functions  NetworkOnly
private media              NetworkOnly
```

Only explicit, fully public static asset origins may be added to `safeAssetOrigins`.

## Request classification

A custom caching path should reject:

- non-GET methods;
- sensitive origins;
- sensitive path prefixes;
- requests containing authentication, cookie, API-key, CSRF, or Supabase-auth headers;
- malformed URLs.

The `classifyRequest()` helper implements these baseline checks. It is not a substitute for an allowlist.

## Response classification

A custom cache path should reject responses that are:

```txt
not successful
opaque
Set-Cookie bearing
Cache-Control: private
Cache-Control: no-store
```

`isResponseSafeToCache()` checks these baseline conditions.

CORS must be configured so that approved cross-origin public media responses can be evaluated. Do not use opaque-response caching as a shortcut for private or unknown origins.

## Cache names and versions

Cache names include a package schema version. When a policy or data format changes incompatibly:

1. increment the cache schema version;
2. allow `cleanupOutdatedCaches` to remove old generated caches;
3. test update from the previous production worker;
4. verify offline fallback survives the transition;
5. document any deliberate retained cache.

Do not manually reuse a private cache name for public content.

## Cache limits

Every runtime cache must define:

```txt
maximum entries
maximum age
purgeOnQuotaError
cacheable response status
```

Avoid unlimited caches. Public media can grow quickly and compete with local draft storage for the origin's quota.

## Signed URLs

Never runtime-cache signed R2, Supabase Storage, or other expiring URLs by broad origin.

Problems include:

- cached content outliving authorization;
- old query signatures creating unbounded cache keys;
- access continuing after server-side expiry;
- sensitive media remaining on a shared device.

Use public stable URLs only for public assets. Private media should be fetched through current authorization and remain `NetworkOnly`.

## Authentication lifecycle

A service worker can continue operating while a session changes. Therefore:

- the worker must not infer authorization from prior requests;
- every private fetch remains a network request;
- queued operations acquire current auth at execution time;
- logout clears user-scoped IndexedDB data;
- account switching never reuses another owner's draft or retry records;
- session expiry blocks replay rather than silently retrying credentials.

## Cloudflare Access

Cloudflare Access protects the admin perimeter but does not replace app-level rules.

Installed mode must still pass through:

```txt
Cloudflare Access
Supabase Auth
Hono permission checks
Supabase RLS and grants
```

Do not add service-worker fallbacks that make protected admin pages appear available after Access is revoked.

## Content Security Policy

PWA integration should work with a strict CSP.

Review directives for:

```txt
default-src
script-src
style-src
font-src
img-src
connect-src
worker-src
manifest-src
frame-ancestors
```

Likely requirements:

```txt
worker-src 'self'
manifest-src 'self'
connect-src 'self' https://api.kenarhinlabs.com <supabase-origin>
font-src 'self'
```

Add public R2/media origins to `img-src` only where approved. Do not add broad wildcards to make installation work.

## Service-worker delivery headers

Recommended behavior:

```txt
/sw.js
  Content-Type: text/javascript
  Cache-Control: no-cache
  Service-Worker-Allowed: not required when /sw.js controls /

/manifest.webmanifest
  Content-Type: application/manifest+json
  Cache-Control: short-lived or revalidated

/assets/<hashed-file>
  Cache-Control: public, max-age=31536000, immutable

/offline.html
  Cache-Control: no-cache or short revalidation
```

The service-worker script must not be served with a year-long immutable cache header.

## Offline page privacy

An offline page must be generic. It must not contain:

```txt
last visited client
email subject
user display name unless rendered locally after explicit review
project title
lead details
permissions
session state
```

For admin, the offline page should be useful without any authenticated data.

## Install prompt privacy

Do not use installation state as a fingerprinting or cross-site tracking signal. Record only necessary product analytics, such as a coarse install acceptance event, and avoid combining it with sensitive account or content identifiers.

## Telemetry rules

Allowed low-cardinality events:

```txt
pwa_registration_success
pwa_registration_failure
pwa_update_ready
pwa_update_accepted
pwa_offline_fallback
pwa_install_prompt_shown
pwa_install_accepted
pwa_draft_restore
pwa_retry_blocked
```

Never log:

```txt
draft payload
retry payload
access token
signed URL query
email body
client record
full URL containing private IDs or queries
```

## Security review gate

Before adding any new runtime cache rule, document:

1. exact origin and path pattern;
2. whether every response is public;
3. whether stale data can cause harm;
4. cache maximum entries and age;
5. authentication/header behavior;
6. logout implications;
7. how the rule is tested;
8. rollback plan.

No undocumented cache expansion should be merged.

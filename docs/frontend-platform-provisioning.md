# Frontend Platform Provisioning

_Last updated: 2026-07-11_

This guide defines the repository and deployment conventions needed to initialize the Ken Arhin Labs frontend applications. It is procedural documentation. Copying these files does not create applications, deploy Workers, mutate Cloudflare resources, or initialize shadcn automatically.

## Current Repository State

The frontend applications have not yet been initialized. The shared design package now exists at:

```txt
packages/design
```

The public and admin applications will live at:

```txt
apps/web
apps/admin
```

## Verified Package Baseline

The following versions were current when this guide was prepared:

```txt
tailwindcss                 4.3.2
@tailwindcss/vite           4.3.2
gsap                        3.15.0
astro                       7.0.7
@astrojs/cloudflare        14.1.2
@tanstack/react-start       1.168.27
@vite-pwa/astro             1.2.0
vite-plugin-pwa             1.3.0
```

Use workspace policy and lockfiles to preserve reproducibility. Review major framework release notes before upgrading rather than blindly refreshing all packages.

## `packages/design`

Install workspace dependencies from the repository root:

```sh
pnpm install
```

The package is private and imported by applications with:

```json
{
  "dependencies": {
    "@labs/design": "workspace:*"
  }
}
```

The shared package does not have its own Tailwind build. Each application owns its Tailwind entry and processes the imported CSS.

## Public Application Initialization

Create the Astro application inside `apps/web` using the current Astro initializer or the repository's preferred scaffold workflow.

Required choices:

```txt
TypeScript strict mode
Cloudflare Workers adapter
Tailwind CSS v4 through @tailwindcss/vite
Astro view transitions evaluated deliberately
React integration only when the first React island is required
PWA integration after the basic app shell is stable
```

Add dependencies:

```sh
pnpm --filter @labs/web add @labs/design@workspace:* gsap
pnpm --filter @labs/web add -D tailwindcss@^4.3.2 @tailwindcss/vite@^4.3.2
```

Add Cloudflare and PWA dependencies when the scaffold reaches those tasks.

### Public global stylesheet

Recommended location:

```txt
apps/web/src/styles/global.css
```

Contents:

```css
@import "tailwindcss" source("../");
@import "@labs/design/styles.css";
```

Import the global stylesheet once from the root layout.

### Public application rule

Do not run `shadcn init` in `apps/web`. The public site owns a custom Astro component system.

## Admin Application Initialization

Create the TanStack Start application inside `apps/admin` using the current Cloudflare-compatible template and repository conventions.

Add the shared design package and Tailwind Vite integration:

```sh
pnpm --filter @labs/admin add @labs/design@workspace:*
pnpm --filter @labs/admin add -D tailwindcss@^4.3.2 @tailwindcss/vite@^4.3.2
```

### Admin global stylesheet

Recommended location:

```txt
apps/admin/src/styles/global.css
```

Start with:

```css
@import "tailwindcss" source("../");
@import "@labs/design/styles.css";
```

The admin may add app-specific shadcn mappings after initialization. Do not place those mappings back into `packages/design` unless they are genuinely framework-neutral semantic roles.

## shadcn Initialization

The shadcn skill is already installed in the repository. Initialize shadcn only after `apps/admin` exists and its Tailwind entry compiles.

Decisions:

```txt
Application:       apps/admin
Primitive base:    Base UI
Tailwind:          v4
Component path:    apps/admin/src/components/ui
Shared package:    do not route generated components to packages/design
```

Use the current CLI's interactive or explicit Base UI option. Before accepting the generated changes:

```sh
pnpm dlx shadcn@latest info --cwd apps/admin
pnpm dlx shadcn@latest add button --cwd apps/admin --dry-run
```

For non-trivial components or updates, use dry-run or diff first.

Do not apply a generic preset over the Ken Arhin Labs tokens. The CLI is a component source workflow, not the owner of the brand theme.

## Admin Semantic Mapping

Shadcn components expect roles such as card, popover, and sidebar. Define those inside the admin app by mapping them to shared variables.

Example direction:

```css
:root {
  --card: var(--surface);
  --card-foreground: var(--surface-foreground);
  --popover: var(--surface);
  --popover-foreground: var(--surface-foreground);
  --sidebar: var(--surface);
  --sidebar-foreground: var(--foreground);
  --sidebar-border: var(--border);
  --sidebar-ring: var(--ring);
}
```

The exact mapping should be finalized after shadcn generates the current Tailwind v4 theme shape.

## Package Imports

The admin should use native `package.json#imports` when supported by the final scaffold.

Example:

```json
{
  "imports": {
    "#components/*": "./src/components/*.tsx",
    "#hooks/*": "./src/hooks/*.ts",
    "#lib/*": "./src/lib/*.ts",
    "#features/*": "./src/features/*.ts"
  }
}
```

Keep `components.json` aliases consistent with the resolved import map. Verify with `shadcn info --json` rather than assuming a path.

## Theme Controller

Both applications support:

```txt
light
 dark
system
```

The controller must:

1. read the stored preference before paint;
2. set `data-theme="light"` or `data-theme="dark"` for explicit choices;
3. remove the attribute for `system`;
4. update accessible control state;
5. listen for system changes only while the preference is `system`.

Do not duplicate theme behavior independently without a shared convention. The implementation can be app-local because Astro and React have different lifecycle needs.

## Font Delivery

Fonts are self-hosted through Fontsource package imports in `@labs/design`.

Rules:

- do not add Google Fonts runtime requests;
- do not duplicate font imports in both applications;
- preload only the font files proven necessary for initial rendering;
- monitor the output bundle before adding more weights or subsets;
- use font-display behavior provided by the package and verify layout stability.

## Public Motion Dependencies

Add GSAP only to applications that need it. The public site uses GSAP extensively but should import plugins by route or feature where practical.

Recommended organization:

```txt
apps/web/src/lib/motion/
  gsap.ts
  lifecycle.ts
  media.ts
  reduced-motion.ts
```

Register only the plugins actually used by a route. Do not create one global file that eagerly imports every GSAP plugin.

## Frontend Environment Variables

### Public site

Safe public configuration may include:

```txt
PUBLIC_SITE_URL
PUBLIC_API_BASE_URL
PUBLIC_R2_BASE_URL
PUBLIC_ENVIRONMENT
```

Server-only public-site secrets belong in the Worker environment and must not use public exposure prefixes.

### Admin

Browser-safe configuration may include:

```txt
VITE_ADMIN_SITE_URL or framework-equivalent public variable
VITE_API_BASE_URL
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Never expose:

```txt
SUPABASE_SERVICE_ROLE_KEY
Database credentials
Cloudflare API tokens
SMTP tokens
Internal webhook secrets
```

Follow the actual environment-variable conventions of the final Astro and TanStack Start versions rather than copying prefixes blindly.

## Environment Separation

Recommended domains:

```txt
Local
  localhost ports owned by the app scaffolds

Preview
  preview-specific Workers or deployment URLs
  preview API and preview backend resources

Production
  kenarhinlabs.com
  admin.kenarhinlabs.com
  production API domain
```

Do not point routine local frontend development at production writes. Use explicit preview environments for remote integration testing.

## PWA Provisioning

### Public

After the initial shell and routing are stable:

```txt
Install @vite-pwa/astro
Add manifest and icons
Add offline fallback
Define cache boundaries
Add update prompt
Test installed and browser modes
```

### Admin

After authentication and the shell are stable:

```txt
Install vite-plugin-pwa
Cache the app shell only
Add safe local draft persistence
Define explicit retry behavior
Avoid caching sensitive API responses
```

## Content Security and Headers

The frontend deployment should eventually define:

```txt
Content-Security-Policy
Referrer-Policy
Permissions-Policy
X-Content-Type-Options
frame-ancestors or equivalent control
Strict-Transport-Security where appropriate
```

CSP must account for self-hosted fonts, R2 media, API origins, and any approved analytics. Do not weaken CSP merely to permit unknown third-party scripts.

## CI and Validation

Recommended frontend checks:

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Design-specific checks:

```sh
npx @google/design.md lint DESIGN.md
```

Add application-specific checks after initialization:

```txt
Astro check
TanStack/TypeScript build
Tailwind compilation
End-to-end smoke tests
Accessibility checks
Visual regression checks
Cloudflare dry-run deployments
```

## Initial Integration Gate

Before building the Living System hero, both applications should pass these gates:

```txt
packages/design imports successfully
semantic color utilities generate
font utilities render the expected families
light, dark, and system modes work without flash
Typeset renders a representative article
public app has no shadcn dependency
admin shadcn files stay app-local
production builds complete
```

## Official References

- Tailwind CSS theme sharing: https://tailwindcss.com/docs/theme
- Tailwind CSS source detection: https://tailwindcss.com/docs/detecting-classes-in-source-files
- Tailwind CSS Vite installation: https://tailwindcss.com/docs/installation/using-vite
- Astro documentation: https://docs.astro.build/
- Cloudflare Astro guide: https://developers.cloudflare.com/workers/framework-guides/web-apps/astro/
- Cloudflare TanStack Start guide: https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/
- shadcn CLI: https://ui.shadcn.com/docs/cli
- shadcn skills: https://ui.shadcn.com/docs/skills
- shadcn changelog: https://ui.shadcn.com/docs/changelog

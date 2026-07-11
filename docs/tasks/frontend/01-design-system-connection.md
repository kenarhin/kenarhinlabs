# Lane 01 — Design System Connection

## Owner and scope

Owner: primary agent (senior frontend developer).

Owned scope:
- Connecting `@labs/design` to `apps/web` (Astro 7) and `apps/admin` (TanStack Start).
- Integrating Tailwind CSS v4 using `@tailwindcss/vite` in a CSS-first model.
- Setting up the correct semantic theme mappings for both apps.
- Ensuring correct theme boot behavior on page load and client-side view transition swaps to prevent theme flashing (FOUC).
- Updating all tagline references to the official standard: "Digital systems, built around people."
- Solving workspace dependency resolution for self-hosted Fontsource packages.

## Checklist

- [x] Research Tailwind v4 configuration options and Astro 7 CSS integrations.
- [x] Install `@labs/design` workspace dependency in `apps/web`.
- [x] Configure Tailwind CSS v4 inside `apps/web` using the Vite plugin model.
- [x] Wire up theme boot script in `apps/web`'s `Layout.astro` supporting transitions.
- [x] Replace the Astro scaffold components in `apps/web` with the verified brand copy/tagline.
- [x] Remap the legacy sea/lagoon style settings in `apps/admin/src/styles.css` to `@labs/design` variables.
- [x] Standardize the dark-mode configuration inside `apps/admin` to use the `data-theme` attribute instead of class.
- [x] Fix font loading errors by hoisting transitive Fontsource dependencies directly to app workspaces.
- [x] Verify theme states, layouts, and page builds.

## Progress log

### 2026-07-11 — Set up Tailwind v4 & Design System connection in apps/web

- Checked the default Astro scaffold structure. No CSS configurations existed.
- Added `@labs/design` as a workspace dependency inside `apps/web/package.json`.
- Configured Vite in `astro.config.mjs` to load `@tailwindcss/vite` and output the SSR bundle format for Cloudflare Workers.
- Created `apps/web/src/styles/global.css` that imports `tailwindcss` and `@labs/design/styles.css` directly.
- Formed the `Layout.astro` component to handle standard head elements, meta definitions, Open Graph details, and Astro's `ClientRouter` view transition elements.
- Wrote an inline theme boot script inside `<head>` in `Layout.astro`. The script checks for the `labs-theme` parameter in `localStorage`, sets `data-theme` on `document.documentElement` to prevent flashing of wrong color schemes on first render, and hooks into `astro:after-swap` for client-side navigation.
- Replaced the initial Astro dashboard content inside `Welcome.astro` with the brand positioning framework.

### 2026-07-11 — Realignment of apps/admin styles

- Examined `apps/admin` and observed that the local stylesheet contained an incorrect, custom sea/lagoon visual scheme that bypassed the shared library's typography and color variables.
- Added `@labs/design` as a workspace dependency inside `apps/admin/package.json`.
- Replaced `apps/admin/src/styles.css` content with imports for `tailwindcss`, `@labs/design/styles.css`, and `tw-animate-css`.
- Swapped out the old `.dark` selectors. Configured `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *))` inside Tailwind v4 to hook directly into the standard `data-theme="dark"` attribute mechanism.
- Mapped shadcn specific component bindings (`--card`, `--popover`, `--sidebar-*`, `--radius-*`) to `@labs/design` CSS variables inside `styles.css`.
- Updated `apps/admin/src/routes/__root.tsx` with the correct root document title and wired an inline theme boot script to standardise visual transitions inside the admin area.

### 2026-07-11 — Tagline adjustments and copy correction

- The user finalized the official tagline: "Digital systems, built around people."
- Replaced occurrences of the former placeholder tagline ("We build the systems behind modern businesses.") across the codebase.
- Updated:
  - `DESIGN.md` (Voice & Copy documentation sample)
  - `docs/frontend-motion-and-interaction.md` (Motion requirements section)
  - `apps/web/src/layouts/Layout.astro` (Tagline and metadata constants)
  - `apps/web/src/pages/index.astro` (Index routing parameters and meta description)
  - `apps/web/src/components/Welcome.astro` (Hero text, subtext, and buttons)

### 2026-07-11 — Font resolution fix (Workspace boundary error)

- Observed an import compile crash inside the running dev server: `Can't resolve '@fontsource-variable/bricolage-grotesque/wght.css' in 'packages/design/src/styles'`.
- Diagnosed root cause: `packages/design` exports Fontsource variable paths. However, because pnpm is set to `linkWorkspacePackages: false` in `pnpm-workspace.yaml`, transitive assets under design-system workspace modules aren't hoisted to nested directories. Consuming apps (`apps/web` and `apps/admin`) must declare font packages explicitly if resolved during compilation.
- Hoisted the three Fontsource packages to the dependencies of both apps:
  - `@fontsource-variable/bricolage-grotesque`
  - `@fontsource/ibm-plex-sans`
  - `@fontsource/ibm-plex-mono`
- Confirmed files are loaded and dev environment runs.

## Decisions

- **Hoisting Fontsource packages**: Explicitly defined transitive styles in root applications so bundler workspace trees can resolve raw CSS files seamlessly.
- **Data-theme vs Class for Dark Mode**: Realigned all apps to use the HTML attribute selector `[data-theme="dark"]` to align with the core variables exported in `packages/design/src/styles/theme.css`.
- **CSS-First Theme Config**: Refused creation of `tailwind.config.js/ts` files inside Astro or TanStack Start apps, enforcing the use of the `@theme` directive in entry stylesheets.

## Documentation sources

- [Tailwind CSS v4 CSS theme configurations](https://tailwindcss.com/docs/theme)
- [Tailwind CSS v4 Vite integration guidelines](https://tailwindcss.com/docs/installation/using-vite)
- [Astro styling and CSS integrations](https://docs.astro.build/en/guides/styling/)
- [Astro View Transitions script behaviors](https://docs.astro.build/en/guides/view-transitions/)

## Verification evidence

| Target task / Action | Verification check | Status |
| -------------------- | ------------------ | ------ |
| Dependecy linking    | Direct font installs and `@labs/design` pnpm additions | Verified successful |
| Web app bundle check | Tailwind v4 compilation checks inside Astro dev server | Verified successful |
| Theme script trigger | Local theme boot and transition listener verification | Verified successful |

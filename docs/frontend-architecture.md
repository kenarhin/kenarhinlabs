# Ken Arhin Labs Frontend Architecture

_Last updated: 2026-07-11_

This document defines the long-term frontend architecture for Ken Arhin Labs. It covers the public website, the internal admin application, their shared design foundation, and the boundary between authored brand experiences and operational interface components.

## Architecture Summary

```txt
Monorepo:                 pnpm workspace
Public website:           Astro on Cloudflare Workers
Admin application:        TanStack Start on Cloudflare Workers
Public UI approach:       Custom Astro components; no shadcn/ui
Admin UI approach:        App-local shadcn/ui using Base UI
Shared design package:    packages/design
Styling:                  Tailwind CSS v4, CSS-first semantic tokens
Public motion:            GSAP + ScrollTrigger + SVG + Astro view transitions
Admin motion:             restrained CSS/GSAP state transitions
Long-form content:        owned `.typeset` CSS system
API:                      Hono on Cloudflare Workers
Identity:                 Supabase Auth
PWA:                      @vite-pwa/astro and vite-plugin-pwa
```

## Main Principle

The frontend is one brand system with two intentionally different product expressions.

```txt
Public website
  Expressive, editorial, narrative, and custom-built.

Admin application
  Dense, accessible, operational, and component-driven.

packages/design
  Shared tokens and foundations, not a shared component library.
```

Do not force the public website and admin application through the same component architecture. They share typography, semantic color, theme behavior, and basic interaction principles. They do not share page composition, information density, or motion intensity.

## Application Responsibilities

### `apps/web`

The public website at `kenarhinlabs.com` is an Astro application deployed to Cloudflare Workers.

Use it for:

```txt
Home
Services
Work and case studies
Stacks and tools
Offers
Field Notes
Labs
Start a Project
Contact
Legal and offline pages
```

Implementation rules:

- Astro components are the default.
- Use semantic HTML before introducing client-side framework code.
- Use React islands only for interactions that genuinely need React.
- Do not install or generate shadcn/ui components in the public application.
- Use GSAP selectively for authored storytelling, not universal animation.
- Fetch public data from D1-backed public endpoints or server-side loaders; do not expose private backend credentials.
- Preserve useful HTML, content, and navigation when JavaScript or motion is unavailable.

### `apps/admin`

The admin application at `admin.kenarhinlabs.com` is a TanStack Start application deployed to Cloudflare Workers.

Use it for:

```txt
Dashboard
Clients and contacts
Leads
Projects and milestones
Content publishing
Case studies and stack guides
Tools and offers
Media
Email workflows
Team, roles, integrations, and settings
```

Implementation rules:

- Use shadcn/ui extensively as owned source code.
- Use Base UI as the primitive base for new shadcn components.
- Keep generated components in `apps/admin/src/components/ui`.
- Keep feature compositions in domain folders rather than expanding the UI folder into a business-logic layer.
- Use TanStack Query for server-state synchronization and caching.
- Use route loaders, server functions, or the Hono API according to the backend boundary; shared business operations belong in Hono.
- Motion communicates state, hierarchy, progress, and changed layout. It should not create cinematic scroll experiences.

### `packages/design`

`packages/design` is a framework-neutral CSS package.

It owns:

```txt
Font imports
Brand and semantic color values
Light, dark, and system theme behavior
Tailwind CSS v4 theme variables
Typography scale
Radius, layout, and depth tokens
Base document and accessibility rules
Long-form `.typeset` styles
Motion timing and easing vocabulary
```

It does not own:

```txt
Astro components
React components
shadcn components
Base UI or Radix primitives
Hooks
Application layouts
GSAP timelines
Business logic
API clients
```

A future shared React component package should only be created after multiple React applications demonstrate meaningful, stable reuse.

## Dependency Direction

```txt
apps/web ───────┐
                ├──> packages/design
apps/admin ─────┘

apps/web ───────────> packages/core / validators where browser-safe
apps/admin ─────────> packages/core / validators where browser-safe

apps/web ───────────> Hono public API
apps/admin ─────────> Hono admin API
```

`packages/design` must never import from an application. It should remain independently consumable and free from runtime secrets.

## Public Rendering Strategy

Use the lowest-cost rendering mode that satisfies each route.

### Static or cached public output

Suitable for:

```txt
Marketing pages
Published Field Notes
Published case studies
Published stack guides
Tool and offer listings
Legal content
```

These routes should read public projections and be cacheable where appropriate.

### On-demand server rendering

Suitable for:

```txt
Personalized or request-aware pages
Preview routes
Dynamic lead flows
Routes requiring server-side validation
Fresh fallback reads when a public projection is missing
```

### Client islands

Suitable for:

```txt
Theme controls
Command/search interfaces
Complex filters
Interactive comparisons
Multi-step project forms
Rich media galleries
Small parts of the Living System experience that need client state
```

Do not hydrate an entire page because one region needs interaction.

## Public Component Structure

Recommended starting structure:

```txt
apps/web/src/
  components/
    common/
    navigation/
    marketing/
    content/
    work/
    services/
    stacks/
    labs/
    forms/
    system/
  layouts/
  pages/
  lib/
    api/
    content/
    motion/
    seo/
    theme/
  styles/
    global.css
    pages/
```

`components/system` is reserved for the visual system language: routes, nodes, diagrams, status annotations, and project-evidence transitions. It is not a generic design-system component folder.

## Admin Component Structure

```txt
apps/admin/src/
  components/
    ui/              # shadcn source code only
    app-shell/
    dashboard/
    forms/
    tables/
    editor/
    media/
    status/
  features/
    auth/
    content/
    crm/
    commerce/
    comms/
    settings/
  hooks/
  lib/
    api/
    auth/
    query/
    permissions/
    theme/
  routes/
  styles/
```

A shadcn primitive should remain generic and accessible. Business behavior belongs in feature components and domain services.

## Styling Architecture

Each app owns a Tailwind entry stylesheet and imports the shared design package.

```css
@import "tailwindcss" source("../");
@import "@labs/design/styles.css";
```

Application markup should use semantic tokens:

```html
<section class="bg-background text-foreground">
  <div class="border border-border bg-surface text-surface-foreground">
    <p class="text-muted-foreground">Published 11 July 2026</p>
  </div>
</section>
```

Do not use raw brand hex values in application classes. Do not use arbitrary generic colors as a substitute for a missing semantic role. Add or revise a role in `packages/design` when the need is genuinely cross-application.

## Theme Architecture

Supported preference values:

```txt
light
 dark
system
```

Implementation behavior:

- `data-theme="light"` forces the editorial light expression.
- `data-theme="dark"` forces the laboratory dark expression.
- no `data-theme` follows `prefers-color-scheme`.
- store the user's explicit preference, not only the resolved theme.
- resolve and apply the preference before first paint.
- authored color sections can retain their art direction across themes.

The admin may expose the same preference values while using denser surfaces and admin-specific semantic mappings.

## Data and State

### Public site

Prefer server-rendered data and URL state. Use client stores only for durable interactive needs.

Good candidates for client state:

```txt
Theme preference
Open navigation or dialog state
Filter controls
Multi-step form progress
Temporary comparison selections
```

Do not mirror CMS or API data into a global browser store without a concrete reason.

### Admin

Use TanStack Query for remote server state. Keep local UI state near the component or feature that owns it. Use form libraries for validated form state. Do not build a second client-side source of truth for canonical business records.

## API Boundary

The frontend should not encode business authorization in presentation code.

```txt
UI visibility
  Improves usability.

Hono permission checks
  Enforce authorization.

Supabase RLS and grants
  Enforce database-level protection.
```

Public and admin API clients should:

- use shared request and response types where safe;
- normalize the API response envelope;
- preserve request IDs for diagnostics;
- distinguish validation, authorization, conflict, and transport failures;
- never display raw database or provider errors.

## Content Rendering

Canonical content may be Markdown or structured blocks. The public site renders only trusted, sanitized output.

Use `.typeset` for semantic rendered HTML:

```html
<article class="typeset typeset-editorial max-w-prose">
  <!-- rendered content -->
</article>
```

Rich content components must come from an allowlist. Do not execute arbitrary administrator-authored MDX.

## Navigation and View Transitions

Astro view transitions may preserve visual continuity between selected public routes. Use them progressively; normal document navigation remains valid when the feature is unsupported or disabled.

The planned signature transition is the **Route Transition**:

```txt
selected link or visual produces a route
  → route crosses or expands through the viewport
  → matched title, image, or node continues on the destination page
  → route settles into the new layout
```

Do not force every navigation through a long animation.

## PWA Boundary

### Public PWA

Cache:

```txt
App shell
Core visual assets
Fonts
Recent public content
Offline fallback
```

Do not present stale dynamic information as current without indicating offline or cached state.

### Admin PWA

Cache:

```txt
App shell
Icons and static assets
Safe local draft state
Explicit retryable actions
```

Do not casually cache full private records, email bodies, credentials, or session responses.

## Accessibility Requirements

Minimum expectations:

- semantic landmarks and heading structure;
- full keyboard access;
- visible focus styles;
- WCAG AA color contrast for text and controls;
- text and status meaning independent of color;
- touch targets appropriate for mobile interaction;
- correct labels, descriptions, and error associations;
- reduced-motion alternatives;
- no essential content hidden inside animation or canvas-only rendering;
- skip navigation on long pages;
- route announcements and focus handling when client-side navigation is enabled.

## Performance Requirements

Public pages should prioritize content and evidence before enhancement.

Rules:

- keep the hero headline and actions renderable without waiting for GSAP;
- self-host fonts and limit loaded weights;
- prefer SVG and DOM layers for the Living System before WebGL;
- animate transforms and opacity when possible;
- lazy-load non-critical media;
- avoid full-screen video as a required hero dependency;
- hydrate only interactive islands;
- use responsive images and explicit dimensions;
- measure Core Web Vitals on representative mobile hardware and networks.

## Testing Strategy

```txt
Unit tests
  formatters, view-model helpers, theme utilities, content transforms

Component tests
  forms, menus, dialogs, state transitions, validation behavior

Integration tests
  route data, API envelopes, auth boundaries, publishing flows

End-to-end tests
  public conversion paths, admin critical workflows, keyboard navigation

Visual regression
  themes, breakpoints, typography, major authored sections

Motion QA
  desktop, mobile, reduced-motion, resize, back/forward navigation
```

## Frontend Build Order

```txt
1. Root DESIGN.md and frontend architecture documents
2. packages/design tokens, fonts, Typeset, and base styles
3. Public Astro app foundation and design-foundation route
4. Admin TanStack Start foundation and app-local shadcn setup
5. Shared API client conventions
6. Public navigation, footer, layouts, and theme controller
7. Living System hero prototype
8. Homepage sections and page-transition prototype
9. Content templates and Typeset rendering
10. Admin shell, auth, dashboard, and first CRUD workflow
11. PWA, accessibility, performance, and visual regression hardening
```

## Official References

- Tailwind CSS theme variables: https://tailwindcss.com/docs/theme
- Tailwind CSS dark mode: https://tailwindcss.com/docs/dark-mode
- Tailwind source detection: https://tailwindcss.com/docs/detecting-classes-in-source-files
- Astro view transitions: https://docs.astro.build/en/guides/view-transitions/
- GSAP documentation: https://gsap.com/docs/v3/
- GSAP matchMedia: https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/
- shadcn Typeset: https://ui.shadcn.com/docs/typeset
- shadcn changelog: https://ui.shadcn.com/docs/changelog

# Frontend Implementation Plan

_Replanned: 2026-07-12_

## Purpose

This is the authoritative frontend program for Ken Arhin Labs. It turns `DESIGN.md`, the frontend
architecture documents, the PWA program, the live Hono API, and the shared packages into bounded
implementation lanes with evidence-based completion gates.

The immediate delivery target is `apps/web`: a distinctive Astro 7 public experience with a strong
Living System homepage, durable site structure, honest backend integration, and a production-shaped
PWA foundation. `apps/admin` is deliberately sequenced after the public foundation rather than being
built in parallel.

## Planning decisions

- `apps/web` remains an authored Astro application. It uses custom Astro components, semantic HTML,
  SVG, Tailwind CSS v4, and scoped GSAP modules. It does not use shadcn/ui.
- `packages/design` owns semantic tokens, fonts, and source brand assets. Application components and
  animation timelines remain app-local.
- The approved System K and vector wordmark are the production working direction. Their source path
  will be normalized from `src/assets/icons/` to the documented `src/assets/logo/` structure before
  app consumption.
- The current `@vite-pwa/astro@1.2.0` release does not declare Astro 7 support. The public app will
  not hide this mismatch. The implementation lane will prove the reviewed `vite-plugin-pwa` Vite
  integration path or leave PWA rollout explicitly gated.
- Public navigation is application-owned when the live navigation endpoint returns an empty
  collection. Those links are structural routes, not mock CMS records. A non-empty valid API
  response may replace them at render time.
- Homepage copy comes from approved brand documentation while `/public/homepage` remains unavailable.
  No invented case studies, testimonials, metrics, prices, offers, or CMS entries will be presented
  as backend data.
- The contact form will use the real `/public/contact` contract and render honest submission errors.
  The current backend persistence port returns `503`; that gap is documented and is not patched from
  the frontend lane.
- Motion starts from a complete static state, respects reduced motion, uses native scrolling, and is
  cleaned up across Astro client navigation.

## Lane ownership

| Lane | Scope | Task log |
| --- | --- | --- |
| 01 — Design-system connection | Existing Tailwind v4, font, token, and theme connection | `01-design-system-connection.md` |
| 02 — Web foundation and shell | Layout, metadata, theme control, header, mobile navigation, footer, shared public components, 404 | `02-web-foundation-and-shell.md` |
| 03 — Living System homepage | Hero composition, SVG system, GSAP choreography, supporting homepage sections | `03-living-system-homepage.md` |
| 04 — Contact and API integration | Typed public API boundary, navigation integration, contact page and real failure states | `04-contact-and-api-integration.md` |
| 05 — Public PWA and quality | `@labs/pwa` diagnostics, Astro integration, offline/update UI, accessibility, performance, browser QA | `05-public-pwa-and-quality.md` |
| 06 — Remaining public page families | Services, Work, Stacks, Field Notes, Labs, Start, legal, content detail routes | `06-remaining-public-pages.md` |
| 07 — Admin application | TanStack Start operating system after the public foundation is accepted | `07-admin-application-later.md` |

Each lane owns only its listed scope. Backend gaps are recorded as handoffs; frontend work must not
silently replace missing persistence or projection adapters.

## Phase 0 — Evidence and plan

- [x] Read every project document under `docs/`, `DESIGN.md`, app instructions, and the existing
      frontend task baseline.
- [x] Inspect the current `apps/web`, `packages/design`, `packages/pwa`, and relevant Hono public
      contracts.
- [x] Verify current Astro 7 lifecycle guidance through the Astro documentation connector.
- [x] Verify current GSAP, Tailwind CSS v4, Vite PWA, and Cloudflare guidance through official
      documentation.
- [x] Inspect live public API behavior without mutating cloud state.
- [x] Review the supplied source SVGs against `docs/frontend-brand-assets.md` and `DESIGN.md`.
- [x] Write the web-first frontend plan and bounded lane files before application implementation.

## Phase 1 — Brand and package readiness

- [ ] Normalize the approved logo assets under `packages/design/src/assets/logo/` and expose them
      through the package without introducing framework components.
- [ ] Preserve `viewBox`, `pathLength`, `data-part`, accessibility metadata, and theme-capable
      `currentColor` behavior.
- [ ] Resolve `packages/pwa/examples/**` TypeScript project/dependency diagnostics with a deliberate
      examples project boundary and current dependencies.
- [ ] Record the unresolved official Astro 7 peer range for `@vite-pwa/astro@1.2.0`.
- [ ] Verify `@labs/design` and `@labs/pwa` package checks before app integration.

## Phase 2 — Public foundation and shell

- [ ] Build the reusable Astro layout, metadata contract, skip link, theme boot, and accessible theme
      preference control.
- [ ] Build the responsive header, primary navigation, mobile menu, and footer.
- [ ] Build public button/link, container, section-label, and system-annotation patterns only where
      the current pages use them.
- [ ] Build a useful branded `404.astro` page with normal navigation and no JavaScript dependency.
- [ ] Preserve complete document navigation when ClientRouter or animation is unavailable.

## Phase 3 — Living System homepage

- [ ] Build a complete static hero containing the approved category label, headline, supporting
      message, actions, system diagram, and continuation cue.
- [ ] Build a scoped GSAP entrance timeline using route drawing, node activation, and a single
      meaningful signal event.
- [ ] Author desktop, tablet, mobile, and reduced-motion states through `gsap.matchMedia()`.
- [ ] Add proof/capability/process/next-step homepage sections without inventing backend content.
- [ ] Keep the first two viewports clear, useful, and immediately interactive.
- [ ] Ensure all GSAP contexts, timelines, SplitText instances, and ScrollTriggers revert before
      Astro swaps and reinitialize once after page load.

## Phase 4 — Contact and backend-aware integration

- [ ] Create a typed public API client that normalizes the Hono response envelope and preserves
      request IDs.
- [ ] Fetch header/footer navigation server-side and fall back only when the valid result is empty or
      unavailable.
- [ ] Build the contact page with accessible fields matching the shared backend validator.
- [ ] Submit to the real API and provide pending, validation, accepted, rate-limited, dependency, and
      transport states.
- [ ] Document that contact persistence remains unavailable until the backend intake adapter is
      implemented.
- [ ] Do not claim that the unavailable homepage projection is integrated.

## Phase 5 — Public PWA and quality

- [ ] Integrate the reviewed PWA path through the Astro 7 Vite configuration and `@labs/pwa`
      configuration factory.
- [ ] Generate only approved public brand icons with authored maskable safe areas.
- [ ] Add the manifest, standalone offline page, single service-worker registration, update prompt,
      and offline/stale indicator.
- [ ] Verify generated Workbox policy keeps API/auth/preview routes network-only and does not inject
      an SPA `index.html` fallback.
- [ ] Run Astro checks, TypeScript, package tests, production builds, generated-worker inspection,
      Cloudflare dry run, and `git diff --check`.
- [ ] Visually test light/dark themes, major breakpoints, keyboard navigation, reduced motion, and
      offline/update surfaces in the in-app browser.
- [ ] Record any device/browser/PWA install checks that still require a preview deployment.

## Phase 6 — Remaining public site

- [ ] Build Services and service detail routes.
- [ ] Build Work and case-study routes using real published API/D1 projections.
- [ ] Build Stacks, tools, and offers with freshness disclosure.
- [ ] Build Field Notes and long-form Typeset routes.
- [ ] Build Labs, Start a Project, privacy, terms, and remaining offline/legal surfaces.
- [ ] Add loading, empty, error, and not-found states for every data-backed page family.

## Phase 7 — Admin later

- [ ] Re-audit the current TanStack Start and shadcn/Base UI setup after public acceptance.
- [ ] Build the secure app shell and first complete content-publishing workflow.
- [ ] Integrate admin PWA draft/retry behavior only with real identity, idempotency, and logout
      cleanup contracts.
- [ ] Sequence remaining CRM, project, commerce, media, communications, and settings domains after
      the first workflow works end to end.

## Backend handoffs

| Contract | Current evidence | Frontend behavior | Backend work still required |
| --- | --- | --- | --- |
| `GET /public/navigation` | Live `200`; empty header/footer arrays | Use structural app navigation, replace with valid non-empty API navigation | Publish navigation records when CMS ownership is ready |
| `GET /public/homepage` | Live `503 DEPENDENCY_UNAVAILABLE` | Render approved brand-authored homepage content; do not label it CMS-backed | Implement homepage read adapter/projection |
| `POST /public/contact` | Route and validator exist; intake adapter is fail-closed | Submit real payload and show honest dependency error/request ID | Implement contact persistence and notification adapter |
| Public content/tools | Code contracts exist; projection path is incomplete | Do not populate current foundation with fabricated entries | Complete public projection source adapter and publish records |

## Verification gates

The current web-first program is complete only when:

1. all current lane checklists and evidence logs are truthful;
2. no generic placeholder Astro artwork or copy remains;
3. package-level PWA diagnostics are resolved and reproducible;
4. the public build, type checks, package tests, and Cloudflare dry run pass;
5. the generated service worker and manifest match the documented security policy;
6. header, footer, homepage, contact, and 404 work in light, dark, mobile, desktop, keyboard-only,
   JavaScript-disabled/static, and reduced-motion scenarios as applicable;
7. live backend limitations are visible in task handoffs and are not misreported as completed;
8. a requirement-by-requirement audit maps the requested deliverables to current files and command
   or browser evidence.

## Documentation sources

- Astro View Transitions lifecycle: https://docs.astro.build/en/guides/view-transitions/
- Astro Cloudflare integration: https://docs.astro.build/en/guides/integrations-guide/cloudflare/
- Vite PWA Astro integration: https://vite-pwa-org.netlify.app/frameworks/astro
- Tailwind CSS theme variables: https://tailwindcss.com/docs/theme
- Tailwind CSS source detection: https://tailwindcss.com/docs/detecting-classes-in-source-files
- GSAP documentation: https://gsap.com/docs/v3/
- GSAP matchMedia: https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/
- GSAP ScrollTrigger: https://gsap.com/docs/v3/Plugins/ScrollTrigger/
- GSAP SplitText: https://gsap.com/docs/v3/Plugins/SplitText/
- Cloudflare Astro guide: https://developers.cloudflare.com/workers/framework-guides/web-apps/astro/


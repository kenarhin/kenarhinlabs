# Lane 05 — Public PWA and Quality

## Owner and scope

Owner: primary agent (senior frontend developer).

Owned scope: `packages/pwa` example diagnostics, `apps/web` PWA configuration/registration/UI,
public PWA assets, offline behavior, generated-worker inspection, accessibility, performance, and
browser verification.

## Checklist

- [x] Put `packages/pwa/examples/**` under an explicit TypeScript project and add only the direct
      development dependencies required to typecheck the maintained examples.
- [x] Remove or replace the incompatible Astro-integration example path without hiding the
      `@vite-pwa/astro` peer constraint.
- [x] Add `@labs/pwa`, `vite-plugin-pwa`, and GSAP to the consuming web app in the correct
      dependency sections.
- [x] Integrate `createPublicPwaOptions()` through Astro's Vite configuration and prove output.
- [x] Add approved favicon, public PWA, Apple touch, and maskable icon outputs.
- [x] Add standalone `offline.html`.
- [x] Add one service-worker registration and accessible update/offline UI.
- [x] Inspect `sw.js`, `manifest.webmanifest`, route order, and fallback behavior.
- [x] Run package tests, Astro checks/build, Cloudflare dry run, accessibility checks, and browser
      QA.

## Diagnosis baseline

The reported editor errors are caused by example files living outside the package's checked
TypeScript project while importing undeclared example-only frameworks:

- `pwa-update-prompt.example.tsx` requires React's JSX runtime.
- `astro.config.example.ts` imports both Astro and `@vite-pwa/astro`, neither declared by
  `@labs/pwa`.
- the package `typecheck` currently passes because `tsconfig.json` excludes `examples/**`, so the
  green command does not cover the files shown by the editor.

Current registry evidence on 2026-07-12:

- `@vite-pwa/astro@1.2.0` declares Astro peers only through major version 5.
- `astro@7.0.7` is current and installed in `apps/web`.
- `vite-plugin-pwa@1.3.0` supports Vite 8.

The selected repair is to maintain examples that are actually typechecked and to use the core Vite
plugin integration for Astro 7 only after build/generated-worker proof. A blanket peer override or
ambient fake module declaration is not an acceptable diagnostic fix.

## Documentation sources

- https://vite-pwa-org.netlify.app/frameworks/astro
- https://developer.chrome.com/docs/workbox/modules/workbox-strategies
- https://developer.mozilla.org/docs/Web/API/Service_Worker_API
- https://docs.astro.build/en/guides/integrations-guide/cloudflare/

## Verification evidence

### 2026-07-12 — Implemented and locally verified

- `@labs/pwa` example TypeScript and package tests pass: 4 files and 13 tests.
- Astro diagnostics pass for 20 files with zero errors, warnings, or hints.
- Astro's SSR build now generates `sw.js` in `astro:build:done`; the integration fails the build if
  Workbox reports zero precached files. The verified worker contained 66 precached files.
- Worker inspection confirmed API and sensitive path `NetworkOnly` rules precede navigation,
  navigation uses `NetworkFirst` with `/offline.html`, images use `StaleWhileRevalidate`, fonts use
  `CacheFirst`, and no SPA `index.html` fallback exists.
- The manifest contains only implemented shortcuts and the four approved public icon variants.
- ImageMagick reduced all PNG outputs to stripped 8-bit sRGB assets; the 512px icons are under 4KB.
- Wrangler 4.110.0 dry-run succeeded with 16 Worker modules, 77 static assets, and the generated
  `SESSION`, `IMAGES`, and `ASSETS` bindings.
- CDP browser QA covered light/dark desktop/mobile, native-dialog focus, reduced motion, contact
  dependency failure, and 404. The dev integration serves the production manifest without enabling a
  development service worker, leaving no unexpected console errors.

## Blockers or handoff notes

Browser install/update and Cloudflare response-header proof will require a production-shaped preview
deployment. Local build output is necessary but not sufficient evidence for those gates.

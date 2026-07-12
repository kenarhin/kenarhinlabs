# Lane 05 — Public PWA and Quality

## Owner and scope

Owner: primary agent (senior frontend developer).

Owned scope: `packages/pwa` example diagnostics, `apps/web` PWA configuration/registration/UI,
public PWA assets, offline behavior, generated-worker inspection, accessibility, performance, and
browser verification.

## Checklist

- [ ] Put `packages/pwa/examples/**` under an explicit TypeScript project and add only the direct
      development dependencies required to typecheck the maintained examples.
- [ ] Remove or replace the incompatible Astro-integration example path without hiding the
      `@vite-pwa/astro` peer constraint.
- [ ] Add `@labs/pwa`, `vite-plugin-pwa`, and GSAP to the consuming web app in the correct dependency
      sections.
- [ ] Integrate `createPublicPwaOptions()` through Astro's Vite configuration and prove output.
- [ ] Add approved favicon, public PWA, Apple touch, and maskable icon outputs.
- [ ] Add standalone `offline.html`.
- [ ] Add one service-worker registration and accessible update/offline UI.
- [ ] Inspect `sw.js`, `manifest.webmanifest`, route order, and fallback behavior.
- [ ] Run package tests, Astro checks/build, Cloudflare dry run, accessibility checks, and browser QA.

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

Not yet run for the implementation.

## Blockers or handoff notes

Browser install/update and Cloudflare response-header proof will require a production-shaped preview
deployment. Local build output is necessary but not sufficient evidence for those gates.


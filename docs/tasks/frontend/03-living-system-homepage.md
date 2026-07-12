# Lane 03 — Living System Homepage

## Owner and scope

Owner: primary agent (senior frontend developer).

Owned scope: `apps/web` homepage composition, Living System SVG/DOM visual, scoped GSAP timelines,
responsive and reduced-motion variants, and the supporting foundation-era homepage sections.

## Checklist

- [ ] Replace the temporary welcome scaffold with a complete static homepage.
- [ ] Build the Living System hero and route/node model.
- [ ] Build the entrance timeline and limited first-scroll transition.
- [ ] Author mobile/tablet/desktop and reduced-motion states.
- [ ] Build proof framing without fabricated client outcomes.
- [ ] Build capability, process, and contact-direction sections.
- [ ] Verify animation cleanup across Astro navigation and resize.
- [ ] Verify performance and immediate CTA availability.

## Motion architecture

- Core GSAP tweens use transforms, `autoAlpha`, and SVG stroke state.
- One timeline coordinates the hero entrance; sequencing is not implemented with scattered delays.
- `gsap.matchMedia()` owns breakpoint and reduced-motion setup and cleanup.
- ScrollTrigger is limited to a short hero-to-content relationship and is never used to scrolljack.
- SplitText may reveal lines through `autoSplit`/`onSplit`; character animation is not the default.
- Plugins are registered only in the homepage motion module.
- The page reverts its scoped context before `astro:before-swap` and initializes on
  `astro:page-load`.

## Evidence log

### 2026-07-12 — Planned

- Verified current Astro navigation lifecycle order through the official Astro documentation
  connector.
- Verified current GSAP context, matchMedia, SplitText, ScrollTrigger, timeline, plugin, utility, and
  performance guidance.
- Confirmed `gsap@3.15.0` is the current registry release and is not yet installed in `apps/web`.
- Confirmed `/public/homepage` currently returns a live `503`, so the foundation homepage must use
  approved authored copy rather than pretend CMS data exists.

## Documentation sources

- https://gsap.com/docs/v3/
- https://gsap.com/docs/v3/GSAP/gsap.timeline()/
- https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/
- https://gsap.com/docs/v3/Plugins/ScrollTrigger/
- https://gsap.com/docs/v3/Plugins/SplitText/
- https://docs.astro.build/en/guides/view-transitions/

## Verification evidence

Not yet run for the implementation.

## Blockers or handoff notes

- Homepage CMS/projection data is unavailable. This lane may use only brand-approved copy and
  factual project names already documented in `docs/context.md`.
- Real screenshots and outcome evidence remain a content/asset handoff; the foundation must not
  invent them.


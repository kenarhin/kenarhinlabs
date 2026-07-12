# Lane 03 — Living System Homepage

## Owner and scope

Owner: primary agent (senior frontend developer).

Owned scope: `apps/web` homepage composition, Living System SVG/DOM visual, scoped GSAP timelines,
responsive and reduced-motion variants, and the supporting foundation-era homepage sections.

## Checklist

- [x] Replace the temporary welcome scaffold with a complete static homepage.
- [x] Build the Living System hero and route/node model.
- [x] Build the entrance timeline and limited first-scroll transition.
- [x] Author mobile/tablet/desktop and reduced-motion states.
- [x] Build proof framing without fabricated client outcomes.
- [x] Build capability, process, and contact-direction sections.
- [x] Verify animation cleanup across Astro navigation and resize.
- [x] Verify performance and immediate CTA availability.

## Motion architecture

- Core GSAP tweens use transforms and SVG stroke state. Essential text never depends on opacity so
  throttled or interrupted animation cannot make content unreadable.
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
- Verified current GSAP context, matchMedia, SplitText, ScrollTrigger, timeline, plugin, utility,
  and performance guidance.
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

### 2026-07-12 — Implemented and browser-verified

- The hero uses one GSAP timeline, `gsap.matchMedia()`, MotionPathPlugin, ScrollTrigger,
  `quickTo()`, and `gsap.utils.clamp()` with a single cleanup callback reverted before Astro swaps.
- Headless-browser review exposed an initial opacity risk; all essential text and section reveals
  were changed to transform-only motion so the authored static state remains readable when browser
  animation is throttled.
- The 1440×1000 light screenshot places the primary action at `y=729`, within the first viewport;
  the 390×844 light reduced-motion screenshot places it at `y=560`.
- CDP checks found no horizontal overflow, runtime exceptions, or duplicate IDs on the homepage.
- The ecosystem strip uses factual names already present in project documentation and makes no
  invented outcome, metric, testimonial, or live-CMS claim.

## Blockers or handoff notes

- Homepage CMS/projection data is unavailable. This lane may use only brand-approved copy and
  factual project names already documented in `docs/context.md`.
- Real screenshots and outcome evidence remain a content/asset handoff; the foundation must not
  invent them.

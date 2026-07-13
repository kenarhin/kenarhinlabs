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
- [x] Add a static-first, pauseable technology rail using curated shared assets.
- [x] Add an honest Selected Work evidence structure without invented case-study claims.
- [x] Separate managed hosting and operations from infrastructure engineering without presenting the
      planned Ken Arhin Labs hosting platform as live.

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

### 2026-07-13 — Homepage refinement and Chrome DevTools verification

- Replaced the ecosystem strip with a curated eight-technology data manifest and static-first GSAP
  rail. Exactly one technology group remains accessible; the visual duplicate is assistive-
  technology-hidden and appears only when motion is active.
- Added a pause/resume control and verified explicit pause, hover/focus pause, document visibility,
  responsive reinitialization, reduced-motion fallback, and Astro contact/back lifecycle cleanup.
- Added Selected Work with Menely Group, 233 Digital, and Agents by 233 Digital as visibly labelled
  development fixtures. Every unapproved evidence field remains pending.
- Added Managed hosting + operations as a fifth capability. Public wording distinguishes current
  provider-backed management from the planned Ken Arhin Labs hosting platform.
- Chrome DevTools found no horizontal overflow at 240, 280, 320, 768, 1024, or 1440 CSS pixels.
- Mobile lab trace on the development server observed LCP 1.305 s and CLS 0.00. Lighthouse scored
  Accessibility 100 and Best Practices 100; the remaining generic `Learn more` link finding belongs
  to Astro's development toolbar rather than application markup.
- Light/dark logo variants, local-only asset requests, keyboard operation, reduced motion, and
  back-navigation reinitialization were verified in Chrome DevTools.

## Blockers or handoff notes

- Homepage CMS/projection data is unavailable. This lane may use only brand-approved copy and
  factual project names already documented in `docs/context.md`.
- Real screenshots and outcome evidence remain a content/asset handoff; the foundation must not
  invent them.

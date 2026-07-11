# Ken Arhin Labs Frontend Motion and Interaction

_Last updated: 2026-07-11_

This document defines the motion language for the public website, admin application, and future client portal. Motion is a communication layer, not decoration.

## Core Principle

> Motion should explain how a system assembles, connects, changes state, publishes, and operates.

Every signature animation must answer at least one question:

```txt
What is connected?
What became active?
What changed?
Where did it move?
What is being built or published?
What should the visitor notice next?
```

If an effect cannot answer one of those questions, remove or simplify it.

## Primary Visual Metaphor

The brand's motion metaphor is **The Living System**.

```txt
Routes connect related elements.
Signals travel along meaningful paths.
Nodes activate when a capability or state becomes available.
Content transforms between layouts while preserving continuity.
Real project evidence emerges from the system.
```

This language should be recognizable across the site without making every page perform the same sequence.

## Hero Decision

The homepage hero uses HTML, SVG, Tailwind CSS, and GSAP. It does not depend on a full-screen AI-generated video.

### Message

Brand/category label:

> INDEPENDENT DIGITAL SYSTEMS LAB

Hero headline (H1):

> Digital systems, built around people.

Supporting copy:

> Ken Arhin Labs designs, builds, hosts, and operates websites, applications, AI workflows, and digital infrastructure that work together.

Primary action:

> Start a project

Secondary action:

> Explore our work

The headline and actions must render immediately without waiting for an animation timeline.

## Living System Hero Storyboard

### Frame 0: usable static composition

Before client JavaScript runs, the visitor sees:

```txt
Navigation
Headline
Supporting copy
Primary and secondary actions
A coherent partially or fully assembled system diagram
A visible indication that content continues below
```

The page must not begin as an empty loading stage.

### Frame 1: entrance

Approximate duration: 1.4–2.2 seconds.

```txt
1. Headline reveals by line or phrase.
2. Principal routes draw from the system origin.
3. Nodes activate in a meaningful order.
4. One Signal Orange event travels through the system.
5. Technical labels appear after their corresponding node exists.
```

Possible node labels:

```txt
STRATEGY
INTERFACE
ENGINEERING
AI + AUTOMATION
INFRASTRUCTURE
OPERATIONS
```

Do not animate every character by default.

### Frame 2: idle

After assembly:

```txt
One slow signal may travel occasionally.
A node may update state.
Pointer response may add subtle depth on capable desktop devices.
No constant pulsing or aggressive loop competes with reading.
```

The idle state should resemble a running system, not a screensaver.

### Frame 3: first scroll

The hero transitions into the first proof or service section.

```txt
Headline moves out of the primary reading position.
The system visual remains continuous.
Routes branch toward service or proof categories.
The active node becomes a real content panel or project image.
The rest of the document enters through normal scrolling.
```

Recommended opening distance:

```txt
Hero composition          100–115vh
Transition distance        60–90vh
Total opening sequence    160–200vh
```

Avoid pinning the full hero for several long screens. Limited visual pinning is acceptable when the visitor remains in control.

## GSAP Responsibilities

### Timelines

Use for:

```txt
Hero assembly
Coordinated section entrances
Node activation
Publishing and completion sequences
```

### ScrollTrigger

Use for:

```txt
Hero-to-content transition
Diagram progress tied to scroll
Case-study process reveals
Limited pinned visual storytelling
Section-state changes
```

Do not use ScrollTrigger to alter basic scroll distance or trap users.

### SplitText

Use for:

```txt
Line-based hero reveals
Section title entrances
Selected case-study titles
```

Preserve accessible text and responsive re-splitting. Character-level effects should be exceptional.

### DrawSVG and MotionPath

Use for:

```txt
Routes
Timelines
System diagrams
Signals moving through processes
```

Paths must communicate real relationships rather than fill empty space.

### Flip

Use for:

```txt
Hero node becoming a content panel
Project image moving from grid to detail
Stack filters reorganizing tools
Admin grid/table transitions
```

### MorphSVG

Use only when the changed shape has semantic continuity:

```txt
Node → project window
Route → project timeline
System mark → service mark
```

### ScrambleText

Reserve for small technical status changes:

```txt
INITIALISING
SYSTEM READY
PUBLISHING
DEPLOYED
```

Do not turn the interface into a generic hacker terminal.

## Astro View Transitions

Astro handles page-level visual continuity. GSAP handles choreography inside a page.

Signature concept: **Route Transition**.

```txt
1. Selected link, node, image, or title establishes a route.
2. The route expands or crosses the viewport.
3. A matched element persists or reappears in the destination composition.
4. The route settles into the next page's structure.
```

Use shared element transitions selectively for:

```txt
Project card → case-study hero
Service node → service diagram
Field Note title → article heading
Labs portal → experiment header
```

Normal browser navigation must remain the fallback. Scripts that initialize GSAP must account for Astro navigation lifecycle and clean up before reinitialization.

## Motion Intensity by Surface

### Homepage

Highest motion intensity, with one signature opening system and controlled transitions into proof.

### Services

Explain process stages:

```txt
Discover → Structure → Design → Build → Launch → Operate
Input → Reasoning → Action → Review → Result
Problem → Prototype → Validate → Build → Release
```

### Work and case studies

Demonstrate transformation:

```txt
Problem
  → architecture
  → system components
  → implemented interface
  → outcome
```

### Stacks and tools

Use modular assembly, route compatibility, and Flip-based filtering. Avoid turning the directory into a floating-card playground.

### Field Notes

Use restrained editorial reveals. Reading stability takes priority over spectacle.

### Labs

Labs may use the most experimental canvas, WebGL, media, or morphing techniques. Experiments remain isolated so the business-critical site stays predictable.

### Start a Project

The motion system becomes quieter and task-focused. Selected needs can assemble into a visual system summary as the form progresses.

### Admin

No scroll storytelling. Use motion to communicate:

```txt
Navigation state
Dialog and panel hierarchy
Saving and publishing
Reordering
Upload and queue progress
Success, failure, and retry
Layout changes
```

## Motion Tokens

Shared CSS vocabulary:

```txt
micro feedback          140ms
control transition      220ms
layout transition       420ms
editorial reveal        720ms
signature sequence     1400ms baseline
```

Shared easings:

```txt
standard
enter
exit
route
```

Exact GSAP timeline values may differ when the story requires it, but should remain related to this vocabulary.

## Responsive Motion

Use `gsap.matchMedia()` for responsive and preference-aware setup.

### Desktop

```txt
Complete system assembly
Limited pinning
Route drawing
Pointer depth where useful
Full shared-element transitions
```

### Tablet

```txt
Shorter routes
Less simultaneous motion
Reduced pinning
Simplified visual density
```

### Mobile

```txt
No long pinned storytelling
Vertical progression
Compact node sequence
Reduced path complexity
Touch-first controls
```

Do not simply scale the desktop timeline down.

## Reduced Motion

Respect `prefers-reduced-motion` and offer a coherent non-moving experience.

Replace:

```txt
Travelling signals       → active route already visible
Scrubbed transformations → direct layout state
Large zoom or rotation   → short fade or no transition
Hero loop                → static assembled system
Parallax                 → stable composition
```

Content, controls, and evidence remain complete in reduced-motion mode.

## Cleanup and Lifecycle

### Astro

- create page-local animation setup functions;
- initialize after the relevant Astro page-load event when client navigation is used;
- kill ScrollTriggers and revert GSAP contexts before reinitialization;
- do not attach duplicate global listeners after navigation;
- refresh ScrollTrigger after fonts, responsive images, or layout-affecting content settles.

### React and TanStack Start

- use GSAP context or the official React integration for component-scoped cleanup;
- keep selectors scoped to component roots;
- revert timelines when components unmount;
- avoid timelines that mutate DOM owned by another route or feature;
- use CSS transitions for ordinary admin controls before reaching for GSAP.

## Scroll Policy

Allowed:

```txt
Triggered reveals
Short scrubbed diagrams
Limited pinning
Masks
Subtle parallax
Shared-element continuity
```

Not allowed:

```txt
Fake scrollbars
Forced horizontal scroll for core content
Arbitrarily slowed scrolling
Long sequences that trap visitors
Mandatory animation before navigation
Motion on every element
```

Native scrolling and user control are the default.

## Performance Policy

- critical text renders server-side;
- GSAP loads only on routes or islands that use it;
- register only required plugins;
- prefer transforms and opacity for frequent movement;
- use SVG complexity appropriate for mobile GPUs;
- avoid layout reads and writes in tight loops;
- pause non-visible loops;
- do not autoplay sound;
- do not make video a prerequisite for understanding the hero;
- test on mid-range mobile hardware, not only desktop development machines.

## Motion Acceptance Criteria

A signature sequence is ready only when:

```txt
The static state is complete.
The animation communicates a clear system idea.
The page remains navigable during and after motion.
Resize and orientation changes do not leave stale inline styles.
Back and forward navigation do not duplicate timelines.
Reduced-motion mode is intentionally designed.
Mobile does not inherit desktop pinning blindly.
The sequence does not delay the primary action.
Performance remains stable under representative conditions.
```

## Official References

- GSAP overview: https://gsap.com/docs/v3/
- GSAP timelines: https://gsap.com/docs/v3/GSAP/gsap.timeline()/
- ScrollTrigger: https://gsap.com/docs/v3/Plugins/ScrollTrigger/
- gsap.matchMedia: https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/
- SplitText: https://gsap.com/docs/v3/Plugins/SplitText/
- gsap.context: https://gsap.com/docs/v3/GSAP/gsap.context()/
- Astro view transitions: https://docs.astro.build/en/guides/view-transitions/

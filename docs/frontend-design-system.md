# Ken Arhin Labs Frontend Design System

_Last updated: 2026-07-11_

This document defines how the **Human Systems Lab** identity becomes a maintainable frontend system. `DESIGN.md` communicates visual intent. `packages/design` is the shared runtime implementation. Application components remain owned by their applications.

## Source-of-Truth Hierarchy

```txt
DESIGN.md
  Brand identity, art direction, rationale, and agent-readable guidance.

packages/design
  Semantic Tailwind CSS v4 tokens and shared CSS foundations.

apps/web
  Public layouts, components, authored sections, and GSAP choreography.

apps/admin
  Admin-specific shadcn theme mappings and app-local components.
```

When documentation and implementation disagree:

1. confirm whether the brand intent changed;
2. update `DESIGN.md` when the identity changed;
3. update `packages/design` when the runtime token changed;
4. update applications to consume the semantic role;
5. avoid solving the disagreement with a one-off raw value.

## Brand Direction

**Human Systems Lab** combines:

```txt
Independent technical journal
Product workshop
Systems engineering studio
Experimental laboratory
```

The interface should feel:

- technically capable without becoming cold;
- editorial without becoming fashion decoration;
- experimental without becoming confusing;
- premium through craft and clarity rather than generic luxury effects;
- human even when discussing infrastructure, automation, and AI.

## Anti-Generic Rules

Do not use these as default brand devices:

```txt
Purple-to-blue AI gradients
Glowing brains, robots, or network spheres
Anonymous gradient meshes
Glass-card stacks
Floating dashboard mockups as the hero
Decorative 3D objects without meaning
Universal centered layouts
Generic “unlock the power of AI” copy
Animation added only because it looks expensive
```

Use instead:

```txt
Real system diagrams
Annotated project evidence
Interface fragments
Process maps
Editorial grids
Authored typography
Visible routes and status notation
Measured asymmetry
Real photography when available
```

## Color Palette

### Approved primitives

| Name | Hex | Meaning |
|---|---:|---|
| Lab Ink | `#11130F` | text, dark environment, technical authority |
| Warm Canvas | `#F3F0E8` | primary light background |
| Clean Paper | `#FFFDF7` | raised reading and interface surface |
| Signal Orange | `#FF5A1F` | activation, primary action, moving signal |
| System Blue | `#2D5BFF` | technology, information, engineering routes |
| Field Green | `#4A6B47` | stable, operational, completed states |
| Steel Text | `#666860` | secondary light-mode content |
| Rule Line | `#D9D5CA` | borders, grids, dividers |

Raw primitives belong in `DESIGN.md` and private CSS variables. Application markup uses semantic roles.

### Semantic roles

```txt
background / foreground
surface / surface-foreground / surface-subtle
surface-strong / surface-strong-foreground
primary / primary-foreground
secondary / secondary-foreground
accent / accent-foreground
muted / muted-foreground
border / input / ring / overlay
success / warning / destructive / info
signal / system / field
```

### Hierarchy

A normal light public viewport should be approximately:

```txt
65–75% neutral canvas and paper
15–25% ink and structural content
no more than 10% combined chromatic accent
```

Signal Orange identifies the current action or route. System Blue and Field Green support the narrative and should not compete with the principal action.

## Light and Dark Expressions

### Light: editorial mode

```txt
background      Warm Canvas
surface         Clean Paper
text            Lab Ink
quiet text      Steel Text
rule            Rule Line
primary signal  Signal Orange
```

### Dark: laboratory mode

Dark mode is purpose-built, not inverted. It uses:

```txt
Lab Ink environment
purpose-built dark surfaces
Warm Canvas text
lighter blue and green variants
Signal Orange focus and activation
quieter olive-grey rules
```

Authored color sections may preserve their color in both modes when the color is part of the story.

Theme preference values:

```txt
light
 dark
system
```

## Typography

### Display: Bricolage Grotesque

Use for:

```txt
Hero statements
Page titles
Service names
Case-study titles
Large numerals
Section-defining statements
```

Use variable width and optical size deliberately. Large display text may be compressed and tightly tracked. Write line breaks as part of the composition.

### Body and interface: IBM Plex Sans

Use for:

```txt
Paragraphs
Navigation
Controls
Forms
Tables
Long-form content
Admin interface
```

Approved initial weights:

```txt
400 regular
500 medium
600 semibold
```

### Technical annotation: IBM Plex Mono

Use for:

```txt
Project identifiers
Dates
Stack labels
System states
Code
Diagram annotations
Compact metadata
```

It is notation, not the dominant brand voice.

## Type Utilities

```txt
font-display
font-sans
font-mono

text-display-xl
text-display-lg
text-heading-lg
text-heading-md
text-heading-sm
text-lead
text-reading
text-body
text-body-sm
text-label
text-technical
```

Typography must remain readable if animation does not run. Never hide essential headings until a timeline completes.

## Layout System

### Grid

```txt
Mobile     4 columns
Tablet     6 columns
Desktop   12 columns
```

Recommended page gutters:

```txt
Mobile     20px
Tablet     32px
Desktop    48px
```

Public layouts use strong anchors, offset columns, rules, and deliberate empty space. The admin uses a denser grid and stronger component boundaries.

### Reading measure

```txt
Long-form body      60–72 characters
Compact admin copy  shorter where scanning matters
Hero and display    composition-led, not measure-led
```

The `.typeset` layer does not own maximum width. Page layouts choose `max-w-prose`, `max-w-reading`, or another explicit measure.

## Spacing

Tailwind's base spacing remains available for implementation. The shared package adds named layout distances:

```txt
page-mobile
page-tablet
page-desktop
section-sm
section
section-lg
```

Public pages should show generous vertical rhythm. Admin workflows can use tighter spacing without changing the global token definitions.

## Shape Language

```txt
2–4px    small controls, technical surfaces
8px      common panels and editorial containers
12–16px  selected larger surfaces
full      statuses, tags, and compact filters only
```

Circles represent meaningful nodes, route points, portals, or media masks. They are not decorative filler.

Do not turn every section into a rounded card. Use rules, alignment, and whitespace to group information.

## Depth

Preferred depth tools:

```txt
Tonal layers
Hairline borders
Overlap
Scale
Controlled clipping
Motion continuity
Restrained shadows for genuinely floating UI
```

Avoid large soft shadows and glass blur as default styling.

## Typeset

The project adopts an owned CSS content system based on the current shadcn/typeset architecture. It is not a React component and does not make the public site a shadcn site.

Use:

```html
<article class="typeset typeset-editorial">
  <!-- semantic rendered HTML -->
</article>
```

Available shared presets:

```txt
typeset-editorial  Field Notes, case studies, stack guides, legal content
typeset-compact    admin previews and dense content contexts
```

Main controls:

```css
--typeset-size;
--typeset-leading;
--typeset-flow;
```

Typeset follows semantic theme colors and brand fonts. Pages own measure, media layout, callouts, galleries, and special content blocks.

## Public Component Ownership

The public site does not use shadcn/ui.

Build public components from:

```txt
Astro
Semantic HTML
Tailwind CSS v4
SVG
GSAP
Native dialog and popover behavior where suitable
Small focused islands only where necessary
```

Custom public components should not be generalized prematurely. A system node, case-study rail, service route, or Labs portal can remain specific to its storytelling purpose.

## Admin Component Ownership

The admin uses shadcn/ui extensively with Base UI.

Rules:

- generate components only inside `apps/admin`;
- run CLI dry-run or diff before adding or updating non-trivial components;
- keep `components/ui` primitive and business-neutral;
- compose workflows in feature folders;
- map shadcn semantic roles to `@labs/design` variables in admin CSS;
- do not apply a shadcn preset over the Ken Arhin Labs brand tokens;
- keep the installed shadcn skill scoped to admin development conventions.

The shared package deliberately does not include `components.json`, `cn()`, React, Base UI, or generated components.

## Buttons and Actions

### Primary

```txt
Signal Orange background
Lab Ink text
Precise action label
Small radius
Decisive hover and active response
```

### Secondary

Use an outline, text-led action, or System Blue when hierarchy requires it. Do not create several equally loud CTAs in one viewport.

### Link language

Prefer destination-aware labels:

```txt
Start a project
Explore our work
Read the case study
Compare the stack
```

Avoid vague labels such as “Learn more” when a more specific label fits.

## Forms

Forms should feel like a structured consultation rather than a generic lead capture.

Requirements:

- persistent labels;
- helpful descriptions where needed;
- clear required and optional states;
- specific field errors;
- visible focus;
- correct autocomplete attributes;
- progress and save state when multi-step;
- no color-only error or success meaning;
- confirmation that explains what happens next.

## Icons and Diagrams

Use icons for recognition and operation, not decoration. Public diagrams may use custom SVG marks and technical annotation. Admin primitives may use the selected shadcn icon library consistently.

System diagrams use:

```txt
Signal Orange  active route or event
System Blue    engineering or data path
Field Green    stable or completed state
Rule Line      dormant structure
Lab Ink        labels and framing
```

## Imagery

Priority order:

```txt
1. Real project screenshots and results
2. Diagrams and annotated system views
3. Real photography
4. Carefully art-directed generated media for a specific concept
5. Abstract decoration only when it carries meaning
```

AI-generated hero video is not part of the current direction. The Living System is an interactive DOM/SVG/GSAP composition.

## Accessibility

Design review must verify:

- normal text contrast at or above WCAG AA;
- large text and graphical control contrast;
- visible keyboard focus in both themes;
- target sizes appropriate for touch;
- labels and states that do not rely on color alone;
- readable line length and zoom behavior;
- reduced-motion equivalents;
- no information conveyed only through hover;
- no essential content embedded only in canvas or video.

## Design Review Checklist

Before accepting a public page:

```txt
Does the opening explain the page clearly?
Is real evidence visible?
Does every major animation communicate something?
Is Signal Orange still selective?
Does the composition avoid generic card repetition?
Does the page work in light, dark, mobile, and reduced-motion modes?
Can a keyboard user reach every action?
Can the page be understood before motion completes?
Are raw colors absent from normal application markup?
```

Before accepting an admin workflow:

```txt
Is the next action obvious?
Are loading, saving, error, and success states explicit?
Does keyboard interaction work?
Is the density appropriate?
Is business logic outside primitive components?
Did the shadcn CLI change get reviewed with dry-run or diff?
Does the workflow preserve request IDs and useful errors?
```

## Official References

- DESIGN.md format: https://github.com/google-labs-code/design.md
- Tailwind CSS theme variables: https://tailwindcss.com/docs/theme
- Tailwind CSS colors: https://tailwindcss.com/docs/customizing-colors
- Tailwind CSS dark mode: https://tailwindcss.com/docs/dark-mode
- shadcn Typeset: https://ui.shadcn.com/docs/typeset
- shadcn changelog: https://ui.shadcn.com/docs/changelog
- shadcn CLI v4: https://ui.shadcn.com/docs/changelog/2026-03-cli-v4

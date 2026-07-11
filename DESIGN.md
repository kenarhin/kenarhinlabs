---
version: alpha
name: Ken Arhin Labs — Human Systems Lab
description: A warm, editorial and technically precise visual identity for an AI-native digital systems lab.
colors:
  lab-ink: "#11130F"
  warm-canvas: "#F3F0E8"
  clean-paper: "#FFFDF7"
  signal-orange: "#FF5A1F"
  system-blue: "#2D5BFF"
  field-green: "#4A6B47"
  steel-text: "#666860"
  rule-line: "#D9D5CA"
  dark-surface: "#1B1E18"
  dark-surface-raised: "#252920"
  dark-muted-text: "#A8ADA2"
  dark-rule-line: "#3D4338"
  dark-system-blue: "#8AA2FF"
  dark-field-green: "#9CB596"
  primary: "{colors.signal-orange}"
  secondary: "{colors.system-blue}"
  tertiary: "{colors.field-green}"
  background-light: "{colors.warm-canvas}"
  surface-light: "{colors.clean-paper}"
  text-light: "{colors.lab-ink}"
  background-dark: "{colors.lab-ink}"
  surface-dark: "{colors.dark-surface}"
  text-dark: "{colors.warm-canvas}"
typography:
  display-xl:
    fontFamily: Bricolage Grotesque
    fontSize: 9rem
    fontWeight: 750
    lineHeight: 0.9
    letterSpacing: -0.055em
    fontVariation: "'wdth' 88, 'opsz' 72"
  display-lg:
    fontFamily: Bricolage Grotesque
    fontSize: 6rem
    fontWeight: 720
    lineHeight: 0.92
    letterSpacing: -0.045em
    fontVariation: "'wdth' 90, 'opsz' 64"
  headline-lg:
    fontFamily: Bricolage Grotesque
    fontSize: 4.5rem
    fontWeight: 700
    lineHeight: 0.96
    letterSpacing: -0.04em
  headline-md:
    fontFamily: Bricolage Grotesque
    fontSize: 3rem
    fontWeight: 680
    lineHeight: 1
    letterSpacing: -0.035em
  headline-sm:
    fontFamily: Bricolage Grotesque
    fontSize: 2rem
    fontWeight: 650
    lineHeight: 1.05
    letterSpacing: -0.025em
  lead:
    fontFamily: IBM Plex Sans
    fontSize: 1.375rem
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: -0.01em
  body-lg:
    fontFamily: IBM Plex Sans
    fontSize: 1.125rem
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: 0em
  body-md:
    fontFamily: IBM Plex Sans
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0em
  body-sm:
    fontFamily: IBM Plex Sans
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0em
  label-caps:
    fontFamily: IBM Plex Mono
    fontSize: 0.75rem
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: 0.08em
  technical:
    fontFamily: IBM Plex Mono
    fontSize: 0.875rem
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: 0.01em
rounded:
  none: 0px
  xs: 2px
  sm: 4px
  md: 8px
  lg: 12px
  full: 9999px
spacing:
  2xs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  4xl: 96px
  section: 128px
  page-gutter-mobile: 20px
  page-gutter-tablet: 32px
  page-gutter-desktop: 48px
  grid-columns-mobile: 4
  grid-columns-tablet: 6
  grid-columns-desktop: 12
components:
  button-primary:
    backgroundColor: "{colors.signal-orange}"
    textColor: "{colors.lab-ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    padding: 12px
    height: 48px
  button-secondary:
    backgroundColor: "{colors.warm-canvas}"
    textColor: "{colors.lab-ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    padding: 12px
    height: 48px
  surface-editorial:
    backgroundColor: "{colors.clean-paper}"
    textColor: "{colors.lab-ink}"
    rounded: "{rounded.md}"
    padding: 32px
---

# Ken Arhin Labs Design Direction

## Overview

Ken Arhin Labs is a global-facing, AI-native digital systems lab. The visual identity is **Human Systems Lab**: a combination of an independent technical journal, a product workshop and a systems engineering studio.

The experience must feel:

- technically capable without looking cold;
- editorial and expressive without becoming fashionable decoration;
- experimental without becoming unpredictable;
- premium through restraint, craft and clarity rather than luxury clichés;
- human even when communicating infrastructure, automation and AI.

The core visual metaphor is **a living system**. Routes connect, signals travel, nodes activate, interfaces assemble and real project evidence emerges from the system. Motion and layout should explain how separate digital parts become one operating ecosystem.

This file communicates brand identity and design intent. It is not the runtime token source. The implementation source of truth is the semantic Tailwind CSS v4 theme in `packages/ui/src/styles/theme.css`. Hex values remain here because they are easy for humans, design tools and coding agents to read.

## Colors

The palette is grounded in warm paper-like neutrals, dark ink and one energetic signal color.

- **Lab Ink (`#11130F`)** is the principal text color, the dark-mode environment and the foundation for serious technical sections. It is warmer than pure black.
- **Warm Canvas (`#F3F0E8`)** is the main light-mode background. It gives the public site an editorial, tactile atmosphere.
- **Clean Paper (`#FFFDF7`)** is a raised reading and interface surface. Do not treat every section as a card simply because this surface exists.
- **Signal Orange (`#FF5A1F`)** represents action, activation and movement through the system. It is the main brand accent and must remain scarce enough to feel important.
- **System Blue (`#2D5BFF`)** represents engineering, data and connected technology. Use it for secondary actions, information and selected system routes.
- **Field Green (`#4A6B47`)** represents stable, operational and completed states. It is supportive rather than dominant.
- **Steel Text (`#666860`)** is for secondary copy and metadata on light surfaces.
- **Rule Line (`#D9D5CA`)** defines grids, dividers and quiet boundaries.

### Color hierarchy

The normal light-mode balance is approximately:

- 65–75% Warm Canvas and Clean Paper;
- 15–25% Lab Ink;
- no more than 10% combined accent color in a typical viewport.

Signal Orange should usually mark the single most important action or active path. System Blue and Field Green should not compete with it for attention.

### Light and dark modes

Light mode is the primary editorial expression. Dark mode is the laboratory expression. Dark mode is not a mechanical inversion: surfaces, secondary text, borders, blue and green receive purpose-built lighter variants.

Some authored sections may retain their art-directed color in both modes. An orange project panel should remain orange when that color is part of the story.

Functional success, warning and error colors may extend the palette, but they are interface status colors—not additional brand accents.

## Typography

Typography carries much of the identity.

### Display — Bricolage Grotesque

Use Bricolage Grotesque for hero statements, page titles, service names, case-study titles and large numbers. Its variable width and optical-size axes should be used deliberately. Large headings may be slightly compressed and tightly tracked.

Headlines should feel authored through line breaks and composition. Avoid placing every heading in the center of the viewport. Do not animate every character by default.

### Body and interface — IBM Plex Sans

Use IBM Plex Sans for paragraphs, navigation, controls, forms, tables and long-form reading. Prefer regular, medium and semibold weights. Reading text should normally sit between 60 and 72 characters per line.

### Technical annotation — IBM Plex Mono

Use IBM Plex Mono for project identifiers, dates, stack labels, system states, code and diagram annotations. It should behave like technical notation, not turn the whole brand into a terminal interface.

Example:

```text
CASE STUDY / 004
SYSTEM STATUS: LIVE
STACK: ASTRO · HONO · SUPABASE · CLOUDFLARE
```

## Layout

Public pages use an editorial grid rather than a universal card grid.

- Mobile: 4 columns.
- Tablet: 6 columns.
- Desktop: 12 columns.
- Very wide screens may extend the canvas, but content should retain intentional anchors and readable line lengths.
- Page gutters increase from 20px on mobile to 48px on desktop.
- Major sections receive generous vertical space; dense operational interfaces may use a tighter rhythm.

Use asymmetry, deliberate empty space, offset columns, large typography and visible rules. A section may be wide and cinematic while its supporting copy remains narrow.

The public site, admin application and future client portal share tokens but not density:

- **Public site:** spacious, editorial and expressive.
- **Admin:** compact, functional and information-first.
- **Client portal:** calm, premium and progress-oriented.

## Elevation & Depth

Depth comes primarily from tonal layers, borders, overlap, scale and motion—not large generic shadows.

Use:

- Warm Canvas behind Clean Paper;
- thin Rule Line borders;
- occasional hard or restrained shadows for floating controls;
- controlled overlap where one system state transforms into another;
- texture only when it supports the editorial or laboratory atmosphere.

Avoid stacks of translucent glass cards. Blur should solve a real layering problem, not act as a default visual style.

## Shapes

The shape language is **architectural with selective softness**.

- Default controls and small containers: 4px radius.
- Larger panels: 8–12px radius when softness improves hierarchy.
- Full pills: reserved for compact statuses, filters and tags.
- Circles: reserved for meaningful system nodes, route points, portals and media masks.
- Large decorative blobs and arbitrary organic shapes are not part of the identity.

Borders, grids and routes may be sharp even when nearby controls have a small radius.

## Components

Components should inherit the brand through typography, spacing, semantic color and state behavior. They should not all become rounded cards.

### Buttons

- Primary buttons use Signal Orange with Lab Ink text.
- Secondary buttons are quieter: outlined, text-led or placed on a contrasting surface.
- Labels should describe the destination or action precisely.
- Hover and active states should feel decisive, not bouncy.

### Surfaces

Use surfaces to group related information, not to wrap every paragraph. Editorial sections may rely on rules, whitespace and alignment instead of containers.

### Forms

Forms should feel like the beginning of a planning process. Labels remain visible, focus states are unmistakable, errors are specific and progress is communicated clearly.

### Data and status

Tables, queues, publishing states and project progress should use motion to explain what changed and where it moved. Color must never be the only status indicator.

No component library's default styling is automatically part of the brand. Any adopted primitives must be re-authored through these tokens and rules.

## Motion & Interaction

Motion is structural communication. It should demonstrate systems being assembled, connected, tested, published and operated.

### Signature vocabulary

- routes draw between related elements;
- signals travel along meaningful paths;
- nodes activate when a capability or state becomes available;
- content transforms between layouts while preserving continuity;
- real project evidence emerges from system structures;
- typography reveals by line or phrase, not constant character effects.

### Intensity by product surface

- **Homepage and selected landing pages:** cinematic but controlled.
- **Services and case studies:** explanatory process motion.
- **Stacks and tools:** modular assembly and layout transitions.
- **Field Notes:** restrained editorial reveals.
- **Labs:** the most experimental motion environment.
- **Admin:** quiet state, navigation and feedback animation only.

Use GSAP timelines, ScrollTrigger, SVG paths and layout transitions where they clarify relationships. Preserve native scrolling. Do not scrolljack, trap the visitor in long pinned sequences or delay access to essential information.

Recommended timing bands:

- micro feedback: 120–180ms;
- controls and menus: 180–280ms;
- panels and layout changes: 300–500ms;
- editorial reveals: 500–900ms;
- signature sequences: 900–2200ms;
- scroll-linked sequences: driven by scroll progress.

Reduced-motion modes must replace travelling, zooming and scrubbed sequences with assembled static states, direct transitions or short fades.

## Imagery & Art Direction

Use real evidence wherever possible:

- project screenshots;
- architectural diagrams;
- process sketches;
- annotated interface fragments;
- stack maps;
- photographs of people, places and working environments;
- carefully art-directed generated material only when it serves a specific concept.

Do not use generic robots, glowing brains, floating network spheres, anonymous gradient meshes or decorative AI imagery. Device mockups are acceptable only when the physical device is relevant to the story.

## Voice & Copy

The voice is direct, intelligent and concrete. Explain what was built, why it matters and how the parts work together.

Prefer:

> We build the systems behind modern businesses.

Avoid:

> Unlock the power of AI and transform the future.

Headlines should make a defensible claim. Supporting copy should provide specificity rather than repeat the headline with more adjectives.

## Do's and Don'ts

- Do make every major animation communicate a system relationship, process or state change.
- Do use Signal Orange selectively for activation and primary action.
- Do use real work, diagrams and interfaces as proof.
- Do preserve readable content and complete functionality without animation.
- Do maintain WCAG AA contrast and visible keyboard focus.
- Do allow light and dark modes to be individually art-directed.
- Don't use purple-blue gradients as a default AI-brand shortcut.
- Don't fill pages with interchangeable rounded cards.
- Don't use glassmorphism, glow, blur or 3D objects without a specific purpose.
- Don't use generic AI slogans or stock AI imagery.
- Don't center every section or make every page follow the same composition.
- Don't animate every text character, icon or hover state.
- Don't let a component library determine the visual identity.

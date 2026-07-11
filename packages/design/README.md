# `@labs/design`

Shared design foundations for Ken Arhin Labs applications.

This package contains no React, Astro, Base UI, Radix, or shadcn components. It exists to keep the brand implementation consistent without forcing the public site and the admin application to share component architecture.

## Responsibilities

- self-hosted font imports;
- light, dark, and system-aware semantic colors;
- Tailwind CSS v4 theme variables;
- typography, radius, layout, and depth tokens;
- base accessibility and document styles;
- owned long-form content styles through `.typeset`;
- shared motion durations and easing vocabulary.

Application-specific layouts, components, GSAP timelines, and interaction logic remain in the application that owns them.

## Consume from an application

Add the workspace dependency:

```json
{
  "dependencies": {
    "@labs/design": "workspace:*"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.3.2",
    "tailwindcss": "^4.3.2"
  }
}
```

When an application's global stylesheet is located at `src/styles/global.css`:

```css
@import "tailwindcss" source("../");
@import "@labs/design/styles.css";
```

The application owns the Tailwind entry point. This package contributes the shared theme and foundations.

## Semantic utilities

Use semantic roles:

```html
<section class="bg-background text-foreground">
  <article class="border border-border bg-surface text-surface-foreground">
    <p class="text-muted-foreground">SYSTEM STATUS / LIVE</p>
    <a class="bg-primary text-primary-foreground">Start a project</a>
  </article>
</section>
```

Do not couple application markup to raw values or generic palette names:

```html
<!-- Avoid -->
<div class="bg-[#F3F0E8] text-[#11130F]">...</div>
<div class="bg-purple-500 text-slate-950">...</div>
```

The exported color roles are:

```text
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

`signal`, `system`, and `field` are narrative roles for diagrams and authored visual sections:

```text
signal  activation, movement, and the primary route
system  technology, data, and connected engineering
field   stable, operational, and completed states
```

## Typography

```text
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

## Long-form content

Use the owned Typeset layer for rendered Markdown, case studies, Field Notes, stack guides, legal pages, and admin previews:

```html
<article class="typeset typeset-editorial max-w-prose">
  <!-- rendered semantic HTML -->
</article>
```

Available presets:

```text
typeset-editorial  public reading experiences
typeset-compact    dense previews and operational contexts
```

Typeset does not set a maximum width. The page layout owns reading measure.

## Theme selection

The CSS follows the operating-system theme when the root element has no explicit theme.

```html
<html data-theme="light">
<html data-theme="dark">
```

A future theme controller should store `light`, `dark`, or `system`. For `system`, remove `data-theme`. Set the resolved attribute before first paint to avoid a theme flash.

## Ownership boundaries

```text
apps/web
  Custom Astro components. No shadcn.

apps/admin
  App-local shadcn components using Base UI.
  Map shadcn roles to these semantic variables inside the admin stylesheet.

packages/design
  No components. No framework-specific code.
```

Create a future shared React component package only after real reuse exists across multiple React applications.

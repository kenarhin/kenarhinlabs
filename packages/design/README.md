# `@labs/ui`

Shared design foundation for Ken Arhin Labs applications.

This package intentionally contains **no components yet**. It currently owns:

- self-hosted brand font imports;
- light, dark and system-aware semantic color tokens;
- Tailwind CSS v4 theme variables;
- typography, radius, container, shadow and easing tokens;
- minimal cross-application base styles.

## Install workspace dependencies

From the repository root:

```sh
pnpm install
```

Each consuming application must depend on the workspace package and Tailwind CSS v4. For example:

```json
{
  "dependencies": {
    "@labs/ui": "workspace:*"
  },
  "devDependencies": {
    "tailwindcss": "^4.3.2",
    "@tailwindcss/vite": "^4.3.2"
  }
}
```

## Application stylesheet

Create the application's own CSS entry point. When the file is located at `src/styles/global.css`, use:

```css
@import "tailwindcss" source("../");
@import "@labs/ui/styles.css";
```

The first import creates Tailwind utilities and scans the application's `src` directory. The package stylesheet registers `packages/ui/src` as an additional source for future shared components.

## Semantic utilities

Use semantic classes rather than palette-specific or arbitrary color values:

```html
<section class="bg-background text-foreground">
  <article class="border-border bg-surface text-surface-foreground">
    <p class="text-muted-foreground">System metadata</p>
    <a class="bg-primary text-primary-foreground">Start a project</a>
  </article>
</section>
```

Available color roles include:

```text
background / foreground
surface / surface-foreground / surface-muted
surface-inverse / surface-inverse-foreground
primary / primary-foreground
secondary / secondary-foreground
accent / accent-foreground
muted / muted-foreground
border / input / ring / overlay
success / warning / destructive / info
signal / system / field
```

The generic Tailwind color palette is removed from the exported theme. This prevents application code from drifting into arbitrary `purple-500`, `slate-900` or raw-hex styling.

## Typography utilities

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
text-label
```

## Theme selection

The CSS follows the operating-system theme when no explicit preference exists. Applications can override it by setting one of these values on the root element:

```html
<html data-theme="light">
<html data-theme="dark">
```

A three-way control should store `light`, `dark` or `system`. For `system`, remove the `data-theme` attribute.

Set the attribute before first paint when the application adds the theme controller, so the page does not flash the wrong mode.

## Package boundary

`DESIGN.md` at the repository root describes the brand and art direction. This package is the implementation source for reusable design tokens. Application-specific layouts and motion remain in their respective apps unless they become genuinely reusable primitives.

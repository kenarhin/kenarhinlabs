# Lane 02 — Web Foundation and Shell

## Owner and scope

Owner: primary agent (senior frontend developer).

Owned scope: `apps/web` root layout, shared public components, header, responsive navigation,
footer, theme controller, metadata, and 404 page; logo export plumbing in `packages/design` where
needed for the public app.

Out of scope: backend implementation, full content page families, admin application work, and
unrelated shared package refactors.

## Checklist

- [ ] Normalize and export approved logo assets.
- [ ] Build accessible logo usage and theme-aware rendering.
- [ ] Build the base layout, metadata contract, skip link, and route lifecycle hooks.
- [ ] Build the responsive header and mobile navigation.
- [ ] Build the footer and global next-step pattern.
- [ ] Build the theme preference control without first-paint flash.
- [ ] Build the branded 404 page.
- [ ] Verify keyboard, mobile, light, dark, and no-motion behavior.

## Decisions and assumptions

- Astro components and native controls are the default.
- The header uses the approved vector wordmark; it is not re-typeset.
- Navigation from the live API replaces app-owned structural links only when the response is valid
  and non-empty.
- Mobile navigation uses a native dialog or disclosure pattern and restores focus when closed.
- The logo remains visible before and without animation.

## Evidence log

### 2026-07-12 — Planned

- Read the complete frontend, PWA, brand asset, backend contract, and task-convention documents.
- Confirmed the current source logo assets match the approved System K/wordmark concept, but their
  directory name (`icons`) disagrees with the approved `assets/logo` structure.
- Confirmed the existing app still contains the temporary `Welcome.astro` scaffold and no shared
  site shell.

## Documentation sources

- https://docs.astro.build/en/basics/astro-components/
- https://docs.astro.build/en/guides/routing/
- https://docs.astro.build/en/guides/view-transitions/
- https://tailwindcss.com/docs/theme

## Verification evidence

Not yet run for the implementation.

## Blockers or handoff notes

None for the static shell. CMS-managed navigation currently returns empty arrays, so the shell must
retain its authored structural routes until published navigation exists.


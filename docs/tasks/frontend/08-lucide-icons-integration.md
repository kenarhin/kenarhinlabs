# Lane 08 — Lucide Icons Integration

## Status

Status: completed. Installed `@lucide/astro` in `@labs/web` (`apps/web`) using direct package imports, and replaced all audited literal text glyphs (`↗`, `×`, `Ⅱ`, `●`, `+`) with official Lucide Astro vector icon components (`ArrowUpRight`, `X`, `Pause`, `Check`, `Plus`).

## Scope & Boundaries

- **Files Owned**: `apps/web/package.json`, `apps/web/src/components/**`, `apps/web/src/pages/**`
- **Focus**: `apps/web` (Astro UI foundation). `apps/admin` (React UI foundation) will use `lucide-react` directly when its full implementation begins.

## Decisions & Architectural Strategy

- **Direct Package Imports (Option A)**: Adopted framework-specific icon package imports (`@lucide/astro` for Astro in `apps/web` and `lucide-react` for React in `apps/admin`).
- **Avoid Master Barrel Files**: Avoided creating a giant re-export file in `@labs/design` to prevent bundler tree-shaking issues, performance overhead, and Astro/React framework component runtime incompatibilities.
- **Pure SVG Vector Icons**: Standardized UI icons across buttons, mobile navigation drawers, interactive control toggles, form fields, and external action links using Lucide SVG components.

## Audited Glyphs & Replaced Components

| Text Glyph / Symbol | Lucide Icon Component | Target File(s) & Component(s) | Description |
| :--- | :--- | :--- | :--- |
| `↗` (North-East Arrow) | `<ArrowUpRight />` | `LivingSystemHero.astro`, `index.astro`, `contact.astro`, `start-a-project.astro`, `SocialChannels.astro`, `LegalPageShell.astro` | Primary hero CTA, bottom section CTA, social card link hover arrows, and form submit buttons. |
| `×` (Multiplication Sign) | `<X />` | `SiteHeader.astro` | Mobile navigation drawer close button. |
| `Ⅱ` (Roman Numeral Two) | `<Pause />` | `TechnologyRail.astro` | Technology marquee rail animation pause/toggle button. |
| `●` (Black Circle Bullet) | `<Check />` | `ThemeMenu.astro` | Visual selection indicator in theme preference dropdown menu. |
| `+` (Plus Sign) | `<Plus />` | `start-a-project.astro` | Service intake checklist item indicator. |

## Deployment Fix — Wrangler v4.112+ Compatibility

- **Root Cause**: During CI/CD deployment (`pnpm dlx wrangler deploy`), Wrangler 4.112.0+ failed with:
  `✘ [ERROR] Processing dist/server/wrangler.json configuration: - The "legacy_env" field is no longer supported, so please remove it from your configuration file.`
  The `@astrojs/cloudflare` adapter hardcodes `"legacy_env": true` into generated `wrangler.json` configuration files inside `dist/server/`.
- **Fix**: Added `cleanGeneratedWranglerConfigs` to `apps/web/integrations/public-pwa.mjs` running in Astro's `astro:build:done` hook to sanitize `dist/server/wrangler.json` and remove the deprecated `"legacy_env"` property automatically before deployment. Removed `"legacy_env"` from `apps/web/wrangler.jsonc`.

## Files Changed

- `apps/web/package.json`: Added `"@lucide/astro": "^1.25.0"` dependency.
- `apps/web/wrangler.jsonc`: Cleaned deprecated `legacy_env` property.
- `apps/web/integrations/public-pwa.mjs`: Added `cleanGeneratedWranglerConfigs` helper to strip `legacy_env` from adapter-generated `dist/server/wrangler.json`.
- `apps/web/src/components/common/ThemeMenu.astro`: Imported `Check`, replaced `●` with `<Check class="size-3.5" />`.
- `apps/web/src/components/navigation/SiteHeader.astro`: Imported `X`, replaced `×` with `<X class="size-5" />`.
- `apps/web/src/components/technology/TechnologyRail.astro`: Imported `Pause`, replaced `Ⅱ` with `<Pause class="size-3.5 fill-current" />`.
- `apps/web/src/components/social/SocialChannels.astro`: Imported `ArrowUpRight`, replaced `↗` with `<ArrowUpRight class="size-4 ..." />`.
- `apps/web/src/components/content/LegalPageShell.astro`: Imported `ArrowUpRight`, replaced `↗` with `<ArrowUpRight class="size-4" />`.
- `apps/web/src/pages/index.astro`: Imported `ArrowUpRight`, replaced `↗` with `<ArrowUpRight class="size-4" />`.
- `apps/web/src/pages/contact.astro`: Imported `ArrowUpRight`, replaced `↗` with `<ArrowUpRight class="size-4" />`.
- `apps/web/src/pages/start-a-project.astro`: Imported `ArrowUpRight` and `Plus`, replaced `+` and `↗` with `<Plus />` and `<ArrowUpRight />`.

## Commands Run & Verification Results

1. **Package Installation**: `pnpm add @lucide/astro` (executed inside `apps/web`). Result: Successfully added `@lucide/astro@1.25.0`.
2. **Production Build Verification**: `pnpm --filter @labs/web build`. Result: Successfully compiled server and prerendered static routes in 17.46s, automatically removing `legacy_env` from `dist/server/wrangler.json`.
3. **Wrangler Configuration Inspection**: Verified `dist/server/wrangler.json` contains valid Wrangler schema without `legacy_env`.

## Checklist

- [x] Audit `apps/web` for literal text glyphs, emojis, and symbols used as icons.
- [x] Evaluate monorepo architecture for Lucide icon sharing between Astro (`apps/web`) and React (`apps/admin`).
- [x] Install `@lucide/astro` package in `@labs/web`.
- [x] Replace `↗` action arrow glyphs with `<ArrowUpRight />`.
- [x] Replace `×` close symbol with `<X />`.
- [x] Replace `Ⅱ` pause character with `<Pause />`.
- [x] Replace `●` theme bullet checkmark with `<Check />`.
- [x] Replace `+` service checkbox character with `<Plus />`.
- [x] Verify production Astro build passes cleanly without type or bundle errors.

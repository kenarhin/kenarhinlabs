import astroForDarkBackground from "@labs/design/assets/stack/astro-brand-assets/astro-logo-light-gradient.svg?url";
import astroForLightBackground from "@labs/design/assets/stack/astro-brand-assets/astro-logo-dark.svg?url";
import cloudflareLogo from "@labs/design/assets/stack/cloudflare-brand-assets/CF-Logo 1.png?url";
import gsapForDarkBackground from "@labs/design/assets/stack/gsap-brand-assets/gsap-white.svg?url";
import gsapForLightBackground from "@labs/design/assets/stack/gsap-brand-assets/gsap-black.svg?url";
import nextForDarkBackground from "@labs/design/assets/stack/nextjs-brand-assets/logotype/dark-background/nextjs-logotype-dark-background.svg?url";
import nextForLightBackground from "@labs/design/assets/stack/nextjs-brand-assets/logotype/light-background/nextjs-logotype-light-background.svg?url";
import supabaseLogo from "@labs/design/assets/stack/supabase-brand-assets/supabase-logo-icon.svg?url";
import tanstackForDarkBackground from "@labs/design/assets/stack/tenstack-brand-assets/tenstack-logo-word-white.svg?url";
import tanstackForLightBackground from "@labs/design/assets/stack/tenstack-brand-assets/tenstack-logo-word-black.svg?url";
import typescriptLogo from "@labs/design/assets/stack/typescript-brand-assets/ts-logo-256.svg?url";
import vercelForDarkBackground from "@labs/design/assets/stack/vercel-brand-kit/logotype/dark/vercel-logotype-dark.svg?url";
import vercelForLightBackground from "@labs/design/assets/stack/vercel-brand-kit/logotype/light/vercel-logotype-light.svg?url";

export interface TechnologyStackItem {
  darkModeLogoUrl?: string;
  displayOrder: number;
  displayWidthRem: number;
  height: number;
  id: string;
  lightModeLogoUrl?: string;
  logoUrl: string;
  name: string;
  requiresLightSurface?: boolean;
  sourceFolder: string;
  width: number;
}

/**
 * Curated homepage technologies, deliberately smaller than the full asset library.
 *
 * Each URL points to an unchanged downloaded source asset in `@labs/design`.
 * Display widths are optical targets; intrinsic dimensions preserve every mark's
 * official aspect ratio and prevent layout shift.
 */
export const HOMEPAGE_TECHNOLOGIES: TechnologyStackItem[] = [
  {
    id: "typescript",
    name: "TypeScript",
    logoUrl: typescriptLogo,
    width: 256,
    height: 256,
    sourceFolder: "typescript-brand-assets",
    displayOrder: 1,
    displayWidthRem: 3.25,
  },
  {
    id: "astro",
    name: "Astro",
    logoUrl: astroForLightBackground,
    lightModeLogoUrl: astroForLightBackground,
    darkModeLogoUrl: astroForDarkBackground,
    width: 460,
    height: 160,
    sourceFolder: "astro-brand-assets",
    displayOrder: 2,
    displayWidthRem: 9.25,
  },
  {
    id: "tanstack",
    name: "TanStack",
    logoUrl: tanstackForLightBackground,
    lightModeLogoUrl: tanstackForLightBackground,
    darkModeLogoUrl: tanstackForDarkBackground,
    width: 3178,
    height: 660,
    sourceFolder: "tenstack-brand-assets",
    displayOrder: 3,
    displayWidthRem: 10.25,
  },
  {
    id: "cloudflare",
    name: "Cloudflare",
    logoUrl: cloudflareLogo,
    width: 512,
    height: 173,
    sourceFolder: "cloudflare-brand-assets",
    displayOrder: 4,
    displayWidthRem: 10,
    requiresLightSurface: true,
  },
  {
    id: "supabase",
    name: "Supabase",
    logoUrl: supabaseLogo,
    width: 109,
    height: 113,
    sourceFolder: "supabase-brand-assets",
    displayOrder: 5,
    displayWidthRem: 3.15,
  },
  {
    id: "gsap",
    name: "GSAP",
    logoUrl: gsapForLightBackground,
    lightModeLogoUrl: gsapForLightBackground,
    darkModeLogoUrl: gsapForDarkBackground,
    width: 623,
    height: 231,
    sourceFolder: "gsap-brand-assets",
    displayOrder: 6,
    displayWidthRem: 9.5,
  },
  {
    id: "nextjs",
    name: "Next.js",
    logoUrl: nextForLightBackground,
    lightModeLogoUrl: nextForLightBackground,
    darkModeLogoUrl: nextForDarkBackground,
    width: 394,
    height: 80,
    sourceFolder: "nextjs-brand-assets",
    displayOrder: 7,
    displayWidthRem: 10.25,
  },
  {
    id: "vercel",
    name: "Vercel",
    logoUrl: vercelForLightBackground,
    lightModeLogoUrl: vercelForLightBackground,
    darkModeLogoUrl: vercelForDarkBackground,
    width: 2048,
    height: 407,
    sourceFolder: "vercel-brand-kit",
    displayOrder: 8,
    displayWidthRem: 10.25,
  },
].sort((left, right) => left.displayOrder - right.displayOrder);

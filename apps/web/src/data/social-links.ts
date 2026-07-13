import instagramForDarkBackground from "@labs/design/assets/social/IG/01 Static Glyph/02 White Glyph/Instagram_Glyph_White.svg?url";
import instagramForLightBackground from "@labs/design/assets/social/IG/01 Static Glyph/03 Black Glyph/Instagram_Glyph_Black.svg?url";
import whatsappLogo from "@labs/design/assets/social/whatsapp/Digital_Glyph_Green_RGB_2026.svg?url";
import xForDarkBackground from "@labs/design/assets/social/x-logo/logo.svg?url";
import xForLightBackground from "@labs/design/assets/social/x-logo/logo-black-96.png?url";

export interface SocialLink {
  darkModeLogoUrl?: string;
  handle: string;
  href: string;
  iconHeight?: number;
  iconWidth?: number;
  id: string;
  lightModeLogoUrl?: string;
  logoUrl?: string;
  name: string;
}

/**
 * Official Ken Arhin Labs social destinations and unchanged platform marks.
 *
 * Theme-specific marks use their supplied black/white variants. WhatsApp uses
 * its supplied green digital glyph unchanged in both theme expressions.
 */
export const SOCIAL_LINKS: SocialLink[] = [
  {
    id: "x",
    name: "X",
    handle: "@kenarhinlabs",
    href: "https://x.com/kenarhinlabs",
    lightModeLogoUrl: xForLightBackground,
    darkModeLogoUrl: xForDarkBackground,
    iconWidth: 24,
    iconHeight: 25,
  },
  {
    id: "instagram",
    name: "Instagram",
    handle: "@kenarhinlabs",
    href: "https://www.instagram.com/kenarhinlabs/",
    lightModeLogoUrl: instagramForLightBackground,
    darkModeLogoUrl: instagramForDarkBackground,
    iconWidth: 24,
    iconHeight: 24,
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    handle: "Channel",
    href: "https://whatsapp.com/channel/0029VbCu9k96xCSPnNiOGn31",
    logoUrl: whatsappLogo,
    iconWidth: 24,
    iconHeight: 24,
  },
];

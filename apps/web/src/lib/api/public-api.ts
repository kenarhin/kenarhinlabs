/**
 * Public API helpers for the Astro website.
 *
 * The module validates the small response surface consumed by the site shell,
 * preserves API request IDs for diagnostics, and falls back only to authored
 * structural navigation when the CMS has no published navigation records.
 */

const API_BASE_URL =
  import.meta.env.PUBLIC_API_BASE_URL ?? "https://api.kenarhinlabs.com";

export interface NavigationItem {
  href: string;
  label: string;
}

export interface SiteNavigation {
  footer: NavigationItem[];
  header: NavigationItem[];
  source: "api" | "structural";
}

interface ApiEnvelope<T> {
  data?: T;
  error?: {
    code?: string;
    message?: string;
  };
  ok: boolean;
  requestId?: string;
}

interface NavigationPayload {
  footer: unknown;
  header: unknown;
}

export const STRUCTURAL_NAVIGATION: SiteNavigation = {
  header: [
    { href: "/", label: "Home" },
    { href: "/#capabilities", label: "Capabilities" },
    { href: "/#approach", label: "Approach" },
    { href: "/contact", label: "Contact" },
  ],
  footer: [
    { href: "/", label: "Home" },
    { href: "/#capabilities", label: "Capabilities" },
    { href: "/contact", label: "Contact" },
  ],
  source: "structural",
};

/** Returns true when a CMS navigation link is safe for the public shell. */
function isNavigationItem(value: unknown): value is NavigationItem {
  if (typeof value !== "object" || value === null) return false;

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.label === "string" &&
    candidate.label.trim().length > 0 &&
    typeof candidate.href === "string" &&
    candidate.href.startsWith("/") &&
    !candidate.href.startsWith("//")
  );
}

/** Filters an unknown API collection into a stable navigation array. */
function navigationItems(value: unknown): NavigationItem[] {
  if (!Array.isArray(value)) return [];

  return value.filter(isNavigationItem).map((item) => ({
    href: item.href,
    label: item.label.trim(),
  }));
}

/**
 * Loads published navigation from the Hono API.
 *
 * @returns API navigation when at least one location is populated; otherwise
 * the authored structural navigation required for the site to remain usable.
 */
export async function getSiteNavigation(): Promise<SiteNavigation> {
  try {
    const response = await fetch(`${API_BASE_URL}/public/navigation`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(2_500),
    });

    if (!response.ok) return STRUCTURAL_NAVIGATION;

    const envelope = (await response.json()) as ApiEnvelope<NavigationPayload>;
    if (!envelope.ok || !envelope.data) return STRUCTURAL_NAVIGATION;

    const header = navigationItems(envelope.data.header);
    const footer = navigationItems(envelope.data.footer);
    if (header.length === 0 && footer.length === 0) return STRUCTURAL_NAVIGATION;

    return {
      header: header.length > 0 ? header : STRUCTURAL_NAVIGATION.header,
      footer: footer.length > 0 ? footer : STRUCTURAL_NAVIGATION.footer,
      source: "api",
    };
  } catch {
    return STRUCTURAL_NAVIGATION;
  }
}

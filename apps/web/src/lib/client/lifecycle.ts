import { setupSiteShell } from "./site-shell";

type Cleanup = () => void;

declare global {
  interface Window {
    __labsClientLifecycleInstalled?: boolean;
  }
}

/** Loads page-specific enhancements only when their root element exists. */
async function setupPage(): Promise<Cleanup> {
  const cleanups: Cleanup[] = [setupSiteShell()];

  if (document.querySelector("[data-homepage]")) {
    const { setupHomepageMotion } = await import("../motion/homepage");
    cleanups.push(await setupHomepageMotion());
  }

  if (document.querySelector("[data-contact-form]")) {
    const { setupContactForm } = await import("../forms/contact");
    cleanups.push(setupContactForm());
  }

  return () => cleanups.reverse().forEach((cleanup) => cleanup());
}

/**
 * Installs one Astro-aware client lifecycle for the entire public site.
 *
 * It tears down page-owned listeners/animations before DOM swaps and starts
 * the next page once Astro reports that styles and scripts are ready.
 */
export function installClientLifecycle(): void {
  if (window.__labsClientLifecycleInstalled) return;
  window.__labsClientLifecycleInstalled = true;

  let cleanup: Cleanup = () => undefined;

  const start = async () => {
    cleanup();
    cleanup = await setupPage();
  };

  document.addEventListener("astro:before-swap", () => cleanup());
  document.addEventListener("astro:page-load", () => void start());
  void start();

  document.addEventListener("astro:before-swap", (event) => {
    const preference = storedThemeForSwap();
    if (preference === "light" || preference === "dark") {
      event.newDocument.documentElement.setAttribute("data-theme", preference);
    } else {
      event.newDocument.documentElement.removeAttribute("data-theme");
    }
  });

  void import("../pwa/register").then(({ registerPublicPwa }) => registerPublicPwa());
}

/** Reads the theme for the incoming Astro document without throwing on storage denial. */
function storedThemeForSwap(): string | null {
  try {
    return localStorage.getItem("labs-theme");
  } catch {
    return null;
  }
}

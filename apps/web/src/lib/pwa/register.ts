/// <reference types="vite-plugin-pwa/client" />

import {
  observeConnectivity,
  startPeriodicServiceWorkerUpdateChecks,
} from "@labs/pwa/client";

declare global {
  interface Window {
    __labsPwaRegistered?: boolean;
  }
}

/** Shows a concise PWA state without blocking primary navigation. */
function showStatus(options: {
  actions?: boolean;
  detail: string;
  message: string;
}): void {
  const status = document.querySelector<HTMLElement>("[data-pwa-status]");
  if (!status) return;

  const message = status.querySelector<HTMLElement>("[data-pwa-message]");
  const detail = status.querySelector<HTMLElement>("[data-pwa-detail]");
  const actions = status.querySelector<HTMLElement>("[data-pwa-actions]");
  if (message) message.textContent = options.message;
  if (detail) detail.textContent = options.detail;
  actions?.classList.toggle("hidden", !options.actions);
  status.classList.remove("hidden");
}

/**
 * Registers the public service worker exactly once for the current browser tab.
 *
 * Update activation remains prompt-based and network loss is communicated as
 * a hint rather than proof that every remote dependency is unavailable.
 */
export async function registerPublicPwa(): Promise<void> {
  if (window.__labsPwaRegistered || !("serviceWorker" in navigator)) return;
  window.__labsPwaRegistered = true;

  const { registerSW } = await import("virtual:pwa-register");
  let updateServiceWorker: ((reloadPage?: boolean) => Promise<void>) | undefined;

  updateServiceWorker = registerSW({
    immediate: true,
    onNeedRefresh() {
      showStatus({
        actions: true,
        message: "A site update is ready.",
        detail: "Update when you are ready to load the newest interface and assets.",
      });
    },
    onOfflineReady() {
      showStatus({
        message: "This site is ready for limited offline use.",
        detail: "Previously visited public pages may be available when your connection drops.",
      });
    },
    onRegisteredSW(_url, registration) {
      if (registration) startPeriodicServiceWorkerUpdateChecks(registration);
    },
    onRegisterError() {
      window.__labsPwaRegistered = false;
    },
  });

  document.querySelector<HTMLButtonElement>("[data-pwa-update]")?.addEventListener("click", () => {
    void updateServiceWorker?.(true);
  });
  document.querySelector<HTMLButtonElement>("[data-pwa-dismiss]")?.addEventListener("click", () => {
    document.querySelector<HTMLElement>("[data-pwa-status]")?.classList.add("hidden");
  });

  observeConnectivity((snapshot) => {
    if (snapshot.status !== "offline") return;
    showStatus({
      message: "You appear to be offline.",
      detail: "Cached pages may not reflect recent updates, availability, or pricing.",
    });
  });
}

type Cleanup = () => void;

const THEME_STORAGE_KEY = "labs-theme";
type ThemePreference = "dark" | "light" | "system";

/** Reads a valid stored theme without allowing arbitrary attribute values. */
function storedTheme(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    if (value === "dark" || value === "light" || value === "system") return value;
  } catch {
    /* A blocked storage API simply falls back to the system preference. */
  }
  return "system";
}

/** Applies one theme preference and keeps the document color-scheme contract. */
function applyTheme(theme: ThemePreference): void {
  if (theme === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* Theme still works for this document when storage is unavailable. */
  }
}

/** Updates every theme menu after a page swap or preference change. */
function renderThemeMenus(theme: ThemePreference): void {
  document.querySelectorAll<HTMLElement>("[data-theme-label]").forEach((label) => {
    label.textContent = theme[0]?.toUpperCase() + theme.slice(1);
  });

  document.querySelectorAll<HTMLButtonElement>("[data-theme-option]").forEach((button) => {
    const selected = button.dataset.themeOption === theme;
    button.setAttribute("aria-pressed", String(selected));
    button.querySelector<HTMLElement>("[data-theme-check]")?.classList.toggle("opacity-0", !selected);
  });
}

/** Binds theme menus on the current Astro document and returns listener cleanup. */
function setupThemeMenus(): Cleanup {
  const disposers: Cleanup[] = [];
  let theme = storedTheme();
  renderThemeMenus(theme);

  document.querySelectorAll<HTMLButtonElement>("[data-theme-option]").forEach((button) => {
    const onClick = () => {
      const requested = button.dataset.themeOption;
      if (requested !== "dark" && requested !== "light" && requested !== "system") return;

      theme = requested;
      applyTheme(theme);
      renderThemeMenus(theme);
      button.closest<HTMLDetailsElement>("details")?.removeAttribute("open");
    };
    button.addEventListener("click", onClick);
    disposers.push(() => button.removeEventListener("click", onClick));
  });

  return () => disposers.forEach((dispose) => dispose());
}

/** Binds the current mobile dialog with focus-safe native dialog behavior. */
function setupMobileNavigation(): Cleanup {
  const dialog = document.querySelector<HTMLDialogElement>("[data-mobile-dialog]");
  const openButton = document.querySelector<HTMLButtonElement>("[data-menu-open]");
  const closeButton = dialog?.querySelector<HTMLButtonElement>("[data-menu-close]");
  if (!dialog || !openButton || !closeButton) return () => undefined;

  const open = () => {
    dialog.showModal();
    document.body.classList.add("overflow-hidden");
    closeButton.focus();
  };
  const close = () => dialog.close();
  const onClose = () => {
    document.body.classList.remove("overflow-hidden");
    openButton.focus();
  };
  const onBackdrop = (event: MouseEvent) => {
    if (event.target === dialog) dialog.close();
  };

  openButton.addEventListener("click", open);
  closeButton.addEventListener("click", close);
  dialog.addEventListener("close", onClose);
  dialog.addEventListener("click", onBackdrop);
  dialog.querySelectorAll<HTMLAnchorElement>("[data-menu-link]").forEach((link) => {
    link.addEventListener("click", close);
  });

  return () => {
    openButton.removeEventListener("click", open);
    closeButton.removeEventListener("click", close);
    dialog.removeEventListener("close", onClose);
    dialog.removeEventListener("click", onBackdrop);
    dialog.querySelectorAll<HTMLAnchorElement>("[data-menu-link]").forEach((link) => {
      link.removeEventListener("click", close);
    });
    document.body.classList.remove("overflow-hidden");
  };
}

/** Sets up all lightweight, page-scoped shell controls. */
export function setupSiteShell(): Cleanup {
  const disposeTheme = setupThemeMenus();
  const disposeMenu = setupMobileNavigation();

  return () => {
    disposeMenu();
    disposeTheme();
  };
}

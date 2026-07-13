import { gsap } from "gsap";

type Cleanup = () => void;

/**
 * Runs the responsive technology loop and owns every pause condition.
 *
 * @returns Cleanup that removes listeners, hides the duplicate visual group,
 * and reverts GSAP transforms before an Astro document swap.
 */
export async function setupTechnologyRailMotion(): Promise<Cleanup> {
  const root = document.querySelector<HTMLElement>("[data-technology-rail]");
  const viewport = root?.querySelector<HTMLElement>("[data-technology-viewport]");
  const track = root?.querySelector<HTMLElement>("[data-technology-track]");
  const duplicate = root?.querySelector<HTMLElement>("[data-technology-duplicate]");
  const toggle = root?.querySelector<HTMLButtonElement>("[data-technology-toggle]");
  const toggleLabel = toggle?.querySelector<HTMLElement>("[data-technology-toggle-label]");
  const toggleIcon = toggle?.querySelector<HTMLElement>("[data-technology-toggle-icon]");

  if (!root || !viewport || !track || !duplicate || !toggle || !toggleLabel || !toggleIcon) {
    return () => undefined;
  }

  await document.fonts.ready;

  const media = gsap.matchMedia();
  media.add("(prefers-reduced-motion: no-preference)", () => {
    let explicitlyPaused = false;
    let pointerPaused = false;
    let focusPaused = false;
    let resizeFrame = 0;

    duplicate.hidden = false;
    toggle.hidden = false;
    toggle.style.display = "inline-flex";
    root.dataset.motion = "active";

    const timeline = gsap.timeline({ repeat: -1 }).to(track, {
      xPercent: -50,
      duration: 48,
      ease: "none",
    });

    /** Keeps transport state separate from the visitor's explicit preference. */
    const syncPlayback = () => {
      const shouldPause =
        explicitlyPaused || pointerPaused || focusPaused || document.hidden;
      timeline.paused(shouldPause);
      root.dataset.motionState = shouldPause ? "paused" : "playing";
    };

    /** Exposes only the persistent pause choice through the control state. */
    const renderToggle = () => {
      toggle.setAttribute("aria-pressed", String(explicitlyPaused));
      toggleLabel.textContent = explicitlyPaused ? "Resume motion" : "Pause motion";
      toggleIcon.textContent = explicitlyPaused ? "▶" : "Ⅱ";
    };

    const onToggle = () => {
      explicitlyPaused = !explicitlyPaused;
      renderToggle();
      syncPlayback();
    };
    const onPointerEnter = () => {
      pointerPaused = true;
      syncPlayback();
    };
    const onPointerLeave = () => {
      pointerPaused = false;
      syncPlayback();
    };
    const onFocusIn = () => {
      focusPaused = true;
      syncPlayback();
    };
    const onFocusOut = (event: FocusEvent) => {
      if (event.relatedTarget instanceof Node && root.contains(event.relatedTarget)) return;
      focusPaused = false;
      syncPlayback();
    };
    const onVisibilityChange = () => syncPlayback();
    const onResize = () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        // Preserve the loop phase while GSAP refreshes percentage transforms.
        const progress = timeline.progress();
        timeline.invalidate().progress(progress);
      });
    };

    toggle.addEventListener("click", onToggle);
    viewport.addEventListener("pointerenter", onPointerEnter, { passive: true });
    viewport.addEventListener("pointerleave", onPointerLeave, { passive: true });
    root.addEventListener("focusin", onFocusIn);
    root.addEventListener("focusout", onFocusOut);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("resize", onResize, { passive: true });

    renderToggle();
    syncPlayback();

    return () => {
      cancelAnimationFrame(resizeFrame);
      toggle.removeEventListener("click", onToggle);
      viewport.removeEventListener("pointerenter", onPointerEnter);
      viewport.removeEventListener("pointerleave", onPointerLeave);
      root.removeEventListener("focusin", onFocusIn);
      root.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("resize", onResize);
      timeline.kill();
      duplicate.hidden = true;
      toggle.hidden = true;
      toggle.style.removeProperty("display");
      delete root.dataset.motion;
      delete root.dataset.motionState;
    };
  });

  return () => media.revert();
}

import { gsap } from "gsap";

type Cleanup = () => void;

/**
 * Assembles each legal document map once on capable desktop viewports.
 *
 * The server-rendered map remains complete without JavaScript. Reduced-motion
 * and smaller viewports intentionally keep that stable, fully readable state.
 *
 * @returns A cleanup callback that reverts GSAP state before an Astro page swap.
 */
export function setupLegalDocumentMotion(): Cleanup {
  const maps = gsap.utils.toArray<HTMLElement>("[data-legal-document-map]");
  if (maps.length === 0) return () => undefined;

  const media = gsap.matchMedia();
  media.add(
    "(min-width: 64rem) and (prefers-reduced-motion: no-preference)",
    () => {
      maps.forEach((map) => {
        const select = gsap.utils.selector(map);
        const timeline = gsap.timeline({
          defaults: { duration: 0.5, ease: "power3.out" },
        });

        // The route establishes document order before its stages become active.
        timeline
          .fromTo(
            select("[data-legal-map-route]"),
            { scaleY: 0 },
            { scaleY: 1, duration: 0.8, ease: "power2.inOut" },
            0,
          )
          .from(
            select("[data-legal-map-node]"),
            { scale: 0.65, stagger: 0.12, duration: 0.38 },
            0.16,
          )
          .from(
            select("[data-legal-map-stage]"),
            { x: 14, stagger: 0.12 },
            0.22,
          );
      });
    },
  );

  return () => media.revert();
}

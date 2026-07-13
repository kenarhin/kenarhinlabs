import { gsap } from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";

type Cleanup = () => void;

gsap.registerPlugin(MotionPathPlugin, ScrollTrigger);

/**
 * Sets up the Living System choreography for the current homepage document.
 *
 * @returns A cleanup callback that reverts all responsive animations,
 * ScrollTriggers, inline styles, and pointer listeners before an Astro swap.
 */
export async function setupHomepageMotion(): Promise<Cleanup> {
  const root = document.querySelector<HTMLElement>("[data-homepage]");
  const hero = root?.querySelector<HTMLElement>("[data-hero]");
  const visual = root?.querySelector<HTMLElement>("[data-system-visual]");
  if (!root || !hero || !visual) return () => undefined;

  await document.fonts.ready;

  const media = gsap.matchMedia();
  media.add(
    {
      desktop: "(min-width: 64rem)",
      mobile: "(max-width: 63.999rem)",
      reduceMotion: "(prefers-reduced-motion: reduce)",
    },
    (context) => {
      const { desktop, reduceMotion } = context.conditions as {
        desktop: boolean;
        mobile: boolean;
        reduceMotion: boolean;
      };
      const select = gsap.utils.selector(root);
      const routes = gsap.utils.toArray<SVGPathElement>(select("[data-route]"));
      const nodes = gsap.utils.toArray<SVGGElement>(select("[data-node]"));
      const signal = select("[data-signal]")[0];

      if (reduceMotion) {
        gsap.set([...routes, ...nodes], { clearProps: "all" });
        // The travelling signal has no static SVG coordinates, so omit it
        // while keeping every route and system node fully understandable.
        gsap.set(signal, { autoAlpha: 0 });
        return;
      }

      const timeline = gsap.timeline({
        defaults: { duration: 0.72, ease: "power3.out" },
      });

      timeline
        .from(select("[data-hero-kicker]"), { y: 18 }, 0)
        .from(
          select("[data-hero-line]"),
          { yPercent: 24, stagger: 0.09, duration: 0.9 },
          0.08,
        )
        .from(select("[data-hero-copy]"), { y: 24 }, 0.42)
        .from(select("[data-hero-actions]"), { y: 20 }, 0.55)
        .from(select("[data-hero-meta]"), { y: 12 }, 0.75)
        .fromTo(
          routes,
          { strokeDasharray: 1, strokeDashoffset: 1 },
          { strokeDashoffset: 0, stagger: 0.12, duration: 1.05, ease: "power2.inOut" },
          0.18,
        )
        .from(
          nodes,
          {
            scale: 0.78,
            stagger: { amount: 0.72, from: "start" },
            duration: 0.48,
          },
          0.55,
        )
        .fromTo(
          signal,
          { autoAlpha: 0 },
          {
            autoAlpha: 1,
            duration: 1.15,
            ease: "none",
            motionPath: {
              align: "#hero-route-primary",
              alignOrigin: [0.5, 0.5],
              path: "#hero-route-primary",
              start: 0,
              end: 1,
            },
          },
          0.72,
        );

      gsap.from(select("[data-capability]"), {
        y: 42,
        stagger: 0.1,
        duration: 0.7,
        ease: "power2.out",
        scrollTrigger: {
          trigger: select("[data-capability]")[0],
          start: "top 82%",
          toggleActions: "play none none reverse",
        },
      });

      gsap.from(select("[data-process-step]"), {
        y: 28,
        stagger: 0.08,
        duration: 0.6,
        scrollTrigger: {
          trigger: select("[data-process-step]")[0],
          start: "top 84%",
          toggleActions: "play none none reverse",
        },
      });

      gsap.from(select("[data-work-item]"), {
        y: 36,
        stagger: 0.1,
        duration: 0.7,
        scrollTrigger: {
          trigger: select("[data-work-item]")[0],
          start: "top 84%",
          toggleActions: "play none none reverse",
        },
      });

      gsap.utils.toArray<HTMLElement>(select("[data-section-reveal]")).forEach((heading) => {
        gsap.from(heading, {
          y: 32,
          duration: 0.75,
          scrollTrigger: {
            trigger: heading,
            start: "top 86%",
            toggleActions: "play none none reverse",
          },
        });
      });

      if (!desktop) return;

      const moveX = gsap.quickTo(visual, "x", { duration: 0.6, ease: "power3.out" });
      const moveY = gsap.quickTo(visual, "y", { duration: 0.6, ease: "power3.out" });
      const clamp = gsap.utils.clamp(-10, 10);
      const onPointerMove = (event: PointerEvent) => {
        const bounds = hero.getBoundingClientRect();
        moveX(clamp(((event.clientX - bounds.left) / bounds.width - 0.5) * 20));
        moveY(clamp(((event.clientY - bounds.top) / bounds.height - 0.5) * 20));
      };
      hero.addEventListener("pointermove", onPointerMove, { passive: true });

      gsap.to(visual, {
        yPercent: -5,
        ease: "none",
        scrollTrigger: {
          trigger: hero,
          start: "top top",
          end: "bottom top",
          scrub: 0.6,
        },
      });

      return () => hero.removeEventListener("pointermove", onPointerMove);
    },
    root,
  );

  ScrollTrigger.refresh();
  return () => media.revert();
}

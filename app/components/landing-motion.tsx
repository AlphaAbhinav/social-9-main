"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./landing-motion.css";

export function MotionWords({ text }: { text: string }) {
  return <span aria-label={text}>{text.split(" ").map((word, index) => <span className="motion-word-mask" aria-hidden="true" key={`${word}-${index}`}><span className="motion-word">{word}</span>{" "}</span>)}</span>;
}

/** All content is visible without JS; matchMedia owns and reverts every animation. */
export function LandingMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const page = root.current;
    if (!page) return;
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    let disposed = false;

    media.add({ desktop: "(min-width: 1000px)", motion: "(prefers-reduced-motion: no-preference)" }, (context) => {
      if (!context.conditions?.motion) return;
      const desktop = context.conditions.desktop;
      const select = gsap.utils.selector(page);
      const reveal = (targets: Element[], trigger: Element, distance = 40) => {
        if (!targets.length) return;
        gsap.from(targets, {
          y: distance, opacity: 0, duration: .85, stagger: .12, ease: "power3.out",
          clearProps: "transform,opacity",
          scrollTrigger: { trigger, start: "top 90%", once: true },
        });
      };

      gsap.from(select(".neon-kicker, .neon-hero > p, .neon-hero-actions"), {
        y: 36, opacity: 0, duration: 1.05, stagger: .13, ease: "power3.out", clearProps: "transform,opacity",
      });
      gsap.from(select(".neon-hero .motion-word"), {
        yPercent: 115, rotation: 6, duration: 1.15, stagger: .075, ease: "power4.out", clearProps: "transform",
      });
      gsap.to(select(".landing-scroll-progress"), {
        scaleX: 1, ease: "none", scrollTrigger: { trigger: page, start: "top top", end: "bottom bottom", scrub: .2 },
      });

      // Keep the mobile preview's existing CSS scale intact.
      if (desktop) {
        gsap.fromTo(select(".neon-product-preview"), { y: 120, rotateX: 16, rotateZ: -2, scale: .82 }, {
          y: 0, rotateX: 0, rotateZ: 0, scale: 1, ease: "none",
          scrollTrigger: { trigger: ".neon-product-preview", start: "top 95%", end: "top 24%", scrub: .8 },
        });
        gsap.to(select(".neon-hero h1"), { y: -65, scale: .95, ease: "none",
          scrollTrigger: { trigger: ".neon-hero", start: "top top", end: "45% top", scrub: .8 } });
        gsap.to(select(".landing-hero-orbit"), {
          rotation: 110, y: 90, ease: "none",
          scrollTrigger: { trigger: ".neon-hero", start: "top top", end: "bottom top", scrub: 1 },
        });
      }

      page.querySelectorAll<HTMLElement>(".neon-section, .neon-plans-inner, .neon-about-copy, .neon-final").forEach((section) => {
        const heading = section.querySelector("h2");
        if (heading) {
          gsap.from(heading, {
            y: desktop ? 55 : 25, opacity: .2, ease: "none",
            scrollTrigger: { trigger: heading, start: "top 94%", end: "top 65%", scrub: .5 },
          });
        }
        reveal(Array.from(section.querySelectorAll(":scope > .neon-section-label, :scope > p, .neon-section-intro > p, .neon-plans-head > p")), section, 22);
      });

      // A scroll-controlled spread gives the product cards a distinct entrance.
      if (desktop) {
        const featureGrid = page.querySelector("#product .neon-feature-grid");
        if (featureGrid) {
          gsap.from(featureGrid.children, {
            x: (index: number) => (1 - index) * 90,
            y: (index: number) => index === 1 ? 90 : 150,
            rotation: (index: number) => (index - 1) * 9,
            scale: .9, ease: "none",
            scrollTrigger: { trigger: featureGrid, start: "top 95%", end: "top 28%", scrub: .7 },
          });
        }
      }

      page.querySelectorAll<HTMLElement>(".neon-feature-grid, .neon-pricing-grid, .neon-growth-proof, .closing-benefits").forEach((grid) => {
        const cards = Array.from(grid.children);
        if (desktop && grid.closest("#product")) return;
        cards.forEach((card, index) => {
          gsap.from(card, {
            y: desktop ? 85 + index * 24 : 28, rotation: desktop ? (index - 1) * 3 : 0,
            opacity: 0, duration: 1, delay: desktop ? index * .12 : 0, ease: "power3.out",
            clearProps: "transform,opacity",
            scrollTrigger: { trigger: desktop ? grid : card, start: "top 89%", once: true },
          });
        });
      });

      page.querySelectorAll<HTMLElement>(".neon-card-visual.analytics, .neon-mini-graph").forEach((chart) => {
        gsap.from(chart.querySelectorAll("i"), {
          scaleY: .12, transformOrigin: "bottom", stagger: .07, duration: .8, ease: "back.out(1.4)",
          scrollTrigger: { trigger: chart, start: "top 88%", once: true },
        });
      });
      const capability = page.querySelector(".neon-capability-track");
      if (capability) reveal(Array.from(capability.children), capability, 25);

      const workflow = page.querySelector<HTMLElement>(".neon-workflow");
      if (workflow) {
        const intro = workflow.querySelector<HTMLElement>(".neon-workflow-inner > div");
        const steps = workflow.querySelectorAll<HTMLElement>("li");
        if (intro) reveal([intro], intro);
        steps.forEach((step) => {
          gsap.fromTo(step, { "--step-progress": 0, opacity: .45, x: desktop ? 30 : 0 }, {
            "--step-progress": 1, opacity: 1, x: 0, ease: "none",
            scrollTrigger: { trigger: step, start: "top 84%", end: "top 48%", scrub: .4 },
          });
        });
      }

      const ribbon = page.querySelector(".landing-motion-ribbon");
      if (ribbon) {
        const scene = gsap.timeline({ scrollTrigger: {
          trigger: ribbon, start: desktop ? "center center" : "top bottom",
          end: desktop ? "+=650" : "bottom top", pin: desktop, scrub: .8, anticipatePin: 1,
          invalidateOnRefresh: true,
        } });
        scene.fromTo(select(".ribbon-line-one"), { xPercent: 12 }, { xPercent: -18, ease: "none" }, 0)
          .fromTo(select(".ribbon-line-two"), { xPercent: -18 }, { xPercent: 8, ease: "none" }, 0)
          .fromTo(select(".ribbon-flower"), { rotation: -90, scale: .7 }, { rotation: 135, scale: 1.15, ease: "none" }, 0);
      }
      const about = page.querySelector(".neon-about-system");
      if (about) {
        gsap.from(about, { scale: .86, opacity: .3, ease: "none",
          scrollTrigger: { trigger: about, start: "top 95%", end: "center 60%", scrub: .6 } });
      }
      const final = page.querySelector(".neon-final");
      if (final) {
        gsap.fromTo(select(".landing-final-halo"), { scale: .6, rotation: -35 }, {
          scale: 1.15, rotation: 35, ease: "none",
          scrollTrigger: { trigger: final, start: "top bottom", end: "bottom bottom", scrub: .8 },
        });
        reveal(select(".neon-final > .neon-cta"), final, 35);
      }
      const footer = page.querySelector(".neon-footer");
      if (footer) reveal(Array.from(footer.children), footer, 20);
    }, page);

    // Pointer effects are isolated from the scroll transforms on the outer cards.
    media.add("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
      const cleanups: (() => void)[] = [];
      page.querySelectorAll<HTMLElement>(".neon-card-visual, .neon-platform-visual").forEach((visual) => {
        const card = visual.closest<HTMLElement>(".neon-feature-card");
        if (!card) return;
        const tiltX = gsap.quickTo(visual, "rotationX", { duration: .5, ease: "power3.out" });
        const tiltY = gsap.quickTo(visual, "rotationY", { duration: .5, ease: "power3.out" });
        const move = (event: PointerEvent) => {
          const bounds = card.getBoundingClientRect();
          tiltX(((event.clientY - bounds.top) / bounds.height - .5) * -12);
          tiltY(((event.clientX - bounds.left) / bounds.width - .5) * 16);
        };
        const reset = () => { tiltX(0); tiltY(0); };
        card.addEventListener("pointermove", move);
        card.addEventListener("pointerleave", reset);
        cleanups.push(() => { card.removeEventListener("pointermove", move); card.removeEventListener("pointerleave", reset); });
      });
      return () => cleanups.forEach((cleanup) => cleanup());
    }, page);

    void document.fonts.ready.then(() => { if (!disposed) ScrollTrigger.refresh(); });
    return () => { disposed = true; media.revert(); };
  }, []);

  return <main className="neon-site landing-motion" ref={root}>
    <div className="landing-scroll-progress" aria-hidden="true" />
    {children}
  </main>;
}

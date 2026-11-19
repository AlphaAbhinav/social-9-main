"use client";
import "../workspace-refinement.css";
import "../dashboard-studio.css";
import "../styles/workspace-sections.css";
import "../accounts/accounts.css";


import gsap from "gsap";
import { useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";

import { DashboardSidebar } from "./dashboard-sidebar";
import type { DashboardSection } from "./dashboard-sidebar";

type DashboardPageFrameProps = {
  active: DashboardSection;
  children: ReactNode;
  className?: string;
};

const motionSelector = [
  "article",
  "aside",
  ".composer-card",
  ".saved-posts-card",
  ".calendar-toolbar",
  ".calendar-card",
  ".post-detail-card",
  ".drafts-card",
  ".library-toolbar",
  ".library-summary",
  ".template-toolbar",
  ".template-card",
  ".action-summary",
  ".live-analytics-banner",
].join(",");

export function DashboardPageFrame({ active, children, className = "" }: DashboardPageFrameProps) {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const page = root.current;
    if (!page || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const context = gsap.context(() => {
      gsap.fromTo(
        page.querySelector(".dashboard-header"),
        { y: 16 },
        { y: 0, duration: 0.45, ease: "power3.out" },
      );
      gsap.fromTo(
        ".workspace-orb-one",
        { xPercent: -4, yPercent: -5 },
        { xPercent: 7, yPercent: 6, duration: 7, repeat: -1, yoyo: true, ease: "sine.inOut" },
      );
      gsap.fromTo(
        ".workspace-orb-two",
        { xPercent: 5, yPercent: 4 },
        { xPercent: -6, yPercent: -7, duration: 9, repeat: -1, yoyo: true, ease: "sine.inOut" },
      );
    }, page);

    function animateNewContent() {
      if (!page) return;
      const targets = Array.from(page.querySelectorAll<HTMLElement>(motionSelector))
        .filter((target) => !target.dataset.motionReady && !target.closest("[role='dialog']"));
      if (!targets.length) return;
      targets.forEach((target) => { target.dataset.motionReady = "true"; });
      gsap.fromTo(
        targets,
        { y: 14, scale: 0.992 },
        { y: 0, scale: 1, duration: 0.4, stagger: 0.04, ease: "power3.out", clearProps: "transform" },
      );
      const bars = targets.flatMap((target) => Array.from(target.querySelectorAll<HTMLElement>(".operations-bar span, .activity-bar-fill")));
      if (bars.length) gsap.fromTo(bars, { scaleY: 0, transformOrigin: "bottom" }, { scaleY: 1, duration: 0.8, stagger: 0.035, ease: "power2.out" });
    }

    animateNewContent();
    const observer = new MutationObserver(() => window.requestAnimationFrame(animateNewContent));
    observer.observe(page, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      context.revert();
    };
  }, []);

  return (
    <main className="dashboard-shell neon-app-shell">
      <DashboardSidebar active={active} />
      <section className={`dashboard-content neon-dashboard neon-workspace-page ${className}`.trim()} ref={root}>
        <div className="workspace-ambient" aria-hidden="true"><span className="workspace-orb-one" /><span className="workspace-orb-two" /><i /></div>
        {children}
      </section>
    </main>
  );
}

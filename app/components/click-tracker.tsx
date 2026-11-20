"use client";

import { useEffect } from "react";
import { track } from "../lib/track";

// One listener tracks important link clicks across every page.
export function ClickTracker() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      const raw = link.getAttribute("href") ?? "";
      const label = (link.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
      if (raw.startsWith("mailto:")) {
        const subject = new URLSearchParams(raw.split("?")[1] ?? "").get("subject") ?? "general";
        return track("contact", { method: "email", label: subject });
      }
      let url: URL;
      try { url = new URL(link.href); } catch { return; }
      if (url.hostname === "play.google.com") return track("app_download_click", { label });
      if (url.origin !== window.location.origin) return;
      if (url.pathname === "/signup") {
        return track("signup_cta_click", { label, plan: url.searchParams.get("plan") ?? undefined, duration: url.searchParams.get("duration") ?? undefined });
      }
      if (url.pathname === "/login" && window.location.pathname !== "/signup") return track("login_cta_click", { label });
      if (url.hash === "#plans") return track("pricing_link_click", { label });
    }
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);
  return null;
}

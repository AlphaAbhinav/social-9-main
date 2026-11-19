"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "./link";

const functions = [
  { title: "Create post", href: "/create-post", description: "Write, publish, or schedule a post", keywords: "caption ai assistant image collage upload" },
  { title: "Calendar", href: "/calendar", description: "Plan content and review scheduled posts", keywords: "schedule ideas business monthly ai plan" },
  { title: "Content library", href: "/content", description: "Find saved drafts and published content", keywords: "posts search draft reuse" },
  { title: "Templates", href: "/templates", description: "Browse ready-to-edit post templates", keywords: "design ideas inspiration" },
  { title: "Accounts", href: "/accounts", description: "Connect Instagram, Facebook Pages, and LinkedIn", keywords: "social channels brand connection" },
  { title: "Analytics", href: "/analytics", description: "Review performance and growth forecasts", keywords: "reports engagement followers reach insights" },
  { title: "Action center", href: "/actions", description: "Review publishing issues and next steps", keywords: "failed errors retry tasks" },
  { title: "Plans & billing", href: "/billing", description: "Manage your plan and Premium access", keywords: "subscription payment upgrade pricing" },
  { title: "Overview", href: "/dashboard", description: "Your workspace at a glance", keywords: "home dashboard summary" },
];

export function WorkspaceSearch() {
  const anchor = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 300, maxHeight: 350 });
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const update = () => {
      const rect = anchor.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(Math.max(rect.width, 280), window.innerWidth - 24);
      const below = window.innerHeight - rect.bottom - 20;
      const height = Math.min(350, Math.max(below, rect.top - 20));
      setPosition({ left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)), top: below >= Math.min(250, height) ? rect.bottom + 8 : Math.max(12, rect.top - height - 8), width, maxHeight: Math.max(100, height) });
    };
    const dismiss = (event: PointerEvent) => { if (!anchor.current?.contains(event.target as Node) && !menu.current?.contains(event.target as Node)) setOpen(false); };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    document.addEventListener("pointerdown", dismiss);
    return () => { window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); document.removeEventListener("pointerdown", dismiss); };
  }, [open]);
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const results = functions.filter((item) => words.every((word) => `${item.title} ${item.description} ${item.keywords}`.toLowerCase().includes(word)));
  return <div ref={anchor} role="group" aria-label="Find a workspace function" className="workspace-search" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget) && !menu.current?.contains(event.relatedTarget)) setOpen(false); }}>
    <form role="search" onSubmit={(event) => { event.preventDefault(); setOpen(true); if (results.length) window.location.assign(results[0].href); }}>
      <input onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }} type="search" aria-label="Search by function" placeholder="Search by function…" value={query} onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} />
      <button type="submit" aria-label="Search functions">⌕</button>
    </form>
    {open && createPortal(<div ref={menu} className="workspace-search-results workspace-search-portal" style={position} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget) && !anchor.current?.contains(event.relatedTarget)) setOpen(false); }}>
      <p role="status">{results.length ? `${results.length} matching functions` : "No matching functions. Try calendar, posts, or accounts."}</p>
      {results.map((item) => <Link onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }} key={item.href} href={item.href}><strong>{item.title}</strong><span>{item.description}</span></Link>)}
    </div>, document.body)}
  </div>;
}

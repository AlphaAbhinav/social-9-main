"use client";

import { Dropdown } from "./dropdown";

import { useCallback, useEffect, useRef, useState } from "react";

import { AddBrandDialog } from "./add-brand-dialog";
import Link from "./link";
import { Social9Mark } from "./social9-mark";
import { ThemeToggle } from "./theme-toggle";
import { clearSession, getAccessToken } from "../lib/session";
import { apiRequest, getActiveBrandId, setActiveBrandId, Social9Brand } from "../lib/api";
import { track } from "../lib/track";

export type DashboardSection =
  | "dashboard"
  | "create-post"
  | "templates"
  | "content"
  | "calendar"
  | "actions"
  | "analytics"
  | "accounts"
  | "billing"
  | "agency";

const navigation: Array<{ id: DashboardSection; href: string; label: string }> = [
  { id: "dashboard", href: "/dashboard", label: "Overview" },
  { id: "accounts", href: "/accounts", label: "Accounts" },
  { id: "create-post", href: "/create-post", label: "Create post" },
  { id: "templates", href: "/templates", label: "Templates" },
  { id: "content", href: "/content", label: "Content library" },
  { id: "calendar", href: "/calendar", label: "Calendar" },
  { id: "actions", href: "/actions", label: "Action center" },
  { id: "analytics", href: "/analytics", label: "Analytics" },
  { id: "agency", href: "/agency", label: "Agency workspace" },
  { id: "billing", href: "/billing", label: "Plans & billing" },
];

export function DashboardSidebar({ active }: { active: DashboardSection }) {
  const menuButton = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [brands, setBrands] = useState<Social9Brand[]>([]);
  const [activeBrand, setActiveBrand] = useState<number | null>(null);
  const [addBrandOpen, setAddBrandOpen] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    void apiRequest<Social9Brand[]>("/brands", {
      headers: { Authorization: `Bearer ${token}` },
    }).then((items) => {
      setBrands(items);
      const saved = getActiveBrandId();
      const selected = items.some((item) => item.id === saved) ? saved : items[0]?.id ?? null;
      if (selected) setActiveBrandId(selected);
      setActiveBrand(selected);
      if (saved && selected && saved !== selected) window.location.reload();
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function dismiss(event: KeyboardEvent) { if (event.key === "Escape") { setMenuOpen(false); menuButton.current?.focus(); } }
    function outside(event: PointerEvent) { if (event.target instanceof Node && !sidebar.current?.contains(event.target)) setMenuOpen(false); }
    document.addEventListener("keydown", dismiss); document.addEventListener("pointerdown", outside);
    return () => { document.removeEventListener("keydown", dismiss); document.removeEventListener("pointerdown", outside); };
  }, [menuOpen]);

  const closeAddBrand = useCallback(() => setAddBrandOpen(false), []);

  function handleBrandCreated(brand: Social9Brand) {
    setActiveBrandId(brand.id);
    window.location.reload();
  }

  function signOut() {
    track("logout");
    clearSession();
    window.location.assign("/login");
  }

  return (
    <aside ref={sidebar} className={menuOpen ? "dashboard-sidebar mobile-menu-open" : "dashboard-sidebar"}>
      <Link className="dashboard-brand" href="/dashboard" aria-label="Social9 dashboard">
        <Social9Mark />
        <span>Social9</span>
      </Link>
      <button
        ref={menuButton}
        className="dashboard-menu-toggle"
        type="button"
        aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={menuOpen}
        aria-controls="dashboard-navigation"
        onClick={() => setMenuOpen((current) => !current)}
      >
        <span aria-hidden="true"><i /><i /><i /></span>
        <b>{menuOpen ? "Close" : "Menu"}</b>
      </button>
      <div className="brand-switcher">
        <span>Your workspace</span>
        <div>
          <Dropdown label="Active brand"
            variant="brand" placeholder={brands.length ? "Choose a brand" : "Loading workspace..."}
            value={activeBrand ?? ""}
            onValueChange={(value) => {
              const brandId = Number(value);
              setActiveBrandId(brandId);
              setActiveBrand(brandId);
              window.location.reload();
            }}
          >
            {brands.map((brand) => <option value={brand.id} key={brand.id}>{brand.name}</option>)}
          </Dropdown>
          <button className="add-brand-button" type="button" aria-label="Add another brand" title="Add another brand" onClick={() => setAddBrandOpen(true)}>+</button>
        </div>
      </div>
      <nav id="dashboard-navigation" aria-label="Primary navigation">
        {navigation.map((item) => (
          <Link
            className={item.id === active ? "nav-item nav-item-active" : "nav-item"}
            href={item.href}
            aria-current={item.id === active ? "page" : undefined}
            key={item.id}
            onClick={() => setMenuOpen(false)}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="dashboard-sidebar-footer">
        <ThemeToggle />
        <button className="sidebar-signout" type="button" onClick={signOut}>Sign out</button>
      </div>
      {addBrandOpen && <AddBrandDialog onClose={closeAddBrand} onCreated={handleBrandCreated} />}
    </aside>
  );
}

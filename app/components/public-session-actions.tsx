"use client";
import { useSyncExternalStore } from "react";
import Link from "./link";
import { getAccessToken } from "../lib/session";
function subscribe(update: () => void) { window.addEventListener("storage", update); window.addEventListener("social9-session-change", update); return () => { window.removeEventListener("storage", update); window.removeEventListener("social9-session-change", update); }; }
export function PublicSessionActions() {
  const authenticated = useSyncExternalStore(subscribe, () => Boolean(getAccessToken()), () => false);
  const action = <Link className="neon-nav-cta" href={authenticated ? "/dashboard" : "/signup"}>
    <span>{authenticated ? "Open workspace" : "Start free"}</span>
    <span className="neon-nav-cta-icon" aria-hidden="true"><svg viewBox="0 0 20 20" fill="none"><path d="M4 10h11m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
  </Link>;
  return authenticated ? action : <><Link className="neon-signin" href="/login">Sign in</Link>{action}</>;
}

"use client";

import { FormEvent, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import Link from "./link";
import { apiRequest, Social9Brand } from "../lib/api";
import { getAccessToken } from "../lib/session";
import { track } from "../lib/track";

const subscribeToBrowser = () => () => undefined;
const getBrowserSnapshot = () => true;
const getServerSnapshot = () => false;

export function AddBrandDialog({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: (brand: Social9Brand) => void;
}) {
  const mounted = useSyncExternalStore(subscribeToBrowser, getBrowserSnapshot, getServerSnapshot);
  const dialogRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [allowance, setAllowance] = useState<{ count: number; limit: number | null } | null>(null);
  const atLimit = allowance?.limit != null && allowance.count >= allowance.limit;
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { const token = getAccessToken(); const headers = { Authorization: `Bearer ${token}` }; void Promise.all([apiRequest<Social9Brand[]>("/brands", { headers }), apiRequest<{ features: { brand_limit: number | null } }>("/billing/subscription", { headers })]).then(([brands, subscription]) => setAllowance({ count: brands.length, limit: subscription.features.brand_limit })).catch(() => setError("Unable to check your brand allowance. Close this dialog and try again.")); }, []);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // The name field stays disabled while the allowance is being checked.
    dialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), a[href]"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [busy, onClose]);

  async function submitBrand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !allowance || atLimit) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Enter a brand or business name.");
      inputRef.current?.focus();
      return;
    }
    const token = getAccessToken();
    if (!token) {
      setError("Your session has expired. Sign in again to add a brand.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const brand = await apiRequest<Social9Brand>("/brands", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: trimmedName }),
      });
      track("brand_created");
      onCreated(brand);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to add the brand. Please try again.");
      setBusy(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div className="add-brand-backdrop" role="presentation" onMouseDown={(event) => {
      if (!busy && event.target === event.currentTarget) onClose();
    }}>
      <section ref={dialogRef} className="add-brand-dialog" role="dialog" aria-modal="true" aria-busy={busy} aria-labelledby="add-brand-title" aria-describedby="add-brand-description">
        <div className="add-brand-dialog-header">
          <span className="add-brand-icon" aria-hidden="true">+</span>
          <button type="button" className="add-brand-close" aria-label="Close add brand dialog" disabled={busy} onClick={onClose}>×</button>
        </div>
        <span className="eyebrow">Your workspace</span>
        <h2 id="add-brand-title">Add a brand</h2>
        <p id="add-brand-description">Give this brand a name. You can then connect its social accounts and manage its content in one place.</p>
        <p role="status">{!allowance ? "Checking your brand allowance..." : atLimit ? `Your plan includes ${allowance.limit} brand${allowance.limit === 1 ? "" : "s"}, and all are in use.` : `${allowance.count} brands used${allowance.limit === null ? "" : ` of ${allowance.limit}`}.`}</p>
        {atLimit ? <Link href="/billing">Compare plans to add another brand</Link> : null}
        <form onSubmit={(event) => void submitBrand(event)}>
          <label htmlFor="add-brand-name">Brand or business name</label>
          <input
            ref={inputRef}
            id="add-brand-name"
            type="text"
            value={name}
            onChange={(event) => { setName(event.target.value); if (error) setError(""); }}
            placeholder="e.g. VisionaryCue"
            maxLength={120}
            autoComplete="organization"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "add-brand-error" : undefined}
            disabled={busy || !allowance || atLimit}
          />
          {error && <p id="add-brand-error" className="add-brand-error" role="alert">{error}</p>}
          <div className="add-brand-actions">
            <button type="button" className="add-brand-cancel" disabled={busy} onClick={onClose}>Cancel</button>
            <button type="submit" className="add-brand-submit" disabled={busy || !allowance || atLimit}>{busy ? "Creating…" : "Create brand"}</button>
          </div>
        </form>
      </section>
    </div>,
    document.body,
  );
}

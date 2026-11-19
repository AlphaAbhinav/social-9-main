"use client";

import { useEffect, useState } from "react";
import { DashboardPageFrame } from "../../components/dashboard-page-frame";
import { SocialIcon } from "../../components/social-icon";
import { ApiError, apiRequest, setActiveBrandId } from "../../lib/api";
import { getAccessToken } from "../../lib/session";
import "./selection.css";

type PageSelection = {
  id: number;
  brand_id: number;
  brand_name: string;
  expires_at: string;
  pages: Array<{
    can_publish?: boolean;
    can_connect?: boolean;
    page_id: string;
    name: string;
    connected_brand_id: number | null;
    connected_brand_name: string | null;
  }>;
};

export function PageSelectionScreen({provider}: {provider: "facebook" | "linkedin"}) {
  const providerName = provider === "linkedin" ? "LinkedIn" : "Facebook";
  const [selection, setSelection] = useState<PageSelection | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const selectionId = new URLSearchParams(window.location.search).get("selection");
    const token = getAccessToken();
    if (!token) {
      window.location.replace("/login");
      return;
    }
    if (!selectionId || !/^[1-9]\d*$/.test(selectionId)) {
      window.location.replace("/accounts");
      return;
    }
    let active = true;
    void apiRequest<PageSelection>(`/social-accounts/${provider}/page-selections/${selectionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(result => {
      if (active) setSelection(result);
    }).catch((requestError: unknown) => {
      if (active) setError(requestError instanceof Error ? requestError.message : "Unable to load Facebook Pages.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [provider]);

  async function finish(cancel = false) {
    const token = getAccessToken();
    if (!token) return window.location.replace("/login");
    if (!selection) return window.location.assign("/accounts");
    setBusy(true);
    setError("");
    try {
      await apiRequest(`/social-accounts/${provider}/page-selections/${selection.id}`, {
        method: cancel ? "DELETE" : "POST",
        headers: { Authorization: `Bearer ${token}` },
        ...(cancel ? {} : { body: JSON.stringify({ page_ids: selected }) }),
      });
      setActiveBrandId(selection.brand_id);
      window.location.assign(cancel ? "/accounts" : `/accounts?connected=${provider}`);
    } catch (requestError) {
      if (requestError instanceof ApiError && [404, 410].includes(requestError.status)) {
        setUnavailable(true);
        if (cancel) return window.location.assign("/accounts");
      }
      setError(requestError instanceof Error ? requestError.message : "Unable to save your Page selection.");
      setBusy(false);
    }
  }

  return <DashboardPageFrame active="accounts" className="accounts-content dashboard-studio">
    <header className="dashboard-header"><div><span className="eyebrow">{providerName} Pages</span><h1>{selection ? `Choose Pages for ${selection.brand_name}.` : `Choose ${providerName} Pages.`}</h1><p>Review all {selection?.pages.length ?? ""} Pages shared by {providerName} before connecting them to your workspace.</p></div></header>
    {loading ? <p role="status">Loading your {providerName} Pages...</p> : null}
    {error ? <p className="error-message" role="alert">{error}</p> : null}
    {selection ? <form className="facebook-page-selection" onSubmit={event => { event.preventDefault(); void finish(); }}>
      <fieldset disabled={busy || unavailable}>
        <legend>Pages for {selection.brand_name}</legend>
        <p>Pages in other workspaces stay connected there. To move one, disconnect it in that workspace first.</p>
        <button type="button" className="secondary-button" onClick={() => setSelected(selection.pages.filter(page => page.can_connect !== false && (page.connected_brand_id === null || page.connected_brand_id === selection.brand_id)).map(page => page.page_id))}>Select all available Pages</button>
        <div className="facebook-page-options">{selection.pages.map(page => {
          const elsewhere = page.connected_brand_id !== null && page.connected_brand_id !== selection.brand_id;
          return <label key={page.page_id} className={elsewhere ? "facebook-page-option is-unavailable" : "facebook-page-option"}>
            <input type="checkbox" value={page.page_id} disabled={elsewhere || page.can_connect === false} checked={selected.includes(page.page_id)} onChange={event => setSelected(current => event.target.checked ? [...current, page.page_id] : current.filter(id => id !== page.page_id))} />
            <SocialIcon provider={provider} label={`${providerName} Page`} />
            <span><strong>{page.name}</strong><small>{elsewhere ? `Connected to ${page.connected_brand_name ?? "another workspace"}` : page.connected_brand_id === selection.brand_id ? "Already in this workspace; select to refresh access" : page.can_connect === false ? "Access token missing; reconnect and approve Page access" : page.can_publish === false ? "Read-only access; your Page role does not allow publishing" : "Available to connect"}</small></span>
          </label>;
        })}</div>
      </fieldset>
      <p>Missing a Page? {provider === "facebook" ? "Cancel and reconnect, then edit the Pages shared with Social9 on Facebook. Keep access enabled for Pages in your other workspaces." : "Check your LinkedIn Page admin role and the app's Community Management API approval, then reconnect LinkedIn Pages."} Choose which Pages to add here. Your choice expires after 10 minutes.</p>
      <div className="facebook-selection-actions">
        <button type="button" className="secondary-button" disabled={busy} onClick={() => void finish(true)}>Cancel</button>
        <button type="submit" className="primary-button" disabled={busy || unavailable || !selected.length || selected.length > 100}>{busy ? "Working..." : `Connect selected Pages (${selected.length})`}</button>
      </div>
    </form> : !loading ? <a href="/accounts">Return to Accounts</a> : null}
    {unavailable ? <a href="/accounts">Start a new {providerName} connection</a> : null}
  </DashboardPageFrame>;
}

export default function FacebookPagesPage() { return <PageSelectionScreen provider="facebook" />; }

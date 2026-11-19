"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ApiError, apiRequest } from "../../lib/api";
import { ADMIN_SESSION_EVENT, clearAdminSession, getAdminAccessToken } from "../admin-session";
import { ThemeToggle } from "../../components/theme-toggle";
import "../admin.css";
import "../operations/operations.css";
import "./coupons.css";

type Coupon = { id: number; code: string; name: string; description: string; discount_type: "amount" | "percent"; value: number; minimum_amount_minor: number; maximum_discount_minor: number | null; tiers: string[]; durations: string[]; active: boolean; total_limit: number | null; per_customer_limit: number | null; usage_mode?: string; status: string; starts_at: string | null; expires_at: string; created_at: string; updated_at: string; created_by: number | null; paid_redemptions?: number; pending_checkouts?: number; discount_given_minor?: number; revenue_minor?: number };
type Redemption = { id: number; email: string; plan_code: string; coupon_code: string; order_reference: string; payment_reference: string | null; payment_mode: string; status: string; original_amount_minor: number; discount_minor: number; amount_minor: number; created_at: string; paid_at: string | null };
type Listing<T> = { items: T[]; total: number };
const money = (value: number) => (value / 100).toLocaleString("en-IN", { style: "currency", currency: "INR" });
const date = (value: string | null) => value ? new Date(value).toLocaleString("en-IN") : "—";
const options = () => ({ headers: { Authorization: `Bearer ${getAdminAccessToken()}` } });
function failure(error: unknown): string {
  if (error instanceof ApiError && error.status === 401) { clearAdminSession(); window.location.replace("/admin/login"); }
  return error instanceof Error ? error.message : "Unable to complete request.";
}
function localDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function CouponEditor({ row, saved, cancel }: { row: Coupon | null; saved: () => void; cancel: () => void }) {
  const [code, setCode] = useState(row?.code ?? "");
  const [generated, setGenerated] = useState(!row);
  const [kind, setKind] = useState<"amount" | "percent">(row?.discount_type ?? "percent");
  const [value, setValue] = useState(row ? String(row.value / 100) : "10");
  const [tiers, setTiers] = useState(row?.tiers ?? ["starter", "advanced", "agency"]);
  const [durations, setDurations] = useState(row?.durations ?? ["monthly", "annual", "three_year"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function toggle(list: string[], value: string) { return list.includes(value) ? list.filter(item => item !== value) : [...list, value]; }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const fields = new FormData(event.currentTarget); setBusy(true); setError("");
    try {
      const start = String(fields.get("starts_at") || "");
      const cap = String(fields.get("maximum_discount") || "");
      const body = { code: generated && !row ? null : code, name: fields.get("name"), description: fields.get("description"), discount_type: kind,
        value: Math.round(Number(value) * 100), minimum_amount_minor: Math.round(Number(fields.get("minimum")) * 100), maximum_discount_minor: cap ? Math.round(Number(cap) * 100) : null,
        total_limit: fields.get("total_limit") ? Number(fields.get("total_limit")) : null, per_customer_limit: fields.get("per_customer_limit") ? Number(fields.get("per_customer_limit")) : null,
        tiers, durations, active: fields.get("active") === "on", starts_at: start ? new Date(start).toISOString() : null,
        expires_at: new Date(String(fields.get("expires_at"))).toISOString(), reason: fields.get("reason") };
      await apiRequest(`/admin/coupons${row ? `/${row.id}` : ""}`, { ...options(), method: row ? "PUT" : "POST", body: JSON.stringify(body) }); saved();
    } catch (error) { setError(failure(error)); } finally { setBusy(false); }
  }
  return <section className="admin-panel coupon-editor"><h2>{row ? `Edit ${row.code}` : "Create a coupon"}</h2><form onSubmit={submit}><fieldset disabled={busy}><div className="coupon-form-grid">
    <label>Campaign name<input name="name" required maxLength={120} defaultValue={row?.name} /></label>
    <label>Coupon code{!row && <span className="coupon-check"><input type="checkbox" checked={generated} onChange={event => setGenerated(event.target.checked)} />Generate a code automatically</span>}<input value={code} readOnly={!!row} disabled={generated && !row} required={!generated} minLength={3} maxLength={40} placeholder={generated ? "Generated securely when saved" : "e.g. WELCOME10"} pattern="[A-Za-z0-9][A-Za-z0-9_-]{2,39}" onChange={event => setCode(event.target.value.toUpperCase())} /></label>
    <label>Discount type<select value={kind} onChange={event => setKind(event.target.value as "amount" | "percent")}><option value="percent">Percentage (%)</option><option value="amount">Fixed amount (₹)</option></select></label>
    <label>{kind === "percent" ? "Discount percentage" : "Discount amount (₹)"}<input type="number" required min="0.01" step="0.01" max={kind === "percent" ? "100" : "1000000"} value={value} onChange={event => setValue(event.target.value)} /></label>
    <label>Minimum purchase (₹)<input name="minimum" type="number" min="0" max="1000000" step="0.01" defaultValue={(row?.minimum_amount_minor ?? 0) / 100} /></label>
    <label>Maximum discount (₹, optional)<input name="maximum_discount" type="number" min="0.01" max="1000000" step="0.01" defaultValue={row?.maximum_discount_minor ? row.maximum_discount_minor / 100 : ""} /></label>
    <label>Starts at (optional, local time)<input name="starts_at" type="datetime-local" defaultValue={localDate(row?.starts_at)} /></label>
    <label>Expires at (local time)<input name="expires_at" required type="datetime-local" defaultValue={localDate(row?.expires_at)} /></label>
    <label>Total usage limit (optional)<input name="total_limit" type="number" min="1" max="100000000" step="1" defaultValue={row?.total_limit ?? ""} /></label>
    <label>Uses per customer (optional)<input name="per_customer_limit" type="number" min="1" max="100000000" step="1" defaultValue={row?.per_customer_limit ?? ""} /></label>
    <div><span>Eligible tiers</span><div className="coupon-checks">{["starter", "advanced", "agency"].map(tier => <label className="coupon-check" key={tier}><input type="checkbox" checked={tiers.includes(tier)} onChange={() => setTiers(toggle(tiers, tier))} />{tier}</label>)}</div></div>
    <div><span>Eligible durations</span><div className="coupon-checks">{[["monthly", "1 month"], ["annual", "1 year"], ["three_year", "3 years"]].map(([duration, title]) => <label className="coupon-check" key={duration}><input type="checkbox" checked={durations.includes(duration)} onChange={() => setDurations(toggle(durations, duration))} />{title}</label>)}</div></div>
    <label className="coupon-full">Description / internal notes<textarea name="description" maxLength={2000} defaultValue={row?.description} /></label>
    <label className="coupon-full">Reason for this change (audit log)<input name="reason" required minLength={5} maxLength={500} /></label>
    <label className="coupon-check"><input name="active" type="checkbox" defaultChecked={row?.active ?? true} />Enabled</label>
  </div></fieldset><p className="admin-metric-note">Times use {Intl.DateTimeFormat().resolvedOptions().timeZone}. One coupon per purchase. A full discount activates the plan without payment. Other payable totals must remain at least ₹1. Leave limits blank for unlimited use. Paid orders and pending checkouts count toward limits, separately for test and live mode. Reopening the same pending checkout does not use another slot; abandoned orders retain their reservation because they can still be paid. Changes apply to new orders; issued Razorpay orders keep their quoted price.</p>
    {error && <p className="admin-login-error" role="alert">{error}</p>}<div className="ops-row-actions"><button disabled={busy || !tiers.length || !durations.length}>{busy ? "Saving…" : row ? "Save changes" : "Create coupon"}</button><button type="button" disabled={busy} onClick={cancel}>Cancel</button></div></form></section>;
}

export default function CouponsPage() {
  const [allowed, setAllowed] = useState(false);
  const [listing, setListing] = useState<Listing<Coupon> | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Coupon | null | undefined>(undefined);
  const [selected, setSelected] = useState<Coupon | null>(null);
  const [history, setHistory] = useState<Listing<Redemption> | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async (signal: AbortSignal) => {
    try {
      const identity = await apiRequest<{ permissions: string[] }>("/admin/operations/me", { ...options(), signal });
      if (!identity.permissions.includes("billing")) throw new Error("Coupon management requires the billing or owner role.");
      setAllowed(true);
      const next = await apiRequest<Listing<Coupon>>(`/admin/coupons?page=${page}&q=${encodeURIComponent(query)}`, { ...options(), signal });
      if (!signal.aborted) setListing(next);
    } catch (error) { if (!signal.aborted) { setListing(null); setAllowed(false); setError(failure(error)); } } finally { if (!signal.aborted) setLoading(false); }
  }, [page, query]);
  useEffect(() => {
    if (!getAdminAccessToken()) { window.location.replace("/admin/login"); return; }
    const controller = new AbortController();
    const changed = () => { controller.abort(); setAllowed(false); setListing(null); setHistory(null); window.location.replace("/admin/login"); };
    window.addEventListener(ADMIN_SESSION_EVENT, changed);
    const timer = window.setTimeout(() => { void load(controller.signal); }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); window.removeEventListener(ADMIN_SESSION_EVENT, changed); };
  }, [load, refresh]);
  useEffect(() => {
    if (!selected || !allowed) return;
    const controller = new AbortController();
    void apiRequest<Listing<Redemption>>(`/admin/coupons/${selected.id}/redemptions?page=${historyPage}`, { ...options(), signal: controller.signal }).then(data => { if (!controller.signal.aborted) setHistory(data); }).catch(error => { if (!controller.signal.aborted) setError(failure(error)); });
    return () => controller.abort();
  }, [selected, historyPage, allowed]);
  return <div className="s9-admin ops-page coupon-page"><header className="admin-topbar"><a href="/admin">Social9 admin reports</a><a href="/admin/operations">Operations &amp; support</a><ThemeToggle compact /><button onClick={() => { setAllowed(false); clearAdminSession(); window.location.replace("/admin/login"); }}>Sign out</button></header><main className="admin-main">
    <div className="admin-heading"><div><p className="admin-eyebrow">BILLING</p><h1>Coupons</h1><p>Give customers a reason to take their next step.</p></div>{allowed && <button disabled={loading} onClick={() => { setEditing(null); setMessage(""); }}>Create coupon</button>}</div>
    {error && <p className="admin-login-error" role="alert">{error}</p>}{message && <p className="ops-success" role="status">{message}</p>}
    {loading && <p role="status">Loading coupons…</p>}
    {allowed && <>{editing !== undefined && <CouponEditor key={editing?.id ?? "new"} row={editing} cancel={() => setEditing(undefined)} saved={() => { setEditing(undefined); setLoading(true); setRefresh(value => value + 1); setMessage("Coupon saved."); }} />}
    <form className="ops-search" onSubmit={event => { event.preventDefault(); setLoading(true); setPage(1); setQuery(search); setRefresh(value => value + 1); }}><label>Search code or campaign<input value={search} onChange={event => setSearch(event.target.value)} /></label><button disabled={loading}>Search</button><button type="button" disabled={loading} onClick={() => { setLoading(true); setRefresh(value => value + 1); }}>Refresh</button></form>
    {listing && <section className="admin-panel"><div className="admin-table-scroll"><table><thead><tr>{["Code / campaign", "Discount", "Eligibility", "Validity", "Redemptions", "Actions"].map(title => <th key={title}>{title}</th>)}</tr></thead><tbody>{listing.items.map(row => <tr key={row.id}><td><strong>{row.code}</strong><p>{row.name}</p><span className="admin-badge">{row.status}</span></td><td>{row.discount_type === "percent" ? `${row.value / 100}%` : money(row.value)}<p>Min. {money(row.minimum_amount_minor)}{row.maximum_discount_minor && ` · cap ${money(row.maximum_discount_minor)}`}</p></td><td>{row.tiers.join(", ")}<p>{row.durations.map(item => item === "monthly" ? "1 month" : item === "annual" ? "1 year" : "3 years").join(", ")}</p></td><td>From: {row.starts_at ? date(row.starts_at) : "Immediately"}<p>Until: {date(row.expires_at)}</p></td><td><small>{row.usage_mode} mode / total limit {row.total_limit ?? "unlimited"} / per customer {row.per_customer_limit ?? "unlimited"}</small><p>{row.paid_redemptions} paid · {row.pending_checkouts} pending</p><p>Savings: {money(row.discount_given_minor ?? 0)}</p><p>Collected: {money(row.revenue_minor ?? 0)}</p></td><td><div className="ops-row-actions"><button onClick={() => { setEditing(row); setMessage(""); }}>Edit</button><button onClick={() => { setSelected(row); setHistory(null); setHistoryPage(1); }}>Details</button></div></td></tr>)}</tbody></table>{!listing.items.length && <p>No coupons found. Create your first campaign above.</p>}</div><footer className="admin-pagination"><span>{listing.total} coupons · Page {page}</span><div><button disabled={loading || page === 1} onClick={() => { setLoading(true); setPage(page - 1); }}>Previous</button><button disabled={loading || page * 25 >= listing.total} onClick={() => { setLoading(true); setPage(page + 1); }}>Next</button></div></footer></section>}
    {selected && <section className="admin-panel coupon-history"><div className="ops-row-actions"><h2>{selected.code} · Details &amp; history</h2><button onClick={() => setSelected(null)}>Close details</button></div><p>{selected.description || "No campaign notes."}</p><p>Created {date(selected.created_at)} by administrator #{selected.created_by ?? "unknown"}. Last updated {date(selected.updated_at)}.</p><p className="admin-metric-note">Pending means a Razorpay order was opened but no captured payment is recorded. It may be abandoned. Test and live orders are labeled below. Revenue is gross captured payments before any refunds. Issued orders preserve the code and discount quoted at checkout.</p>
    {!history ? <p role="status">Loading history…</p> : <><div className="admin-table-scroll"><table><thead><tr>{["Customer / plan", "Order / payment", "Amounts", "Status / dates"].map(title => <th key={title}>{title}</th>)}</tr></thead><tbody>{history.items.map(item => <tr key={item.id}><td>{item.email}<p>{item.plan_code}</p></td><td>{item.order_reference}<p>{item.payment_reference ?? "Awaiting payment"}</p><small>{item.payment_mode} mode</small></td><td>Original {money(item.original_amount_minor)}<p>Discount −{money(item.discount_minor)}</p><strong>Payable {money(item.amount_minor)}</strong></td><td>{item.status}<p>Opened {date(item.created_at)}</p><p>Paid {date(item.paid_at)}</p></td></tr>)}</tbody></table>{!history.items.length && <p>No checkout activity for this coupon yet.</p>}</div><footer className="admin-pagination"><span>{history.total} checkouts · Page {historyPage}</span><div><button disabled={historyPage === 1} onClick={() => { setHistory(null); setHistoryPage(historyPage - 1); }}>Previous</button><button disabled={historyPage * 25 >= history.total} onClick={() => { setHistory(null); setHistoryPage(historyPage + 1); }}>Next</button></div></footer></>}
    </section>}</>}
  </main></div>;
}

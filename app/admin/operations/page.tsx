"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { ApiError, apiRequest } from "../../lib/api";
import { ADMIN_SESSION_EVENT, clearAdminSession, getAdminAccessToken } from "../admin-session";
import { ThemeToggle } from "../../components/theme-toggle";
import "../admin.css";
import "./operations.css";

type Row = Record<string, unknown>;
type Identity = { role: string; permissions: string[]; mfa_enabled: boolean };
type Listing = { total: number; items: Row[]; history_note?: string };
type Customer = { user: Row; brands: Listing; connections: Listing; posts: Listing; purchases: Listing; subscription: Listing };
type Diagnostics = { counts: Record<string, number>; posts: Row[]; connections: Row[]; scheduler: Row; alerts: Row };
type Tab = "status" | "customers" | "payments" | "refunds" | "audit";
type Action = { path: string; title: string; confirmation: string; description: string; kind?: "refund_request" | "refund_decision"; status?: string; amount?: number };

function text(value: unknown, key = "") {
  if (value === null || value === undefined) return "Unknown";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (key.endsWith("_at") || key === "scheduled_for" || key === "expires_at" || key === "current_period_end") return new Date(String(value)).toLocaleString("en-IN");
  if (key.endsWith("_minor")) return (Number(value) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 });
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

function Table({ rows, actions }: { rows: Row[]; actions?: (row: Row) => ReactNode }) {
  if (!rows.length) return <p className="admin-empty">No matching records.</p>;
  const columns = Object.keys(rows[0]);
  return <div className="admin-table-scroll"><table><thead><tr>{columns.map(key => <th scope="col" key={key}>{key.replaceAll("_minor", " (currency units)").replaceAll("_", " ")}</th>)}{actions && <th scope="col">Actions</th>}</tr></thead><tbody>{rows.map(row => <tr key={String(row.id)}>{columns.map(key => <td key={key}>{text(row[key], key)}</td>)}{actions && <td className="ops-row-actions">{actions(row)}</td>}</tr>)}</tbody></table></div>;
}

export default function OperationsPage() {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [tab, setTab] = useState<Tab>("status");
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerMatches, setCustomerMatches] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [action, setAction] = useState<Action | null>(null);
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [amount, setAmount] = useState("");
  const [refundReference, setRefundReference] = useState("");
  const [revoke, setRevoke] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const can = (permission: string) => !!identity?.permissions.includes(permission);

  function handleError(failure: unknown) {
    if (failure instanceof ApiError && failure.status === 401) { clearAdminSession(); window.location.replace("/admin/login"); return; }
    if (failure instanceof ApiError && failure.status === 403) { setListing(null); setCustomer(null); setDiagnostics(null); }
    setError(failure instanceof Error ? failure.message : "Unable to complete this request.");
  }
  function options() { return { headers: { Authorization: `Bearer ${getAdminAccessToken()}` } }; }

  useEffect(() => {
    const token = getAdminAccessToken();
    if (!token) { window.location.replace("/admin/login"); return; }
    let active = true;
    const changed = () => { setIdentity(null); setCustomer(null); setListing(null); setDiagnostics(null); window.location.replace("/admin/login"); };
    window.addEventListener(ADMIN_SESSION_EVENT, changed);
    void apiRequest<Identity>("/admin/operations/me", { headers: { Authorization: `Bearer ${token}` } }).then(value => {
      if (!active || token !== getAdminAccessToken()) return;
      setIdentity(value);
      setLoading(value.permissions.length > 0);
      const selected = new URLSearchParams(window.location.search).get("customer");
      if (selected && value.permissions.includes("support")) { setCustomerId(selected); setTab("customers"); }
      else setTab(value.permissions.includes("diagnostics") ? "status" : value.permissions.includes("billing") ? "payments" : "customers");
    }).catch(failure => { handleError(failure); if (active) setLoading(false); });
    return () => { active = false; window.removeEventListener(ADMIN_SESSION_EVENT, changed); };
  }, []);

  useEffect(() => {
    if (!identity || tab === "customers") return;
    const token = getAdminAccessToken();
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(page), q: search });
    void apiRequest<Diagnostics | Listing>(`/admin/operations/${tab}?${params}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal }).then(value => {
      if (controller.signal.aborted || token !== getAdminAccessToken()) return;
      if (tab === "status") setDiagnostics(value as Diagnostics); else setListing(value as Listing);
    }).catch(failure => { if (!controller.signal.aborted) handleError(failure); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [identity, tab, page, search, refresh]);

  useEffect(() => {
    if (!identity || tab !== "customers" || !customerId || !identity.permissions.includes("support")) return;
    const controller = new AbortController();
    void apiRequest<Customer>(`/admin/operations/customers/${encodeURIComponent(customerId)}`, { ...options(), signal: controller.signal }).then(value => { if (!controller.signal.aborted) setCustomer(value); }).catch(failure => { if (!controller.signal.aborted) handleError(failure); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [identity, tab, customerId, refresh]);

  useEffect(() => {
    if (action && dialog.current && !dialog.current.open) dialog.current.showModal();
    else if (!action && dialog.current?.open) dialog.current.close();
  }, [action]);

  function chooseAction(next: Action) {
    setReason(""); setConfirmation(""); setAmount(next.amount ? (next.amount / 100).toFixed(2) : ""); setRefundReference(""); setRevoke(false); setError(""); setAction(next);
  }
  async function execute(event: FormEvent) {
    event.preventDefault();
    if (!action || busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const body: Record<string, unknown> = { reason, confirmation };
      if (action.kind === "refund_request") body.amount_minor = Math.round(Number(amount) * 100);
      if (action.kind === "refund_decision") Object.assign(body, { status: action.status, provider_reference: refundReference || null, revoke_access: revoke });
      await apiRequest(action.path, { ...options(), method: "POST", body: JSON.stringify(body) });
      setMessage(`${action.title} completed. The action is recorded in the audit log.`);
      setLoading(true);
      setAction(null); setRefresh(value => value + 1);
    } catch (failure) { handleError(failure); } finally { setBusy(false); }
  }
  async function findCustomers(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    try { const result = await apiRequest<Listing>(`/admin/users?q=${encodeURIComponent(customerSearch)}`, options()); setCustomerMatches(result.items); }
    catch (failure) { handleError(failure); } finally { setLoading(false); }
  }

  if (!identity) return <main className="s9-admin admin-access-screen"><h1>Verifying access</h1>{error && <p role="alert">{error}</p>}</main>;
  const tabs: { id: Tab; title: string; permission: string }[] = [{ id: "status", title: "Publishing health", permission: "diagnostics" }, { id: "customers", title: "Customer support", permission: "support" }, { id: "payments", title: "Payment history", permission: "billing" }, { id: "refunds", title: "Refund requests", permission: "billing" }, { id: "audit", title: "Audit log", permission: "audit" }];
  return <div className="s9-admin ops-page"><header className="admin-topbar"><a href="/admin">Social9 admin reports</a>{can("billing") && <a href="/admin/coupons">Coupons</a>}<span>{identity.role} access</span><ThemeToggle compact /><button onClick={() => { setIdentity(null); clearAdminSession(); window.location.replace("/admin/login"); }}>Sign out</button></header>
    <main className="admin-main"><div className="admin-heading"><div><p className="admin-eyebrow">SUPPORT AND RELIABILITY</p><h1>Admin operations</h1><p>Investigate problems and record customer support decisions.</p></div><button disabled={loading || busy} onClick={() => { setLoading(true); setError(""); setRefresh(value => value + 1); }}>Refresh</button></div>
      <p className="admin-metric-note">Authenticator protection: {identity.mfa_enabled ? "enabled" : "not configured"}. Administrator roles are assigned through server configuration.</p>
      <nav className="ops-tabs" aria-label="Operations navigation">{tabs.filter(item => can(item.permission)).map(item => <button key={item.id} aria-current={tab === item.id ? "page" : undefined} onClick={() => { setLoading(item.id !== "customers" || !!customerId); setListing(null); setDiagnostics(null); setTab(item.id); setPage(1); setSearch(""); setError(""); setMessage(""); }}>{item.title}</button>)}</nav>
      {!identity.permissions.length && <p>Your viewer role provides access to the <a href="/admin">reports panel</a>. Operational controls require an assigned support or billing role.</p>}
      {error && !action && <p role="alert" className="admin-login-error">{error}</p>}{message && <p role="status" className="ops-success">{message}</p>}
      {loading && <p role="status">Loading records...</p>}
      {tab === "status" && diagnostics && <><section className="admin-panel"><h2>Publishing health</h2><div className="ops-metrics">{Object.entries(diagnostics.counts).map(([key, value]) => <article key={key}><span>{key.replaceAll("_", " ")}</span><strong>{value}</strong></article>)}</div><p>Scheduler: {text(diagnostics.scheduler.status)}. Last heartbeat: {text(diagnostics.scheduler.updated_at, "updated_at")}. Alert delivery: {text(diagnostics.alerts.status)}.</p><p className="admin-metric-note">Overdue means more than five minutes late. Suspended customers remain paused. Uncertain deliveries require checking the provider; retry is blocked.</p></section><section className="admin-panel"><h2>Posts needing attention</h2><p className="admin-metric-note">Showing up to 50 recent posts. Counts above cover the full platform.</p><Table rows={diagnostics.posts} actions={row => <><a href={`/admin/operations?customer=${row.owner_id}`}>Customer</a>{row.status === "failed" && !row.suspended_owner && <button onClick={() => chooseAction({ path: `/admin/operations/posts/${row.id}/retry`, title: "Queue post retry", confirmation: `RETRY ${row.id}`, description: "Queues delivery to remaining channels. Channels already confirmed as published are preserved." })}>Retry</button>}{row.status === "scheduled" && <button onClick={() => chooseAction({ path: `/admin/operations/posts/${row.id}/cancel`, title: "Cancel scheduled delivery", confirmation: `CANCEL ${row.id}`, description: "Moves the post to draft. Existing public posts remain on their social platforms. Active uploads cannot be cancelled here." })}>Cancel</button>}</>} /></section><section className="admin-panel"><h2>Connections needing attention</h2><p className="admin-metric-note">Showing up to 50 connections that are disconnected or expire within seven days.</p><Table rows={diagnostics.connections} /></section></>}
      {tab === "customers" && can("support") && <><form className="ops-search" onSubmit={findCustomers}><label>Find customer by name or email<input value={customerSearch} onChange={event => setCustomerSearch(event.target.value)} /></label><button disabled={loading}>Search</button></form>{customerMatches.length > 0 && <Table rows={customerMatches} actions={row => <button onClick={() => { setCustomer(null); setError(""); setLoading(true); setCustomerId(String(row.id)); }}>Open customer</button>} />}{customer && <><section className="admin-panel"><h2>{String(customer.user.name)}</h2><p>{String(customer.user.email)} - Customer {String(customer.user.id)}</p><p>Registered: {text(customer.user.created_at, "created_at")}. Account: {customer.user.is_suspended ? "Suspended" : "Active"}.</p><button onClick={() => { const action = customer.user.is_suspended ? "reactivate" : "suspend"; chooseAction({ path: `/admin/operations/customers/${customer.user.id}/${action}`, title: `${action === "suspend" ? "Suspend" : "Reactivate"} customer`, confirmation: `${action.toUpperCase()} ${customer.user.id}`, description: action === "suspend" ? "Blocks customer access and queued publishing. Delivery already started may finish." : "Restores access. Past-due scheduled posts become drafts for customer review." }); }}>{customer.user.is_suspended ? "Reactivate" : "Suspend"} account</button></section>{(["brands", "connections", "posts", "purchases", "subscription"] as const).map(key => <section key={key} className="admin-panel"><h2>{key} ({customer[key].total})</h2><p className="admin-metric-note">Showing up to 50 recent records.</p><Table rows={customer[key].items} /></section>)}</>}</>}
      {tab === "payments" && can("billing") && <form className="ops-search" onSubmit={event => event.preventDefault()}><label>Search email or exact payment/order reference<input value={search} onChange={event => { setListing(null); setLoading(true); setError(""); setSearch(event.target.value); setPage(1); }} /></label></form>}
      {tab === "refunds" && can("billing") && <p className="admin-metric-note">Requests are reviewed individually. Approval records a decision; issue refunds in Razorpay. Recording a processed refund verifies its reference with Razorpay and does not transfer funds.</p>}
      {listing && <section className="admin-panel">{listing.history_note && <p className="admin-metric-note">{listing.history_note}</p>}<Table rows={listing.items} actions={tab === "payments" ? row => <button disabled={Number(row.refunded_minor) >= Number(row.amount_minor)} onClick={() => chooseAction({ path: `/admin/operations/payments/${row.id}/refunds`, title: "Record refund request", kind: "refund_request", amount: Number(row.amount_minor) - Number(row.refunded_minor), confirmation: `REFUND REQUEST ${row.id}`, description: `Records a review request for this ${row.currency} payment. It does not approve or transfer money.` })}>Refund request</button> : tab === "refunds" ? row => <>{row.status === "requested" && <button onClick={() => chooseAction({ path: `/admin/operations/refunds/${row.id}`, title: "Approve refund request", confirmation: `REFUND ${row.id}`, description: "Records approval. Process the refund separately in Razorpay.", kind: "refund_decision", status: "approved" })}>Approve</button>}{["requested", "approved"].includes(String(row.status)) && <button onClick={() => chooseAction({ path: `/admin/operations/refunds/${row.id}`, title: "Reject refund request", confirmation: `REFUND ${row.id}`, description: "Records a rejection with your reason.", kind: "refund_decision", status: "rejected" })}>Reject</button>}{row.status === "approved" && <button onClick={() => chooseAction({ path: `/admin/operations/refunds/${row.id}`, title: "Record processed refund", confirmation: `REFUND ${row.id}`, description: "Verifies the processed Razorpay refund against this payment and amount.", kind: "refund_decision", status: "processed" })}>Record processed</button>}</> : undefined} /><footer className="admin-pagination"><span>{listing.total} records - Page {page} of {Math.max(1, Math.ceil(listing.total / 20))}</span><div><button disabled={loading || page <= 1} onClick={() => { setListing(null); setLoading(true); setPage(page - 1); }}>Previous</button><button disabled={loading || page * 20 >= listing.total} onClick={() => { setListing(null); setLoading(true); setPage(page + 1); }}>Next</button></div></footer></section>}
    </main>
    <dialog ref={dialog} className="ops-dialog" onCancel={event => { if (busy) event.preventDefault(); else setAction(null); }} onClose={() => { if (!busy) setAction(null); }}><form onSubmit={execute}>{action && <><h2>{action.title}</h2><p>{action.description}</p><label>Reason<textarea required minLength={5} maxLength={500} value={reason} disabled={busy} onChange={event => setReason(event.target.value)} /></label>{action.kind === "refund_request" && <label>Refund amount (currency units)<input required type="number" min="0.01" step="0.01" max={action.amount ? action.amount / 100 : undefined} value={amount} disabled={busy} onChange={event => setAmount(event.target.value)} /></label>}{action.status === "processed" && <><label>Razorpay refund reference<input required pattern="rfnd_[A-Za-z0-9]+" value={refundReference} disabled={busy} onChange={event => setRefundReference(event.target.value)} /></label><label className="ops-checkbox"><input type="checkbox" checked={revoke} disabled={busy} onChange={event => setRevoke(event.target.checked)} />End access associated with this payment</label></>}<label>Type <strong>{action.confirmation}</strong> to confirm<input required value={confirmation} disabled={busy} onChange={event => setConfirmation(event.target.value)} autoComplete="off" /></label>{error && <p role="alert" className="admin-login-error">{error}</p>}<div className="ops-row-actions"><button type="button" disabled={busy} onClick={() => setAction(null)}>Cancel</button><button type="submit" disabled={busy || confirmation !== action.confirmation || reason.trim().length < 5}>{busy ? "Working..." : "Confirm action"}</button></div></>}</form></dialog>
  </div>;
}

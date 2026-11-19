"use client";

import { useEffect, useRef, useState } from "react";
import { API_URL, ApiError, apiRequest } from "../lib/api";
import { ADMIN_SESSION_EVENT, clearAdminSession, getAdminAccessToken } from "./admin-session";
import type { Social9User } from "../lib/api";
import { Social9Mark } from "../components/social9-mark";
import { ThemeToggle } from "../components/theme-toggle";
import "./admin.css";

type Section = "overview" | "users" | "brands" | "accounts" | "posts" | "subscriptions";
type Row = Record<string, string | number | boolean | null>;
type Records = { items: Row[]; total: number; page: number; page_size: number };
type Overview = {
  metrics: Record<string, number>; post_statuses: Record<string, number>; platforms: Record<string, number>;
  recent_activity: { id: number; name: string; caption: string; status: string; platforms: string; updated_at: string }[];
  generated_at: string;
  subscription_metrics: Record<string, number>; subscription_plans: Record<string, number>;
};
const navigation: { id: Section; label: string; icon: string }[] = [
  { id: "overview", label: "Dashboard", icon: "grid" }, { id: "users", label: "Users", icon: "users" },
  { id: "brands", label: "Brands", icon: "brand" }, { id: "accounts", label: "Social accounts", icon: "link" },
  { id: "posts", label: "Posts & publishing", icon: "post" }, { id: "subscriptions", label: "Subscriptions", icon: "wallet" },
];
const metrics = [
  ["total_users", "Total users", "users", "slate"], ["active_users", "Active users", "pulse", "green"],
  ["total_brands", "Total brands", "brand", "orange"], ["connected_accounts", "Connected accounts", "shield", "blue"],
  ["total_posts", "Total posts", "post", "purple"], ["published_posts", "Published posts", "trend", "green"],
  ["scheduled_posts", "Scheduled posts", "clock", "orange"], ["failed_posts", "Failed posts", "bell", "red"],
];
const filters: Partial<Record<Section, string[]>> = {
  users: ["verified", "unverified", "active", "suspended"], accounts: ["connected", "disconnected", "expired"],
  posts: ["draft", "scheduled", "publishing", "published", "failed"], subscriptions: ["active", "trialing", "inactive", "created", "canceled", "expired"],
};
function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
    users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
    brand: "M3 7l9-4 9 4v10l-9 4-9-4z M3 7l9 4 9-4 M12 11v10",
    link: "M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2 M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2",
    post: "M9 4H5v18h14V4h-4 M9 2h6v5H9z M8 12h8 M8 16h6",
    wallet: "M3 6h17v15H3z M3 6V3h14 M15 11h7v5h-7z",
    pulse: "M2 12h5l3-9 4 18 3-9h5", shield: "M12 2l9 4v6c0 5-9 10-9 10S3 17 3 12V6z M8 12l3 3 5-6",
    trend: "M3 17l6-6 4 4 8-10 M14 5h7v7", clock: "M12 8v4l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
    bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4",
    download: "M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5", search: "M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
    refresh: "M20 7V2 M20 7h-5 M20 7a9 9 0 1 0 1 9", arrow: "M4 12h16 M14 6l6 6-6 6",
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.grid} /></svg>;
}
const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
function display(key: string, value: Row[string]): string {
  if (value === null) return "—";
  if (typeof value === "boolean") return key === "is_suspended" ? (value ? "Suspended" : "Active") : value ? "Verified" : "Unverified";
  if (key.endsWith("_at") || key === "scheduled_for" || key === "current_period_end") return new Date(String(value)).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  return String(value);
}
function downloadCsv(rows: Row[], filename: string) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const quote = (value: unknown) => {
    let text = String(value ?? "");
    if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  const url = URL.createObjectURL(new Blob(["\uFEFF" + [keys.map(quote).join(","), ...rows.map((row) => keys.map((key) => quote(row[key])).join(","))].join("\r\n")], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function reportParams(section: Section, search: string, status: string, plan: string, start: string, end: string) {
  const params = new URLSearchParams({ q: search, status });
  {
    if (start) params.set("start_date", start);
    if (end) params.set("end_date", end);
  }
  if (section === "subscriptions" && plan) params.set("plan", plan);
  return params;
}

export default function AdminPage() {
  const [section, setSection] = useState<Section>("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [records, setRecords] = useState<Records | null>(null);
  const [query, setQuery] = useState(""); const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(""); const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0); const [loading, setLoading] = useState(true);
  const [error, setError] = useState(""); const [denied, setDenied] = useState(false);
  const [menu, setMenu] = useState(false);
  const [admin, setAdmin] = useState<Social9User | null>(null);
  const [startDate, setStartDate] = useState(""); const [endDate, setEndDate] = useState("");
  const [startDraft, setStartDraft] = useState(""); const [endDraft, setEndDraft] = useState("");
  const [dateError, setDateError] = useState(""); const [preset, setPreset] = useState("all");
  const [planFilter, setPlanFilter] = useState("");
  const [exporting, setExporting] = useState(false); const [exportMessage, setExportMessage] = useState("");
  const exportAbort = useRef<AbortController | null>(null);
  useEffect(() => () => { exportAbort.current?.abort(); }, []);
  useEffect(() => {
    const changed = () => { exportAbort.current?.abort(); setAdmin(null); setOverview(null); setRecords(null); window.location.replace("/admin/login"); };
    const focused = () => { setAdmin(null); setRefresh((value) => value + 1); };
    window.addEventListener(ADMIN_SESSION_EVENT, changed);
    window.addEventListener("focus", focused);
    return () => { window.removeEventListener(ADMIN_SESSION_EVENT, changed); window.removeEventListener("focus", focused); };
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => { setSearch(query); setPage(1); }, 300); return () => window.clearTimeout(timer); }, [query]);
  useEffect(() => {
    const token = getAdminAccessToken();
    if (!token) { window.location.replace("/admin/login"); return; }
    const controller = new AbortController(); let active = true;
    const params = reportParams(section, search, filter, planFilter, startDate, endDate);
    params.set("page", String(page));
    const overviewParams = new URLSearchParams();
    if (startDate) overviewParams.set("start_date", startDate);
    if (endDate) overviewParams.set("end_date", endDate);
    const options = { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal };
    const request = apiRequest<Social9User>("/admin/me", options).then<Overview | Records | null>((user) => {
      if (!active || getAdminAccessToken() !== token) return null;
      setAdmin(user);
      setError(""); setDenied(false);
      return section === "overview" ? apiRequest<Overview>(`/admin/overview?${overviewParams}`, options) : apiRequest<Records>(`/admin/${section}?${params}`, options);
    });
    void request.then((data) => { if (!active || !data || getAdminAccessToken() !== token) return; if (section === "overview") setOverview(data as Overview); else setRecords(data as Records); }).catch((failure: unknown) => {
      if (!active) return;
      if (failure instanceof ApiError && [401, 403].includes(failure.status)) { setAdmin(null); setOverview(null); setRecords(null); clearAdminSession(); window.location.replace("/admin/login"); return; }
      setDenied(failure instanceof ApiError && failure.status === 403);
      setError(failure instanceof Error ? failure.message : "Unable to load admin data.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [section, search, filter, planFilter, startDate, endDate, page, refresh]);
  function navigate(next: Section) { setLoading(true); setRecords(null); exportAbort.current?.abort(); setExportMessage(""); setSection(next); setQuery(""); setSearch(""); setFilter(""); setPlanFilter(""); setPage(1); setMenu(false); }
  function applyDates(start: string, end: string) {
    if (start && end && start > end) { setDateError("Start date must be on or before end date."); return; }
    setLoading(true); setRecords(null); setDateError(""); setStartDate(start); setEndDate(end); setPage(1); setExportMessage("");
  }
  function choosePreset(value: string) {
    setPreset(value);
    if (value === "custom") return;
    const now = new Date();
    const end = value === "all" ? "" : now.toISOString().slice(0, 10);
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    if (value === "month") start.setUTCDate(1);
    else start.setUTCDate(start.getUTCDate() - (value === "7" ? 6 : 29));
    const from = value === "all" ? "" : start.toISOString().slice(0, 10);
    setStartDraft(from); setEndDraft(end); applyDates(from, end);
  }
  const columns = records?.items[0] ? Object.keys(records.items[0]) : [];
  const exportRows: Row[] = section === "overview" && overview ? [
    ...Object.entries(overview.metrics).map(([metric, value]) => ({ metric: label(metric), value, scope: ["total_users", "total_brands", "connected_accounts"].includes(metric) ? "Current platform total" : metric === "active_users" ? (startDate || endDate ? "Activity in selected period" : "Activity in last 30 days") : "Posts created in selected period" })),
    ...Object.entries(overview.subscription_metrics || {}).map(([metric, value]) => ({ metric: label(metric), value, scope: "Current state of subscriptions created in selected period" })),
  ].map((row) => ({ ...row, start_date: startDate || "All dates", end_date: endDate || "No end date", timezone: "UTC", generated_at: overview.generated_at })) : records?.items || [];
  async function exportAll() {
    if (section === "overview") { downloadCsv(exportRows, "social9-overview.csv"); return; }
    const token = getAdminAccessToken();
    if (!token) { clearAdminSession(); return; }
    const controller = new AbortController(); exportAbort.current = controller;
    setExporting(true); setExportMessage("Preparing all matching records…");
    try {
      const params = reportParams(section, search, filter, planFilter, startDate, endDate);
      const response = await fetch(`${API_URL}/admin/${section}/export?${params}`, { headers: { Authorization: `Bearer ${token}`, Accept: "text/csv" }, signal: controller.signal, cache: "no-store" });
      if (!response.ok) {
        if ([401, 403].includes(response.status)) { clearAdminSession(); return; }
        const body = await response.json().catch(() => ({}));
        throw new Error(typeof body.detail === "string" ? body.detail : "Unable to export records. Please try again.");
      }
      setExportMessage("Downloading your full report…");
      const blob = await response.blob();
      if (controller.signal.aborted || getAdminAccessToken() !== token) return;
      const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
      anchor.href = url; anchor.download = `social9-${section}${startDate || endDate ? `-${startDate || "beginning"}-to-${endDate || "now"}` : "-all"}.csv`; anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportMessage("Full report downloaded. Includes all records matching your filters.");
    } catch (failure: unknown) {
      setExportMessage(controller.signal.aborted ? "Export canceled." : failure instanceof Error ? failure.message : "Unable to export records.");
    } finally { if (exportAbort.current === controller) { setExporting(false); exportAbort.current = null; } }
  }

  if (!admin) return <main className="s9-admin admin-access-check"><div className="admin-state"><p role={error ? "alert" : "status"}>{error || "Verifying access…"}</p>{error && <button onClick={() => setRefresh((value) => value + 1)}>Try again</button>}<a href="/admin/login">Admin sign in</a></div></main>;

  return <div className="s9-admin">
    <aside className={`admin-sidebar ${menu ? "is-open" : ""}`}>
      <a className="admin-logo" href="/admin"><Social9Mark /><span>social<span>9</span><small>ADMIN PORTAL</small></span></a>
      <p className="admin-nav-label">PLATFORM</p>
      <nav aria-label="Admin navigation">{navigation.map((item) => <button key={item.id} disabled={exporting} onClick={() => navigate(item.id)} className={section === item.id ? "selected" : ""} aria-current={section === item.id ? "page" : undefined}><Icon name={item.icon} />{item.label}{section === item.id && <span className="admin-nav-dot" />}</button>)}</nav>
      <div className="admin-sidebar-footer"><div className="admin-avatar">S9</div><div><strong>{admin.name}</strong><small>Platform administration</small></div></div>
      <a className="admin-back" href="/admin/coupons">Coupons <Icon name="arrow" /></a>
      <a className="admin-back" href="/admin/operations">Operations &amp; support <Icon name="arrow" /></a>
      <a className="admin-back" href="/dashboard">Back to workspace <Icon name="arrow" /></a>
      <button className="admin-signout" onClick={() => { setAdmin(null); clearAdminSession(); window.location.replace("/admin/login"); }}>Sign out</button>
    </aside>
    <div className="admin-body">
      <header className="admin-topbar"><button className="admin-menu" aria-label="Toggle navigation" aria-expanded={menu} onClick={() => setMenu(!menu)}><Icon name="grid" /></button><span>Administration <span>/</span> {navigation.find((item) => item.id === section)?.label}</span><div className="admin-topbar-tools"><span className="admin-secure"><Icon name="shield" /> Admin workspace</span><ThemeToggle compact /></div></header>
      <main className="admin-main">
        <div className="admin-heading"><div><p className="admin-eyebrow">{section === "overview" ? "THE BIG PICTURE" : "SOCIAL9 ADMIN"}</p><h1>{section === "overview" ? "Platform overview" : navigation.find((item) => item.id === section)?.label}</h1><p>{section === "overview" ? "Your people, their brands, and the content moving between them." : "Find what you need. Keep your platform moving."}</p></div><div className="admin-actions"><button className="admin-refresh" onClick={() => { setLoading(true); setRefresh(refresh + 1); }} disabled={loading || exporting} aria-label="Refresh data"><Icon name="refresh" /></button><button className="admin-export" disabled={loading || exporting || !!error || !exportRows.length || query !== search} onClick={() => void exportAll()}><Icon name="download" />{exporting ? "Exporting…" : section === "overview" ? "Export overview" : "Export all matching"}</button></div></div>
        <section className="admin-report-filters" aria-label="Report date filters">
          <label>Report period<select value={preset} disabled={exporting} onChange={(event) => choosePreset(event.target.value)}><option value="all">All time</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="month">This month</option><option value="custom">Custom range</option></select></label>
          <label>From<input type="date" value={startDraft} disabled={exporting} onChange={(event) => { setPreset("custom"); setStartDraft(event.target.value); }} /></label>
          <label>Through<input type="date" value={endDraft} disabled={exporting} onChange={(event) => { setPreset("custom"); setEndDraft(event.target.value); }} /></label>
          <button disabled={exporting} onClick={() => applyDates(startDraft, endDraft)}>Apply dates</button>
          <p>{section === "users" ? "Registration dates are available for new users. Earlier signup dates are unknown and excluded from date-filtered results." : `UTC calendar dates, inclusive. Filtering by record creation date. ${startDate || endDate ? `Applied: ${startDate || "beginning"} through ${endDate || "now"}.` : "All dates applied."}`}</p>
          {dateError && <p className="admin-report-error" role="alert">{dateError}</p>}
        </section>
        {exportMessage && <div className="admin-export-status" role="status">{exportMessage}{exporting && <button onClick={() => exportAbort.current?.abort()}>Cancel export</button>}</div>}
        {error ? <div className="admin-state" role="alert"><Icon name="shield" /><h2>{denied ? "Administrator access required" : "Unable to load data"}</h2><p>{denied ? "Your account does not have permission to view platform data. Ask the platform owner to enable administrator access." : error}</p>{!denied && <button onClick={() => { setLoading(true); setRefresh(refresh + 1); }}>Try again</button>}<a href="/dashboard">Return to workspace</a></div> : section === "overview" ? <>
          <div className="admin-pulse"><div><span className="admin-pulse-dot" /><span>Publishing at a glance</span></div><p>{loading ? "Getting the latest activity…" : `${overview?.metrics.scheduled_posts ?? 0} posts in the queue. ${overview?.metrics.published_posts ?? 0} ideas shared.`}</p><button disabled={loading} onClick={() => { navigate("posts"); setFilter((overview?.metrics.failed_posts ?? 0) > 0 ? "failed" : "scheduled"); }}>{!loading && (overview?.metrics.failed_posts ?? 0) > 0 ? `${overview!.metrics.failed_posts} posts need attention` : "Review the queue"}<Icon name="arrow" /></button></div>
          <div className="admin-section-heading"><h2>People & publishing</h2><span>Across all workspaces</span></div>
          <div className="admin-metrics" aria-busy={loading}>{metrics.map(([key, title, icon, tone]) => <article key={key} className="admin-metric"><div className="admin-metric-heading"><h2>{title}</h2><span className={`admin-metric-icon ${tone}`}><Icon name={icon} /></span></div><strong>{loading ? "—" : (overview?.metrics[key] ?? 0).toLocaleString("en-IN")}</strong></article>)}</div>
          <p className="admin-metric-note">Post counts use the selected creation dates. Users, brands, and connected accounts are current platform totals. Active users created a post or updated a connection {startDate || endDate ? "in the selected period" : "in the last 30 days"}.</p>
          <section className="admin-panel admin-subscription-report"><div className="admin-panel-heading"><h2>Subscriptions at a glance</h2><button disabled={exporting} onClick={() => navigate("subscriptions")}>Explore subscriptions <Icon name="arrow" /></button></div><div className="admin-subscription-metrics">{[["total_subscriptions", "Subscription records"], ["active_paid", "Active paid"], ["expiring_soon", "Expiring in 30 days"], ["overdue_active", "Overdue active records"], ["preview_subscriptions", "Preview records"]].map(([key, title]) => <article key={key}><span>{title}</span><strong>{loading ? "—" : (overview?.subscription_metrics[key] || 0).toLocaleString("en-IN")}</strong></article>)}</div><p>Current state of subscriptions created in the selected period. Active paid counts require Razorpay, a paid plan, and an unexpired term. Preview records are counted separately.</p><div className="admin-plan-breakdown">{Object.entries(overview?.subscription_plans || {}).map(([plan, count]) => <button key={plan} disabled={loading || exporting} onClick={() => { navigate("subscriptions"); setPlanFilter(plan); }}><span>{label(plan)}</span><strong>{count}</strong></button>)}</div><small>Plan counts include inactive and preview records.</small></section>
          <div className="admin-overview-grid"><section className="admin-panel admin-welcome"><span className="admin-panel-tag">THE SOCIAL SIDE</span><h2>Good ideas.<br />Connected communities.</h2><p>See where your community is showing up, then take a closer look at the people and brands behind it.</p><div className="admin-network"><h3>Connected channels</h3>{loading ? <p>Loading channels…</p> : !Object.keys(overview?.platforms || {}).length ? <p>No connected channels yet.</p> : Object.entries(overview!.platforms).map(([provider, count]) => <div key={provider}><span className={`admin-provider ${provider}`}>{provider.slice(0, 1).toUpperCase()}</span><span>{label(provider)}</span><strong>{count}</strong></div>)}</div><div className="admin-quick-links"><button onClick={() => navigate("users")}><Icon name="users" />Explore users<Icon name="arrow" /></button><button onClick={() => navigate("brands")}><Icon name="brand" />Explore brands<Icon name="arrow" /></button></div></section>
          <section className="admin-panel"><div className="admin-panel-heading"><h2>Recent publishing activity</h2><button onClick={() => navigate("posts")}>View all <Icon name="arrow" /></button></div><div className="admin-activity">{loading ? <p role="status">Loading activity…</p> : !overview?.recent_activity.length ? <div className="admin-empty"><Icon name="post" /><h3>No publishing activity yet</h3><p>Posts will appear here as users create and publish content.</p></div> : overview.recent_activity.map((post) => <article key={post.id}><div><strong>{post.name}</strong><time dateTime={post.updated_at}>{new Date(post.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</time></div><p>{post.caption || "Untitled post"}</p><footer><span>{post.platforms}</span><span className={`admin-badge ${post.status}`}>{label(post.status)}</span></footer></article>)}</div></section></div>
          <section className="admin-panel admin-pipeline"><div><h2>Publishing pipeline</h2><p>All posts across the platform</p></div><div>{Object.entries(overview?.post_statuses || {}).map(([status, count]) => <button key={status} disabled={loading} onClick={() => { navigate("posts"); setFilter(status); }}><span className={`admin-badge ${status}`}>{label(status)}</span><strong>{count}</strong></button>)}{!loading && !Object.keys(overview?.post_statuses || {}).length && <p>No posts yet.</p>}</div></section>
          {overview && !loading && <p className="admin-updated">Updated {new Date(overview.generated_at).toLocaleString("en-IN")}</p>}
        </> : <section className="admin-panel admin-records"><div className="admin-table-tools"><label className="admin-search"><Icon name="search" /><input disabled={exporting} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email or content…" aria-label="Search records" /></label>{filters[section] && <select disabled={exporting} value={filter} aria-label="Filter by status" onChange={(event) => { setLoading(true); setFilter(event.target.value); setPage(1); }}><option value="">All statuses</option>{filters[section]!.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select>}{section === "subscriptions" && <select disabled={exporting} value={planFilter} aria-label="Filter by plan" onChange={(event) => { setLoading(true); setPlanFilter(event.target.value); setPage(1); }}><option value="">All plans</option>{Array.from(new Set(["free", "starter", "advanced", "agency", "pro", planFilter].filter(Boolean))).map((plan) => <option key={plan} value={plan}>{label(plan)}</option>)}</select>}<span>{loading ? "Loading…" : `${records?.total ?? 0} records`}</span></div>
          {loading ? <div className="admin-empty" role="status">Loading records…</div> : !records?.items.length ? <div className="admin-empty"><Icon name="search" /><h3>No records found</h3><p>{search || filter ? "Try another search or status filter." : "Records will appear here when your platform has activity."}</p></div> : <div className="admin-table-scroll"><table><thead><tr>{columns.map((column) => <th key={column} scope="col">{label(column)}</th>)}</tr></thead><tbody>{records.items.map((row) => <tr key={String(row.id)}>{columns.map((column) => <td key={column}>{column === "status" || column === "is_verified" ? <span className={`admin-badge ${String(row[column])}`}>{display(column, row[column])}</span> : <span title={display(column, row[column])}>{section === "users" && column === "name" ? <a href={`/admin/operations?customer=${row.id}`}>{display(column, row[column])}</a> : display(column, row[column])}</span>}</td>)}</tr>)}</tbody></table></div>}
          <footer className="admin-pagination"><span>Page {page} of {Math.max(1, Math.ceil((records?.total || 0) / 20))}</span><div><button disabled={loading || page === 1} onClick={() => { setLoading(true); setPage(page - 1); }}>Previous</button><button disabled={loading || !records || page * 20 >= records.total} onClick={() => { setLoading(true); setPage(page + 1); }}>Next</button></div></footer>
        </section>}
      </main>
    </div>
  </div>;
}

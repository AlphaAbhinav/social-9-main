"use client";
import { AnalyticsBarChart } from "../../components/analytics-bar-chart";

import { useState } from "react";
import { Dropdown } from "../../components/dropdown";
import Link from "../../components/link";
import { SocialIcon } from "../../components/social-icon";
import type { FacebookDaily, FacebookMetrics } from "../../lib/analytics";

type ChartMetric = "views" | "unique_viewers" | "engagements" | "followers_gained";
const labels: Record<ChartMetric, string> = {
  views: "Views", unique_viewers: "Daily unique viewers",
  engagements: "Engagements", followers_gained: "New followers",
};
const number = (value: number | null) => value === null ? "—" : value.toLocaleString();

function downloadCsv(filename: string, rows: Array<Array<string | number | null>>) {
  const csv = rows.map((row) => row.map((value) => {
    const cell = value === null ? "" : String(value);
    // Keep user captions/Page names from being interpreted as spreadsheet formulas.
    const safe = typeof value === "string" && /^[=+@\-\t\r]/.test(cell) ? `'${cell}` : cell;
    return `"${safe.replaceAll('"', '""')}"`;
  }).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function FacebookAnalytics({ facebook, reason }: { facebook: FacebookMetrics | null; reason: string }) {
  const [pageId, setPageId] = useState("all");
  const [metric, setMetric] = useState<ChartMetric>("views");
  const selectedPage = facebook?.pages.find((page) => String(page.account_id) === pageId);
  const selected = selectedPage ?? facebook;
  const selectedName = selectedPage?.account_name ?? "All connected Pages";
  const notices = selectedPage ? selectedPage.reason : reason;
  const content = selected?.content ?? [];
  const daily = selected?.daily ?? [];
  const total = daily.every((point) => point[metric] !== null) && daily.length
    ? daily.reduce((sum, point) => sum + (point[metric] ?? 0), 0) : null;

  function exportDaily() {
    if (!selected || !facebook) return;
    const keys: Array<keyof Omit<FacebookDaily, "date">> = ["views", "unique_viewers", "engagements", "followers_gained", "followers_lost", "followers", "profile_views"];
    downloadCsv(`social9-facebook-daily-${facebook.range_days}-days.csv`, [
      ["Page", "Date", "Views", "Daily unique viewers", "Engagements", "New followers", "Unfollows", "Total followers", "Profile views"],
      ...daily.map((point) => [selectedName, point.date, ...keys.map((key) => point[key])]),
    ]);
  }

  function exportPosts() {
    if (!facebook) return;
    downloadCsv(`social9-facebook-posts-${facebook.range_days}-days.csv`, [
      ["Page", "Published", "Caption", "Lifetime reactions", "Lifetime comments", "Lifetime shares", "Lifetime interactions", "Facebook URL"],
      ...content.map((post) => [post.account_name ?? selectedName, post.published_at, post.caption, post.reactions, post.comments, post.shares, post.interactions, post.permalink]),
    ]);
  }

  return <section className="facebook-analytics-section" aria-label="Facebook Page analytics">
    <div className="analytics-card-heading">
      <div><span className="eyebrow">Facebook Pages</span><h2>Measure your Page performance.</h2></div>
      <div className="analytics-header-actions">
        {facebook ? <label htmlFor="dropdown-facebook-page" className="content-type-filter">Page
          <Dropdown id="dropdown-facebook-page" label="Facebook Page" value={selectedPage ? pageId : "all"} onValueChange={setPageId}>
            <option value="all">All connected Pages</option>
            {facebook.pages.map((page) => <option key={page.account_id} value={String(page.account_id)}>{page.account_name}</option>)}
          </Dropdown>
        </label> : null}
        <button type="button" className="analytics-action" disabled={!selected?.available} onClick={exportDaily}>Export daily CSV</button>
      </div>
    </div>

    {facebook ? <p className="growth-planner-note">{selectedName} · {facebook.range_days} completed days, {facebook.since} through {new Date(`${facebook.until}T00:00:00Z`).toLocaleDateString(undefined, { timeZone: "UTC" })} (end date excluded). Refreshed {new Date(facebook.fetched_at).toLocaleTimeString()}. Facebook metrics can take 24 hours to update.</p> : null}
    {notices ? <aside className="analytics-notice" role="status"><strong>Facebook data availability</strong><p>{notices}</p><Link href="/accounts">Review Page connection →</Link></aside> : null}

    {selected?.available ? <>
      <section className="instagram-scorecard" aria-label="Facebook performance overview">
        <article data-analytics-card><span>Total followers</span><strong>{number(selected.followers)}</strong><small>Latest completed day</small></article>
        <article data-analytics-card><span>Follower change</span><strong>{number(selected.net_followers)}</strong><small>{number(selected.followers_gained)} follows · {number(selected.followers_lost)} unfollows</small></article>
        <article data-analytics-card><span>Content views</span><strong>{number(selected.views)}</strong><small>Times content was played or displayed</small></article>
        <article data-analytics-card><span>Daily unique viewers</span><strong>{number(selected.unique_viewers)}</strong><small>Sum of daily unique viewers</small></article>
        <article data-analytics-card><span>Post engagements</span><strong>{number(selected.engagements)}</strong><small>Reactions, comments, shares and other actions</small></article>
        <article data-analytics-card><span>Profile views</span><strong>{number(selected.profile_views)}</strong><small>Visits to your Page profile</small></article>
      </section>
      <p className="growth-planner-note">Unique viewers are counted separately each day and on each Page, so these totals can include the same person more than once. Facebook&apos;s Page engagements metric excludes Reel interactions. A dash means Meta did not return complete data.</p>
      <section className="provider-insights-card" data-analytics-card>
        <div className="analytics-card-heading"><div><span className="eyebrow">Facebook trends</span><h3>Performance over time</h3></div>
          <div className="insight-metric-tabs" role="group" aria-label="Select Facebook chart metric">{(Object.keys(labels) as ChartMetric[]).map((key) => <button type="button" key={key} className={metric === key ? "active" : ""} aria-pressed={metric === key} onClick={() => setMetric(key)}>{labels[key]}</button>)}</div>
        </div>
        <div className="insight-chart-summary"><div><strong>{number(total)}</strong><span>{labels[metric]}</span></div><small>Gaps indicate unavailable daily values</small></div>
        <AnalyticsBarChart points={daily.map(point => ({ date: point.date, value: point[metric] }))} label={labels[metric]} tone="blue" />
      </section>
    </> : <div className="analytics-empty"><SocialIcon provider="facebook" /><strong>Facebook insights are unavailable.</strong><p>{notices || "Connect a live Page and grant insights access. The Facebook user needs permission to analyze the Page."}</p><Link href="/accounts">Connect or reconnect Facebook →</Link></div>}

    {content.length ? <section className="instagram-content-section" data-analytics-card>
      <div className="analytics-card-heading"><div><span className="eyebrow">Facebook content performance</span><h3>Recent posts ranked by interactions</h3></div><button type="button" className="analytics-action" onClick={exportPosts}>Export posts CSV</button></div>
      <p className="growth-planner-note">Posts published during this period. Reactions, comments and shares are lifetime counts as of refresh, rather than actions limited to the selected dates. Up to 100 posts per Page are loaded.</p>
      <div className="instagram-performance-list">{[...content].sort((left, right) => (right.interactions ?? -1) - (left.interactions ?? -1)).slice(0, 20).map((post, index) => <article key={post.id}>
        <div className="instagram-rank">{String(index + 1).padStart(2, "0")}</div>
        <SocialIcon provider="facebook" />
        <div className="instagram-content-copy"><strong>{post.caption || "Facebook post"}</strong><small>{post.account_name ?? selectedName} · {new Date(post.published_at).toLocaleDateString()}</small></div>
        <dl><div><dt>Reactions</dt><dd>{number(post.reactions)}</dd></div><div><dt>Comments</dt><dd>{number(post.comments)}</dd></div><div><dt>Shares</dt><dd>{number(post.shares)}</dd></div></dl>
        {post.permalink ? <a href={post.permalink} target="_blank" rel="noreferrer" aria-label="Open post on Facebook">↗</a> : null}
      </article>)}</div>
    </section> : selected?.available ? <div className="analytics-empty compact"><strong>No Facebook post performance returned.</strong><p>Try a wider date range or review the Page connection.</p></div> : null}
  </section>;
}

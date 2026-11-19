"use client";

import { useState } from "react";
import { AnalyticsBarChart } from "../../components/analytics-bar-chart";
import { Dropdown } from "../../components/dropdown";
import Link from "../../components/link";
import { SocialIcon } from "../../components/social-icon";
import "./youtube-analytics.css";

type Metric = "views" | "estimatedMinutesWatched" | "likes" | "comments" | "subscribersGained";
const chartLabels: Record<Metric, string> = {
  views: "Views",
  estimatedMinutesWatched: "Watch time",
  likes: "Likes",
  comments: "Comments",
  subscribersGained: "New subscribers",
};
const metricKeys = Object.keys(chartLabels) as Metric[];
const number = (value: number | null | undefined) => value != null && Number.isFinite(value) ? value.toLocaleString() : "—";

export type YouTubeVideo = {
  id: string; title: string; published_at: string | null; privacy: string | null;
  thumbnail_url: string; views: number | null; likes: number | null;
  comments: number | null; url: string;
};
export type YouTubeAccount = {
  account_id: number; account_name: string; available: boolean;
  metrics: Record<string, number> | null; daily?: Array<Record<string, string | number | null>> | null;
  note: string; videos?: YouTubeVideo[] | null; videos_note?: string;
};

function downloadCsv(filename: string, rows: Array<Array<string | number | null | undefined>>) {
  const csv = rows.map(row => row.map(value => {
    const cell = value == null ? "" : String(value);
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

function dailyValue(row: Record<string, string | number | null>, key: Metric): number | null {
  const value = row[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function YouTubeAnalytics({ accounts, days }: { accounts: YouTubeAccount[]; days: number }) {
  const [accountId, setAccountId] = useState(String(accounts[0]?.account_id ?? ""));
  const [metric, setMetric] = useState<Metric>("views");
  const account = accounts.find(item => String(item.account_id) === accountId) ?? accounts[0];
  const daily = account?.daily ?? [];
  const videos = account?.videos ?? [];
  const summary = account?.metrics ?? {};
  const valuesByDay = new Map(daily.filter(row => typeof row.day === "string").map(row => [row.day, row]));
  const yesterday = new Date();
  yesterday.setUTCHours(0, 0, 0, 0);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const chartPoints = daily.length ? Array.from({ length: days }, (_, index) => {
    const date = new Date(yesterday);
    date.setUTCDate(date.getUTCDate() - (days - index - 1));
    const day = date.toISOString().slice(0, 10);
    const row = valuesByDay.get(day);
    return { date: day, value: row ? dailyValue(row, metric) : null };
  }) : [];
  const netSubscribers = summary.subscribersGained != null && summary.subscribersLost != null
    ? summary.subscribersGained - summary.subscribersLost : null;

  function exportDaily() {
    downloadCsv(`social9-youtube-daily-${days}-days.csv`, [
      ["Channel", "Date", "Views", "Watch time (minutes)", "Likes", "Comments", "Shares", "Subscribers gained", "Subscribers lost"],
      ...daily.map(row => [account.account_name, row.day, row.views, row.estimatedMinutesWatched, row.likes, row.comments, row.shares, row.subscribersGained, row.subscribersLost]),
    ]);
  }

  function exportVideos() {
    downloadCsv("social9-youtube-recent-videos.csv", [
      ["Channel", "Published", "Title", "Privacy", "Lifetime views", "Lifetime likes", "Lifetime comments", "YouTube URL"],
      ...videos.map(video => [account.account_name, video.published_at, video.title, video.privacy, video.views, video.likes, video.comments, video.url]),
    ]);
  }

  if (!account) return null;
  return <section className="youtube-analytics-section" aria-label="YouTube channel analytics">
    <div className="analytics-card-heading">
      <div><span className="eyebrow">YouTube channels</span><h2>Measure your channel performance.</h2></div>
      <div className="analytics-header-actions">
        <label htmlFor="dropdown-youtube-channel" className="content-type-filter">Channel
          <Dropdown id="dropdown-youtube-channel" label="YouTube channel" value={String(account.account_id)} onValueChange={setAccountId}>
            {accounts.map(item => <option key={item.account_id} value={String(item.account_id)}>{item.account_name}</option>)}
          </Dropdown>
        </label>
        <button type="button" className="analytics-action" disabled={!account.available || !daily.length} onClick={exportDaily}>Export daily CSV</button>
      </div>
    </div>
    <p className="growth-planner-note">{account.account_name} · Last {days} completed days, ending yesterday (UTC). YouTube analytics can take time to update.</p>
    {!account.available ? <div className="analytics-empty"><SocialIcon provider="youtube" /><strong>YouTube insights are unavailable.</strong><p>{account.note}</p><Link href="/accounts">Review channel connection →</Link></div> : <>
      <section className="instagram-scorecard" aria-label="YouTube performance overview">
        <article data-analytics-card><span>Views</span><strong>{number(summary.views)}</strong><small>Channel views in this period</small></article>
        <article data-analytics-card><span>Watch time</span><strong>{number(summary.estimatedMinutesWatched)}</strong><small>Minutes watched in this period</small></article>
        <article data-analytics-card><span>Subscriber change</span><strong>{number(netSubscribers)}</strong><small>{number(summary.subscribersGained)} gained · {number(summary.subscribersLost)} lost</small></article>
        <article data-analytics-card><span>Likes</span><strong>{number(summary.likes)}</strong><small>Likes in this period</small></article>
        <article data-analytics-card><span>Comments</span><strong>{number(summary.comments)}</strong><small>Comments in this period</small></article>
        <article data-analytics-card><span>Shares</span><strong>{number(summary.shares)}</strong><small>Shares in this period</small></article>
      </section>
      <p className="growth-planner-note">{account.note} A dash means YouTube did not return that value.</p>
      <section className="provider-insights-card" data-analytics-card>
        <div className="analytics-card-heading"><div><span className="eyebrow">YouTube trends</span><h3>Performance over time</h3></div>
          <div className="insight-metric-tabs" role="group" aria-label="Select YouTube chart metric">
            {metricKeys.map(key => <button type="button" key={key} className={metric === key ? "active" : ""} aria-pressed={metric === key} onClick={() => setMetric(key)}>{chartLabels[key]}</button>)}
          </div>
        </div>
        <div className="insight-chart-summary"><div><strong>{number(summary[metric])}</strong><span>{chartLabels[metric]}{metric === "estimatedMinutesWatched" ? " (minutes)" : ""}</span></div><small>Gaps indicate days YouTube did not return</small></div>
        <AnalyticsBarChart points={chartPoints} label={chartLabels[metric]} tone="red" />
      </section>
      <section className="youtube-content-section" data-analytics-card>
        <div className="analytics-card-heading"><div><span className="eyebrow">YouTube content performance</span><h3>Recent videos</h3></div><button type="button" className="analytics-action" disabled={!videos.length} onClick={exportVideos}>Export videos CSV</button></div>
        <p className="growth-planner-note">Latest 20 uploads. Video views, likes and comments are lifetime counts, regardless of the selected date range.</p>
        {account.videos === null ? <p className="network-analytics-empty">{account.videos_note ?? "Recent videos are unavailable."}</p>
          : videos.length ? <div className="youtube-video-list">{videos.map((video, index) => <article className="youtube-video" key={video.id}>
            <span className="youtube-video-rank">{String(index + 1).padStart(2, "0")}</span>
            <div className="youtube-video-thumbnail" role="img" aria-label={`Thumbnail for ${video.title}`} style={{ backgroundImage: `url("${video.thumbnail_url}")` }} />
            <div className="youtube-video-copy"><strong><a href={video.url} target="_blank" rel="noreferrer">{video.title}</a></strong><small>{video.published_at ? new Date(video.published_at).toLocaleDateString() : "Date unavailable"}{video.privacy ? ` · ${video.privacy.charAt(0).toUpperCase()}${video.privacy.slice(1)}` : ""}</small></div>
            <dl><div><dt>Views</dt><dd>{number(video.views)}</dd></div><div><dt>Likes</dt><dd>{number(video.likes)}</dd></div><div><dt>Comments</dt><dd>{number(video.comments)}</dd></div></dl>
            <a className="youtube-video-open" href={video.url} target="_blank" rel="noreferrer" aria-label={`Open ${video.title} on YouTube`}>↗</a>
          </article>)}</div>
          : <p className="network-analytics-empty">No videos found in this channel&apos;s recent uploads.</p>}
      </section>
    </>}
  </section>;
}

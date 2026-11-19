"use client";
import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";
import { getAccessToken } from "../../lib/session";
import { isComingSoonProvider, platformName } from "../../lib/provider-availability";
import Link from "../../components/link";
import { SocialIcon } from "../../components/social-icon";
import { YouTubeAnalytics, type YouTubeAccount } from "./youtube-analytics";
import { PinterestAnalytics, type PinterestAccount } from "./pinterest-analytics";
import "./network-analytics.css";

type Network = "threads" | "youtube" | "twitter" | "pinterest";
type Result = { accounts: Array<YouTubeAccount | PinterestAccount> };
const labels: Record<string, string> = {
  views: "Views", likes: "Likes", comments: "Comments", shares: "Shares",
  estimatedMinutesWatched: "Watch time (minutes)", subscribersGained: "Subscribers gained", subscribersLost: "Subscribers lost",
  like_count: "Likes", reply_count: "Replies", retweet_count: "Reposts", quote_count: "Quotes", bookmark_count: "Bookmarks", impression_count: "Impressions",
  PIN_CLICK: "Pin clicks", OUTBOUND_CLICK: "Outbound clicks",
  IMPRESSION: "Impressions", SAVE: "Saves",
};

export function NetworkAnalytics({ provider, days }: { provider: Network; days: number }) {
  const [loaded, setLoaded] = useState<{ provider: Network; days: number; result?: Result; error?: string } | null>(null);
  const current = loaded?.provider === provider && loaded.days === days ? loaded : null;
  const result = current?.result;
  const error = current?.error;
  const name = platformName(provider);
  useEffect(() => {
    if (isComingSoonProvider(provider)) return;
    let active = true;
    const token = getAccessToken();
    void apiRequest<Result>(`/analytics/networks/${provider}?days=${days}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(result => { if (active) setLoaded({ provider, days, result }); })
      .catch(cause => { if (active) setLoaded({ provider, days, error: cause instanceof Error ? cause.message : "Unable to load analytics." }); });
    return () => { active = false; };
  }, [provider, days]);

  if (provider === "youtube" && result?.accounts.length) return <YouTubeAnalytics accounts={result.accounts as YouTubeAccount[]} days={days} />;
  if (provider === "pinterest" && result?.accounts.length) return <PinterestAnalytics accounts={result.accounts as PinterestAccount[]} days={days} />;

  return <section className="network-analytics" aria-label={`${name} analytics`}>
    <header className="network-analytics-heading">
      <div className="network-analytics-title"><SocialIcon provider={provider} /><div><h2>{name} analytics</h2><p>Channel performance and engagement</p></div></div>
      {!isComingSoonProvider(provider) && <span className="network-analytics-period">Last {days} days</span>}
    </header>
    {isComingSoonProvider(provider) ? <div className="network-analytics-empty"><p>This integration is coming soon.</p><Link href="/accounts">View available channels</Link></div>
      : error ? <div className="network-analytics-empty" role="alert"><strong>Unable to load {name} analytics</strong><p>{error}</p></div>
      : !result ? <div className="network-analytics-empty" role="status">Loading {name} insights…</div>
      : !result.accounts.length ? <div className="network-analytics-empty"><strong>Connect your {name} account</strong><p>Your channel performance will appear here once connected.</p><Link href="/accounts">Open Accounts</Link></div>
      : result.accounts.map(account => <article className="network-analytics-account" key={account.account_id}>
        <div className="network-analytics-account-heading"><h3>{account.account_name}</h3><span>{account.available ? "Provider insights" : "Metrics unavailable"}</span></div>
        <p className="network-analytics-note">{account.note}</p>
        {account.available && account.metrics && Object.keys(account.metrics).length ? <dl className="network-analytics-metrics">
          {Object.entries(account.metrics).map(([metric, value]) => <div className="network-analytics-metric" key={metric}>
            <dt>{labels[metric] ?? metric.replaceAll("_", " ")}</dt>
            <dd>{Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "Unavailable"}</dd>
          </div>)}
        </dl> : <p className="network-analytics-empty">{account.available ? "No metrics were returned for this range." : "Metrics are unavailable. Check your account permissions or try again later."}</p>}
      </article>)}
  </section>;
}

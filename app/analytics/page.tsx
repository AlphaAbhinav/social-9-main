"use client";
import { AnalyticsBarChart } from "../components/analytics-bar-chart";
import { platformName, isComingSoonProvider } from "../lib/provider-availability";

import { useState } from "react";
import { Dropdown } from "../components/dropdown";
import Link from "../components/link";
import { DashboardPageFrame } from "../components/dashboard-page-frame";
import { SocialIcon } from "../components/social-icon";
import { useAnalytics } from "../features/analytics/use-analytics";
import type { InsightMetric } from "../features/analytics/use-analytics";
import { GrowthAssistant } from "../components/growth-assistant";
import { FacebookAnalytics } from "../features/analytics/facebook-analytics";
import { NetworkAnalytics } from "../features/analytics/network-analytics";
import "../features/analytics/facebook-analytics.css";
import "../features/analytics/platform-navigation.css";

const platforms = [
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "threads", label: "Threads" },
  { id: "youtube", label: "YouTube" },
  { id: "twitter", label: "X" },
  { id: "pinterest", label: "Pinterest" },
  { id: "workspace", label: "Workspace" },
] as const;
type AnalyticsPlatform = typeof platforms[number]["id"];

const metricLabels: Record<InsightMetric, { label: string; description: string }> = {
  impressions: { label: "Views", description: "Instagram views by day" },
  reach: { label: "Daily unique viewers", description: "Unique accounts reached each day; summed across days" },
  interactions: { label: "Engagements", description: "Instagram interactions by day" },
  followers_gained: { label: "New followers", description: "New followers by day" },
};

const compactNumber = new Intl.NumberFormat(undefined, {
  notation: "compact",
  maximumFractionDigits: 1,
});

export default function AnalyticsPage() {
  const [platform, setPlatform] = useState<AnalyticsPlatform>("instagram");
  const {
    days,
    analytics,
    metric,
    setMetric,
    contentType,
    setContentType,
    subscription,
    currentReach,
    setCurrentReach,
    engagementRate,
    setEngagementRate,
    postsPerWeek,
    setPostsPerWeek,
    projectionHorizon,
    setProjectionHorizon,
    projection,
    projectionLoading,
    forecastDays,
    setForecastDays,
    forecast,
    forecastLoading,
    loading,
    error,
    instagram,
    activityPeak,
    contentTypes,
    visibleContent,
    changeRange,
    refreshAnalytics,
    exportInstagramCsv,
    calculateGrowthProjection,
    calculateEngagementForecast
  } = useAnalytics();
  const facebook = analytics?.provider_metrics.facebook ?? null;

  const trendMetric: InsightMetric = instagram?.daily_metrics?.includes(metric) ? metric : (instagram?.daily_metrics?.[0] as InsightMetric | undefined) ?? "reach";
  const trendAvailable = instagram?.daily_metrics?.includes(trendMetric) ?? false;
  const instagramNumber = (key: string, value: number) => instagram?.available_metrics && !instagram.available_metrics.includes(key) ? "Unavailable" : value.toLocaleString();
  return (
    <DashboardPageFrame active="analytics" className="analytics-content operations-analytics dashboard-studio">
      <header className="dashboard-header analytics-header">
        <div>
          <span className="eyebrow">Workspace analytics</span>
          <h1>Review your social media analytics.</h1>
          <p>Live Instagram, Facebook Page and YouTube channel performance, trends and content insights alongside your Social9 publishing health.</p>
        </div>
        <div className="analytics-header-actions">
          <button className="analytics-action" type="button" disabled={loading} onClick={refreshAnalytics}>
            <span aria-hidden="true">↻</span> {loading ? "Refreshing…" : "Refresh data"}
          </button>
          {platform === "instagram" ? <button className="analytics-action" type="button" disabled={!instagram} onClick={exportInstagramCsv}>
            <span aria-hidden="true">↓</span> Export Instagram CSV
          </button> : null}
          <label htmlFor="dropdown-date-range" className="range-select">Date range
            <Dropdown id="dropdown-date-range" label="Date range" value={days} onValueChange={(value) => changeRange(value)}>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </Dropdown>
          </label>
        </div>
      </header>

      <GrowthAssistant unlocked={subscription?.is_paid === true} />

      <nav className="analytics-platform-navigation" aria-label="Analytics platforms">
        <div role="tablist" aria-label="Choose analytics platform">
          {platforms.map((item, index) => <button
            key={item.id}
            id={`analytics-tab-${item.id}`}
            type="button"
            role="tab"
            aria-selected={platform === item.id}
            aria-controls={`analytics-panel-${item.id}`}
            tabIndex={platform === item.id ? 0 : -1}
            onClick={() => setPlatform(item.id)}
            onKeyDown={(event) => {
              let next = index;
              if (event.key === "ArrowRight") next = (index + 1) % platforms.length;
              else if (event.key === "ArrowLeft") next = (index + platforms.length - 1) % platforms.length;
              else if (event.key === "Home") next = 0;
              else if (event.key === "End") next = platforms.length - 1;
              else return;
              event.preventDefault();
              setPlatform(platforms[next].id);
              document.getElementById(`analytics-tab-${platforms[next].id}`)?.focus();
            }}
          >{item.id !== "workspace" ? <SocialIcon provider={item.id} /> : <span aria-hidden="true">▦</span>}<span>{item.label}</span></button>)}
        </div>
        <p>Choose a platform to explore its performance.</p>
      </nav>

      <aside className="live-analytics-banner" hidden={!["instagram", "facebook", "workspace"].includes(platform)}>
        <span><i /> {platform === "instagram" ? (instagram ? "Live Instagram data" : "Instagram connection") : platform === "facebook" ? (facebook?.available ? "Live Facebook data" : "Facebook connection") : "Workspace activity"}</span>
        <p>{platform === "instagram"
          ? instagram ? `${instagram.accounts} connected Instagram account${instagram.accounts === 1 ? "" : "s"} refreshed at ${new Date(instagram.fetched_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.` : "Connect Instagram and grant insights access to see your performance."
          : platform === "facebook" ? facebook ? `${facebook.accounts} connected Facebook Page${facebook.accounts === 1 ? "" : "s"}. Choose a Page to review its performance.` : "Connect a Facebook Page and grant insights access to see its performance."
          : "Track content delivery, publishing cadence and planning across your workspace."}</p>
      </aside>

      {error ? <div className="analytics-error" role="alert"><span>{error}</span><button type="button" onClick={refreshAnalytics}>Try again</button></div> : null}
      {loading && !analytics ? <div className="analytics-skeleton" aria-label="Loading analytics"><span /><span /><span /><span /></div> : null}

      {analytics ? <div className={loading ? "analytics-results is-refreshing" : "analytics-results"} aria-busy={loading}>
        <div className="analytics-platform-panel" role="tabpanel" id="analytics-panel-facebook" aria-labelledby="analytics-tab-facebook" hidden={platform !== "facebook"} tabIndex={0}>
          <FacebookAnalytics facebook={analytics.provider_metrics.facebook ?? null} reason={analytics.provider_metrics_reasons?.facebook ?? "Connect a live Facebook Page and grant insights access to view analytics."} />
        </div>
        <div className="analytics-platform-panel" role="tabpanel" id="analytics-panel-instagram" aria-labelledby="analytics-tab-instagram" hidden={platform !== "instagram"} tabIndex={0}>
        {instagram ? <>
          <section className="instagram-scorecard" aria-label="Instagram performance overview">
            <article data-analytics-card><span>Total followers</span><strong>{instagram.followers.toLocaleString()}</strong><small>Across connected accounts</small></article>
            <article data-analytics-card><span>Follower growth</span><strong className="positive">{instagramNumber("followers_gained", instagram.followers_gained)}</strong><small>New followers in {days} days</small></article>
            <article data-analytics-card><span>Reach</span><strong>{instagramNumber("reach", instagram.reach)}</strong><small>Sum of daily accounts reached</small></article>
            <article data-analytics-card><span>Views</span><strong>{instagramNumber("views", instagram.impressions)}</strong><small>Instagram&apos;s views metric</small></article>
            <article data-analytics-card><span>Interactions</span><strong>{instagramNumber("total_interactions", instagram.interactions)}</strong><small>{instagramNumber("likes", instagram.likes)} likes · {instagramNumber("comments", instagram.comments)} comments · {instagramNumber("shares", instagram.shares)} shares · {instagramNumber("saves", instagram.saves)} saves</small></article>
            <article data-analytics-card><span>Engagement rate</span><strong>{instagram.available_metrics && (!instagram.available_metrics.includes("total_interactions") || !instagram.available_metrics.includes("reach")) ? "Unavailable" : `${instagram.engagement_rate}%`}</strong><small>Interactions divided by reach</small></article>
          </section>

          {instagram.unavailable_metrics.length ? <aside className="analytics-notice">
            <strong>Partial provider data</strong>
            <p>{instagram.unavailable_metrics.length === 1 && instagram.unavailable_metrics[0] === "followers_gained"
              ? "Instagram hasn’t returned follower-growth data for this account. Other available insights load successfully."
              : "Some metrics could not be loaded. Available values below are live."}</p>
            {instagram.metric_issues ? <details><summary>Metric availability details</summary><ul>{Object.entries(instagram.metric_issues).map(([name, reason]) => <li key={name}>{name.replaceAll("_", " ")}: {reason}</li>)}</ul></details> : null}
          </aside> : null}

          <section className="provider-insights-card" data-analytics-card>
            <div className="analytics-card-heading">
              <div><span className="eyebrow">Instagram trends</span><h2>Performance over time</h2></div>
              <div className="insight-metric-tabs" role="group" aria-label="Select chart metric">
                {(Object.keys(metricLabels) as InsightMetric[]).filter(item => instagram.daily_metrics?.includes(item)).map((item) => <button
                  type="button"
                  className={trendMetric === item ? "active" : ""}
                  aria-pressed={trendMetric === item}
                  onClick={() => setMetric(item)}
                  key={item}
                >{metricLabels[item].label}</button>)}
              </div>
            </div>
            <div className="insight-chart-summary">
              <div><strong>{trendAvailable && instagram.daily.length ? instagram.daily.reduce((sum, point) => sum + point[trendMetric], 0).toLocaleString() : "Unavailable"}</strong><span>{metricLabels[trendMetric].description}</span></div>
              <small>{instagram.posts_analyzed} posts analyzed · {trendMetric === "reach" ? "daily reach may include the same account on multiple days" : "daily values follow Instagram’s reporting-day boundaries"}</small>
            </div>
            {trendAvailable && instagram.daily.length ? <AnalyticsBarChart points={instagram.daily.map(point => ({ date: point.date, value: point[trendMetric] }))} label={metricLabels[trendMetric].label} /> : <div className="analytics-empty compact"><strong>No trend points yet.</strong><p>Instagram has not returned daily values for this period.</p></div>}
          </section>

          <section className="instagram-content-section" data-analytics-card>
            <div className="analytics-card-heading">
              <div><span className="eyebrow">Content intelligence</span><h2>What resonated with your audience</h2></div>
              <label htmlFor="dropdown-content-type" className="content-type-filter">Content type
                <Dropdown id="dropdown-content-type" label="Content type" value={contentType} onValueChange={(value) => setContentType(value)}>
                  <option value="all">All content</option>
                  {contentTypes.map((item) => <option value={item} key={item}>{item.replaceAll("_", " ")}</option>)}
                </Dropdown>
              </label>
            </div>
            {visibleContent.length ? <div className="instagram-performance-list">
              {visibleContent.map((media, index) => <article key={media.id}>
                <div className="instagram-rank">{String(index + 1).padStart(2, "0")}</div>
                <div className="instagram-thumbnail" style={media.thumbnail_url ? { backgroundImage: `url(${media.thumbnail_url})` } : undefined}>{media.media_type === "REELS" ? <span>▶</span> : <SocialIcon provider="instagram" />}</div>
                <div className="instagram-content-copy">
                  <strong>{media.caption || `${media.media_type.replaceAll("_", " ")} post`}</strong>
                  <div className="instagram-content-meta">
                    <span>{media.media_type.replaceAll("_", " ")}</span>
                    <small>{media.username ? `@${media.username}` : media.account_name} · {new Date(media.published_at).toLocaleDateString()}</small>
                  </div>
                </div>
                <dl><div><dt>Likes</dt><dd>{compactNumber.format(media.likes)}</dd></div><div><dt>Comments</dt><dd>{compactNumber.format(media.comments)}</dd></div><div><dt>Engagement</dt><dd>{compactNumber.format(media.interactions)}</dd></div></dl>
                {media.permalink ? <a href={media.permalink} target="_blank" rel="noreferrer" aria-label="Open post on Instagram">↗</a> : null}
              </article>)}
            </div> : <div className="analytics-empty"><strong>No matching Instagram content.</strong><p>Try another content type or a wider date range.</p></div>}
          </section>
        </> : <section className="instagram-connect-state" data-analytics-card>
          <div><SocialIcon className="instagram-connect-mark" provider="instagram" /><span className="eyebrow">Instagram analytics</span><h2>Connect performance to your publishing plan.</h2><p>{analytics.provider_metrics_reason}</p><Link href="/accounts">Connect Instagram →</Link></div>
          <aside><span>Follower trends</span><span>Reach and impressions</span><span>Content rankings</span><span>CSV reporting</span></aside>
        </section>}

        </div>
        <div className="analytics-platform-panel" role="tabpanel" id="analytics-panel-workspace" aria-labelledby="analytics-tab-workspace" hidden={platform !== "workspace"} tabIndex={0}>
        <section className="analytics-kpis workspace-kpis" aria-label="Publishing summary">
          <article data-analytics-card><span>Content in range</span><strong>{analytics.overview.posts_in_range}</strong><small>{analytics.overview.total_posts} posts across the workspace</small></article>
          <article data-analytics-card><span>Completed flows</span><strong>{analytics.overview.published}</strong><small>{analytics.overview.provider_published} provider · {analytics.overview.preview_published} preview</small></article>
          <article data-analytics-card><span>Scheduled</span><strong>{analytics.overview.scheduled}</strong><small>Queued for automatic publishing</small></article>
          <article data-analytics-card><span>Publish success</span><strong>{analytics.overview.provider_published + analytics.overview.failed > 0 ? `${analytics.overview.publish_success_rate}%` : "\u2014"}</strong><small>{analytics.overview.provider_published + analytics.overview.failed ? `${analytics.overview.failed} posts need attention` : "No publishing data yet"}</small></article>
        </section>

        <section className="analytics-main-grid">
          <article className="trend-card" data-analytics-card>
            <div className="analytics-card-heading"><div><span className="eyebrow">Content activity</span><h2>Publishing cadence</h2></div><div className="chart-legend"><span className="impressions">Created</span><span className="engagements">Completed</span></div></div>
            <div className="operations-chart" role="img" aria-label={`Content created and published over ${days} days`}>
              {analytics.trend.map((point) => <div className="operations-column" key={point.date}><div className="operations-bar"><span className="created" style={{ height: `${Math.max(point.created ? 12 : 2, point.created / activityPeak * 100)}%` }} /><span className="delivered" style={{ height: `${Math.max(point.published ? 12 : 2, point.published / activityPeak * 100)}%` }} /></div><small>{new Date(`${point.date}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</small></div>)}
            </div>
          </article>

          <aside className="channel-card" data-analytics-card>
            <span className="eyebrow">Channel delivery</span><h2>Publishing readiness</h2>
            <div className="channel-list">{analytics.channels.map((channel) => <article key={channel.provider}><SocialIcon className="channel-symbol" provider={channel.provider} /><div className="channel-copy"><div><strong>{platformName(channel.provider)}</strong><small>{channel.post_count} posts</small></div><span className={channel.connected ? "" : "not-connected"}>{isComingSoonProvider(channel.provider) ? "Coming soon" : channel.connected ? "Connected" : "Not connected"}</span></div><dl><div><dt>Delivered</dt><dd>{channel.published}</dd></div><div><dt>Queued</dt><dd>{channel.scheduled}</dd></div><div><dt>Failed</dt><dd>{channel.failed}</dd></div></dl></article>)}</div>
          </aside>
        </section>

        <section className="analytics-lower-grid workspace-delivery-grid">
          <article className="top-content-card" data-analytics-card>
            <div className="analytics-card-heading"><div><span className="eyebrow">Delivery log</span><h2>Recent Social9 content</h2></div><Link href="/create-post">Create new post</Link></div>
            {analytics.recent_posts.length === 0 ? <div className="analytics-empty"><strong>No content yet.</strong><p>Create your first post to begin recording workspace analytics.</p></div> : <div className="delivery-table"><div className="delivery-row delivery-head"><span>Post</span><span>Channel</span><span>Status</span><span>Delivery mode</span></div>{analytics.recent_posts.map((post) => <article className="delivery-row" key={post.id}><div><strong>{post.caption}</strong><small>{new Date(post.created_at).toLocaleDateString()}</small>{post.publish_error ? <em>{post.publish_error}</em> : null}</div><span className="table-platform">{post.platforms.join(" + ")}</span><span className={`post-status ${post.status}`}>{post.status}</span><strong className={`delivery-mode ${post.delivery_mode}`}>{post.delivery_mode}</strong></article>)}</div>}
          </article>

        </section>

<details className="studio-disclosure analytics-planning-tools"><summary><span><strong>Planning & forecasts</strong><small>Explore growth scenarios and AI engagement forecasts</small></span><span aria-hidden="true">+</span></summary>
        <section className="growth-planner" data-analytics-card aria-label="Premium growth scenario planner">
          <div className="growth-planner-heading"><div><span className="eyebrow">Premium growth planner</span><h2>Turn your current reach into measurable scenarios.</h2><p>Use your own baseline to compare steady, goal, and stretch outcomes. Every assumption stays visible.</p></div><span>{subscription?.features.growth_projection ? "Unlocked" : "Premium"}</span></div>
          {subscription?.features.growth_projection ? <>
            <div className="growth-planner-form">
              <label>Monthly reach<input type="number" min="1" max="100000000" value={currentReach} onChange={(event) => setCurrentReach(Number(event.target.value))} /></label>
              <label>Engagement rate<input type="number" min="0" max="100" step="0.1" value={engagementRate} onChange={(event) => setEngagementRate(Number(event.target.value))} /><small>%</small></label>
              <label>Posts per week<input type="number" min="1" max="21" value={postsPerWeek} onChange={(event) => setPostsPerWeek(Number(event.target.value))} /></label>
              <label htmlFor="dropdown-planning-horizon">Planning horizon<Dropdown id="dropdown-planning-horizon" label="Planning horizon" value={projectionHorizon} onValueChange={(value) => setProjectionHorizon(Number(value) as 30 | 90)}><option value={30}>30 days</option><option value={90}>90 days</option></Dropdown></label>
              <button type="button" disabled={projectionLoading} onClick={() => void calculateGrowthProjection()}>{projectionLoading ? "Calculating..." : "Build scenarios"}</button>
            </div>
            {projection ? <div className="growth-scenario-results">
              <div className="growth-baseline"><span>Baseline</span><strong>{projection.baseline_reach.toLocaleString()} reach</strong><small>{projection.baseline_interactions.toLocaleString()} estimated interactions · {projection.planned_posts} planned posts</small></div>
              <div className="growth-scenario-grid">{projection.scenarios.map((scenario) => <article key={scenario.name}><span>{scenario.name}</span><strong>{scenario.projected_reach.toLocaleString()}</strong><small>projected reach</small><dl><div><dt>Reach assumption</dt><dd>+{scenario.assumed_reach_lift_percent}%</dd></div><div><dt>Engagement rate</dt><dd>{scenario.projected_engagement_rate}%</dd></div><div><dt>Interactions</dt><dd>{scenario.projected_interactions.toLocaleString()}</dd></div></dl></article>)}</div>
              <p>{projection.disclaimer}</p>
            </div> : <p className="growth-planner-note">Enter your current numbers to build illustrative planning scenarios. No result is presented as guaranteed growth.</p>}
          </> : <div className="growth-planner-lock"><div><strong>Model growth before you commit.</strong><p>Premium unlocks baseline-based reach, engagement, and interaction scenarios for 30- and 90-day plans.</p></div><Link href="/billing">Unlock growth planning →</Link></div>}
        </section>

        <section className="growth-planner ai-forecast-card" data-analytics-card aria-label="AI engagement forecast">
          <div className="growth-planner-heading"><div><span className="eyebrow">Social9 forecasting AI</span><h2>Estimate your next engagement window.</h2><p>The XGBoost model uses your latest Instagram insight history to estimate daily engagement—not generic growth percentages.</p></div><span>{subscription?.features.growth_projection ? "Experimental AI" : "Premium"}</span></div>
          {subscription?.features.growth_projection ? (instagram ? <>
            <div className="growth-planner-form forecast-form">
              <label htmlFor="dropdown-forecast-horizon">Forecast horizon<Dropdown id="dropdown-forecast-horizon" label="Forecast horizon" value={forecastDays} onValueChange={(value) => setForecastDays(Number(value) as 7 | 14 | 30)}><option value={7}>Next 7 days</option><option value={14}>Next 14 days</option><option value={30}>Next 30 days</option></Dropdown></label>
              <button type="button" disabled={forecastLoading} onClick={() => void calculateEngagementForecast()}>{forecastLoading ? "Running model..." : "Run AI forecast"}</button>
            </div>
            {forecast ? <div className="growth-scenario-results">
              <div className="growth-scenario-grid forecast-summary"><article><span>Daily average</span><strong>{forecast.average_predicted_engagement.toLocaleString()}</strong><small>predicted engagements</small></article><article><span>Projected peak</span><strong>{forecast.peak_predicted_engagement.toLocaleString()}</strong><small>{new Date(`${forecast.peak_date}T00:00:00`).toLocaleDateString()}</small></article><article><span>Personalized history</span><strong>{forecast.history_days}</strong><small>Instagram days analyzed</small></article></div>
              <div className="forecast-points" aria-label={`First ${Math.min(7, forecast.predictions.length)} forecast days`}>{forecast.predictions.slice(0, 7).map((point) => <article key={point.date}><span>{new Date(`${point.date}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span><strong>{point.predicted_engagement.toLocaleString()}</strong></article>)}</div>
              <p>{forecast.disclaimer}</p>
            </div> : <p className="growth-planner-note">Run the model to calculate a personalized forecast from your latest 30 days of Instagram insights.</p>}
          </> : <div className="growth-planner-lock"><div><strong>Instagram history is required.</strong><p>Connect a live Instagram professional account and collect at least eight days of insights.</p></div><Link href="/accounts">Connect Instagram →</Link></div>) : <div className="growth-planner-lock"><div><strong>Forecast with your own performance data.</strong><p>Premium unlocks personalized engagement forecasting powered by the Social9 model.</p></div><Link href="/billing">Unlock AI forecasting →</Link></div>}
        </section>

        </details>
        <section className="analytics-suggestions" data-analytics-card><div className="analytics-card-heading"><div><span className="eyebrow">Actionable guidance</span><h2>What to improve next</h2></div></div><div>{analytics.suggestions.map((suggestion) => <article key={suggestion.title}><span>✦</span><div><strong>{suggestion.title}</strong><p>{suggestion.body}</p><Link href={suggestion.href}>{suggestion.action} →</Link></div></article>)}</div></section>
        </div>
        {(["threads", "youtube", "twitter", "pinterest"] as const).map(provider => <div key={provider} className="analytics-platform-panel" role="tabpanel" id={`analytics-panel-${provider}`} aria-labelledby={`analytics-tab-${provider}`} hidden={platform !== provider} tabIndex={0}>{platform === provider && <NetworkAnalytics key={`${provider}-${days}`} provider={provider} days={days} />}</div>)}
        <div className="analytics-platform-panel" role="tabpanel" id="analytics-panel-linkedin" aria-labelledby="analytics-tab-linkedin" hidden={platform !== "linkedin"} tabIndex={0}>
          <aside className="linkedin-analytics-card" data-analytics-card><SocialIcon className="linkedin-mark" provider="linkedin" /><span className="eyebrow light">LinkedIn analytics</span><h2>Analytics access is being set up.</h2><p>LinkedIn analytics requires separate provider approval. Connect your account to publish; performance insights will appear here when analytics access is ready.</p><div><span>Reach</span><span>Impressions</span><span>Followers</span></div><Link href="/accounts">Review LinkedIn account →</Link></aside>
        </div>
      </div> : null}
    </DashboardPageFrame>
  );
}

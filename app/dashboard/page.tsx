"use client";
import "../workspace-refinement.css";
import "../dashboard-studio.css";
import "../styles/workspace-sections.css";
import "../accounts/accounts.css";

import { platformName, isComingSoonProvider } from "../lib/provider-availability";

import gsap from "gsap";
import { dashboardPreview } from "./preview-data";
import { GettingStarted } from "../components/getting-started";
import { WorkspaceSearch } from "../components/workspace-search";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "../components/link";

import { DashboardSidebar } from "../components/dashboard-sidebar";
import { Social9Mark } from "../components/social9-mark";
import { SocialIcon } from "../components/social-icon";
import { ApiError, apiRequest, getActiveBrandId } from "../lib/api";
import type { Social9User } from "../lib/api";
import type { AnalyticsSummary } from "../lib/analytics";
import { clearSession, getAccessToken } from "../lib/session";
import "./workspace-loading.css";
import { cacheGeneration, DASHBOARD_CACHE_EVENT, readDashboardCache, writeDashboardCache } from "../lib/dashboard-cache";
import { track } from "../lib/track";

function scoreFor(data: AnalyticsSummary): number {
  const connected = Math.min(30, data.overview.connected_accounts * 15);
  const activity = Math.min(35, data.overview.posts_in_range * 7);
  const delivery = Math.min(35, (data.overview.publish_success_rate ?? 0) * 0.35);
  return Math.round(connected + activity + delivery);
}

export default function DashboardPage({ preview = false }: { preview?: boolean } = {}) {
  const root = useRef<HTMLElement>(null);
  const [user, setUser] = useState<Social9User | null>(preview ? { id: 0, name: "Alex", email: "Design preview", is_verified: true } : null);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(preview ? dashboardPreview : null);
  const [error, setError] = useState("");
  const [analyticsError, setAnalyticsError] = useState("");
  const [refreshing, setRefreshing] = useState(!preview);
  const [cached, setCached] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadingSlow, setLoadingSlow] = useState(false);
  const [reusingId, setReusingId] = useState<number | null>(null);
  const [reuseMessage, setReuseMessage] = useState("");

  useEffect(() => {
    if (preview) return;
    const invalidate = () => {
      setAnalytics(null);
      setRefreshing(true);
      setAnalyticsError("");
      setError("");
      setCached(false);
      setLoadingSlow(false);
      setRefreshKey((value) => value + 1);
    };
    window.addEventListener(DASHBOARD_CACHE_EVENT, invalidate);
    const sessionChanged = (event: StorageEvent) => {
      if (event.key === null || ["social9_access_token", "social9_active_brand_id"].includes(event.key)) window.location.reload();
    };
    window.addEventListener("storage", sessionChanged);
    return () => {
      window.removeEventListener(DASHBOARD_CACHE_EVENT, invalidate);
      window.removeEventListener("storage", sessionChanged);
    };
  }, [preview]);

  useEffect(() => {
    if (preview) return;
    const token = getAccessToken();
    if (!token) return void window.location.replace("/login");
    const startedAt = performance.now();
    const controller = new AbortController();
    const brandId = getActiveBrandId();
    const generation = cacheGeneration();
    let active = true;
    const slowTimer = window.setTimeout(() => setLoadingSlow(true), 7000);
    const sessionTimer = window.setTimeout(() => {
      if (!active) return;
      controller.abort();
      setError("We could not reach the Social9 service. Check your connection and try again.");
      setRefreshing(false);
    }, 20000);
    const options = { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal };
    // Start both requests together, but never let analytics block navigation.
    const summary = apiRequest<AnalyticsSummary>("/analytics/summary?days=30", options)
      .then((data) => ({ data, error: null }), (error: unknown) => ({ data: null, error }));
    const valid = () => active && getAccessToken() === token && getActiveBrandId() === brandId && cacheGeneration() === generation;
    const unauthorized = (requestError: unknown) => {
      if (requestError instanceof ApiError && requestError.status === 401) {
        clearSession();
        window.location.replace("/login");
        return true;
      }
      return false;
    };
    void apiRequest<Social9User>("/auth/me", options).then(async (loadedUser) => {
      if (!valid()) return;
      performance.clearMeasures("social9:dashboard-shell");
      performance.measure("social9:dashboard-shell", { start: startedAt });
      window.clearTimeout(sessionTimer);
      setUser(loadedUser);
      window.clearTimeout(slowTimer);
      const saved = readDashboardCache<AnalyticsSummary>(loadedUser.id, brandId);
      if (saved) { setAnalytics(saved); setCached(true); }
      const result = await summary;
      if (!valid()) return;
      if (result.error) {
        if (!unauthorized(result.error)) setAnalyticsError(result.error instanceof Error ? result.error.message : "Unable to refresh analytics.");
      } else if (result.data) {
        performance.clearMeasures("social9:dashboard-analytics");
        performance.measure("social9:dashboard-analytics", { start: startedAt });
        setAnalytics(result.data);
        setCached(false);
        writeDashboardCache(loadedUser.id, brandId, result.data, generation);
      }
      setRefreshing(false);
    }).catch((requestError: unknown) => {
      if (!valid() || unauthorized(requestError)) return;
      setError(requestError instanceof Error ? requestError.message : "Unable to verify your session.");
      setRefreshing(false);
    }).finally(() => { window.clearTimeout(slowTimer); window.clearTimeout(sessionTimer); });
    return () => {
      active = false;
      window.clearTimeout(sessionTimer);
      controller.abort();
      window.clearTimeout(slowTimer);
    };
  }, [refreshKey, preview]);

  useLayoutEffect(() => {
    if (!user || !analytics || !root.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const context = gsap.context(() => {
      const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
      timeline.from("[data-neon='header']", { y: 14, duration: 0.4 })
        .from("[data-neon='metric']", { y: 10, duration: 0.32, stagger: 0.045 }, "-=0.22")
        .from("[data-neon='card']", { y: 14, scale: 0.99, duration: 0.38, stagger: 0.05 }, "-=0.18")
        .from("[data-neon='feature']", { y: 12, duration: 0.34, stagger: 0.06 }, "-=0.24")
        .from("[data-neon='recommendation']", { x: 9, duration: 0.28, stagger: 0.04 }, "-=0.24");
      gsap.fromTo(".momentum-progress", { strokeDashoffset: 289 }, { strokeDashoffset: 289 * (1 - scoreFor(analytics) / 100), duration: 1.2, ease: "power2.out" });
      gsap.from(".activity-bar-fill", { scaleX: 0, transformOrigin: "left center", duration: 0.9, stagger: 0.08, ease: "power2.out" });
    }, root);
    return () => context.revert();
  }, [user, analytics]);

  async function reuseIdea(postId: number) {
    if (preview) return;
    const token = getAccessToken();
    if (!token) return void window.location.replace("/login");
    setReusingId(postId);
    setReuseMessage("");
    setError("");
    try {
      await apiRequest(`/posts/${postId}/duplicate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      track("post_duplicated", { location: "/dashboard" });
      setReuseMessage("Reusable draft created. It is ready in your content library.");
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        clearSession();
        window.location.replace("/login");
        return;
      }
      setError(requestError instanceof Error ? requestError.message : "Unable to reuse this idea.");
    } finally {
      setReusingId(null);
    }
  }

  if (!user && !error) return (
    <main className="workspace-loading" aria-busy="true">
      <div className="workspace-loading-brand"><Social9Mark /><span>Social9<span className="workspace-loading-brand-dot">.</span></span></div>
      <section className="workspace-loading-content" role="status" aria-live="polite" aria-atomic="true">
        <div className="workspace-loading-signal" aria-hidden="true">
          <div className="workspace-loading-orbit" />
          <div className="workspace-loading-core"><Social9Mark /></div>
          <span className="workspace-loading-spark workspace-loading-spark-one" />
          <span className="workspace-loading-spark workspace-loading-spark-two" />
        </div>
        <span className="workspace-loading-eyebrow">LOADING YOUR WORKSPACE</span>
        <h1>Loading your<br />Social9 workspace.</h1>
        <p>{loadingSlow ? "Waking up the Social9 service..." : "Opening your Social9 workspace..."}</p>
        <div className="workspace-loading-track" aria-hidden="true"><span /></div>
        <small>{loadingSlow ? "Checking your connection. You can retry if the service is unavailable." : "Your content, conversations, and insights. All together."}</small>
      </section>
      <footer className="workspace-loading-footer"><span />Manage every signal.</footer>
    </main>
  );

  if (!user && error) return <main className="dashboard-loading neon-dashboard-loading dashboard-load-failed" role="alert"><Social9Mark /><h1>We couldn’t open your workspace.</h1><p>{error}</p><div><button type="button" onClick={() => window.location.reload()}>Try again</button><Link href="/login">Back to sign in</Link></div></main>;

  const overview = analytics?.overview;
  const instagram = analytics?.provider_metrics?.instagram ?? null;
  const score = analytics ? scoreFor(analytics) : 0;
  const pipelineTotal = (overview?.drafts ?? 0) + (overview?.scheduled ?? 0) + (overview?.published ?? 0) + (overview?.failed ?? 0);
  const statuses = [
    { label: "Drafts", value: overview?.drafts ?? 0, className: "draft" },
    { label: "Scheduled", value: overview?.scheduled ?? 0, className: "scheduled" },
    { label: "Completed", value: overview?.published ?? 0, className: "published" },
    { label: "Needs attention", value: overview?.failed ?? 0, className: "failed" },
  ];

  return (
    <main className="dashboard-shell neon-app-shell">
      {preview ? <aside className="dashboard-sidebar"><Link className="dashboard-brand" href="/"><Social9Mark /><span>Social9</span></Link><p className="eyebrow">Design preview</p><nav aria-label="Preview navigation"><Link className="nav-item nav-item-active" href="/dashboard-preview" aria-current="page">Overview</Link><Link className="nav-item" href="/templates">Templates</Link><Link className="nav-item" href="/login">Sign in to your workspace</Link></nav></aside> : <DashboardSidebar active="dashboard" />}

      <section className="dashboard-content neon-dashboard dashboard-studio overview-studio" ref={root}>
        <header className="neon-dashboard-top" data-neon="header">
          <div><h1>Good morning, {user?.name.split(" ")[0]}!</h1><p>Here’s the complete summary of your content activity.</p></div>
          <div className="neon-dashboard-tools"><WorkspaceSearch />{user ? <div className="profile-chip"><span>{user.name.charAt(0).toUpperCase()}</span><div><strong>{user.name}</strong><small>{user.email}</small></div></div> : null}</div>
        </header>

        {error ? <p className="error-message" role="alert">{error}</p> : null}
        <div className="dashboard-refresh-status" role="status">
          {preview ? "Design preview / Sample data only. Sign in to use workspace features." : refreshing ? (cached ? "Showing recent results. Refreshing analytics..." : "Loading analytics. Your workspace is ready to use.") : cached ? "Showing recent results; refresh could not be completed." : analytics ? "Analytics updated." : null}
        </div>
        {analyticsError ? <div className="error-message" role="alert">{analyticsError} <button type="button" onClick={() => { setRefreshing(true); setAnalyticsError(""); setRefreshKey((value) => value + 1); }}>Retry analytics</button></div> : null}
        {!analytics && refreshing ? <section className="dashboard-analytics-placeholder" aria-label="Analytics loading" aria-busy="true"><h2>Loading your analytics</h2><p>You can create a post, manage accounts, or browse your calendar while analytics load.</p><Link href="/create-post">Create a post</Link></section> : null}
        {analytics && user ? <>
          <GettingStarted overview={analytics.overview} />
          <section className="neon-metric-strip" aria-label="Workspace metrics">
            <article data-neon="metric"><strong>{overview?.connected_accounts}</strong><div><small>Connected channels</small><span>{overview?.connected_accounts ? "Ready to publish" : "Connect now"}</span></div></article>
            <article data-neon="metric"><strong>{overview?.scheduled}</strong><div><small>Scheduled posts</small><span>In your queue</span></div></article>
            <article data-neon="metric"><strong>{overview?.total_posts}</strong><div><small>Total content</small><span>{overview?.posts_in_range} this period</span></div></article>
            <article data-neon="metric"><strong>{overview && overview.provider_published + overview.failed > 0 ? `${overview.publish_success_rate}%` : "\u2014"}</strong><div><small>Publishing success</small><span>{overview?.failed ? `${overview.failed} need attention` : overview?.provider_published ? "Healthy flow" : "No publishing data yet"}</span></div></article>
          </section>

          <nav className="studio-shortcuts" aria-label="Workspace quick actions"><Link href="/create-post"><span>01 / CREATE</span><strong>Write a post <b aria-hidden="true">+</b></strong></Link><Link href="/calendar"><span>02 / PLAN</span><strong>Open your calendar <b aria-hidden="true">&rarr;</b></strong></Link><Link href="/templates"><span>03 / EXPLORE</span><strong>Find your next idea <b aria-hidden="true">&rarr;</b></strong></Link></nav>

          <section className="neon-control-grid">
            <aside className="neon-dark-card neon-agenda" data-neon="card"><div className="neon-date"><strong>{new Date().getDate()}</strong><span>{new Date().toLocaleDateString(undefined,{weekday:"long"})}<br />{new Date().toLocaleDateString(undefined,{month:"long",year:"numeric"})}</span></div><h2>Today’s queue</h2>{analytics.upcoming_posts.length ? <div className="neon-agenda-list">{analytics.upcoming_posts.slice(0,4).map((post) => <article key={post.id}>{post.platforms.map((provider) => <SocialIcon key={provider} provider={provider} />)}<div><strong>{post.caption}</strong><small>{new Date(post.scheduled_for).toLocaleString(undefined,{weekday:"short",hour:"2-digit",minute:"2-digit"})}</small></div></article>)}</div> : <p className="neon-agenda-empty">Nothing is queued yet. Schedule the next idea and it will appear here.</p>}</aside>

            <article className="neon-dark-card neon-focus-card" data-neon="card"><div className="neon-focus-copy"><span>Workspace momentum</span><h2>{score >= 70 ? "Your content system is moving." : score >= 40 ? "Your rhythm is building." : "Your next publishing streak starts here."}</h2><p>This score uses connected channels, recent activity, and actual publishing outcomes—never fabricated reach.</p><div className="neon-focus-foot"><div className="momentum-dial" aria-label={`Workspace momentum ${score} out of 100`}><svg viewBox="0 0 110 110" aria-hidden="true"><circle className="momentum-track" cx="55" cy="55" r="46" /><circle className="momentum-progress" cx="55" cy="55" r="46" /></svg><strong>{score}</strong><small>/100</small></div><Link href="/create-post">Create the next post →</Link></div></div></article>

            <aside className="neon-dark-card neon-reco-panel" data-neon="card"><div className="panel-heading"><div><span className="eyebrow">For you</span><h2>Recommendations</h2></div><span className="spark-mark">✦</span></div><div className="neon-reco-list">{analytics.suggestions.length ? analytics.suggestions.map((suggestion) => <article data-neon="recommendation" key={suggestion.title}><div><strong>{suggestion.title}</strong><p>{suggestion.body}</p><Link href={suggestion.href}>{suggestion.action} →</Link></div><span /></article>) : <article data-neon="recommendation"><div><strong>Your workspace is on track</strong><p>Keep the current rhythm and review your next scheduled post.</p><Link href="/calendar">Open calendar →</Link></div><span /></article>}</div></aside>
          </section>

          <section className="neon-growth-grid" aria-label="Growth tools">
            <article className={`neon-feature-card streak-card ${analytics.consistency.state}`} data-neon="feature">
              <div className="feature-card-heading"><div><span className="eyebrow">Publishing consistency</span><h2>Track your posting streak.</h2></div><span className="streak-state">{analytics.consistency.state === "at_risk" ? "At risk" : analytics.consistency.state === "protected" ? "Protected" : analytics.consistency.state === "active" ? "On track" : "Start here"}</span></div>
              <div className="streak-layout">
                <div className="streak-count"><span aria-hidden="true">↗</span><strong>{analytics.consistency.current_streak}</strong><small>week streak</small></div>
                <div className="streak-copy"><p>{analytics.consistency.message}</p><div className="streak-stats"><span><b>{analytics.consistency.published_this_week}</b> published</span><span><b>{analytics.consistency.scheduled_this_week}</b> scheduled</span><span><b>{analytics.consistency.days_remaining}</b> days left</span></div></div>
              </div>
              <div className="week-rhythm" aria-label="Current week progress">{["M","T","W","T","F","S","S"].map((day, index) => <span className={index <= (new Date().getDay() + 6) % 7 ? "elapsed" : ""} key={`${day}-${index}`}><i />{day}</span>)}</div>
              <div className="feature-card-footer"><span>Best streak: {analytics.consistency.longest_streak} week{analytics.consistency.longest_streak === 1 ? "" : "s"}</span><Link href="/create-post">Plan this week →</Link></div>
            </article>

            <article className="neon-feature-card recycle-card" data-neon="feature">
              <div className="feature-card-heading"><div><span className="eyebrow">Smart recycling</span><h2>Reuse your published content.</h2></div><span className="recycle-count">{analytics.recycling.eligible_count} ready</span></div>
              {reuseMessage ? <div className="reuse-success" role="status"><span>✓</span><p>{reuseMessage}</p><Link href="/content?status=draft">Open drafts →</Link></div> : null}
              {analytics.recycling.candidates.length ? <div className="recycle-list">{analytics.recycling.candidates.map((candidate) => <article key={candidate.post_id}>
                <div className={candidate.media_url ? "recycle-visual has-image" : "recycle-visual"} style={candidate.media_url ? { backgroundImage: `linear-gradient(180deg,transparent,rgba(4,4,8,.82)),url(${candidate.media_url})` } : undefined}>{candidate.platforms.map((provider) => <SocialIcon key={provider} provider={provider} />)}</div>
                <div className="recycle-copy"><small>{candidate.reason}</small><strong>{candidate.caption}</strong><span>Published {candidate.age_days} days ago</span></div>
                <button type="button" disabled={reusingId !== null} onClick={() => void reuseIdea(candidate.post_id)}>{reusingId === candidate.post_id ? "Creating..." : "Reuse this idea"}</button>
              </article>)}</div> : <div className="recycle-empty"><span aria-hidden="true">↻</span><div><strong>Your reuse library is learning.</strong><p>{analytics.recycling.next_ready_in_days ? `Your first published idea becomes eligible in ${analytics.recycling.next_ready_in_days} day${analytics.recycling.next_ready_in_days === 1 ? "" : "s"}.` : "Publish consistently and Social9 will surface older ideas worth revisiting."}</p></div><Link href="/content">View content →</Link></div>}
            </article>
          </section>

          <section className="neon-lower-grid">
            <article className="neon-dark-card neon-pipeline" data-neon="card"><div className="panel-heading"><div><span className="eyebrow">Publishing health</span><h2>Content pipeline</h2></div><span className="live-data-pill"><i /> {preview ? "Sample data" : "Live data"}</span></div><div className="pipeline-list">{statuses.map((item) => <div className="pipeline-row" key={item.label}><div><span className={`pipeline-dot ${item.className}`} /><strong>{item.label}</strong></div><div className="activity-bar"><span className={`activity-bar-fill ${item.className}`} style={{width:`${pipelineTotal ? Math.max(5,item.value / pipelineTotal * 100) : 0}%`}} /></div><b>{item.value}</b></div>)}</div></article>
            <div className="neon-channels">{analytics.channels.map((channel) => <article className={`neon-dark-card neon-channel-card ${channel.provider}`} data-neon="card" key={channel.provider}><div className="neon-channel-head"><SocialIcon className="channel-symbol" provider={channel.provider} /><span>{isComingSoonProvider(channel.provider) ? "Coming soon" : channel.connected ? "Connected" : "Not connected"}</span></div><h3>{platformName(channel.provider)}</h3><p>{channel.provider === "instagram" && instagram ? `${instagram.reach.toLocaleString()} reach · ${instagram.interactions.toLocaleString()} interactions` : `${channel.published} completed · ${channel.scheduled} scheduled · ${channel.failed} failed`}</p></article>)}</div>
          </section>

          <section className="neon-dark-card neon-upcoming" data-neon="card"><div className="panel-heading"><div><span className="eyebrow">Coming up</span><h2>Next scheduled posts</h2></div><Link href="/calendar">View full calendar</Link></div>{analytics.upcoming_posts.length ? <div className="upcoming-list">{analytics.upcoming_posts.slice(0,3).map((post) => <article key={post.id}><time dateTime={post.scheduled_for}><strong>{new Date(post.scheduled_for).toLocaleDateString(undefined,{day:"2-digit"})}</strong><small>{new Date(post.scheduled_for).toLocaleDateString(undefined,{month:"short"})}</small></time><div><strong>{post.caption}</strong><small>{post.platforms.join(" + ")} · {new Date(post.scheduled_for).toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"})}</small></div><span className="post-status scheduled">Scheduled</span></article>)}</div> : <div className="empty-command-state"><p>No posts are scheduled yet. Give the next idea a time slot so Social9 can take it from there.</p><Link href="/create-post">Schedule a post</Link></div>}</section>
        </> : null}
      </section>
    </main>
  );
}

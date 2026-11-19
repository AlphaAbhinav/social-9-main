"use client";

import { AIFeedback } from "../components/ai-feedback";
import { Dropdown } from "../components/dropdown";

import Link from "../components/link";
import { isComingSoonProvider, platformNames } from "../lib/provider-availability";
import { useCallback, useEffect, useRef, useState } from "react";

import { ConfirmationDialog } from "../components/confirmation-dialog";
import { DashboardPageFrame } from "../components/dashboard-page-frame";
import { ApiError, apiRequest, getActiveBrandId } from "../lib/api";
import { clearSession, getAccessToken, getSessionUser } from "../lib/session";

type TrendSnapshot = { country: string; fetched_at: string; source: string; trends: { title: string; published_at: string; source_url: string }[] };

type BusinessBrief = { description: string; audience: string; goals: string; tone: string; details: string };
const emptyBrief: BusinessBrief = { description: "", audience: "", goals: "", tone: "Professional and friendly", details: "" };

type Provider = "instagram" | "linkedin" | "facebook" | "threads" | "youtube" | "twitter" | "pinterest";
type CalendarPost = {
  id: number;
  caption: string;
  platforms: Provider[];
  status: "draft" | "scheduled" | "published" | "failed";
  scheduled_for: string | null;
  media_urls: string[];
  created_at: string;
};
type ContentPlanItem = {
  date: string;
  day_number: number;
  slot_number?: number;
  theme: string;
  title: string;
  platforms: Provider[];
  format: string;
  objective: string;
  suggested_time: string;
  caption_prompt: string;
  why_it_works: string;
  call_to_action: string;
};
type ContentPlan = {
  plan: "free" | "premium";
  is_paid: boolean;
  free_days: number;
  included_through: string | null;
  locked: boolean;
  upgrade_message: string | null;
  items: ContentPlanItem[];
};

const today = new Date();
const initialMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function aiPlanStorageKey() {
  const userId = getSessionUser()?.id;
  const brandId = getActiveBrandId();
  return userId && brandId ? `social9_ai_plan_${userId}_${brandId}` : null;
}

function monthBounds(month: Date) {
  return {
    start: new Date(month.getFullYear(), month.getMonth(), 1),
    end: new Date(month.getFullYear(), month.getMonth() + 1, 1),
  };
}

function dateKey(value: Date | string) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return `${year}-${month - 1}-${day}`;
  }
  const date = typeof value === "string" ? new Date(value) : value;
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function calendarDate(value: Date) {
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${value.getFullYear()}-${month}-${day}`;
}

export default function CalendarPage() {
  const ideaTrigger = useRef<HTMLButtonElement>(null);
  const ideaHeading = useRef<HTMLHeadingElement>(null);
  const [viewMonth, setViewMonth] = useState(initialMonth);
  const [scheduledPosts, setScheduledPosts] = useState<CalendarPost[]>([]);
  const [drafts, setDrafts] = useState<CalendarPost[]>([]);
  const [contentPlan, setContentPlan] = useState<ContentPlan | null>(null);
  const [aiGenerationId, setAiGenerationId] = useState<number | null>(null);
  const [aiItems, setAiItems] = useState<ContentPlanItem[]>([]);
  const [business, setBusiness] = useState<BusinessBrief>(emptyBrief);
  const [useCurrentTrends, setUseCurrentTrends] = useState(false);
  const [trendCountry, setTrendCountry] = useState("IN");
  const [trendSnapshot, setTrendSnapshot] = useState<TrendSnapshot | null>(null);
  const [aiTopic, setAiTopic] = useState("");
  const [aiPlatform, setAiPlatform] = useState<"all" | "both" | Provider>("all");
  const [postsPerDay, setPostsPerDay] = useState(1);
  const [agendaDay, setAgendaDay] = useState<Date | null>(null);
  const [aiStartDate, setAiStartDate] = useState(() => calendarDate(new Date()));
  const [aiPlanLoading, setAiPlanLoading] = useState(false);
  const [selected, setSelected] = useState<CalendarPost | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<ContentPlanItem | null>(null);
  useEffect(() => {
    if (!selectedIdea) return;
    ideaHeading.current?.focus({ preventScroll: true });
    ideaHeading.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "center" });
  }, [selectedIdea]);
  const [pendingDelete, setPendingDelete] = useState<CalendarPost | null>(null);
  const [platformFilter, setPlatformFilter] = useState<"all" | Provider>("all");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  const unauthorized = useCallback(() => {
    clearSession();
    window.location.replace("/login");
  }, []);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    const controller = new AbortController();
    apiRequest<{description:string;audience:string;voice:string;goal:string}>("/ai/brand-profile",{headers:{Authorization:`Bearer ${token}`},signal:controller.signal})
      .then(profile=>setBusiness(current=>({...current,description:current.description || profile.description,audience:current.audience || profile.audience,goals:current.goals || profile.goal,tone:current.tone === emptyBrief.tone ? profile.voice.slice(0,100) || current.tone : current.tone})))
      .catch(()=>{ /* A campaign brief can still be entered manually. */ });
    return ()=>controller.abort();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const key = aiPlanStorageKey();
      if (!key) return;
      try {
        const brief = window.localStorage.getItem(`${key}_business`);
        if (brief) {
          const parsed = JSON.parse(brief);
          if (Object.keys(emptyBrief).every((field) => typeof parsed[field] === "string")) setBusiness(parsed);
        }
        const saved = window.localStorage.getItem(key);
        if (!saved) return;
        const plan = JSON.parse(saved) as { topic?: string; platform?: "all" | "both" | Provider; startDate?: string; generationId?: number; items?: ContentPlanItem[]; postsPerDay?: number; trendSnapshot?: TrendSnapshot };
        if (!Array.isArray(plan.items) || ![7, 30, 60, 90].includes(plan.items.length) || !plan.items.every((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date) && typeof item.title === "string")) return;
        setAiItems(plan.items);
        setAiGenerationId(plan.generationId ?? null);
        setPostsPerDay([1,2,3].includes(plan.postsPerDay ?? 1) ? plan.postsPerDay ?? 1 : 1);
        setTrendSnapshot(plan.trendSnapshot ?? null);
        setAiTopic(plan.topic ?? "");
        setAiPlatform(plan.platform ?? "all");
        setAiStartDate(plan.startDate ?? plan.items[0].date);
        const [year, month] = plan.items[0].date.split("-").map(Number);
        setViewMonth(new Date(year, month - 1, 1));
      } catch {
        window.localStorage.removeItem(key);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const refresh = useCallback(async (month: Date) => {
    const token = getAccessToken();
    if (!token) return unauthorized();
    setLoading(true);
    const { start, end } = monthBounds(month);
    const query = `date_from=${encodeURIComponent(start.toISOString())}&date_to=${encodeURIComponent(end.toISOString())}`;
    const planThrough = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 1);
    const planQuery = `date_from=${calendarDate(start)}&date_to=${calendarDate(planThrough)}`;
    try {
      const [calendarItems, draftItems, plan] = await Promise.all([
        apiRequest<CalendarPost[]>(`/posts?${query}`, { headers: { Authorization: `Bearer ${token}` } }),
        apiRequest<CalendarPost[]>("/posts?status=draft", { headers: { Authorization: `Bearer ${token}` } }),
        apiRequest<ContentPlan>(`/content-plan?${planQuery}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setScheduledPosts(calendarItems);
      setDrafts(draftItems);
      setContentPlan(plan);
      setSelected((current) => current ? [...calendarItems, ...draftItems].find((post) => post.id === current.id) ?? null : null);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) return unauthorized();
      setError(requestError instanceof Error ? requestError.message : "Unable to load your calendar.");
    } finally {
      setLoading(false);
    }
  }, [unauthorized, setSelected]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return unauthorized();
    let active = true;
    const loadingTimer = window.setTimeout(() => setLoading(true), 0);
    const { start, end } = monthBounds(viewMonth);
    const query = `date_from=${encodeURIComponent(start.toISOString())}&date_to=${encodeURIComponent(end.toISOString())}`;
    const planThrough = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 1);
    const planQuery = `date_from=${calendarDate(start)}&date_to=${calendarDate(planThrough)}`;
    Promise.all([
      apiRequest<CalendarPost[]>(`/posts?${query}`, { headers: { Authorization: `Bearer ${token}` } }),
      apiRequest<CalendarPost[]>("/posts?status=draft", { headers: { Authorization: `Bearer ${token}` } }),
      apiRequest<ContentPlan>(`/content-plan?${planQuery}`, { headers: { Authorization: `Bearer ${token}` } }),
    ])
      .then(([calendarItems, draftItems, plan]) => {
        if (!active) return;
        setScheduledPosts(calendarItems);
        setDrafts(draftItems);
        setContentPlan(plan);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        if (requestError instanceof ApiError && requestError.status === 401) return unauthorized();
        setError(requestError instanceof Error ? requestError.message : "Unable to load your calendar.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; window.clearTimeout(loadingTimer); };
  }, [unauthorized, viewMonth]);

  function changeMonth(offset: number) {
    setSelected(null);
    setSelectedIdea(null);
    setAgendaDay(null);
    setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function selectPost(post: CalendarPost) {
    setAgendaDay(null);
    setSelected(post);
    setSelectedIdea(null);
    setRescheduleTime(post.scheduled_for ? new Date(post.scheduled_for).toISOString().slice(0, 16) : "");
    setError("");
  }

  function selectIdea(idea: ContentPlanItem) {
    setAgendaDay(null);
    setSelected(null);
    setSelectedIdea(idea);
    setError("");
  }

  async function generateAIPlan() {
    const topic = aiTopic.trim() || "30-day business content strategy";
    if (business.description.trim().length < 10 || business.audience.trim().length < 3 || business.goals.trim().length < 3) return setError("Tell us what your business does, who you want to reach, and your goals before generating a plan.");
    if (topic.length < 3) return setError("Use at least three characters for the campaign focus, or leave it blank.");
    const token = getAccessToken();
    if (!token) return unauthorized();
    setAiPlanLoading(true);
    setError("");
    try {
      const result = await apiRequest<{ generation_id?: number; topic: string; items: ContentPlanItem[]; trend_snapshot?: TrendSnapshot }>("/content-plan/ai", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ topic, platform: aiPlatform, start_date: aiStartDate, posts_per_day: postsPerDay, business, use_current_trends: useCurrentTrends, trend_country: trendCountry }),
      });
      if (result.items.length !== 30 * postsPerDay) throw new Error("The AI returned an incomplete plan. Please try again.");
      setAiItems(result.items);
      setAiGenerationId(result.generation_id ?? null);
      setTrendSnapshot(result.trend_snapshot ?? null);
      const key = aiPlanStorageKey();
      if (key) {
        try {
          window.localStorage.setItem(`${key}_business`, JSON.stringify(business));
          window.localStorage.setItem(key, JSON.stringify({ topic, platform: aiPlatform, startDate: aiStartDate, postsPerDay, generationId: result.generation_id, items: result.items, trendSnapshot: result.trend_snapshot }));
        } catch {
          // The generated ideas still work for this visit when browser storage is unavailable.
        }
      }
      setSelectedIdea(null);
      const [year, month] = aiStartDate.split("-").map(Number);
      setViewMonth(new Date(year, month - 1, 1));
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) return unauthorized();
      setError(requestError instanceof Error ? requestError.message : "Unable to generate your AI plan.");
    } finally {
      setAiPlanLoading(false);
    }
  }

  async function reschedule(post: CalendarPost) {
    if (!rescheduleTime) return setError("Choose a future date and time.");
    const token = getAccessToken();
    if (!token) return unauthorized();
    setWorking(true);
    try {
      const updated = await apiRequest<CalendarPost>(`/posts/${post.id}/schedule`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ scheduled_for: new Date(rescheduleTime).toISOString() }),
      });
      setSelected(updated);
      await refresh(viewMonth);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to reschedule this post.");
    } finally {
      setWorking(false);
    }
  }

  async function moveToDraft(post: CalendarPost) {
    const token = getAccessToken();
    if (!token) return unauthorized();
    setWorking(true);
    try {
      await apiRequest<CalendarPost>(`/posts/${post.id}/draft`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
      setSelected(null);
      await refresh(viewMonth);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to move this post to drafts.");
    } finally {
      setWorking(false);
    }
  }

  async function deletePost() {
    const post = pendingDelete;
    if (!post) return;
    const token = getAccessToken();
    if (!token) return unauthorized();
    setWorking(true);
    try {
      await apiRequest(`/posts/${post.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setSelected(null);
      setPendingDelete(null);
      await refresh(viewMonth);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete this post.");
    } finally {
      setWorking(false);
    }
  }

  const firstDay = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1).getDay();
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: 42 }, (_, index) => {
    const dayNumber = index - firstDay + 1;
    return dayNumber >= 1 && dayNumber <= daysInMonth ? new Date(viewMonth.getFullYear(), viewMonth.getMonth(), dayNumber) : null;
  });
  const visiblePosts = platformFilter === "all" ? scheduledPosts : scheduledPosts.filter((post) => post.platforms.includes(platformFilter));
  const visibleIdeas = (aiItems.length ? aiItems : contentPlan?.items ?? [])
    .filter((idea) => platformFilter === "all" || idea.platforms.includes(platformFilter));

  return (
    <DashboardPageFrame active="calendar" className="calendar-content calendar-studio">
        <header className="dashboard-header">
          <div><span className="eyebrow">Content calendar</span><h1>Plan and schedule your social posts.</h1><p>Review scheduled campaigns, manage drafts, and adjust timing before publishing goes live.</p></div>
          <Link className="header-action-link" href="/create-post">+ Create post</Link>
        </header>
        {error ? <p className="error-message calendar-error" role="alert">{error}</p> : null}
        {loading && <p role="status">Updating calendar...</p>}
        {contentPlan ? <section className={`content-plan-banner${contentPlan.locked ? " locked" : ""}`}>
          <div><span className="eyebrow">{contentPlan.is_paid ? "Premium content plan" : "Included with Free"}</span><h2>{contentPlan.is_paid ? "Your month, shaped around your business." : `Your next ${contentPlan.free_days} days are planned.`}</h2><p>{contentPlan.locked ? contentPlan.upgrade_message : contentPlan.is_paid ? "Starter ideas are general prompts. Open Business details above the calendar to generate your personalized 30-day plan." : `Daily ideas are included through ${new Date(`${contentPlan.included_through}T12:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}.`}</p></div>
          {!contentPlan.is_paid ? <Link href="/billing">Unlock planning beyond 30 days →</Link> : null}
        </section> : null}

        {contentPlan?.is_paid ? <details id="business-brief" className="ai-calendar-panel brief-disclosure">
          <summary><span><strong>Your business. Your content plan.</strong><small>{aiItems.length ? `${aiItems.length} ideas saved / Edit your business brief` : "Add your business brief for ideas tailored to your brand"}</small></span><span className="disclosure-action">Business details <b aria-hidden="true">+</b></span></summary>
          <div className="brief-disclosure-body">
          <div><span className="eyebrow">Premium AI calendar</span><h2>A month of ideas, built for your business.</h2><p>Tell us what you do and what you want to achieve. Choose 1 to 3 ideas per day, shaped by your saved brand profile, latest growth plan and available performance. Campaign details below override conflicting saved details.</p></div>
          <div className="business-brief-grid">
            <label className="business-brief-wide">What does your business do? <span>Required</span><textarea value={business.description} onChange={(event) => setBusiness({ ...business, description: event.target.value })} maxLength={1500} placeholder="Business name, products or services, and what makes you different. For example: a Pune bakery offering custom eggless cakes and same-day delivery." /></label>
            <label>Who do you want to reach? <span>Required</span><textarea value={business.audience} onChange={(event) => setBusiness({ ...business, audience: event.target.value })} maxLength={500} placeholder="Ideal customers, location, interests, and needs." /></label>
            <label>What do you want to achieve? <span>Required</span><textarea value={business.goals} onChange={(event) => setBusiness({ ...business, goals: event.target.value })} maxLength={500} placeholder="More enquiries, product sales, awareness, community growth, or another goal." /></label>
            <label>Brand voice<input value={business.tone} onChange={(event) => setBusiness({ ...business, tone: event.target.value })} maxLength={100} placeholder="e.g. Friendly, expert, playful" /></label>
            <label>Offers, dates, and things to avoid<textarea value={business.details} onChange={(event) => setBusiness({ ...business, details: event.target.value })} maxLength={1500} placeholder="Confirmed offers, launches, available content, and any restrictions. Optional." /></label>
          </div>
          <p className="business-brief-note">Saved brand details prefill this brief. Your generated plan is remembered for this brand in this browser. Missing insights produce hypotheses, not performance claims. Ideas are drafts; nothing is published automatically.</p>
          <div className="ai-calendar-controls">
            <label><span>Current internet trends</span><span><input type="checkbox" checked={useCurrentTrends} onChange={(event) => setUseCurrentTrends(event.target.checked)} /> Use recent Google search trends</span></label>
            {useCurrentTrends ? <label htmlFor="dropdown-trend-region">Trend region<Dropdown id="dropdown-trend-region" label="Trend region" value={trendCountry} onValueChange={setTrendCountry}><option value="IN">India</option><option value="US">United States</option><option value="GB">United Kingdom</option><option value="CA">Canada</option><option value="AU">Australia</option></Dropdown></label> : null}
          </div>
          <p className="business-brief-note">Relevant trends inform the first few days; the rest stays evergreen. Search interest is not proof that a topic is trending on Instagram, Facebook Pages, or LinkedIn. Review relevance before publishing.</p>
          {trendSnapshot ? <details className="ai-calendar-active"><summary>Trend sources used as context / {trendSnapshot.country} / checked {new Date(trendSnapshot.fetched_at).toLocaleString()}</summary><p>These are candidate signals, not a claim that every trend was used. Each trend-based idea explains its business connection.</p><ul>{trendSnapshot.trends.map(trend => <li key={trend.title}><a href={trend.source_url} target="_blank" rel="noopener noreferrer">{trend.title}</a></li>)}</ul></details> : null}
          <div className="ai-calendar-controls">
            <label>Campaign focus (optional)<input value={aiTopic} onChange={(event) => setAiTopic(event.target.value)} maxLength={200} placeholder="e.g. new cafe menu" /></label>
            <label htmlFor="dropdown-ai-plan-channel">Channel<Dropdown id="dropdown-ai-plan-channel" label="AI plan channel" value={aiPlatform} onValueChange={(value) => setAiPlatform(value as "all" | "both" | Provider)}><option value="all">All platforms</option><option value="both">Instagram + LinkedIn</option>{Object.entries(platformNames).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</Dropdown></label>
            <label htmlFor="dropdown-ai-plan-frequency">Ideas per day (total)<Dropdown id="dropdown-ai-plan-frequency" label="AI plan posting frequency" value={postsPerDay} onValueChange={value=>setPostsPerDay(Number(value))}><option value={1}>1 / day - 30 ideas</option><option value={2}>2 / day - 60 ideas</option><option value={3}>3 / day - 90 ideas</option></Dropdown></label>
            <label>Start date<input type="date" min={calendarDate(new Date())} value={aiStartDate} onChange={(event) => setAiStartDate(event.target.value)} /></label>
            <button type="button" disabled={aiPlanLoading} onClick={() => void generateAIPlan()}>{aiPlanLoading ? "Generating..." : "Generate 30-day plan"}</button>
          </div>
          {aiItems.length ? <div className="ai-calendar-active" role="status">{aiItems.length} saved AI ideas are showing for {aiItems[0].date} through {aiItems[aiItems.length - 1].date}. <button type="button" onClick={() => { const key = aiPlanStorageKey(); if (key) window.localStorage.removeItem(key); setAiItems([]); setAiGenerationId(null); setPostsPerDay(1); setTrendSnapshot(null); setSelectedIdea(null); }}>Show starter ideas</button></div> : null}
          {aiItems.length ? <AIFeedback generationId={aiGenerationId} /> : null}
          </div>
        </details> : null}

        <div className="calendar-studio-heading"><div><span className="eyebrow">YOUR PUBLISHING STUDIO</span><h2>A little structure. More room to create.</h2></div><div className="calendar-studio-key"><span>Ideas</span><span>Instagram</span><span>Facebook</span><span>LinkedIn</span></div></div>
        <div className="calendar-toolbar">
          <div className="month-navigation"><button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month">‹</button><h2>{viewMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h2><button type="button" onClick={() => changeMonth(1)} aria-label="Next month">›</button></div>
          <div className="calendar-filters"><button type="button" onClick={() => setViewMonth(new Date(initialMonth))}>Today</button><label htmlFor="dropdown-calendar-channel">Channel<Dropdown id="dropdown-calendar-channel" label="Calendar channel" value={platformFilter} onValueChange={(value) => setPlatformFilter(value as "all" | Provider)}><option value="all">All</option>{Object.entries(platformNames).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</Dropdown></label></div>
        </div>

        <div className="calendar-layout">
          <section className="calendar-card" aria-label="Monthly calendar">
            <div className="weekday-row">{weekdayLabels.map((day) => <span key={day}>{day}</span>)}</div>
            <div className="month-grid">{cells.map((date, index) => {
              const dayPosts = date ? visiblePosts.filter((post) => post.scheduled_for && dateKey(post.scheduled_for) === dateKey(date)) : [];
              const dayIdeas = date ? visibleIdeas.filter((idea) => dateKey(idea.date) === dateKey(date)) : [];
              return <div className={date ? "calendar-day" : "calendar-day outside"} key={`${index}-${date?.toISOString() ?? "empty"}`}>{date ? <><span className={dateKey(date) === dateKey(today) ? "day-number today" : "day-number"}>{date.getDate()}</span><div className="day-posts">{dayIdeas.map((idea) => <button className="content-plan-idea" aria-pressed={selectedIdea === idea} type="button" key={`${idea.date}-${idea.slot_number ?? 1}-${idea.title}`} onClick={(event) => { ideaTrigger.current = event.currentTarget; selectIdea(idea); }}><time>Day {idea.day_number}{postsPerDay > 1 ? ` / Post ${idea.slot_number ?? 1}` : ""}</time><span>✦ {idea.title}</span></button>)}{dayPosts.slice(0, 2).map((post) => <button className={`calendar-post ${post.platforms[0]}`} type="button" key={post.id} onClick={() => selectPost(post)}><time>{new Date(post.scheduled_for!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time><span>{post.caption}</span></button>)}{dayPosts.length > 2 ? <button className="calendar-more-posts" type="button" onClick={()=>{setAgendaDay(date);setSelected(null);setSelectedIdea(null);}}>View all {dayPosts.length} posts</button> : null}</div></> : null}</div>;
            })}</div>
          </section>

          <aside className="calendar-side-panel">



            {agendaDay ? <section className="post-detail-card calendar-day-agenda"><div className="detail-heading"><h2>{agendaDay.toLocaleDateString(undefined,{month:"short",day:"numeric"})} / Scheduled posts</h2><button type="button" aria-label="Close day agenda" onClick={()=>setAgendaDay(null)}>&times;</button></div><ul>{visiblePosts.filter(post=>post.scheduled_for && dateKey(post.scheduled_for)===dateKey(agendaDay)).sort((a,b)=>Date.parse(a.scheduled_for!)-Date.parse(b.scheduled_for!)).map(post=><li key={post.id}><button type="button" onClick={()=>selectPost(post)}><time>{new Date(post.scheduled_for!).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</time><p>{post.caption}</p><small>{post.platforms.join(" + ")}</small></button></li>)}</ul></section> : selectedIdea ? <section className="post-detail-card content-idea-detail">
              <div className="detail-heading"><span className="post-status planned">Day {selectedIdea.day_number} · {selectedIdea.theme}</span><button type="button" onClick={() => { setSelectedIdea(null); ideaTrigger.current?.focus(); }} aria-label="Close content idea">×</button></div>
              <h2 ref={ideaHeading} tabIndex={-1}>{selectedIdea.title}</h2><p>{selectedIdea.caption_prompt}</p>
              <div className="content-idea-facts"><span><small>Format</small>{selectedIdea.format}</span><span><small>Goal</small>{selectedIdea.objective}</span><span><small>Suggested time</small>{selectedIdea.suggested_time}</span></div>
              <div className="detail-platforms">{selectedIdea.platforms.map((provider) => <span key={provider}>{provider}</span>)}</div>
              <div className="content-idea-note"><strong>Why this can work</strong><p>{selectedIdea.why_it_works}</p></div>
              <div className="content-idea-note"><strong>Suggested call to action</strong><p>{selectedIdea.call_to_action}</p></div>
              {selectedIdea.platforms.some(isComingSoonProvider) ? <p>Keep this idea for planning. Publishing to this platform is coming soon.</p> : <Link className="primary-composer-button full-action" href={`/create-post?idea=${encodeURIComponent(selectedIdea.caption_prompt)}&platform=${selectedIdea.platforms[0]}&date=${selectedIdea.date}&time=${selectedIdea.suggested_time}`}>Create this post →</Link>}
            </section> : selected ? <section className="post-detail-card"><div className="detail-heading"><span className={`post-status ${selected.status}`}>{selected.status}</span><button type="button" onClick={() => setSelected(null)} aria-label="Close post details">×</button></div><h2>Post details</h2><p>{selected.caption}</p><div className="detail-platforms">{selected.platforms.map((provider) => <span key={provider}>{provider}</span>)}</div><label className="detail-schedule">Schedule<input type="datetime-local" value={rescheduleTime} onChange={(event) => setRescheduleTime(event.target.value)} /></label><button className="primary-composer-button full-action" type="button" disabled={working} onClick={() => void reschedule(selected)}>Update schedule</button>{selected.status === "scheduled" ? <button className="secondary-button full-action" type="button" disabled={working} onClick={() => void moveToDraft(selected)}>Move to drafts</button> : null}<button className="text-danger-button" type="button" disabled={working} onClick={() => setPendingDelete(selected)}>Delete post</button></section> : <section className="drafts-card"><div className="saved-posts-heading"><div><span className="eyebrow">Unscheduled</span><h2>Drafts</h2></div><span>{drafts.length}</span></div>{loading ? <p className="empty-posts">Loading calendar...</p> : drafts.length === 0 ? <p className="empty-posts">No drafts waiting. New drafts will appear here.</p> : <ul>{drafts.slice(0, 6).map((post) => <li key={post.id}><button type="button" onClick={() => selectPost(post)}><p>{post.caption}</p><small>{post.platforms.join(" + ")}</small></button></li>)}</ul>}<Link className="draft-create-link" href="/create-post">Create another post</Link></section>}
          </aside>
        </div>

        {pendingDelete ? <ConfirmationDialog
          busy={working}
          confirmLabel="Delete post"
          description="This permanently removes the post from Social9. Content already published on Instagram, Facebook Pages, or LinkedIn will remain on the provider."
          eyebrow="Delete content"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => void deletePost()}
          title="Delete this post?"
        /> : null}
    </DashboardPageFrame>
  );
}

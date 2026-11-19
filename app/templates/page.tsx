"use client";

import "./templates-studio.css";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Dropdown } from "../components/dropdown";
import { DashboardPageFrame } from "../components/dashboard-page-frame";
import Link from "../components/link";
import { SocialIcon } from "../components/social-icon";
import { contentTemplates } from "../lib/content-templates";
import { ApiError, apiRequest, getActiveBrandId, type Social9Brand } from "../lib/api";
import { getAccessToken, clearSession } from "../lib/session";
import { brandIndustry, engagementExperiment, recommendTemplates, templateIndustries, templateSupportedChannels, type BrandTemplateProfile, type TemplateBrand, type TemplateChannel } from "../lib/brand-templates";
import { platformName } from "../lib/provider-availability";

export default function TemplatesPage() {
  const [brand, setBrand] = useState<TemplateBrand | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState("");
  const [goal, setGoal] = useState("all");
  const [platform, setPlatform] = useState("all");

  useEffect(() => {
    const token = getAccessToken();
    if (!token) { window.location.replace("/login"); return; }
    const controller = new AbortController();
    const headers = { Authorization: `Bearer ${token}` };
    void apiRequest<Social9Brand[]>("/brands", { headers, signal: controller.signal }).then(async brands => {
      const selected = brands.find(item => item.id === getActiveBrandId()) ?? brands[0];
      if (!selected) throw new Error("Create a brand to get relevant templates.");
      const options = { headers: { ...headers, "X-Brand-ID": String(selected.id) }, signal: controller.signal };
      const [profile, accounts] = await Promise.all([
        apiRequest<BrandTemplateProfile>("/ai/brand-profile", options),
        apiRequest<{ provider: string; status: string }[]>("/social-accounts", options),
      ]);
      if (!controller.signal.aborted) setBrand({ ...selected, profile, channels: templateSupportedChannels.filter(channel => accounts.some(account => account.provider === channel && account.status === "connected")) });
    }).catch(cause => {
      if (controller.signal.aborted) return;
      if (cause instanceof ApiError && cause.status === 401) { clearSession(); window.location.replace("/login"); return; }
      setError(cause instanceof Error ? cause.message : "Unable to load brand templates.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const recommendations = useMemo(() => brand ? recommendTemplates(contentTemplates, brand) : [], [brand]);
  const goals = [...new Set(recommendations.map(item => item.template.goal))];
  const visible = recommendations.filter(({ template, channels }) =>
    (goal === "all" || template.goal === goal) && (platform === "all" || channels.includes(platform as TemplateChannel)) &&
    (!search.trim() || [template.title, template.caption, template.goal, template.industry].some(value => value.toLowerCase().includes(search.trim().toLowerCase()))));
  function clearFilters() { setSearch(""); setGoal("all"); setPlatform("all"); }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!brand) return;
    const data = new FormData(event.currentTarget);
    const profile = Object.fromEntries(["industry", "description", "audience", "voice", "goal"].map(key => [key, String(data.get(key) ?? "")])) as BrandTemplateProfile;
    setSaving(true); setSaved(false); setError("");
    try {
      const updated = await apiRequest<BrandTemplateProfile>("/ai/brand-profile", { method: "PUT", headers: { Authorization: `Bearer ${getAccessToken()}`, "X-Brand-ID": String(brand.id) }, body: JSON.stringify(profile) });
      setBrand({ ...brand, profile: updated }); clearFilters(); setSaved(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save brand details."); }
    finally { setSaving(false); }
  }

  return <DashboardPageFrame active="templates" className="templates-content templates-studio">
    <header className="dashboard-header template-header"><div><span className="eyebrow">MADE FOR YOUR BRAND</span><h1>{brand ? `Content ideas for ${brand.name}.` : "Your brand. Your next conversation."}</h1><p>Ideas for this workspace brand, matched to its business type, goals and connected channels. Choose another brand in the sidebar to see its ideas.</p></div>{brand && <span className="template-count"><strong>{recommendations.length}</strong> relevant templates</span>}</header>
    {loading && <p role="status">Finding templates for your brand…</p>}
    {error && <p className="template-feedback" role="alert">{error}</p>}
    {brand && <>
      <section className="template-brand-context" aria-label="Brand context"><div><strong>{brand.name}</strong><p>{brandIndustry(brand) ?? "Add your business type for a closer match"}{brand.profile.audience && ` · For ${brand.profile.audience}`}</p>{brand.profile.goal && <p>Your goal: {brand.profile.goal}</p>}</div><div className="template-context-channels">{brand.channels.map(channel => <span key={channel}><SocialIcon provider={channel} />{platformName(channel)}</span>)}</div></section>
      <details className="template-profile"><summary>Tailor these ideas to your business</summary><form key={brand.id} onSubmit={saveProfile}><fieldset disabled={saving}><label>Business type<select name="industry" defaultValue={brand.profile.industry ?? ""}><option value="">Detect from brand details</option>{templateIndustries.map(item => <option key={item}>{item}</option>)}<option value="Any business">Other business</option></select></label><label>What does your brand offer?<textarea name="description" maxLength={800} defaultValue={brand.profile.description} placeholder="e.g. A neighbourhood bakery making fresh sourdough and celebration cakes" /></label><label>Who is your audience?<input name="audience" maxLength={500} defaultValue={brand.profile.audience} placeholder="e.g. Local families and home bakers" /></label><label>What would you like to achieve?<input name="goal" maxLength={300} defaultValue={brand.profile.goal} placeholder="e.g. More comments, saves and enquiries" /></label><label>Brand voice<input name="voice" maxLength={200} defaultValue={brand.profile.voice} placeholder="e.g. Warm, practical and friendly" /></label><button disabled={saving}>{saving ? "Saving…" : "Save brand details"}</button></fieldset>{saved && <p role="status">Saved. Your templates now use these brand details.</p>}</form></details>
      {!brand.channels.length ? <section className="template-empty"><strong>Connect a channel for {brand.name}.</strong><p>Connect a supported account to see templates suitable for this brand’s channels.</p><Link href="/accounts">Connect an account →</Link></section> : <>
        <nav className="template-categories" aria-label="Filter templates by goal">{["all", ...goals].map(item => <button type="button" key={item} aria-pressed={goal === item} onClick={() => setGoal(item)}>{item === "all" ? "Recommended for you" : item}<span>{item === "all" ? recommendations.length : recommendations.filter(row => row.template.goal === item).length}</span></button>)}</nav>
        <section className="template-toolbar" aria-label="Template filters"><label className="template-search">Search your templates<input type="search" placeholder="Try offer, review, tip…" value={search} onChange={event => setSearch(event.target.value)} /></label><label htmlFor="dropdown-channel">Connected channel<Dropdown id="dropdown-channel" label="Connected channel" value={platform} onValueChange={setPlatform}><option value="all">All connected channels</option>{brand.channels.map(channel => <option key={channel} value={channel}>{platformName(channel)}</option>)}</Dropdown></label></section>
        <div className="template-results-heading"><span role="status" aria-live="polite">{visible.length} matching template{visible.length === 1 ? "" : "s"}</span><button type="button" onClick={clearFilters}>Clear filters</button></div>
        {visible.length ? <section className="template-grid" aria-label="Recommended post templates">{visible.map(({ template, channels, reasons }) => {
          const experiment = engagementExperiment(template.goal);
          const channel = platform === "all" ? channels[0] : platform;
          return <article className={`template-card studio-${template.goal.toLowerCase()}`} key={template.id}><div className="template-card-top"><div><span className={`template-goal goal-${template.goal.toLowerCase()}`}>{template.goal}</span><small>{template.format}</small></div><div className="template-platforms">{channels.map(provider => <span key={provider} title={platformName(provider)}><SocialIcon provider={provider} /></span>)}</div></div><h2>{template.title}</h2><p className="template-match">{reasons.join(" · ")}</p><p className="template-caption">{template.caption}</p><details className="template-creative-brief"><summary>Caption & engagement idea <span>+</span></summary><p className="template-full-caption">{template.caption}</p><dl><div><dt>Visual</dt><dd>{template.visual}</dd></div><div><dt>Call to action</dt><dd>{template.cta}</dd></div><div><dt>Why try it</dt><dd>{experiment.why}</dd></div><div><dt>Measure</dt><dd>{experiment.measure}</dd></div></dl></details><div className="template-tags">{template.hashtags.map(tag => <span key={tag}>{tag}</span>)}</div><div className="template-card-footer"><span>{brand.name}</span><Link href={`/create-post?template=${encodeURIComponent(template.id)}&platform=${channel}&template_brand=${brand.id}`}>Customize for {platformName(channel)} →</Link></div></article>;
        })}</section> : <section className="template-empty"><strong>No templates match those filters.</strong><p>Try a broader search or clear a filter.</p><button type="button" onClick={clearFilters}>Show recommendations</button></section>}
        <p className="template-method">Suggestions use your saved brand details and connected channels. Test one idea at a time and compare results in Analytics.</p>
      </>}
    </>}
  </DashboardPageFrame>;
}

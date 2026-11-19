"use client";

/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- Horizontal scroll regions need keyboard focus so arrow keys can scroll their posts. */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "./link";
import { SocialIcon } from "./social-icon";
import { discoverPosts } from "../lib/discover-posts";
import { API_URL, ApiError, apiRequest } from "../lib/api";
import { getAccessToken } from "../lib/session";
import type { Provider, SavedPost } from "../lib/posts";
import "./discover-feed.css";

export function DiscoverFeed() {
  const [tab, setTab] = useState<"discover" | "personal">("discover");
  const [platform, setPlatform] = useState<"all" | Provider>("all");
  const [visible, setVisible] = useState(6);
  const [format, setFormat] = useState<"all" | "photo" | "video" | "text">("all");
  const [liked, setLiked] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [savedOnly, setSavedOnly] = useState(false);
  const [posts, setPosts] = useState<SavedPost[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "signin" | "error">("idle");
  const [error, setError] = useState("");
  const request = useRef(0);
  const feed = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 0, max: 0, current: 1 });

  function measureFeed() {
    const rail = feed.current;
    if (!rail) return;
    const card = rail.firstElementChild as HTMLElement | null;
    const step = card ? card.getBoundingClientRect().width + parseFloat(getComputedStyle(rail).columnGap || "0") : 1;
    setPosition({ left: rail.scrollLeft, max: rail.scrollWidth - rail.clientWidth, current: Math.round(rail.scrollLeft / step) + 1 });
  }

  useEffect(() => {
    const rail = feed.current;
    if (!rail) return;
    const observer = new ResizeObserver(measureFeed);
    observer.observe(rail);
    for (const card of rail.children) observer.observe(card);
    return () => observer.disconnect();
  }, [tab, visible, platform, format, savedOnly, state, posts.length, saved.length]);

  function scrollPosts(direction: number) {
    const rail = feed.current;
    const card = rail?.firstElementChild;
    if (!rail || !card) return;
    const step = card.getBoundingClientRect().width + parseFloat(getComputedStyle(rail).columnGap || "0");
    rail.scrollBy({ left: direction * step, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }

  async function loadPersonal() {
    setTab("personal");
    const id = ++request.current;
    const token = getAccessToken();
    setPosts([]);
    setError("");
    if (!token) { setState("signin"); return; }
    setState("loading");
    try {
      const results = await apiRequest<SavedPost[]>("/posts?limit=100", { headers: { Authorization: `Bearer ${token}` } });
      if (id !== request.current) return;
      if (token !== getAccessToken()) { setState("signin"); return; }
      setPosts(results);
      setState("ready");
    } catch (failure) {
      if (id !== request.current) return;
      if (failure instanceof ApiError && failure.status === 401) { setState("signin"); return; }
      setError(failure instanceof Error ? failure.message : "Your posts could not be loaded.");
      setState("error");
    }
  }

  function postFormat(post: SavedPost) {
    return post.media_urls.length === 0 ? "text" : post.post_type === "video" || post.post_type === "reel" || /\.(mp4|mov|webm)(?:\?|$)/i.test(post.media_urls[0]) ? "video" : "photo";
  }
  function mediaUrl(url: string) { return /^https?:\/\//i.test(url) ? url : `${API_URL}${url.startsWith("/") ? "" : "/"}${url}`; }
  function toggle(id: string, values: string[], update: (values: string[]) => void) { update(values.includes(id) ? values.filter((value) => value !== id) : [...values, id]); }
  const ideas = discoverPosts.filter((idea) => (platform === "all" || idea.platform === platform) && (format === "all" || idea.format === format) && (!savedOnly || saved.includes(idea.id)));
  const personal = posts.filter((post) => (platform === "all" || post.platforms.includes(platform)) && (format === "all" || postFormat(post) === format));

  return <section className="discover-section neon-section" id="discover" aria-labelledby="discover-title">
    <div className="neon-section-label"><i /> THE INSPIRATION EDIT</div>
    <div className="neon-section-intro"><h2 id="discover-title">Good posts. <em>Good scrolls.</em></h2><p>A mix of creative sparks, fun facts, photos, and videos. Explore for free or switch to your own Social9 posts.</p></div>
    <div className="discover-controls">
      <div className="discover-tabs" role="group" aria-label="Feed view"><button type="button" aria-pressed={tab === "discover"} onClick={() => { request.current += 1; setTab("discover"); setPosts([]); setState("idle"); setVisible(6); }}>Discover</button><button type="button" aria-pressed={tab === "personal"} onClick={() => { setVisible(6); void loadPersonal(); }}>Your posts</button></div>
      <div className="discover-filters">
        <label><span className="discover-sr-only">Filter by platform</span><select aria-label="Filter by platform" value={platform} onChange={(event) => { setPlatform(event.target.value as "all" | Provider); setVisible(6); }}><option value="all">All platforms</option><option value="instagram">Instagram</option><option value="linkedin">LinkedIn</option><option value="facebook">Facebook Pages</option></select></label>
        <label><span className="discover-sr-only">Filter by post format</span><select aria-label="Filter by post format" value={format} onChange={(event) => { setFormat(event.target.value as "all" | "photo" | "video" | "text"); setVisible(6); }}><option value="all">All formats</option><option value="photo">Photos</option><option value="video">Videos</option><option value="text">Text posts</option></select></label>
        {tab === "discover" ? <button type="button" aria-pressed={savedOnly} onClick={() => { setSavedOnly(!savedOnly); setVisible(6); }}>Saved ({saved.length})</button> : null}
        <div className="discover-scroll-controls"><button type="button" aria-label="Previous posts" disabled={position.left < 2} onClick={() => scrollPosts(-1)}>&larr;</button><button type="button" aria-label="Next posts" disabled={position.max < 2 || position.left >= position.max - 2} onClick={() => scrollPosts(1)}>&rarr;</button></div>
      </div>
    </div>
    <p className="discover-note">{tab === "discover" ? "Curated by Social9. Original posts with credited sample media. Likes and saves last for this visit." : "Private to your session. Shows posts saved in Social9, rather than your full social network feed."}</p>
    {tab === "discover" && ideas.length === 0 ? <div className="discover-empty"><h3>No posts in this view yet.</h3><p>Try another filter, or save a post to find it here.</p></div> : null}
    {tab === "discover" ? <div className="discover-grid" ref={feed} onScroll={measureFeed} tabIndex={0} role="region" aria-label="Scrollable post feed">{ideas.slice(0, visible).map((idea, index) => <article className="discover-card" key={idea.id} data-format={idea.format}>
      <header><span className="discover-avatar">S9</span><div><strong>Social9 picks</strong><small>{idea.category} · {idea.format}</small></div><SocialIcon provider={idea.platform} /></header>
      {idea.media ? <div className="discover-media">{idea.format === "video" ? <video src={idea.media} controls muted playsInline preload="metadata" aria-label={idea.alt}>Your browser does not support video playback.</video> : <Image src={idea.media} alt={idea.alt ?? idea.title} width={900} height={675} unoptimized loading="lazy" />}</div> : <div className={`discover-art discover-art-${index % 3}`}><span>{idea.category}</span><h3>{idea.title}</h3><small>{idea.platform === "instagram" ? "Instagram" : idea.platform === "facebook" ? "Facebook" : "LinkedIn"} inspiration</small><i aria-hidden="true" /></div>}
      <div className="discover-card-copy">{idea.media ? <h3>{idea.title}</h3> : null}<p className="discover-caption">{idea.caption}</p><details className="discover-full-caption"><summary>Read caption</summary><p>{idea.caption}</p></details>{idea.credit ? <a className="discover-credit" href={idea.credit.url} target="_blank" rel="noopener noreferrer">{idea.credit.label}</a> : null}<div className="discover-reactions"><button type="button" aria-pressed={liked.includes(idea.id)} aria-label={`Like ${idea.title}`} onClick={() => toggle(idea.id, liked, setLiked)}>{liked.includes(idea.id) ? "♥ Liked" : "♡ Like"}</button><button type="button" aria-pressed={saved.includes(idea.id)} aria-label={`Save ${idea.title}`} onClick={() => toggle(idea.id, saved, setSaved)}>{saved.includes(idea.id) ? "✓ Saved" : "+ Save"}</button></div><Link href={`/create-post?template=${encodeURIComponent(idea.template)}&platform=${idea.platform}`}>Create a post like this <span aria-hidden="true">↗</span></Link></div>
    </article>)}</div> : <>
      {state === "loading" ? <div className="discover-empty" role="status">Loading your Social9 posts…</div> : null}
      {state === "signin" ? <div className="discover-empty"><h3>Sign in to see your posts.</h3><p>Your saved content stays in your account. The Discover feed is free to browse anytime.</p><Link className="neon-cta" href="/login">Sign in</Link></div> : null}
      {state === "error" ? <div className="discover-empty" role="alert"><p>{error}</p><button type="button" onClick={() => void loadPersonal()}>Try again</button></div> : null}
      {state === "ready" && personal.length === 0 ? <div className="discover-empty"><h3>No posts {platform === "all" ? "saved yet" : "for this platform"}.</h3><p>Create a post or pick an idea from Discover to get started.</p><Link className="neon-cta" href="/create-post">Create a post</Link></div> : null}
      {state === "ready" && personal.length > 0 ? <div className="discover-grid" ref={feed} onScroll={measureFeed} tabIndex={0} role="region" aria-label="Scrollable post feed">{personal.slice(0, visible).map((post) => <article className="discover-card" key={post.id}><header><span className="discover-avatar">You</span><div><strong>Your Social9 post</strong><small>{post.status} · {post.platforms.join(" + ")}</small></div></header>{post.media_urls.length > 0 ? <div className="discover-media discover-personal-media">{post.media_urls.map((url, index) => /\.(mp4|mov|webm)(?:\?|$)/i.test(url) || ((post.post_type === "video" || post.post_type === "reel") && index === 0) ? <video key={url} src={mediaUrl(url)} controls muted playsInline preload="metadata" aria-label="Your saved video">Your browser does not support video playback.</video> : <Image key={url} src={mediaUrl(url)} alt={`Photo ${index + 1} attached to your saved post`} width={640} height={480} unoptimized loading="lazy" />)}</div> : <div className="discover-text-label">Text post</div>}<div className="discover-card-copy"><p className="discover-caption">{post.caption}</p><details className="discover-full-caption"><summary>Read caption</summary><p>{post.caption}</p></details><Link href="/content">Manage this post <span aria-hidden="true">↗</span></Link></div></article>)}</div> : null}
    </>}
    {(tab === "discover" ? ideas.length : personal.length) > 0 && (tab === "discover" || state === "ready") ? <div className="discover-rail-footer"><span><b>{String(position.current).padStart(2, "0")}</b> / {String(Math.min(visible, tab === "discover" ? ideas.length : personal.length)).padStart(2, "0")} <span className="discover-swipe-hint">Swipe or use the arrows to explore</span></span><div className="discover-progress" aria-hidden="true"><span style={{ width: `${position.max > 0 ? 15 + 85 * Math.min(1, position.left / position.max) : 100}%` }} /></div></div> : null}
    {(tab === "discover" ? ideas.length : state === "ready" ? personal.length : 0) > visible ? <div className="discover-more"><button type="button" onClick={() => setVisible((count) => count + 6)}>Load more posts</button></div> : null}
    {tab === "personal" && posts.length >= 100 ? <p className="discover-note">Showing up to 100 saved posts. <Link href="/content">Open your full content library</Link>.</p> : null}
  </section>;
}

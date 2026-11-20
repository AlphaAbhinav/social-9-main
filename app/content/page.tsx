"use client";

import { InstagramPostLink } from "../components/instagram-post-link";
import { SavedInstagramMusic } from "../features/create-post/saved-instagram-music";
import { Dropdown } from "../components/dropdown";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ConfirmationDialog } from "../components/confirmation-dialog";
import { DashboardPageFrame } from "../components/dashboard-page-frame";
import { SocialIcon } from "../components/social-icon";
import Link from "../components/link";
import { API_URL, ApiError, apiRequest } from "../lib/api";
import type { Provider, SavedPost } from "../lib/posts";
import { clearSession, getAccessToken } from "../lib/session";
import { track } from "../lib/track";

type StatusFilter = "all" | SavedPost["status"];

function localDateTime(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export default function ContentLibraryPage() {
  const [posts, setPosts] = useState<SavedPost[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [platformFilter, setPlatformFilter] = useState<"all" | Provider>("all");
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [editing, setEditing] = useState<SavedPost | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editPlatforms, setEditPlatforms] = useState<Provider[]>([]);
  const [editSchedule, setEditSchedule] = useState("");
  const [pendingDelete, setPendingDelete] = useState<SavedPost | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const queryInitialized = useRef(false);
  const searchRequest = useRef(0);

  const unauthorized = useCallback(() => {
    clearSession();
    window.location.replace("/login");
  }, []);

  const loadPosts = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return unauthorized();
    const requestId = ++searchRequest.current;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (platformFilter !== "all") params.set("platform", platformFilter);
      if (search.trim()) params.set("search", search.trim());
      const results = await apiRequest<SavedPost[]>(`/posts?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (requestId !== searchRequest.current) return;
      setPosts(results);
      setError("");
    } catch (requestError) {
      if (requestId !== searchRequest.current) return;
      if (requestError instanceof ApiError && requestError.status === 401) return unauthorized();
      setError(requestError instanceof Error ? requestError.message : "Unable to load the content library.");
    } finally {
      if (requestId === searchRequest.current) setLoading(false);
    }
  }, [platformFilter, search, statusFilter, unauthorized]);

  useEffect(() => {
    if (queryInitialized.current) return;
    queryInitialized.current = true;
    const params = new URLSearchParams(window.location.search);
    const requestedStatus = params.get("status");
    if (["draft", "scheduled", "publishing", "published", "failed"].includes(requestedStatus ?? "")) {
      const timer = window.setTimeout(() => setStatusFilter(requestedStatus as StatusFilter), 0);
      return () => window.clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadPosts(), 250);
    return () => { window.clearTimeout(timer); searchRequest.current += 1; };
  }, [loadPosts]);

  const counts = useMemo(() => posts.reduce<Record<string, number>>((result, post) => {
    result[post.status] = (result[post.status] ?? 0) + 1;
    return result;
  }, {}), [posts]);

  function beginEdit(post: SavedPost) {
    setEditing(post);
    setEditCaption(post.caption);
    setEditPlatforms(post.platforms);
    setEditSchedule(localDateTime(post.scheduled_for));
    setMessage("");
    setError("");
  }

  function toggleEditPlatform(provider: Provider) {
    setEditPlatforms((current) => current.includes(provider)
      ? current.filter((item) => item !== provider)
      : [...current, provider]);
  }

  async function saveEdit() {
    if (!editing) return;
    if (!editCaption.trim()) return setError("Add a caption before saving.");
    if (!editPlatforms.length) return setError("Select at least one platform.");
    const token = getAccessToken();
    if (!token) return unauthorized();
    setWorkingId(editing.id);
    setError("");
    try {
      await apiRequest<SavedPost>(`/posts/${editing.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          caption: editCaption.trim(),
          platforms: editPlatforms,
          scheduled_for: editSchedule ? new Date(editSchedule).toISOString() : null,
        }),
      });
      setEditing(null);
      setMessage("Post updated.");
      track("post_edited");
      await loadPosts();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update the post.");
    } finally {
      setWorkingId(null);
    }
  }

  async function duplicate(post: SavedPost) {
    const token = getAccessToken();
    if (!token) return unauthorized();
    setWorkingId(post.id);
    setError("");
    try {
      const duplicateDraft = await apiRequest<SavedPost>(`/posts/${post.id}/duplicate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      track("post_duplicated", { location: "/content" });
      setMessage(post.status === "published" && !duplicateDraft.media_urls.length ? "A caption-only draft was created. Create a new post to attach media again." : "A reusable draft was created.");
      await loadPosts();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to duplicate the post.");
    } finally {
      setWorkingId(null);
    }
  }

  async function publish(post: SavedPost) {
    const token = getAccessToken();
    if (!token) return unauthorized();
    setWorkingId(post.id);
    setError("");
    try {
      const result = await apiRequest<SavedPost>(`/posts/${post.id}/publish`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      track(result.status === "failed" ? "post_publish_failed" : "post_published", { platforms: post.platforms.join(","), location: "/content" });
      if (result.status === "failed") setError(result.publish_error ?? "The provider could not publish this post.");
      else setMessage((result.status === "publishing" || result.status === "scheduled") ? "Publishing is already in progress. Refresh shortly to check delivery." : Object.values(result.external_post_ids).some((id) => id.startsWith("preview:")) ? "Preview completed. No public post was sent to preview channels." : "Post published successfully.");
      await loadPosts();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to publish the post.");
    } finally {
      setWorkingId(null);
    }
  }

  async function deletePost() {
    if (!pendingDelete) return;
    const token = getAccessToken();
    if (!token) return unauthorized();
    setWorkingId(pendingDelete.id);
    setError("");
    try {
      await apiRequest(`/posts/${pendingDelete.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setPendingDelete(null);
      setMessage("Post deleted.");
      track("post_deleted");
      await loadPosts();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete the post.");
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <DashboardPageFrame active="content" className="content-library-content dashboard-studio">
        <header className="dashboard-header library-header">
          <div><span className="eyebrow">Content library</span><h1>Manage your saved posts.</h1><p>Find drafts, scheduled posts, and published content. Edit a post or duplicate it as a new draft. Original uploads are removed after every selected channel confirms live publishing. Keep your own copy to reuse media.</p></div>
          <div className="library-header-actions"><Link href="/templates">Browse templates</Link><a className="library-create-link" href="/create-post">+ Create post</a></div>
        </header>

        {message ? <p className="success-message" role="status">{message}</p> : null}
        {error ? <p className="error-message" role="alert">{error}</p> : null}

        <section className="library-toolbar" aria-label="Content filters">
          <label className="library-search">Search content<input type="search" maxLength={120} placeholder="Search captions..." value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          <label htmlFor="dropdown-post-status">Status<Dropdown id="dropdown-post-status" label="Post status" value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}><option value="all">All statuses</option><option value="draft">Draft</option><option value="scheduled">Scheduled</option><option value="published">Published</option><option value="failed">Failed</option></Dropdown></label>
          <label htmlFor="dropdown-channel">Channel<Dropdown id="dropdown-channel" label="Channel" value={platformFilter} onValueChange={(value) => setPlatformFilter(value as "all" | Provider)}><option value="all">All channels</option><option value="facebook">Facebook</option><option value="instagram">Instagram</option><option value="linkedin">LinkedIn</option></Dropdown></label>
        </section>

        <div className="library-summary" aria-label="Visible content summary">
          <span><strong>{posts.length}</strong> visible</span><span><strong>{counts.draft ?? 0}</strong> drafts</span><span><strong>{counts.scheduled ?? 0}</strong> scheduled</span><span><strong>{counts.failed ?? 0}</strong> need attention</span>
        </div>

        {loading ? <p className="library-empty">Loading your content...</p> : posts.length === 0 ? <div className="library-empty">{search.trim() || statusFilter !== "all" || platformFilter !== "all" ? <><strong>No matching posts.</strong><p>Try another search or clear your filters.</p><button type="button" onClick={() => { setSearch(""); setStatusFilter("all"); setPlatformFilter("all"); }}>Clear filters</button></> : <><strong>No posts yet.</strong><p>Your drafts and published posts will appear here.</p><Link href="/create-post">Create post</Link>{" \u00b7 "}<Link href="/templates">Browse templates</Link></>}</div> : (
          <section className="content-library-grid" aria-label="Saved content">
            {posts.map((post) => <article className={post.media_urls.length ? "library-post-card has-media" : "library-post-card"} key={post.id}>
              <div className="library-card-top"><span className={`post-status ${post.status}`}>{post.status}</span><div>{post.platforms.map((provider) => <SocialIcon className="library-provider" provider={provider} key={provider} />)}</div></div>
              {post.media_urls[0] && /\.(mp4|mov)(?:\?|$)/i.test(post.media_urls[0]) ? <div className="library-card-media"><video src={post.media_urls[0].startsWith("/") ? `${API_URL}${post.media_urls[0]}` : post.media_urls[0]} muted controls preload="metadata" aria-label="Saved video" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div> : post.media_urls[0] ? <div className="library-card-media" role="img" aria-label="Post media preview" style={{ backgroundImage: `linear-gradient(180deg,transparent 45%,rgba(7,6,10,.78)),url(${post.media_urls[0]})` }}><span>{post.media_urls.length} asset{post.media_urls.length === 1 ? "" : "s"}</span></div> : <div className="library-card-text-mark" aria-hidden="true"><span>Aa</span><small>Text post</small></div>}
              <p>{post.caption}</p>{post.caption.length > 180 ? <details className="library-caption-detail"><summary>Read full caption</summary><p>{post.caption}</p></details> : null}
              {Object.entries(post.external_post_ids).map(([provider, id]) => <small key={provider}>{provider === "twitter" ? "X" : provider === "youtube" ? "YouTube" : provider === "linkedin" ? "LinkedIn" : provider.charAt(0).toUpperCase() + provider.slice(1)}: {id.startsWith("preview:") ? "Preview completed (not public)" : "Delivered"}</small>)}
              {/^\d+$/.test(post.external_post_ids.instagram || "") && post.post_type !== "story" ? <InstagramPostLink postId={post.id} /> : null}
              {post.status === "failed" && Object.keys(post.external_post_ids).length > 0 ? <small>Retry sends only to the remaining channels. Duplicate to change the content.</small> : null}
              {post.publish_error ? <small className="library-post-error">{post.publish_error}</small> : null}
              <div className="library-card-meta"><span>{post.post_type ?? "post"} · {post.media_urls.length ? `${post.media_urls.length} media file${post.media_urls.length === 1 ? "" : "s"}` : "Text post"}</span><time dateTime={post.scheduled_for ?? post.created_at}>{post.scheduled_for ? `Scheduled ${new Date(post.scheduled_for).toLocaleString()}` : `Created ${new Date(post.created_at).toLocaleDateString()}`}</time></div>
              <SavedInstagramMusic post={post} />
              <div className="library-card-actions">
                {post.status !== "published" && post.status !== "publishing" && Object.keys(post.external_post_ids).length === 0 ? <button type="button" onClick={() => beginEdit(post)}>Edit</button> : null}
                <button type="button" disabled={workingId !== null} onClick={() => void duplicate(post)}>{workingId === post.id ? "Working..." : "Duplicate"}</button>
                {post.status !== "published" && post.status !== "publishing" && !post.network_options?.instagram_manual_music ? <button className="library-publish" type="button" disabled={workingId !== null} onClick={() => void publish(post)}>{post.status === "failed" ? "Retry delivery" : "Publish now"}</button> : null}
                <button className="library-delete" type="button" disabled={workingId !== null || post.status === "publishing"} onClick={() => setPendingDelete(post)}>Delete</button>
              </div>
            </article>)}
          </section>
        )}

        {editing ? <div className="edit-post-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditing(null); }}><section className="edit-post-dialog" role="dialog" aria-modal="true" aria-labelledby="edit-post-title"><div className="edit-post-heading"><div><span className="eyebrow">Edit content</span><h2 id="edit-post-title">Update this post.</h2></div><button type="button" aria-label="Close editor" onClick={() => setEditing(null)}>×</button></div><label>Caption<textarea maxLength={3000} value={editCaption} onChange={(event) => setEditCaption(event.target.value)} /><small>{editCaption.length}/3000</small></label><fieldset><legend>Channels</legend>{(["threads", "youtube", "twitter", "pinterest"] as const).filter(provider => editing.platforms.includes(provider)).map(provider => <label key={provider}><input type="checkbox" checked={editPlatforms.includes(provider)} onChange={() => toggleEditPlatform(provider)} />{provider === "twitter" ? "X" : provider}</label>)}<label><input type="checkbox" checked={editPlatforms.includes("instagram")} onChange={() => toggleEditPlatform("instagram")} /> Instagram</label><label><input type="checkbox" checked={editPlatforms.includes("linkedin")} onChange={() => toggleEditPlatform("linkedin")} /> LinkedIn</label><label><input type="checkbox" checked={editPlatforms.includes("facebook")} onChange={() => toggleEditPlatform("facebook")} /> Facebook</label></fieldset><label>Schedule (optional)<input type="datetime-local" value={editSchedule} onChange={(event) => setEditSchedule(event.target.value)} /></label><div className="edit-post-actions"><button type="button" onClick={() => setEditing(null)}>Cancel</button><button type="button" disabled={workingId !== null} onClick={() => void saveEdit()}>{workingId === editing.id ? "Saving..." : "Save changes"}</button></div></section></div> : null}

        {pendingDelete ? <ConfirmationDialog busy={workingId === pendingDelete.id} confirmLabel="Delete post" description="This removes the Social9 record. Posts already published on a provider will remain live there." eyebrow="Delete content" onCancel={() => setPendingDelete(null)} onConfirm={() => void deletePost()} title="Delete this post?" /> : null}
    </DashboardPageFrame>
  );
}

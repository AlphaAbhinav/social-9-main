"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DashboardPageFrame } from "../components/dashboard-page-frame";
import { apiRequest, getActiveBrandId } from "../lib/api";
import { getAccessToken } from "../lib/session";
import "./agency.css";

type Workspace = { id: number; name: string; role: string; accepted: boolean };
type History = { actor: string; action: string; comment: string; at: string };
type Draft = {
  id: number;
  revision: number;
  caption: string;
  platform: string;
  state: string;
  author_id: number;
  history: History[];
  post_id?: number;
};
type PublicPost = {
  id: string;
  title: string;
  published_at: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  reposts?: number | null;
};
type Snapshot = {
  recent_posts?: PublicPost[];
  sample_note?: string;
  followers: number | null;
  posts: number | null;
  views: number | null;
  source: string;
  observed_at: string;
  note: string;
};
type Competitor = {
  id: number;
  revision: number;
  name: string;
  provider: string;
  handle: string;
  snapshots: Snapshot[];
};
type Report = {
  id: number;
  title: string;
  brand: string;
  start: string;
  end: string;
  summary: string;
  note: string;
  published_posts: number;
  by_network: Record<string, number>;
  generated_at: string;
  posts: {
    id: number;
    caption: string;
    platforms: string;
    published_at: string;
  }[];
};
type Context = {
  name: string;
  role: string;
  plan: string;
  features: { teams: boolean; reports: boolean; competitor_limit: number };
  members: { id: number; name: string; role: string; accepted: boolean }[];
  drafts: Draft[];
  competitors: Competitor[];
  reports: Report[];
};
const networks = [
  "facebook",
  "instagram",
  "linkedin",
  "threads",
  "youtube",
  "twitter",
  "pinterest",
];
const count = (value: number | null | undefined) =>
  value == null ? "Unavailable" : value.toLocaleString();
const day = (date: Date) => date.toISOString().slice(0, 10);

function csvDownload(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((value) => {
          const text = String(value);
          const safe = /^[=+@\-\t\r\n]/.test(text) ? `'${text}` : text;
          return `"${safe.replaceAll('"', '""')}"`;
        })
        .join(","),
    )
    .join("\r\n");
  const url = URL.createObjectURL(
    new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function BenchmarkForm({
  competitor,
  submit,
}: {
  competitor: Competitor;
  submit: (path: string, body: object) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="secondary-button" onClick={() => setOpen(!open)}>
        Record benchmark
      </button>
      {open && (
        <form
          className="agency-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const data = new FormData(form);
            const metric = (key: string) =>
              data.get(key) ? Number(data.get(key)) : null;
            const success = await submit(
              `/competitors/${competitor.id}/benchmark`,
              {
                revision: competitor.revision,
                followers: metric("followers"),
                posts: metric("posts"),
                views: metric("views"),
                observed_at: new Date(
                  String(data.get("observed_at")),
                ).toISOString(),
                note: data.get("note"),
              },
            );
            if (success) setOpen(false);
          }}
        >
          <label>
            Observed at
            <input required type="datetime-local" name="observed_at" />
          </label>
          <div className="agency-three">
            {["followers", "posts", "views"].map((metric) => (
              <label key={metric}>
                {metric}
                <input name={metric} type="number" min="0" step="1" />
              </label>
            ))}
          </div>
          <label>
            Source / methodology
            <input
              required
              name="note"
              maxLength={1000}
              placeholder="Public profile, screenshot date or source URL"
            />
          </label>
          <button className="primary-button">Save manual observation</button>
        </form>
      )}
    </>
  );
}

export default function AgencyPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [brand, setBrand] = useState<number | null>(null);
  const [context, setContext] = useState<Context | null>(null);
  const [tab, setTab] = useState("competitors");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const loadSequence = useRef(0);
  const [reportDates] = useState(() => ({
    start: day(new Date(Date.now() - 30 * 86400000)),
    end: day(new Date()),
  }));
  const [editing, setEditing] = useState<Draft | null>(null);
  const [caption, setCaption] = useState("");
  const [platform, setPlatform] = useState("linkedin");
  const [network, setNetwork] = useState("youtube");
  const [preview, setPreview] = useState<Report | null>(null);
  const request = useCallback(
    <T,>(path: string, method = "GET", body?: object) =>
      apiRequest<T>(`/agency${path}`, {
        method,
        headers: { Authorization: `Bearer ${getAccessToken()}` },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
    [],
  );
  const load = useCallback(
    async (id: number) => {
      const sequence = ++loadSequence.current;
      setLoading(true);
      setContext(null);
      setPreview(null);
      setEditing(null);
      setError("");
      setMessage("");
      try {
        const data = await request<Context>(`/${id}`);
        if (sequence === loadSequence.current) setContext(data);
      } catch (e) {
        if (sequence === loadSequence.current)
          setError(e instanceof Error ? e.message : "Workspace unavailable");
      } finally {
        if (sequence === loadSequence.current) setLoading(false);
      }
    },
    [request],
  );
  useEffect(() => {
    if (!getAccessToken()) {
      window.location.assign("/login");
      return;
    }
    let active = true;
    void request<Workspace[]>("/workspaces")
      .then(async (items) => {
        if (!active) return;
        setWorkspaces(items);
        const saved = getActiveBrandId();
        const selected =
          items.find((w) => w.id === saved && w.accepted) ??
          items.find((w) => w.accepted);
        if (selected) {
          setBrand(selected.id);
          await load(selected.id);
        } else setLoading(false);
      })
      .catch((e) => {
        if (active) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [request, load]);
  async function mutate(path: string, body?: object, method = "POST") {
    if (!brand || busy) return false;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await request(`/${brand}${path}`, method, body);
      setContext(await request<Context>(`/${brand}`));
      setMessage("Saved successfully.");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save");
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function accept(id: number) {
    setBusy(true);
    setError("");
    try {
      await request(`/${id}/accept`, "POST");
      setWorkspaces(await request<Workspace[]>("/workspaces"));
      setBrand(id);
      await load(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to accept");
    } finally {
      setBusy(false);
    }
  }
  const owner = context?.role === "owner";
  const canWrite = owner || context?.role === "editor";
  const compared =
    context?.competitors.filter((c) => c.provider === network) ?? [];
  const maximum = Math.max(
    1,
    ...compared.map((c) => c.snapshots.at(-1)?.followers ?? 0),
  );
  return (
    <DashboardPageFrame active="agency" className="agency-page">
      <header className="dashboard-header">
        <div>
          <span className="eyebrow">Social9 · Work together</span>
          <h1>Agency workspace</h1>
          <p>
            Review content, deliver client reports and understand your
            competition.
          </p>
        </div>
        {context && (
          <span className="agency-role">
            {context.role} · {context.plan}
          </span>
        )}
      </header>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="success-message" role="status">
          {message}
        </p>
      )}
      <div className="agency-workspaces">
        <label>
          Workspace
          <select
            aria-label="Workspace"
            disabled={busy}
            value={brand ?? ""}
            onChange={(e) => {
              const id = Number(e.target.value);
              setBrand(id);
              void load(id);
            }}
          >
            {workspaces
              .filter((w) => w.accepted)
              .map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} · {w.role}
                </option>
              ))}
          </select>
        </label>
        {workspaces
          .filter((w) => !w.accepted)
          .map((w) => (
            <button
              disabled={busy}
              key={w.id}
              className="secondary-button"
              onClick={() => void accept(w.id)}
            >
              Accept {w.name} invitation · {w.role}
            </button>
          ))}
      </div>
      <nav className="agency-tabs" aria-label="Agency features">
        {[
          ["competitors", "Competitor analysis"],
          ["approvals", "Content approvals"],
          ["reports", "Client reports"],
          ["team", "Team & roles"],
        ].map(([id, label]) => (
          <button
            key={id}
            aria-current={tab === id ? "page" : undefined}
            className={tab === id ? "selected" : ""}
            onClick={() => {
              setTab(id);
              setPreview(null);
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      {loading ? (
        <p role="status">Loading workspace…</p>
      ) : !context ? (
        <p>
          Create a brand in your dashboard or accept a team invitation to get
          started.
        </p>
      ) : (
        <fieldset className="agency-body" disabled={busy}>
          {tab === "competitors" && (
            <>
              <section className="agency-card agency-intro">
                <div>
                  <span className="eyebrow">Benchmark your market</span>
                  <h2>Compare public profiles</h2>
                  <p>
                    Track your brand and competitors side by side. YouTube and X
                    support API snapshots; other networks use manual
                    observations. Unknown metrics stay unavailable.
                  </p>
                </div>
                <strong>
                  {context.competitors.length} /{" "}
                  {context.features.competitor_limit}
                  <small>tracked profiles</small>
                </strong>
              </section>
              {owner && (
                <form
                  className="agency-card agency-form agency-inline"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const data = new FormData(form);
                    if (
                      await mutate("/competitors", {
                        name: data.get("name"),
                        provider: data.get("provider"),
                        handle: data.get("handle"),
                      })
                    )
                      form.reset();
                  }}
                >
                  <label>
                    Profile name
                    <input
                      required
                      name="name"
                      maxLength={120}
                      placeholder="Your brand or competitor"
                    />
                  </label>
                  <label>
                    Network
                    <select aria-label="Network" name="provider">
                      {networks.map((n) => (
                        <option key={n}>{n}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Public handle
                    <input
                      required
                      name="handle"
                      maxLength={100}
                      pattern="@?[A-Za-z0-9_.-]+"
                      placeholder="@brand"
                    />
                  </label>
                  <button className="primary-button">Track profile</button>
                </form>
              )}
              <section className="agency-card">
                <div className="agency-heading">
                  <h2>Audience comparison</h2>
                  <label>
                    Compare within
                    <select
                      aria-label="Compare within"
                      value={network}
                      onChange={(e) => setNetwork(e.target.value)}
                    >
                      {networks.map((n) => (
                        <option key={n}>{n}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <p>
                  Latest observed followers within one network. Observation
                  dates and sources may differ; this is not a reach comparison.
                </p>
                {!compared.length && (
                  <p className="agency-empty">
                    Add profiles on this network to start comparing.
                  </p>
                )}
                {compared.map((c) => {
                  const latest = c.snapshots.at(-1);
                  const previous = latest
                    ? c.snapshots
                        .slice(0, -1)
                        .reverse()
                        .find(
                          (s) =>
                            s.source === latest.source &&
                            s.followers != null &&
                            latest.followers != null &&
                            s.observed_at !== latest.observed_at,
                        )
                    : undefined;
                  const delta =
                    previous &&
                    latest?.followers != null &&
                    previous.followers != null
                      ? latest.followers - previous.followers
                      : null;
                  return (
                    <div className="agency-comparison" key={c.id}>
                      <div>
                        <strong>{c.name}</strong>
                        <span>@{c.handle}</span>
                      </div>
                      <div>
                        <div className="agency-bar">
                          <i
                            style={{
                              width: `${((latest?.followers ?? 0) / maximum) * 100}%`,
                            }}
                          />
                        </div>
                        <small>
                          {latest
                            ? `${new Date(latest.observed_at).toLocaleString()} · ${latest.source.replaceAll("_", " ")}`
                            : "No observation yet"}
                        </small>
                      </div>
                      <strong>
                        {count(latest?.followers)}
                        {delta != null && (
                          <small>
                            {delta >= 0 ? "+" : ""}
                            {count(delta)} since{" "}
                            {new Date(
                              previous!.observed_at,
                            ).toLocaleDateString()}
                          </small>
                        )}
                      </strong>
                    </div>
                  );
                })}
              </section>
              <div className="agency-grid">
                {context.competitors.map((c) => {
                  const latest = c.snapshots.at(-1);
                  return (
                    <article className="agency-card" key={c.id}>
                      <span className="eyebrow">
                        {c.provider} · @{c.handle}
                      </span>
                      <h2>{c.name}</h2>
                      <div className="agency-metrics">
                        <div>
                          <strong>{count(latest?.followers)}</strong>
                          <span>Followers</span>
                        </div>
                        <div>
                          <strong>{count(latest?.posts)}</strong>
                          <span>Lifetime posts</span>
                        </div>
                        <div>
                          <strong>{count(latest?.views)}</strong>
                          <span>Lifetime views</span>
                        </div>
                      </div>
                      {latest && <p>{latest.note}</p>}
                      <div className="agency-actions">
                        {owner && (
                          <>
                            {["youtube", "twitter"].includes(c.provider) && (
                              <button
                                className="primary-button"
                                onClick={() =>
                                  void mutate(`/competitors/${c.id}/refresh`)
                                }
                              >
                                Refresh public API
                                {c.provider === "twitter"
                                  ? " · uses API credits"
                                  : ""}
                              </button>
                            )}
                            <BenchmarkForm competitor={c} submit={mutate} />
                            <button
                              className="secondary-button"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Remove ${c.name} and its benchmark history?`,
                                  )
                                )
                                  void mutate(
                                    `/competitors/${c.id}`,
                                    undefined,
                                    "DELETE",
                                  );
                              }}
                            >
                              Remove
                            </button>
                          </>
                        )}
                        <button
                          className="secondary-button"
                          disabled={!c.snapshots.length}
                          onClick={() =>
                            csvDownload(`${c.provider}-benchmarks.csv`, [
                              [
                                "Observed at",
                                "Source",
                                "Followers",
                                "Posts",
                                "Views",
                                "Methodology",
                              ],
                              ...c.snapshots.map((s) => [
                                s.observed_at,
                                s.source,
                                s.followers ?? "",
                                s.posts ?? "",
                                s.views ?? "",
                                s.note,
                              ]),
                            ])
                          }
                        >
                          Export CSV
                        </button>
                      </div>
                      <details>
                        <summary>{c.snapshots.length} observations</summary>
                        {c.snapshots
                          .slice()
                          .reverse()
                          .map((s, i) => (
                            <p key={i}>
                              {new Date(s.observed_at).toLocaleString()} ·{" "}
                              {s.source} · {count(s.followers)} followers ·{" "}
                              {s.note}
                            </p>
                          ))}
                      </details>
                      {latest?.recent_posts && (
                        <details>
                          <summary>
                            Recent public content ? {latest.recent_posts.length}{" "}
                            posts
                          </summary>
                          <p>{latest.sample_note}</p>
                          {latest.recent_posts
                            .slice()
                            .sort((a, b) => (b.likes ?? -1) - (a.likes ?? -1))
                            .map((post) => (
                              <div className="agency-public-post" key={post.id}>
                                <a
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  href={
                                    c.provider === "youtube"
                                      ? `https://www.youtube.com/watch?v=${encodeURIComponent(post.id)}`
                                      : `https://x.com/i/status/${encodeURIComponent(post.id)}`
                                  }
                                >
                                  {post.title}
                                </a>
                                <p>
                                  {new Date(
                                    post.published_at,
                                  ).toLocaleDateString()}{" "}
                                  ? {count(post.views)} views ?{" "}
                                  {count(post.likes)} likes ?{" "}
                                  {count(post.comments)} comments
                                </p>
                                {post.views != null &&
                                  post.views > 0 &&
                                  post.likes != null &&
                                  post.comments != null && (
                                    <small>
                                      {(
                                        ((post.likes + post.comments) /
                                          post.views) *
                                        100
                                      ).toFixed(2)}
                                      % likes + comments / views
                                    </small>
                                  )}
                              </div>
                            ))}
                        </details>
                      )}
                    </article>
                  );
                })}
              </div>
            </>
          )}
          {tab === "team" && (
            <section className="agency-card">
              <h2>People & permissions</h2>
              <p>
                Owner manages connections and publishing. Editors create and
                submit team drafts. Reviewers approve or request changes.
                Viewers read the workspace. Team members do not receive access
                to account tokens, billing or the owner&apos;s personal
                workspace.
              </p>
              {!context.features.teams && (
                <p>
                  Team invitations and review workflows require Agency.{" "}
                  <a href="/billing">Compare plans</a>
                </p>
              )}
              {owner && context.features.teams && (
                <form
                  className="agency-form agency-inline"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const data = new FormData(form);
                    if (
                      await mutate("/members", {
                        email: data.get("email"),
                        role: data.get("role"),
                      })
                    )
                      form.reset();
                  }}
                >
                  <label>
                    Registered user&apos;s email
                    <input required name="email" type="email" />
                  </label>
                  <label>
                    Role
                    <select aria-label="Role" name="role">
                      <option>editor</option>
                      <option>reviewer</option>
                      <option>viewer</option>
                    </select>
                  </label>
                  <button className="primary-button">
                    Invite to workspace
                  </button>
                </form>
              )}
              <p>
                Invitations appear in the recipient&apos;s Agency workspace and
                require acceptance.
              </p>
              <ul className="agency-member-list">
                <li>
                  <strong>Brand owner</strong>
                  <span>owner · active</span>
                </li>
                {context.members.map((m) => (
                  <li key={m.id}>
                    <strong>{m.name}</strong>
                    <span>
                      {m.role} · {m.accepted ? "active" : "invited"}
                    </span>
                    {owner && (
                      <button
                        className="secondary-button"
                        onClick={() =>
                          void mutate(`/members/${m.id}`, undefined, "DELETE")
                        }
                      >
                        Remove access
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {tab === "approvals" && (
            <>
              <section className="agency-card">
                <h2>A clear path from draft to delivery</h2>
                <p>
                  Draft → submit → independent review → owner&apos;s publishing
                  library. Edits reset review. Team drafts support text posts
                  for LinkedIn, Facebook, Threads and X. The owner can prepare
                  media posts in the regular composer.
                </p>
                <p>
                  Approval records cover the reviewed team draft. Further
                  changes in the owner&apos;s library are managed by the owner.
                </p>
                {!context.features.teams && (
                  <p>
                    Content approvals require Agency.{" "}
                    <a href="/billing">Compare plans</a>
                  </p>
                )}
                {canWrite && context.features.teams && (
                  <form
                    className="agency-form"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const success = await mutate(
                        editing ? `/drafts/${editing.id}` : "/drafts",
                        {
                          caption,
                          platform,
                          ...(editing ? { revision: editing.revision } : {}),
                        },
                        editing ? "PATCH" : "POST",
                      );
                      if (success) {
                        setCaption("");
                        setEditing(null);
                      }
                    }}
                  >
                    <label>
                      {editing
                        ? "Edit draft · approval will reset"
                        : "New team draft"}
                      <textarea
                        required
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        maxLength={
                          platform === "twitter"
                            ? 280
                            : platform === "threads"
                              ? 500
                              : 3000
                        }
                        rows={5}
                      />
                    </label>
                    <label>
                      Network
                      <select
                        aria-label="Network"
                        value={platform}
                        onChange={(e) => setPlatform(e.target.value)}
                      >
                        {["linkedin", "facebook", "threads", "twitter"].map(
                          (n) => (
                            <option key={n}>{n}</option>
                          ),
                        )}
                      </select>
                    </label>
                    <div className="agency-actions">
                      <button className="primary-button">
                        {editing ? "Save new version" : "Save draft"}
                      </button>
                      {editing && (
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => {
                            setEditing(null);
                            setCaption("");
                          }}
                        >
                          Cancel edit
                        </button>
                      )}
                    </div>
                  </form>
                )}
              </section>
              {!context.drafts.length && (
                <p className="agency-empty">
                  Your review queue is empty. Invite an editor and reviewer to
                  create your first workflow.
                </p>
              )}
              {context.drafts.map((d) => (
                <article className="agency-card" key={d.id}>
                  <div className="agency-heading">
                    <span className="eyebrow">
                      {d.platform} · Version {d.revision}
                    </span>
                    <span className={`agency-state state-${d.state}`}>
                      {d.state.replaceAll("_", " ")}
                    </span>
                  </div>
                  <p className="agency-caption">{d.caption}</p>
                  <div className="agency-actions">
                    {canWrite && d.state !== "transferred" && (
                      <button
                        className="secondary-button"
                        onClick={() => {
                          setEditing(d);
                          setCaption(d.caption);
                          setPlatform(d.platform);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        Edit
                      </button>
                    )}
                    {canWrite &&
                      ["draft", "changes_requested"].includes(d.state) && (
                        <button
                          className="primary-button"
                          onClick={() =>
                            void mutate(`/drafts/${d.id}/review`, {
                              revision: d.revision,
                              action: "submit",
                            })
                          }
                        >
                          Submit for review
                        </button>
                      )}
                    {(owner || context.role === "reviewer") &&
                      d.state === "pending" && (
                        <>
                          <button
                            className="primary-button"
                            onClick={() =>
                              void mutate(`/drafts/${d.id}/review`, {
                                revision: d.revision,
                                action: "approve",
                              })
                            }
                          >
                            Approve
                          </button>
                          <button
                            className="secondary-button"
                            onClick={() => {
                              const comment =
                                window.prompt("Changes requested");
                              if (comment !== null)
                                void mutate(`/drafts/${d.id}/review`, {
                                  revision: d.revision,
                                  action: "reject",
                                  comment,
                                });
                            }}
                          >
                            Request changes
                          </button>
                        </>
                      )}
                    {owner && d.state === "approved" && (
                      <button
                        className="primary-button"
                        onClick={() =>
                          void mutate(`/drafts/${d.id}/review`, {
                            revision: d.revision,
                            action: "transfer",
                          })
                        }
                      >
                        Move approved copy to library
                      </button>
                    )}
                    {context.role !== "viewer" && d.state !== "transferred" && (
                      <button
                        className="secondary-button"
                        onClick={() => {
                          const comment = window.prompt("Add a review comment");
                          if (comment)
                            void mutate(`/drafts/${d.id}/review`, {
                              revision: d.revision,
                              action: "comment",
                              comment,
                            });
                        }}
                      >
                        Comment
                      </button>
                    )}
                    {d.post_id && (
                      <a className="secondary-button" href="/content">
                        Open publishing library · Post #{d.post_id}
                      </a>
                    )}
                  </div>
                  <details>
                    <summary>
                      Review history · {d.history.length} events
                    </summary>
                    {d.history.map((h, i) => (
                      <p key={i}>
                        <strong>{h.actor}</strong> · {h.action} ·{" "}
                        {new Date(h.at).toLocaleString()}
                        {h.comment && (
                          <>
                            <br />
                            {h.comment}
                          </>
                        )}
                      </p>
                    ))}
                  </details>
                </article>
              ))}
            </>
          )}
          {tab === "reports" && (
            <>
              <section className="agency-card">
                <h2>Client publishing reports</h2>
                <p>
                  Save a branded snapshot of Social9 publishing activity with
                  your client summary. Export CSV or use Print / Save as PDF.
                  These reports show delivered content; they do not include
                  reach or engagement metrics.
                </p>
                {!context.features.reports && (
                  <p>
                    Report creation requires Advanced or Agency.{" "}
                    <a href="/billing">Compare plans</a>
                  </p>
                )}
                {owner && context.features.reports && (
                  <form
                    className="agency-form agency-inline"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const data = new FormData(e.currentTarget);
                      await mutate("/reports", {
                        title: data.get("title"),
                        start: data.get("start"),
                        end: data.get("end"),
                        summary: data.get("summary"),
                      });
                    }}
                  >
                    <label>
                      Report title
                      <input
                        required
                        name="title"
                        defaultValue="Monthly publishing report"
                        maxLength={120}
                      />
                    </label>
                    <label>
                      From
                      <input
                        required
                        name="start"
                        type="date"
                        defaultValue={reportDates.start}
                      />
                    </label>
                    <label>
                      Through
                      <input
                        required
                        name="end"
                        type="date"
                        max={reportDates.end}
                        defaultValue={reportDates.end}
                      />
                    </label>
                    <label className="agency-wide">
                      Client summary
                      <textarea name="summary" rows={3} maxLength={4000} />
                    </label>
                    <button className="primary-button">
                      Create saved report
                    </button>
                  </form>
                )}
              </section>
              <div className="agency-grid">
                {context.reports.map((r) => (
                  <article className="agency-card" key={r.id}>
                    <span className="eyebrow">
                      {r.start} — {r.end}
                    </span>
                    <h2>{r.title}</h2>
                    <p>
                      {r.published_posts} unique published posts ·{" "}
                      {new Date(r.generated_at).toLocaleString()}
                    </p>
                    <div className="agency-actions">
                      <button
                        className="primary-button"
                        onClick={() => setPreview(r)}
                      >
                        View report
                      </button>
                      <button
                        className="secondary-button"
                        onClick={() =>
                          csvDownload(`social9-report-${r.id}.csv`, [
                            ["Post ID", "Caption", "Networks", "Published at"],
                            ...r.posts.map((p) => [
                              p.id,
                              p.caption,
                              p.platforms,
                              p.published_at,
                            ]),
                          ])
                        }
                      >
                        Download CSV
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              {!context.reports.length && (
                <p className="agency-empty">Saved reports will appear here.</p>
              )}
              {preview && (
                <section className="agency-card report-preview">
                  <div className="agency-heading">
                    <span className="eyebrow">
                      {preview.brand} · Powered by Social9
                    </span>
                    <button
                      className="secondary-button report-print-button"
                      onClick={() => window.print()}
                    >
                      Print / Save as PDF
                    </button>
                  </div>
                  <h1>{preview.title}</h1>
                  <p>
                    {preview.start} — {preview.end}
                  </p>
                  <p className="agency-caption">{preview.summary}</p>
                  <div className="agency-metrics">
                    <div>
                      <strong>{preview.published_posts}</strong>
                      <span>Unique published posts</span>
                    </div>
                    {Object.entries(preview.by_network).map(([n, value]) => (
                      <div key={n}>
                        <strong>{value}</strong>
                        <span>{n} placements</span>
                      </div>
                    ))}
                  </div>
                  <p>{preview.note}</p>
                  <table>
                    <thead>
                      <tr>
                        <th>Published</th>
                        <th>Networks</th>
                        <th>Content</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.posts.map((p) => (
                        <tr key={p.id}>
                          <td>
                            {new Date(p.published_at).toLocaleDateString()}
                          </td>
                          <td>{p.platforms}</td>
                          <td>{p.caption}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <small>
                    Generated {new Date(preview.generated_at).toLocaleString()}
                  </small>
                </section>
              )}
            </>
          )}
        </fieldset>
      )}
    </DashboardPageFrame>
  );
}

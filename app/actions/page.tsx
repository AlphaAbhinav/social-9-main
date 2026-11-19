"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "../components/link";
import { DashboardPageFrame } from "../components/dashboard-page-frame";
import { ApiError, apiRequest } from "../lib/api";
import { clearSession, getAccessToken } from "../lib/session";

type WorkspaceAction = {
  id: string;
  priority: "urgent" | "warning" | "recommended" | "info" | "success";
  category: string;
  title: string;
  description: string;
  action_label: string;
  href: string;
  count: number;
};

type ActionCenterResponse = {
  generated_at: string;
  summary: { urgent: number; recommended: number; scheduled_this_week: number };
  actions: WorkspaceAction[];
};

export default function ActionCenterPage() {
  const [data, setData] = useState<ActionCenterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const unauthorized = useCallback(() => {
    clearSession();
    window.location.replace("/login");
  }, []);

  const loadActions = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return unauthorized();
    setLoading(true);
    try {
      setData(await apiRequest<ActionCenterResponse>("/workspace/actions", {
        headers: { Authorization: `Bearer ${token}` },
      }));
      setError("");
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) return unauthorized();
      setError(requestError instanceof Error ? requestError.message : "Unable to load workspace actions.");
    } finally {
      setLoading(false);
    }
  }, [unauthorized]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadActions(), 0);
    return () => window.clearTimeout(timer);
  }, [loadActions]);

  return (
    <DashboardPageFrame active="actions" className="action-center-content dashboard-studio">
        <header className="dashboard-header action-center-header">
          <div><span className="eyebrow">Action center</span><h1>Resolve publishing issues.</h1><p>Review failed posts, account connection issues, and upcoming publishing tasks.</p></div>
          <button className="refresh-actions-button" type="button" disabled={loading} onClick={() => void loadActions()}>{loading ? "Refreshing..." : "Refresh actions"}</button>
        </header>

        {error ? <p className="error-message" role="alert">{error}</p> : null}
        {data ? <>
          <section className="action-summary" aria-label="Action summary"><article><span>Urgent</span><strong>{data.summary.urgent}</strong><small>Publishing blockers</small></article><article><span>Recommended</span><strong>{data.summary.recommended}</strong><small>Workspace improvements</small></article><article><span>Next 7 days</span><strong>{data.summary.scheduled_this_week}</strong><small>Scheduled posts</small></article></section>
          <section className="action-list" aria-label="Workspace actions">
            {data.actions.map((action) => <article className={`action-card ${action.priority}`} key={action.id}><div className="action-priority-mark" aria-hidden="true" /><div className="action-card-copy"><div><span>{action.category}</span><small>{action.priority}</small></div><h2>{action.title}</h2><p>{action.description}</p></div><Link href={action.href}>{action.action_label} →</Link></article>)}
          </section>
          <p className="action-generated">Updated {new Date(data.generated_at).toLocaleString()}. Refresh after resolving an item to recalculate the queue.</p>
        </> : loading ? <p className="library-empty">Checking your workspace...</p> : null}
    </DashboardPageFrame>
  );
}

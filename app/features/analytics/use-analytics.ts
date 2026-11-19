"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AnalyticsSummary } from "../../lib/analytics";
import { ApiError, apiRequest } from "../../lib/api";
import { clearSession, getAccessToken } from "../../lib/session";

export type InsightMetric = "reach" | "impressions" | "interactions" | "followers_gained";
type SubscriptionSummary = { is_paid: boolean; features: { growth_projection: boolean } };
type GrowthProjection = {
  horizon_days: number;
  planned_posts: number;
  baseline_reach: number;
  baseline_engagement_rate: number;
  baseline_interactions: number;
  scenarios: Array<{
    name: string;
    assumed_reach_lift_percent: number;
    assumed_engagement_lift_percent: number;
    projected_reach: number;
    projected_engagement_rate: number;
    projected_interactions: number;
  }>;
  methodology: string;
  disclaimer: string;
  guaranteed: false;
};
type EngagementForecast = {
  model: string;
  source: string;
  forecast_days: number;
  history_days: number;
  average_predicted_engagement: number;
  peak_date: string;
  peak_predicted_engagement: number;
  predictions: Array<{ date: string; predicted_engagement: number }>;
  personalized: true;
  guaranteed: false;
  disclaimer: string;
};

function csvCell(value: string | number): string {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export function useAnalytics() {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [metric, setMetric] = useState<InsightMetric>("reach");
  const [contentType, setContentType] = useState("all");
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null);
  const [currentReach, setCurrentReach] = useState(10000);
  const [engagementRate, setEngagementRate] = useState(4);
  const [postsPerWeek, setPostsPerWeek] = useState(4);
  const [projectionHorizon, setProjectionHorizon] = useState<30 | 90>(30);
  const [projection, setProjection] = useState<GrowthProjection | null>(null);
  const [projectionLoading, setProjectionLoading] = useState(false);
  const [forecastDays, setForecastDays] = useState<7 | 14 | 30>(7);
  const [forecast, setForecast] = useState<EngagementForecast | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const unauthorized = useCallback(() => {
    clearSession();
    window.location.replace("/login");
  }, []);

  const loadAnalytics = useCallback(async (range: 7 | 30 | 90, signal?: AbortSignal) => {
    const token = getAccessToken();
    if (!token) return unauthorized();
    try {
      const data = await apiRequest<AnalyticsSummary>(`/analytics/summary?days=${range}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });
      setAnalytics(data);
      setError("");
    } catch (requestError: unknown) {
      if (signal?.aborted) return;
      if (requestError instanceof ApiError && requestError.status === 401) return unauthorized();
      setError(requestError instanceof Error ? requestError.message : "Unable to load analytics.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [unauthorized]);

  useEffect(() => {
    const controller = new AbortController();
    const token = getAccessToken();
    if (!token) {
      unauthorized();
      return () => controller.abort();
    }
    Promise.all([
      apiRequest<AnalyticsSummary>(`/analytics/summary?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      }),
      apiRequest<SubscriptionSummary>("/billing/subscription", {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      }),
    ])
      .then(([data, currentSubscription]) => {
        setAnalytics(data);
        setSubscription(currentSubscription);
        setError("");
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return;
        if (requestError instanceof ApiError && requestError.status === 401) return unauthorized();
        setError(requestError instanceof Error ? requestError.message : "Unable to load analytics.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [days, unauthorized]);

  const instagram = analytics?.provider_metrics?.instagram ?? null;
  const metricPeak = Math.max(
    1,
    ...(instagram?.daily.map((point) => Math.max(0, point[metric])) ?? [1]),
  );
  const activityPeak = Math.max(1, ...(analytics?.trend.map((point) => point.created) ?? [1]));
  const contentTypes = useMemo(
    () => Array.from(new Set(instagram?.content.map((item) => item.media_type) ?? [])).sort(),
    [instagram],
  );
  const visibleContent = useMemo(
    () => (instagram?.content ?? [])
      .filter((item) => contentType === "all" || item.media_type === contentType)
      .sort((left, right) => right.interactions - left.interactions)
      .slice(0, 20),
    [contentType, instagram],
  );

  function changeRange(value: string) {
    if (Number(value) === days) return;
    setLoading(true);
    setDays(Number(value) as 7 | 30 | 90);
  }

  function refreshAnalytics() {
    setLoading(true);
    void loadAnalytics(days);
  }

  function exportInstagramCsv() {
    if (!instagram) return;
    const rows = [
      ["Published", "Account", "Type", "Caption", "Likes", "Comments", "Interactions", "Instagram URL"],
      ...instagram.content.map((item) => [
        item.published_at,
        item.username ? `@${item.username}` : item.account_name,
        item.media_type,
        item.caption,
        item.likes,
        item.comments,
        item.interactions,
        item.permalink,
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `social9-instagram-${days}-days.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function calculateGrowthProjection() {
    const token = getAccessToken();
    if (!token) return unauthorized();
    setProjectionLoading(true);
    setError("");
    try {
      const result = await apiRequest<GrowthProjection>("/analytics/growth-projection", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          current_monthly_reach: currentReach,
          current_engagement_rate: engagementRate,
          target_posts_per_week: postsPerWeek,
          horizon_days: projectionHorizon,
        }),
      });
      setProjection(result);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) return unauthorized();
      setError(requestError instanceof Error ? requestError.message : "Unable to calculate growth scenarios.");
    } finally {
      setProjectionLoading(false);
    }
  }

  async function calculateEngagementForecast() {
    const token = getAccessToken();
    if (!token) return unauthorized();
    setForecastLoading(true);
    setError("");
    try {
      const result = await apiRequest<EngagementForecast>("/analytics/engagement-forecast", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ forecast_days: forecastDays }),
      });
      setForecast(result);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) return unauthorized();
      setError(requestError instanceof Error ? requestError.message : "Unable to create the AI forecast.");
    } finally {
      setForecastLoading(false);
    }
  }

  return {
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
    metricPeak,
    activityPeak,
    contentTypes,
    visibleContent,
    changeRange,
    refreshAnalytics,
    exportInstagramCsv,
    calculateGrowthProjection,
    calculateEngagementForecast
  };
}

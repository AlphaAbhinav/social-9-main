import type { Provider } from "./posts";

export type AnalyticsSummary = {
  simulated: false;
  provider_metrics_available: boolean;
  provider_metrics_reason: string;
  provider_metrics_reasons?: { instagram: string; facebook: string };
  provider_metrics: {
    facebook?: FacebookMetrics | null;
    instagram: null | {
      source: "instagram";
      accounts: number;
      range_days: number;
      followers: number;
      followers_gained: number;
      account_media_count: number;
      posts_analyzed: number;
      reach: number;
      impressions: number;
      impressions_source: "views";
      profile_views: number;
      likes: number;
      comments: number;
      shares: number;
      saves: number;
      interactions: number;
      engagement_rate: number;
      fetched_at: string;
      unavailable_metrics: string[];
      available_metrics?: string[];
      daily_metrics?: string[];
      metric_issues?: Record<string, string>;
      daily: Array<{
        date: string;
        reach: number;
        impressions: number;
        profile_views: number;
        followers_gained: number;
        interactions: number;
        shares: number;
        saves: number;
      }>;
      top_media: InstagramMedia[];
      content: InstagramMedia[];
    };
  };
  range_days: number;
  overview: {
    total_posts: number;
    posts_in_range: number;
    drafts: number;
    scheduled: number;
    publishing: number;
    published: number;
    provider_published: number;
    preview_published: number;
    failed: number;
    connected_accounts: number;
    publish_success_rate: number | null;
  };
  trend: Array<{ date: string; created: number; published: number; scheduled: number; failed: number }>;
  channels: Array<{ provider: "instagram" | "linkedin" | "facebook" | "threads" | "youtube" | "twitter" | "pinterest"; connected: boolean; post_count: number; published: number; scheduled: number; failed: number }>;
  consistency: {
    current_streak: number;
    longest_streak: number;
    published_this_week: number;
    scheduled_this_week: number;
    days_remaining: number;
    state: "active" | "protected" | "at_risk" | "start";
    at_risk: boolean;
    message: string;
    week_ends_at: string;
  };
  recycling: {
    eligible_count: number;
    next_ready_in_days: number;
    candidates: Array<{
      post_id: number;
      caption: string;
      platforms: Array<"instagram" | "linkedin" | "facebook" | "threads" | "youtube" | "twitter" | "pinterest">;
      published_at: string;
      age_days: number;
      interactions: number;
      reason: string;
      media_url: string | null;
    }>;
  };
  suggestions: Array<{ title: string; body: string; action: string; href: string; tone: string }>;
  upcoming_posts: Array<{ id: number; caption: string; platforms: Provider[]; scheduled_for: string }>;
  recent_posts: Array<{ id: number; caption: string; platforms: Provider[]; status: string; created_at: string; published_at: string | null; publish_error: string | null; delivery_ids: number; delivery_mode: "provider" | "preview" | "none" }>;
};

export type FacebookDaily = {
  date: string;
  views: number | null;
  unique_viewers: number | null;
  engagements: number | null;
  followers_gained: number | null;
  followers_lost: number | null;
  followers: number | null;
  profile_views: number | null;
};

export type FacebookPost = {
  id: string;
  caption: string;
  published_at: string;
  permalink: string;
  reactions: number | null;
  comments: number | null;
  shares: number | null;
  interactions: number | null;
  account_id?: number;
  account_name?: string;
};

export type FacebookPageMetrics = Omit<FacebookDaily, "date"> & {
  account_id: number;
  page_id: string;
  account_name: string;
  available: boolean;
  net_followers: number | null;
  daily: FacebookDaily[];
  content: FacebookPost[];
  content_truncated: boolean;
  unavailable_metrics: string[];
  reason: string;
};

export type FacebookMetrics = Omit<FacebookDaily, "date"> & {
  source: "facebook";
  accounts: number;
  available: boolean;
  range_days: number;
  since: string;
  until: string;
  net_followers: number | null;
  daily: FacebookDaily[];
  content: FacebookPost[];
  pages: FacebookPageMetrics[];
  posts_analyzed: number;
  unavailable_metrics: string[];
  fetched_at: string;
};

export type InstagramMedia = {
        id: string;
        caption: string;
        media_type: string;
        permalink: string;
        thumbnail_url: string;
        published_at: string;
        likes: number;
        comments: number;
        interactions: number;
        account_name: string;
        username: string | null;
};

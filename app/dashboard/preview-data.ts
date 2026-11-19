import type { AnalyticsSummary } from "../lib/analytics";

/** Illustrative data for the public design preview; never stored in account caches. */
export const dashboardPreview: AnalyticsSummary = {
  simulated: false, provider_metrics_available: false, provider_metrics_reason: "Design preview", provider_metrics: { instagram: null }, range_days: 30,
  overview: { total_posts: 36, posts_in_range: 24, drafts: 8, scheduled: 6, publishing: 0, published: 22, provider_published: 22, preview_published: 0, failed: 0, connected_accounts: 3, publish_success_rate: 100 },
  trend: [],
  channels: [
    { provider: "facebook", connected: true, post_count: 0, published: 0, scheduled: 0, failed: 0 },
    { provider: "instagram", connected: true, post_count: 24, published: 15, scheduled: 4, failed: 0 },
    { provider: "linkedin", connected: true, post_count: 12, published: 7, scheduled: 2, failed: 0 },
  ],
  consistency: { current_streak: 4, longest_streak: 6, published_this_week: 3, scheduled_this_week: 2, days_remaining: 3, state: "active", at_risk: false, message: "Your weekly plan is taking shape. Two more ideas are ready for their moment.", week_ends_at: "2026-10-04" },
  recycling: { eligible_count: 0, next_ready_in_days: 4, candidates: [] },
  suggestions: [
    { title: "Make room for your next story", body: "Turn a behind-the-scenes moment into this week's next post.", action: "Explore templates", href: "/templates", tone: "positive" },
    { title: "Keep a little space for conversation", body: "Try a question-led post alongside your next product update.", action: "Browse ideas", href: "/templates", tone: "positive" },
  ],
  upcoming_posts: [
    { id: 1, caption: "A little look behind the scenes of our next collection.", platforms: ["instagram"], scheduled_for: "2026-10-02T10:00:00+05:30" },
    { id: 2, caption: "Three things we learned from listening to our customers.", platforms: ["linkedin"], scheduled_for: "2026-10-03T09:00:00+05:30" },
    { id: 3, caption: "Meet the people who make it happen.", platforms: ["instagram", "facebook"], scheduled_for: "2026-10-04T18:00:00+05:30" },
  ],
  recent_posts: [],
};

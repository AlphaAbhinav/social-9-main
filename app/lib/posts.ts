export type Provider = "instagram" | "linkedin" | "facebook" | "threads" | "youtube" | "twitter" | "pinterest";

export type SavedPost = {
  network_options?: Record<string, string | number | boolean>;
  id: number;
  caption: string;
  post_type: "post" | "story" | "reel" | "video";
  platforms: Provider[];
  status: "draft" | "scheduled" | "publishing" | "published" | "failed";
  scheduled_for: string | null;
  media_urls: string[];
  external_post_ids: Record<string, string>;
  publish_error: string | null;
  published_at: string | null;
  created_at: string;
};

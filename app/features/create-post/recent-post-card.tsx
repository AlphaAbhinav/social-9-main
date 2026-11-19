"use client";
import { InstagramPostLink } from "../../components/instagram-post-link";
import { PostPreview } from "./post-preview";
import { API_URL } from "../../lib/api";
import type { SavedPost } from "./use-composer";
import { SavedInstagramMusic } from "./saved-instagram-music";
const empty: File[] = [];
export function RecentPostCard({
  post,
  accounts,
}: {
  post: SavedPost;
  accounts: Record<string, string>;
}) {
  const images = post.preview_media || [];
  const sources = images.length
    ? images.map((url) => ({ url }))
    : post.media_urls.map((url) => ({
        url: url.startsWith("/") ? `${API_URL}${url}` : url,
        video: /\.(mp4|mov)(\?|$)/i.test(url),
      }));
  const links = Object.entries(post.external_post_ids).flatMap(
    ([provider, id]) => {
      if (!id || id.startsWith("preview:")) return [];
      if (provider === "facebook" && /^\d+_\d+$/.test(id)) {
        const [page, story] = id.split("_");
        return [
          {
            provider: "Facebook",
            url: `https://www.facebook.com/${page}/posts/${story}`,
          },
        ];
      }
      if (provider === "youtube" && /^[\w-]+$/.test(id))
        return [
          { provider: "YouTube", url: `https://www.youtube.com/watch?v=${id}` },
        ];
      if (provider === "twitter" && /^\d+$/.test(id))
        return [{ provider: "X", url: `https://x.com/i/web/status/${id}` }];
      if (provider === "pinterest" && /^\d+$/.test(id))
        return [{ provider: "Pinterest", url: `https://www.pinterest.com/pin/${id}/` }];
      if (provider === "linkedin" && /^urn:li:(share|ugcPost):\d+$/.test(id))
        return [
          {
            provider: "LinkedIn",
            url: `https://www.linkedin.com/feed/update/${id}/`,
          },
        ];
      return [];
    },
  );
  return (
    <>
      <SavedInstagramMusic post={post} />
      <PostPreview
        saved
        files={empty}
        sources={sources}
        caption={post.caption}
        platforms={post.platforms}
        postType={post.post_type}
        accounts={{ ...accounts, ...post.account_names }}
        titles={{
          youtube: String(post.network_options?.youtube_title || ""),
          pinterest: String(post.network_options?.pinterest_title || ""),
        }}
        publishedAt={post.published_at || post.created_at}
      />
      {(links.length > 0 || (/^\d+$/.test(post.external_post_ids.instagram || "") && post.post_type !== "story")) && (
        <div className="recent-published-links">
          {/^\d+$/.test(post.external_post_ids.instagram || "") && post.post_type !== "story" ? <InstagramPostLink postId={post.id} /> : null}
          {links.map((link) => (
            <a
              key={link.provider}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on {link.provider} ↗
            </a>
          ))}
        </div>
      )}
    </>
  );
}

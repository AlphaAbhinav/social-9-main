"use client";
import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import { getAccessToken } from "../lib/session";

export function InstagramPostLink({ postId }: { postId: number }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    const token = getAccessToken();
    if (!token) return;
    apiRequest<{ url: string }>(`/posts/${postId}/instagram-permalink`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(result => {
      const parsed = new URL(result.url);
      if (parsed.protocol !== "https:" || !["www.instagram.com", "instagram.com"].includes(parsed.hostname)) throw new Error("Invalid Instagram link");
      if (active) setUrl(result.url);
    }).catch(error => {
      if (active) setError(error instanceof Error ? error.message : "Instagram link unavailable");
    });
    return () => { active = false; };
  }, [postId, attempt]);
  if (url) return <a href={url} target="_blank" rel="noopener noreferrer">View on Instagram</a>;
  return <span>{error ? <><button type="button" onClick={() => { setError(""); setAttempt(value => value + 1); }}>Retry Instagram link</button><small role="status">{error}</small></> : <small>Loading Instagram link...</small>}</span>;
}

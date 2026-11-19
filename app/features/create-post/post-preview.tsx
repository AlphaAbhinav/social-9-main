"use client";

import { useEffect, useState } from "react";
import { LocalImagePreview } from "./local-image-preview";
import { SocialIcon } from "../../components/social-icon";
import "./post-preview.css";

const names: Record<string, string> = {facebook:"Facebook",instagram:"Instagram",linkedin:"LinkedIn",threads:"Threads",twitter:"X",youtube:"YouTube",pinterest:"Pinterest"};
type Props = {files: File[]; caption: string; platforms: string[]; postType: string; accounts: Record<string,string>; titles?: Record<string,string>; saved?: boolean; sources?: {url:string;video?:boolean;poster?:string}[]; publishedAt?: string|null};

export function PostPreview({files,caption,platforms,postType,accounts,titles,saved,sources,publishedAt}: Props) {
  const [chosen,setChosen] = useState("");
  const [slide,setSlide] = useState(0);
  const [media,setMedia] = useState<{file:File;url:string}[]>([]);
  const provider = platforms.includes(chosen) ? chosen : platforms[0] ?? "facebook";
  useEffect(() => {
    const next = files.map(file => ({file,url:URL.createObjectURL(file)}));
    // Synchronize browser-owned preview URLs; release them on replacement/unmount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMedia(next);
    setSlide(0);
    return () => next.forEach(item => URL.revokeObjectURL(item.url));
  },[files]);
  const current: {url:string;video?:boolean;file?:File}[] = sources || media.filter(item => files.includes(item.file)).map(item=>({url:item.url,file:item.file,video:/\.(mp4|mov)$/i.test(item.file.name)}));
  const index = Math.min(slide,Math.max(0,current.length-1));
  const selected = current[index];
  const vertical = postType === "story" || postType === "reel";
  const captionBlock = postType !== "story" ? <p className="post-preview-caption">{caption || "Your caption will appear here."}</p> : null;
  return <section className={`post-preview${saved ? " saved-post-preview" : ""}`} aria-label={saved?"Saved post appearance":"Full post preview"}>
    {!saved && <div className="post-preview-heading"><h2>Post preview</h2><span>Updates as you edit</span></div>}
    <div className="post-preview-platforms" role="group" aria-label="Preview channel">{platforms.map(channel => <button key={channel} type="button" aria-pressed={provider === channel} onClick={() => setChosen(channel)}><SocialIcon provider={channel as Parameters<typeof SocialIcon>[0]["provider"]} />{names[channel]}</button>)}</div>
    {!platforms.length && <p>Select a channel to preview your post.</p>}
    <article className={`post-preview-card preview-${provider}${vertical ? " preview-vertical" : ""}`}>
      <header><span className="post-preview-avatar" aria-hidden="true">{(accounts[provider] || "Your account").slice(0,1).toUpperCase()}</span><div><strong>{accounts[provider] || "Your account"}</strong><small>{publishedAt ? `${new Date(publishedAt).toLocaleString()} / ` : ""}{names[provider]} · {postType === "post" ? "Feed post" : postType === "story" ? "Story" : postType === "reel" ? "Reel" : "Video"}</small></div><span aria-hidden="true">•••</span></header>
      {provider === "facebook" || provider === "linkedin" || provider === "threads" || provider === "twitter" ? captionBlock : null}
      {selected ? <div className="post-preview-media">
        {/* Uploaded previews have no separately supplied caption track. */}
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        {selected.file && !selected.video ? <LocalImagePreview file={selected.file} alt={`Attachment ${index+1}`} /> : selected.video ? <><video key={selected.url} src={selected.url} controls playsInline preload="metadata" aria-label="Preview your video" />{!saved && <small>If your browser cannot play this file, convert it to MP4 with H.264 video and AAC audio.</small>}</> : /* Browser blob URLs are local, and must not be sent to an image optimizer. */
        // eslint-disable-next-line @next/next/no-img-element
        <img src={selected.url} alt={`Attachment ${index+1}`} />}
        {saved && !selected.video && postType !== "post" && <span className="saved-video-label">{postType === "story" ? "Story preview" : "Video preview"}</span>}
        {current.length > 1 && <div className="post-preview-carousel"><button type="button" aria-label="Previous preview image" disabled={!index} onClick={() => setSlide(index-1)}>←</button><span>{index+1} / {current.length}</span><button type="button" aria-label="Next preview image" disabled={index === current.length-1} onClick={() => setSlide(index+1)}>→</button></div>}
      </div> : saved ? null : <div className="post-preview-placeholder">{files.length ? "Preparing preview…" : "Add an image or video to preview it here."}</div>}
      {provider === "youtube" || provider === "pinterest" ? <h3>{titles?.[provider] || "Your title"}</h3> : null}
      {provider !== "facebook" && provider !== "linkedin" && provider !== "threads" && provider !== "twitter" ? captionBlock : null}
      {postType !== "story" && <footer aria-hidden="true">{provider === "youtube" ? "Like · Share · Save" : provider === "pinterest" ? "Save · Visit" : "Like · Comment · Share"}</footer>}
    </article>
    {!saved && <p className="post-preview-note">Layout preview. Final cropping and controls may vary by platform.{postType === "story" ? " Your internal Story label is not published as an overlay." : ""}</p>}
  </section>;
}

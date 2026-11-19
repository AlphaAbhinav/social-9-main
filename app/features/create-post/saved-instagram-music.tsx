"use client";
import { useState } from "react";
import { API_URL } from "../../lib/api";
import { downloadFile, instagramReminder } from "./instagram-reminder";
import "./instagram-music.css";

export function SavedInstagramMusic({post}: {post: {id:number; caption:string; media_urls:string[]; network_options?:Record<string,string|number|boolean>}}) {
  const [when, setWhen] = useState("");
  const [message, setMessage] = useState("");
  const options = post.network_options;
  if (options?.instagram_audio_id) return <p>Instagram music: {String(options.instagram_audio_title || options.instagram_audio_id)} {String(options.instagram_audio_artist || "")}</p>;
  if (!options?.instagram_manual_music) return null;
  const song = String(options.instagram_manual_music);
  return <details className="instagram-music"><summary>Finish in Instagram · {song}</summary>
    <p>Add this song in Instagram and finish publishing there. This Social9 draft is not published automatically.</p>
    <div className="instagram-music-buttons">
      {post.media_urls.map((url,index) => <a key={url} href={url.startsWith("/") ? `${API_URL}${url}` : url} target="_blank" rel="noopener noreferrer" download>Open / save media {index+1}</a>)}
      <button type="button" className="secondary-button" onClick={() => downloadFile(new Blob([post.caption], {type:"text/plain;charset=utf-8"}), "social9-instagram-caption.txt")}>Download caption</button>
    </div>
    <label htmlFor={`instagram-saved-reminder-${post.id}`}>Reminder time<input id={`instagram-saved-reminder-${post.id}`} type="datetime-local" value={when} onChange={event => setWhen(event.target.value)} /></label>
    <div className="instagram-music-buttons"><button type="button" className="secondary-button" onClick={() => {
      try {
        const contents = instagramReminder({when:new Date(when),song,caption:post.caption,filenames:post.media_urls.map((url,index) => url.split("?")[0].split("/").pop() || `Media ${index+1}`),uid:crypto.randomUUID()});
        downloadFile(new Blob([contents],{type:"text/calendar;charset=utf-8"}),"social9-instagram-reminder.ics");
        setMessage("Import the downloaded calendar file to activate your reminder.");
      } catch (cause) {setMessage(cause instanceof Error ? cause.message : "Could not create reminder.");}
    }}>Download calendar reminder</button><a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer">Open Instagram</a></div>
    {message && <p role="status">{message}</p>}
  </details>;
}

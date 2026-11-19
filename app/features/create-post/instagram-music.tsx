"use client";

import { type Dispatch, type SetStateAction, useCallback, useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";
import { getAccessToken } from "../../lib/session";
import { downloadFile, instagramReminder } from "./instagram-reminder";
import "./instagram-music.css";

type Options = Record<string, string | number | boolean>;
type Track = { id: string; title: string; artist: string; preview_url: string | null; instagram_url: string | null };
type Access = { accountId: number; connected: boolean; configured: boolean };

export function InstagramMusic({ accountId, postType, options, setOptions, files, caption, scheduledFor, setScheduledFor, instagramOnly, busy }: {
  accountId: number; postType: string; options: Options; setOptions: Dispatch<SetStateAction<Options>>;
  files: File[]; caption: string; scheduledFor: string; setScheduledFor: (value: string) => void; instagramOnly: boolean; busy: boolean;
}) {
  const [access, setAccess] = useState<Access | null>(null);
  const [result, setResult] = useState<{accountId: number; audio: Track[]} | null>(null);
  const [query, setQuery] = useState("");
  const [audioType, setAudioType] = useState("music");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const automatic = postType === "reel" || postType === "video";
  const connected = access?.accountId === accountId && access.connected;
  const tracks = result?.accountId === accountId ? result.audio : [];
  const manual = !!options.instagram_manual_music;

  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (!accountId || !automatic) return;
    try {
      const response = await apiRequest<Omit<Access, "accountId">>(`/instagram-music/${accountId}/status`, {headers: {Authorization: `Bearer ${getAccessToken()}`}, signal});
      setAccess({accountId, ...response});
    } catch (cause) {
      if (!signal?.aborted) setError(cause instanceof Error ? cause.message : "Could not check music access.");
    }
  }, [accountId, automatic]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void refresh(controller.signal), 0);
    const focus = () => void refresh(controller.signal);
    window.addEventListener("focus", focus);
    return () => { window.clearTimeout(timer); controller.abort(); window.removeEventListener("focus", focus); };
  }, [refresh]);

  async function connect() {
    const popup = window.open("about:blank", "_blank");
    if (!popup) { setError("Allow popups to connect Facebook music access."); return; }
    popup.opener = null;
    setPending(true); setError("");
    try {
      const response = await apiRequest<{authorization_url: string}>(`/instagram-music/${accountId}/connect`, {method: "POST", headers: {Authorization: `Bearer ${getAccessToken()}`}});
      popup.location.href = response.authorization_url;
      setMessage("Finish authorization in the new tab, then return here and refresh music access.");
    } catch (cause) {
      popup.close();
      setError(cause instanceof Error ? cause.message : "Could not connect music.");
    } finally { setPending(false); }
  }

  async function search() {
    setPending(true); setError(""); setMessage("");
    try {
      const parameters = new URLSearchParams({q: query, audio_type: audioType});
      const response = await apiRequest<{audio: Track[]}>(`/instagram-music/${accountId}/audio?${parameters}`, {headers: {Authorization: `Bearer ${getAccessToken()}`}});
      setResult({accountId, audio: response.audio});
      if (!response.audio.length) setMessage("No matching tracks are available for this account. Try another search.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not search music."); }
    finally { setPending(false); }
  }

  function removeTrack() {
    setOptions(current => Object.fromEntries(Object.entries(current).filter(([key]) => !["instagram_audio_id", "instagram_audio_title", "instagram_audio_artist", "instagram_audio_volume", "instagram_video_volume"].includes(key))));
  }

  function downloadReminder() {
    setError(""); setMessage("");
    try {
      if (!files.length || !caption.trim() || !String(options.instagram_manual_music || "").trim()) throw new Error("Add your media, caption and song note first.");
      const contents = instagramReminder({when: new Date(scheduledFor), song: String(options.instagram_manual_music), caption,
        filenames: files.map(file => file.name), uid: crypto.randomUUID()});
      downloadFile(new Blob([contents], {type: "text/calendar;charset=utf-8"}), "social9-instagram-reminder.ics");
      setMessage("Import the downloaded .ics file into your calendar to activate the reminder. Save your media and caption; finish publishing in Instagram.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create the reminder."); }
  }

  return <fieldset className="instagram-music" disabled={busy}>
    <legend>Instagram music</legend>
    {automatic ? <>
      <p>Choose music for this Instagram Reel. Meta provides a limited catalogue approved for third-party publishing. Music applies to Instagram only.</p>
      {!accountId ? <p>Choose an Instagram account to check music access.</p> : <>
        <div className="instagram-music-buttons">
          <button type="button" className="secondary-button" disabled={pending || (access?.accountId === accountId && !access.configured)} onClick={() => void connect()}>{connected ? "Reconnect Facebook music access" : "Connect Facebook for music"}</button>
          <button type="button" className="secondary-button" disabled={pending} onClick={() => {setError(""); void refresh();}}>Refresh music access</button>
          {connected && <button type="button" className="secondary-button" disabled={pending} onClick={() => {setPending(true); setError(""); void apiRequest(`/instagram-music/${accountId}`, {method:"DELETE",headers:{Authorization:`Bearer ${getAccessToken()}`}}).then(() => {setAccess({accountId,connected:false,configured:true});setResult(null);removeTrack();}).catch(cause => setError(cause instanceof Error ? cause.message : "Could not disconnect music.")).finally(() => setPending(false));}}>Disconnect music</button>}
        </div>
        {access?.accountId === accountId && !access.configured && <p>Facebook music access needs to be enabled by the Social9 administrator.</p>}
        {connected && <>
          <div className="instagram-music-search">
            <label htmlFor="instagram-audio-query">Song or artist<input id="instagram-audio-query" value={query} maxLength={200} placeholder="Leave blank for trending audio" onChange={event => setQuery(event.target.value)} onKeyDown={event => {if (event.key === "Enter") {event.preventDefault(); if (!pending) void search();}}} /></label>
            <label htmlFor="instagram-audio-type">Audio type<select id="instagram-audio-type" value={audioType} onChange={event => setAudioType(event.target.value)}><option value="music">Music</option><option value="original_sound">Original sounds</option></select></label>
            <button type="button" className="secondary-button" disabled={pending} onClick={() => void search()}>{pending ? "Loading..." : "Search audio"}</button>
          </div>
          {!!tracks.length && <ul className="instagram-music-results">{tracks.map(track => <li key={track.id}>
            <div><strong>{track.title}</strong><span>{track.artist}</span></div>
            {/* Meta supplies music previews without caption tracks; song and artist appear alongside. */}
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            {track.preview_url ? <audio controls preload="none" src={track.preview_url} aria-label={`Preview ${track.title}`} /> : track.instagram_url ? <a href={track.instagram_url} target="_blank" rel="noopener noreferrer">Preview in Instagram</a> : <small>Preview unavailable</small>}
            <button type="button" className="secondary-button" aria-pressed={options.instagram_audio_id === track.id} onClick={() => setOptions(current => ({...current, instagram_audio_id: track.id, instagram_audio_title: track.title, instagram_audio_artist: track.artist}))}>{options.instagram_audio_id === track.id ? "Selected" : "Use song"}</button>
          </li>)}</ul>}
        </>}
      </>}
      {!!options.instagram_audio_id && <div className="instagram-music-selected">
        <strong>Selected: {String(options.instagram_audio_title || options.instagram_audio_id)}</strong><span>{String(options.instagram_audio_artist || "")}</span>
        <button type="button" className="secondary-button" onClick={removeTrack}>Remove song</button>
        <label htmlFor="instagram-audio-volume">Music volume: {Number(options.instagram_audio_volume ?? 100)}%<input id="instagram-audio-volume" type="range" min={1} max={100} value={Number(options.instagram_audio_volume ?? 100)} onChange={event => setOptions(current => ({...current,instagram_audio_volume:Number(event.target.value)}))} /></label>
        <label htmlFor="instagram-video-volume">Original video volume: {Number(options.instagram_video_volume ?? 100)}%<input id="instagram-video-volume" type="range" min={1} max={100} value={Number(options.instagram_video_volume ?? 100)} onChange={event => setOptions(current => ({...current,instagram_video_volume:Number(event.target.value)}))} /></label>
        <p>Meta adds the track from its beginning. Song trimming and a combined video/audio preview are unavailable. Your video must contain an audio track.</p>
      </div>}
    </> : <>
      <p>For photo posts, carousels and Stories, add catalogue music inside Instagram. Prepare your content here and import a calendar reminder to finish publishing.</p>
      <label className="instagram-music-toggle"><input type="checkbox" checked={manual} disabled={!instagramOnly && !manual} onChange={event => setOptions(current => {const next = {...current}; if (event.target.checked) next.instagram_manual_music = "Choose a song in Instagram"; else delete next.instagram_manual_music; return next;})} />Finish in Instagram with music</label>
      {!instagramOnly && <p>Select Instagram as the only channel to prepare a manual music post.</p>}
      {manual && <div className="instagram-music-manual">
        <label htmlFor="instagram-song-note">Song and artist to add<input id="instagram-song-note" maxLength={200} value={String(options.instagram_manual_music)} onChange={event => setOptions(current => ({...current, instagram_manual_music:event.target.value || " "}))} /></label>
        <label htmlFor="instagram-reminder-time">Reminder time<input id="instagram-reminder-time" type="datetime-local" value={scheduledFor} onChange={event => setScheduledFor(event.target.value)} /></label>
        <div className="instagram-music-buttons"><button type="button" className="secondary-button" onClick={downloadReminder}>Download calendar reminder</button><button type="button" className="secondary-button" onClick={() => {downloadFile(new Blob([caption], {type:"text/plain;charset=utf-8"}), "social9-instagram-caption.txt");}}>Download caption</button></div>
        {!!files.length && <div className="instagram-music-buttons">{files.map((file,index) => <button type="button" className="secondary-button" key={`${file.name}-${index}`} onClick={() => downloadFile(file, file.name)}>Save {file.name}</button>)}</div>}
        <p>This creates a calendar file, not an automatic Social9 notification. Import it into your calendar. Save a draft to keep your content in Social9; add music and publish in Instagram.</p>
      </div>}
    </>}
    {error && <p className="instagram-music-error" role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
  </fieldset>;
}

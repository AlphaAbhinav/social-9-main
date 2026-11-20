"use client";
import { useId, useState } from "react";
import { apiRequest } from "../lib/api";
import { getAccessToken } from "../lib/session";
import "./ai-feedback.css";
import { track } from "../lib/track";

export function AIFeedback({ generationId }: { generationId?: number | null }) {
  return generationId ? <FeedbackControls key={generationId} generationId={generationId} /> : null;
}

function FeedbackControls({ generationId }: { generationId: number }) {
  const noteId = useId();
  const [rating, setRating] = useState<"helpful" | "needs_work" | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function save() {
    if (!rating || busy) return;
    setBusy(true); setMessage(""); setError("");
    try {
      await apiRequest("/ai/feedback", { method: "POST", headers: { Authorization: `Bearer ${getAccessToken() ?? ""}` },
        body: JSON.stringify({ generation_id: generationId, rating, note }) });
      track("ai_feedback", { label: rating });
      setMessage("Feedback saved. Future advice for this brand will use it.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save feedback. Try again.");
    } finally { setBusy(false); }
  }
  return <fieldset className="ai-feedback" disabled={busy}>
    <legend>Help improve your next result</legend>
    <p>Your feedback helps tailor future advice to this brand.</p>
    <div className="ai-feedback-choices">
      <button type="button" aria-pressed={rating === "helpful"} onClick={() => { setRating("helpful"); setMessage(""); }}>Helpful</button>
      <button type="button" aria-pressed={rating === "needs_work"} onClick={() => { setRating("needs_work"); setMessage(""); }}>Needs work</button>
    </div>
    {rating ? <><label htmlFor={noteId}>What should we keep or improve? (optional)</label>
      <textarea id={noteId} value={note} onChange={event => { setNote(event.target.value); setMessage(""); }} maxLength={1000} rows={2} placeholder="For example: more specific hooks, less formal wording, or ideas we can film quickly." />
      <button type="button" onClick={() => void save()}>{busy ? "Saving..." : "Save feedback"}</button></> : null}
    {message ? <p role="status">{message}</p> : null}
    {error ? <p role="alert">{error}</p> : null}
  </fieldset>;
}

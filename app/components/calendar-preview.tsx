import { SocialIcon } from "./social-icon";

/** Illustrative calendar for the public product section; contains no account data. */
export function CalendarPreview() {
  return <div className="s9-calendar-demo"><div className="s9-demo-heading"><div><small>A LITTLE STRUCTURE. A LOT OF POSSIBILITY.</small><h3>Your content, in motion.</h3></div><span className="s9-demo-badge">30 days of ideas ✳</span></div><div className="s9-demo-days">{["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map(d => <span key={d}>{d}</span>)}</div><div className="s9-demo-grid">{Array.from({ length: 14 }, (_, i) => <div key={i}><small>{String(i + 1).padStart(2, "0")}</small>{[0, 3, 6, 9].includes(i) && <div className={`s9-calendar-note note-${i}`}><SocialIcon provider={i === 6 ? "linkedin" : i === 9 ? "facebook" : "instagram"} /><b>{["Behind the scenes", "", "", "Something new", "", "", "What we learned", "", "", "Meet the people"][i]}</b><span>{i === 6 ? "Share a thought" : "Tell your story"}</span></div>}</div>)}</div><div className="s9-floating-note">✦ Goodbye, blank calendar.</div></div>;
}

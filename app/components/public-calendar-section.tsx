import Link from "./link";
import { CalendarPreview } from "./calendar-preview";
import "./public-calendar.css";

export function PublicCalendarSection() {
  return <section className="public-calendar neon-section" id="calendar-preview" aria-labelledby="calendar-preview-title">
    <div className="public-calendar-heading neon-section-intro"><div><div className="neon-section-label"><i /> Your content calendar</div><h2 id="calendar-preview-title">Your free 30-day<br /><em>social media content plan.</em></h2></div><p>See what to post each day on Instagram, Facebook Pages, and LinkedIn. Use suggested formats, caption prompts, and calls to action to create your own posts.</p></div>
    <div className="s9-product-preview"><div className="s9-preview-toolbar"><span><i /><i /><i /></span><b>social9 / your workspace</b><span aria-hidden="true">↗</span></div><CalendarPreview /><span className="s9-preview-caption">Illustrative workspace preview</span></div>
    <div className="public-calendar-footer"><span>Your first 30 days of content ideas are included free.</span><Link className="neon-cta" href="/signup">Plan my first 30 days <span aria-hidden="true">↗</span></Link></div>
  </section>;
}

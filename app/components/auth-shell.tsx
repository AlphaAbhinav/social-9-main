import type { ReactNode } from "react";
import Link from "./link";

import { Social9Mark } from "./social9-mark";
import { ThemeToggle } from "./theme-toggle";
import "./auth-shell.css";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="login-shell auth-refresh">
      <section className="story-panel" aria-label="About Social9">
        <div className="story-orb story-orb-one" />
        <div className="story-orb story-orb-two" />

        <Link className="brand" href="/" aria-label="Social9 home">
          <Social9Mark />
          <span>Social9</span>
        </Link>

        <div className="story-copy">
          <span className="eyebrow">
            <span className="eyebrow-dot" />
            Built for local businesses
          </span>
          <h1>Plan your content.<br /><span>Schedule your posts.</span></h1>
          <p>
            Create and schedule Instagram, Facebook Pages, and LinkedIn posts in one
            workspace. Start with a free 30-day content plan.
          </p>
        </div>

        <div className="planner-card" aria-label="Upcoming content preview">
          <div className="planner-heading">
            <div>
              <span className="planner-label">A week in your workspace</span>
              <strong>3 posts ready to go</strong>
            </div>
            <span className="planner-badge">On track</span>
          </div>

          <div className="post-row">
            <span className="date-chip"><b>MON</b>24</span>
            <span className="post-icon post-icon-coral">*</span>
            <span className="post-copy">
              <strong>Monday special</strong>
              <small>Instagram - 10:30 AM</small>
            </span>
            <span className="status-dot" />
          </div>
          <div className="post-row">
            <span className="date-chip"><b>WED</b>26</span>
            <span className="post-icon post-icon-violet">Aa</span>
            <span className="post-copy">
              <strong>Behind the scenes</strong>
              <small>LinkedIn - 1:00 PM</small>
            </span>
            <span className="status-dot" />
          </div>
          <div className="post-row post-row-muted">
            <span className="date-chip"><b>FRI</b>28</span>
            <span className="post-icon post-icon-blue">#</span>
            <span className="post-copy">
              <strong>Weekend update</strong>
              <small>Facebook - 6:00 PM</small>
            </span>
            <span className="status-dot" />
          </div>
        </div>

        <p className="story-footnote">
          Content planning and publishing for small businesses.
        </p>
      </section>

      <section className="form-panel">
        <div className="auth-theme-control"><ThemeToggle compact /></div>
        <Link className="mobile-brand" href="/" aria-label="Social9 home">
          <Social9Mark />
          <span>Social9</span>
        </Link>
        <div className="form-wrap">{children}</div>
        <footer>
          <span>Copyright 2026 Social9</span>
          <span>Made for growing local businesses</span>
        </footer>
      </section>
    </main>
  );
}

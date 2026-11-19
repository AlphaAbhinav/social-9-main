import Link from "./components/link";
import { Social9Mark } from "./components/social9-mark";
import { ThemeToggle } from "./components/theme-toggle";

export default function NotFound() {
  return (
    <main className="not-found-page">
      <div className="not-found-grid" aria-hidden="true" />
      <header className="not-found-header">
        <Link className="not-found-brand" href="/" aria-label="Social9 home">
          <Social9Mark />
          <span>SOCIAL<b>9</b></span>
        </Link>
        <ThemeToggle compact />
      </header>

      <section className="not-found-content">
        <div className="not-found-code" aria-hidden="true">
          <span>4</span>
          <div><i /><b>9</b></div>
          <span>4</span>
        </div>
        <span className="not-found-kicker"><i /> Page not found</span>
        <h1>This page could not be found.</h1>
        <p>
          The link may be incorrect or the page may have moved.
          Your Social9 workspace is still right where you left it.
        </p>
        <div className="not-found-actions">
          <Link className="not-found-primary" href="/">Return home <span>↗</span></Link>
          <Link className="not-found-secondary" href="/dashboard">Open dashboard <span>→</span></Link>
        </div>
      </section>

      <nav className="not-found-routes" aria-label="Helpful destinations">
        <Link href="/create-post"><span>01</span><div><strong>Create a post</strong><small>Turn the next idea into content.</small></div><b>↗</b></Link>
        <Link href="/calendar"><span>02</span><div><strong>View calendar</strong><small>See what is scheduled next.</small></div><b>↗</b></Link>
        <Link href="/analytics"><span>03</span><div><strong>Open analytics</strong><small>Review publishing results.</small></div><b>↗</b></Link>
      </nav>

      <footer className="not-found-footer">
        <span>404 · Nothing scheduled here</span>
        <span>Social9 © 2026</span>
      </footer>
    </main>
  );
}

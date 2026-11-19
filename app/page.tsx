import "./styles/homepage.css";
import { AppDownloadPrompt, AppDownloadSection, AndroidDownloadBadge } from "./components/app-download";
import { androidAppUrl } from "./lib/mobile-app";
import { headers } from "next/headers";
import { PublicSessionActions } from "./components/public-session-actions";
import { HomePricing } from "./components/home-pricing";
import { siteOrigin, siteDescription } from "./lib/seo";
import { WorkflowArt, PlatformArt } from "./components/brand-illustrations";
import { PublicCalendarSection } from "./components/public-calendar-section";
import { DiscoverFeed } from "./components/discover-feed";
import Link from "./components/link";
import { WorkspaceSearch } from "./components/workspace-search";
import { Social9Mark } from "./components/social9-mark";
import { SocialIcon } from "./components/social-icon";
import { ThemeToggle } from "./components/theme-toggle";
import { PersonalizedGreeting } from "./components/personalized-greeting";
import { LandingMotion, MotionWords } from "./components/landing-motion";

const recommendations = [
  "Turn the product update into a short LinkedIn story",
  "Move two drafts into this week’s publishing queue",
  "Reuse your strongest idea for Instagram",
];

const workflow = [
  { number: "01", title: "Connect your channels", copy: "Connect your Instagram, Facebook Pages, and LinkedIn accounts for publishing." },
  { number: "02", title: "Draft your posts", copy: "Write captions, add media, and choose the channels for each post." },
  { number: "03", title: "Schedule or publish", copy: "Publish now or choose a date and time in your content calendar." },
  { number: "04", title: "Review your results", copy: "Check publishing status and available account insights to plan your next posts." },
];

export default async function HomePage() {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const structuredData = { "@context": "https://schema.org", "@graph": [{ "@type": "Organization", "@id": `${siteOrigin()}/#organization`, name: "Social9", url: siteOrigin(), logo: `${siteOrigin()}/social9-mark-transparent.png` }, { "@type": "WebSite", "@id": `${siteOrigin()}/#website`, name: "Social9", url: siteOrigin(), description: siteDescription, publisher: { "@id": `${siteOrigin()}/#organization` } }, { "@type": "SoftwareApplication", name: "Social9", applicationCategory: "BusinessApplication", operatingSystem: "Web", url: siteOrigin(), description: siteDescription, featureList: ["30-day content planning", "Instagram scheduling", "LinkedIn scheduling", "Facebook Pages scheduling", "Premium AI captions"] }] };
  return (
    <LandingMotion>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <header className="neon-public-header">
        <Link className="neon-brand" href="/" aria-label="Social9 homepage"><Social9Mark /><span className="neon-brand-copy"><strong>SOCIAL<b>9</b></strong><small>Social media scheduling</small></span></Link>
        <nav aria-label="Public navigation"><a href="#product">Product</a><a href="#discover">Discover</a><a href="#workflow">How it works</a><a href="#platforms">Platforms</a><a href="#plans">Plans</a><AppDownloadPrompt className="s9-app-nav" /></nav>
        <div className="neon-header-actions"><ThemeToggle compact /><PublicSessionActions /></div>
      </header>

      <section id="main-content" tabIndex={-1} className="neon-hero">
        <div className="landing-hero-orbit" aria-hidden="true"><i /></div>
        <div className="neon-kicker"><i /> Your first 30 days are included</div>
        <h1><MotionWords text="Plan your social content." /><br /><em><MotionWords text="Schedule. Publish. Repeat." /></em></h1>
        <p>Plan, schedule, and publish Instagram, Facebook Pages, and LinkedIn posts in one workspace. Get 30 days of content ideas free. Upgrade to Premium for AI captions and longer content plans.</p>
        <div className="neon-hero-actions"><Link className="neon-cta red" href="/signup">Get my free 30-day plan <span>↗</span></Link><a className="neon-text-link" href="#plans">Compare plans →</a></div>
        <AppDownloadPrompt className="s9-app-hero" />
        <div className="neon-product-preview" aria-label="Example Social9 product interface">
          <div className="neon-preview-top">
            <div><span className="neon-preview-logo">S9</span><div><PersonalizedGreeting /><small>Here’s your complete publishing summary</small></div></div>
            <WorkspaceSearch />
            <div className="neon-preview-actions"><span>☼</span><span>●</span><span>A</span></div>
          </div>
          <div className="neon-preview-metrics">
            <article><div><strong>03</strong><small>Connected</small></div><div className="neon-mini-graph"><i /><i /><i /><i /><i /><i /></div></article>
            <article><div><strong>08</strong><small>Scheduled</small></div><div className="neon-mini-graph"><i /><i /><i /><i /><i /><i /></div></article>
            <article><div><strong>24</strong><small>Total posts</small></div><div className="neon-mini-graph"><i /><i /><i /><i /><i /><i /></div></article>
            <article><div><strong>96%</strong><small>Publish success</small></div><div className="neon-mini-graph"><i /><i /><i /><i /><i /><i /></div></article>
          </div>
          <div className="neon-signal-strip"><div><span><i /> Plan your content</span><span><i /> Schedule your posts</span><span><i /> Track publishing status</span></div></div>
          <div className="neon-preview-body">
            <aside className="neon-preview-rail"><span className="active">⌂</span><span>▥</span><span>◴</span><span>✦</span><span>↗</span></aside>
            <div className="neon-preview-center">
              <article className="neon-today-card"><time>10:24</time><small>Tuesday · 1 September</small><h3>Today’s queue</h3><ul><li><SocialIcon provider="linkedin" /><div><strong>Founder perspective</strong><small>11:30 AM</small></div></li><li><SocialIcon provider="instagram" /><div><strong>Product story</strong><small>3:00 PM</small></div></li><li><SocialIcon provider="facebook" /><div><strong>Community update</strong><small>5:00 PM</small></div></li></ul></article>
              <article className="neon-spotlight"><div><small>Campaign focus</small><h3>Instagram, Facebook Pages, and LinkedIn posts, planned together.</h3><span>8 posts scheduled · Instagram + Facebook + LinkedIn</span></div></article>
            </div>
            <aside className="neon-recommendations"><h3>Suggested next steps</h3>{recommendations.map((item, index) => <article key={item}><div><small>{index === 0 ? "Content" : index === 1 ? "Cadence" : "Repurpose"}</small><p>{item}</p></div><i /></article>)}</aside>
            <aside className="neon-social-rail"><SocialIcon provider="instagram" /><SocialIcon provider="linkedin" /><SocialIcon provider="facebook" /><span>YT</span><span>TT</span><span className="add">+</span></aside>
          </div>
          <div className="neon-preview-bottom"><article className="neon-preview-tile"><small>Publishing health</small><strong>96%</strong></article><article className="neon-preview-tile color"><small>Instagram</small><strong>12</strong></article><article className="neon-preview-tile green"><small>Facebook Pages</small><strong>07</strong></article><article className="neon-preview-tile red"><small>LinkedIn</small><strong>12</strong></article></div>
        </div>
      </section>

      <section className="neon-capability-bar" aria-label="Social9 workflow">
        <div className="neon-capability-track">
          <span><i>01</i><span>Create<small>Draft your posts</small></span></span>
          <b aria-hidden="true">→</b>
          <span><i>02</i><span>Schedule<small>Set a posting time</small></span></span>
          <b aria-hidden="true">→</b>
          <span><i>03</i><span>Publish<small>Post to your channels</small></span></span>
          <b aria-hidden="true">→</b>
          <span><i>04</i><span>Learn<small>Review your results</small></span></span>
        </div>
      </section>

      <section className="neon-section" id="product">
        <div className="neon-section-label"><i /> Social media management tools</div>
        <div className="neon-section-intro"><h2>Plan, create, and schedule <em>social media posts.</em></h2><p>Keep content ideas, drafts, scheduled posts, and publishing results together. Manage Instagram, Facebook Pages, and LinkedIn without switching between separate planning tools.</p></div>
        <div className="neon-feature-grid">
          <article className="neon-feature-card dark">
            <span>01 · Content studio</span>
            <div className="neon-card-visual composer" aria-hidden="true"><div><b>New post</b><small>Draft saved</small></div><i /><i /><i className="short" /><strong>✦ Refine with AI</strong></div>
            <h3>Create Instagram, Facebook Pages, and LinkedIn posts.</h3>
            <p>Draft for Instagram, Facebook Pages, and LinkedIn, then unlock Premium AI to write, refine, shorten, and find relevant hashtags.</p>
          </article>
          <article className="neon-feature-card green">
            <span>02 · Publishing</span>
            <div className="neon-card-visual schedule" aria-hidden="true"><time><b>08</b><small>MON</small></time><time className="active"><b>09</b><small>TUE</small></time><time><b>10</b><small>WED</small></time><div><i /> 3 posts ready</div></div>
            <h3>Start with a free 30-day content calendar.</h3>
            <p>Every free workspace includes a daily format, channel, objective, suggested time, caption prompt, and call to action.</p>
          </article>
          <article className="neon-feature-card red">
            <span>03 · Analytics</span>
            <div className="neon-card-visual analytics" aria-hidden="true"><strong>96%</strong><small>Publishing success</small><div><i /><i /><i /><i /><i /><i /></div></div>
            <h3>Track publishing status and account insights.</h3>
            <p>See published, scheduled, and failed posts. View platform insights when your connected account provides access.</p>
          </article>
        </div>
      </section>

      <PublicCalendarSection />
      <DiscoverFeed />
      <HomePricing />

      <section className="neon-workflow workflow-redesign" id="workflow"><div className="neon-workflow-inner"><div><div className="neon-section-label"><i /> How it works</div><h2>From content idea<br /><em>to scheduled post.</em></h2><p>Connect your accounts, draft a post, choose a publishing time, and review the result in Social9.</p><Link className="neon-cta" href="/signup">Create your free account ↗</Link></div><ol>{workflow.map((item) => <li key={item.number}><span>{item.number}</span><WorkflowArt step={item.number} /><div><h3>{item.title}</h3><p>{item.copy}</p></div><b>↗</b></li>)}</ol></div></section>

      <div className="landing-motion-ribbon" aria-hidden="true"><svg className="ribbon-flower" viewBox="0 0 200 200">{Array.from({ length: 8 }, (_, i) => <ellipse key={i} cx="100" cy="100" rx="28" ry="94" transform={`rotate(${i * 22.5} 100 100)`} />)}</svg><span className="ribbon-line-one">One idea. <em>Three channels.</em></span><span className="ribbon-line-two"><em>Plan ahead.</em> Publish consistently.</span><small>PLAN. SCHEDULE. PUBLISH.</small></div>
      <section className="neon-section platforms-redesign" id="platforms"><div className="neon-section-label"><i /> Supported social platforms</div><div className="neon-section-intro"><h2>Schedule your posts. <em>Across three platforms.</em></h2><p>Manage your Instagram, Facebook Pages, and LinkedIn content in one calendar. Prepare posts for each platform and keep track of what is scheduled. Instagram requires a professional account; Facebook requires Page access. Each provider must grant publishing permissions, and analytics availability varies.</p></div><div className="neon-feature-grid">
        <article className="neon-feature-card red"><span>Instagram</span><PlatformArt platform="instagram" /><h3>Plan and schedule Instagram content.</h3><p>Add your images and captions, then publish or schedule posts for your connected Instagram account.</p></article>
        <article className="neon-feature-card dark"><span>LinkedIn</span><PlatformArt platform="linkedin" /><h3>Create and schedule LinkedIn updates.</h3><p>Draft business updates, founder stories, and company milestones for your connected LinkedIn account.</p></article>
        <article className="neon-feature-card green"><span>Facebook Pages</span><PlatformArt platform="facebook" /><h3>Publish to your Facebook community.</h3><p>Choose a connected Page, then publish or schedule text, photos, videos, and Reels from the same workspace.</p></article>
      </div></section>

      <AppDownloadSection />

      <section className="neon-final restored-closing"><div className="landing-final-halo" aria-hidden="true" /><h2>Get your free<br />30-day content plan.</h2><p>Create a Social9 account for 30 days of Instagram, Facebook Pages, and LinkedIn content ideas. Add your captions and media, then schedule your posts.</p><Link className="neon-cta" href="/signup">Build my free content plan ↗</Link><div><AppDownloadPrompt className="s9-app-closing" /></div><div className="closing-benefits">
          <div className="closing-benefit"><span className="closing-benefit-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="5" width="16" height="16" rx="3" /><path d="M8 3v4m8-4v4M4 11h16m-11 4h6" /></svg></span><div><strong>30-day content plan</strong><small>One content idea for each day</small></div></div>
          <div className="closing-benefit"><span className="closing-benefit-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg></span><div><strong>Schedule in advance</strong><small>Plan ahead. Publish on your schedule.</small></div></div>
          <div className="closing-benefit"><span className="closing-benefit-icon closing-benefit-platforms" aria-hidden="true"><SocialIcon provider="instagram" /><SocialIcon provider="facebook" /><SocialIcon provider="linkedin" /></span><div><strong>Manage three social platforms</strong><small>Instagram, Facebook Pages, and LinkedIn in one place</small></div></div>
        </div></section>

      <footer className="neon-footer refreshed-footer"><div><Link className="neon-brand" href="/"><Social9Mark /><span>SOCIAL<b>9</b></span></Link><p>Plan, schedule, and publish Instagram, Facebook Pages, and LinkedIn posts with Social9. Start with a free 30-day content plan.</p><div className="s9-footer-app"><strong>Get Social9 for Android</strong><AndroidDownloadBadge /><p>{androidAppUrl() ? "Available now on Google Play." : "Coming soon. The download link will appear here at launch."}</p></div><span className="footer-signature">A product by VisionaryCue Informatics</span></div><nav aria-label="Footer navigation"><div><strong>Product</strong><a href="#product">Features</a><Link href="/instagram-scheduling">Instagram scheduling</Link><Link href="/linkedin-scheduling">LinkedIn scheduling</Link><Link href="/free-content-calendar">Free content calendar</Link><a href="#workflow">How it works</a><a href="#plans">Plans</a><a href="#download-app">Android app</a></div><div><strong>Workspace</strong><Link href="/login">Sign in</Link><Link href="/signup">Create account</Link><Link href="/analytics">Analytics</Link></div><div><strong>Company</strong><a href="mailto:visionarycue.informatics@gmail.com">Contact</a><Link href="/privacy">Privacy policy</Link><Link href="/data-deletion">Data deletion</Link><Link href="/terms">Terms of service</Link><Link href="/refunds">Refund policy</Link></div></nav><div className="neon-footer-bottom"><span>© 2026 Social9</span><span>Social media planning for small businesses.</span></div></footer>
    </LandingMotion>
  );
}

import { siteOrigin, siteTitle, siteDescription } from "./lib/seo";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { BackendWarmup } from "./components/backend-warmup";
import { ClickTracker } from "./components/click-tracker";
import "./globals.css";
import "./theme.css";
import "./readability.css";
import "./dropdown.css";
import "./brand-system.css";
import "./audit-fixes.css";

const themeScript = `(() => {
  try {
    const stored = localStorage.getItem("social9-theme");
    const theme = stored === "light" || stored === "dark"
      ? stored
      : matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch (_) {
    document.documentElement.dataset.theme = "dark";
  }
})();`;

const GTM_ID = "GTM-K6PBH7VH";
const META_PIXEL_ID = "1605123714199219";

// Analytics run only on the live site, never on localhost or preview deployments.
const isTrackedHost = (host: string | null | undefined) => /^(www\.)?social9\.io$/.test((host ?? "").split(":")[0]);

// Google Tag Manager (GA4 is configured inside it) and the Meta Pixel.
const trackingScript = `window.dataLayer = window.dataLayer || [];
if (/^(www\\.)?social9\\.io$/.test(location.hostname)) {
  try {
    var s9User = JSON.parse(localStorage.getItem('social9_user') || sessionStorage.getItem('social9_user') || 'null');
    dataLayer.push(s9User && s9User.id ? {user_id: String(s9User.id), logged_in: 'yes'} : {logged_in: 'no'});
  } catch (e) {}
  dataLayer.push({'gtm.start': new Date().getTime(), event: 'gtm.js'});
  (function(d){var j=d.createElement('script');j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id=${GTM_ID}';d.head.appendChild(j);})(document);

  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', '${META_PIXEL_ID}');
  fbq('track', 'PageView');
}`;

export function generateMetadata(): Metadata {
  const origin = siteOrigin();
  return {
    metadataBase: new URL(origin),
    title: { default: siteTitle, template: "%s | Social9" },
    description: siteDescription,
    keywords: ["social media scheduling", "Instagram scheduling tool", "LinkedIn scheduling tool", "Facebook Pages scheduling tool", "social media content calendar", "30-day content plan", "AI caption generator", "social media management for small businesses"],
    alternates: { canonical: origin },
    robots: { index: true, follow: true },
    icons: {
      icon: [{ url: "/social9-mark-v2-32.png", type: "image/png", sizes: "32x32" }],
      shortcut: "/social9-mark-v2-32.png",
      apple: "/social9-mark-v2-180.png",
    },
    openGraph: { title: siteTitle, description: siteDescription, siteName: "Social9", locale: "en_IN", type: "website", url: origin, images: [{ url: `${origin}/og.png`, width: 1730, height: 909, alt: "Social9 content planning and social media scheduling" }] },
    twitter: { card: "summary_large_image", title: siteTitle, description: siteDescription, images: [`${origin}/og.png`] },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const requestHeaders = await headers();
  const nonce = requestHeaders.get("x-nonce") ?? undefined;
  const tracked = isTrackedHost(requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"));
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/social9-mark-v2-32.png" type="image/png" />
        <link rel="shortcut icon" href="/social9-mark-v2-32.png" type="image/png" />
        <link rel="apple-touch-icon" href="/social9-mark-v2-180.png" />
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: trackingScript }} />
      </head>
      <body>
        {tracked && <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element -- Meta Pixel fallback must be a plain image. */}
          <img height="1" width="1" style={{ display: "none" }} alt="" src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`} />
        </noscript>}
        <BackendWarmup /><ClickTracker />{children}</body>
    </html>
  );
}

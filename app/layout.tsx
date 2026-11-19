import { siteOrigin, siteTitle, siteDescription } from "./lib/seo";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { BackendWarmup } from "./components/backend-warmup";
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
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/social9-mark-v2-32.png" type="image/png" />
        <link rel="shortcut icon" href="/social9-mark-v2-32.png" type="image/png" />
        <link rel="apple-touch-icon" href="/social9-mark-v2-180.png" />
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body><BackendWarmup />{children}</body>
    </html>
  );
}

import type { Metadata } from "next";

export const siteDescription = "Plan, schedule, and publish Instagram, Facebook Pages, and LinkedIn posts in one workspace. Start with a free 30-day content plan. Unlock AI captions with Premium.";
export const siteTitle = "Social9 | Instagram, Facebook & LinkedIn Scheduling Tool";

export function siteOrigin() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.social9.io").replace(/\/$/, "");
}

export function pageMetadata(title: string, description: string, path: string, index = false): Metadata {
  const url = `${siteOrigin()}${path}`;
  const fullTitle = `${title} | Social9`;
  return {
    title: { absolute: fullTitle },
    description,
    alternates: { canonical: url },
    robots: { index, follow: true },
    openGraph: { title: fullTitle, description, url, siteName: "Social9", type: "website", images: [{ url: `${siteOrigin()}/og.png`, width: 1730, height: 909, alt: "Social9 content planning and social media scheduling" }] },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [`${siteOrigin()}/og.png`] },
  };
}

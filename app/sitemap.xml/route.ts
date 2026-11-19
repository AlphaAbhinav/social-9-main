import { siteOrigin } from "../lib/seo";

export function GET() {
  const origin = siteOrigin().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  const urls = ["/", "/privacy", "/terms", "/refunds", "/data-deletion", "/instagram-scheduling", "/linkedin-scheduling", "/free-content-calendar", "/product-tour"];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((path) => `<url><loc>${origin}${path}</loc></url>`).join("")}</urlset>`, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}

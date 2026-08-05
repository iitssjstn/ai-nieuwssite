import { getArticles, getSiteSettings } from "@/lib/db";
import { getExcerpt } from "@/lib/content";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

function escapeXml(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getBaseUrl() {
  const h = headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

export async function GET() {
  const baseUrl = getBaseUrl();
  const { site_name, site_description } = getSiteSettings();
  const articles = getArticles({ status: "published" })
    .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
    .slice(0, 30);

  const items = articles
    .map((a) => `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${baseUrl}/artikel/${a.slug}</link>
      <guid>${baseUrl}/artikel/${a.slug}</guid>
      <pubDate>${new Date(a.published_at).toUTCString()}</pubDate>
      <category>${escapeXml(a.category)}</category>
      <description>${escapeXml(getExcerpt(a.body, 200))}</description>
    </item>`)
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(site_name)}</title>
    <link>${baseUrl}</link>
    <description>${escapeXml(site_description)}</description>
    <language>nl-NL</language>
${items}
  </channel>
</rss>`;

  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}

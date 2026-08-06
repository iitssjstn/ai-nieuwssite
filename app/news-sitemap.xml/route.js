import { getArticles, getSiteSettings } from "@/lib/db";
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
  const { site_name } = getSiteSettings();

  // Google Nieuws wil UITSLUITEND de laatste 48 uur aan artikelen in deze
  // sitemap — oudere artikelen moeten eruit, anders verliest de sitemap
  // vertrouwen bij Google. De reguliere sitemap.xml blijft verantwoordelijk
  // voor de volledige, permanente artikelenlijst.
  const cutoff = Date.now() - 48 * 60 * 60 * 1000;
  const recentArticles = getArticles({ status: "published" })
    .filter((a) => a.published_at && new Date(a.published_at).getTime() >= cutoff)
    .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
    .slice(0, 1000); // Google's harde limiet per sitemap-bestand

  const items = recentArticles
    .map((a) => `  <url>
    <loc>${baseUrl}/artikel/${a.slug}</loc>
    <news:news>
      <news:publication>
        <news:name>${escapeXml(site_name)}</news:name>
        <news:language>nl</news:language>
      </news:publication>
      <news:publication_date>${new Date(a.published_at).toISOString()}</news:publication_date>
      <news:title>${escapeXml(a.title)}</news:title>
    </news:news>
  </url>`)
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${items}
</urlset>`;

  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}

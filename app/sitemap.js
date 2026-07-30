import { getArticles } from "@/lib/db";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default function sitemap() {
  const h = headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") || "https";
  const baseUrl = `${proto}://${host}`;

  const published = getArticles({ status: "published" });

  const articleEntries = published.map((a) => ({
    url: `${baseUrl}/artikel/${a.slug}`,
    lastModified: a.published_at || a.created_at,
    changeFrequency: "hourly",
    priority: 0.8,
  }));

  const categories = ["binnenland", "economie", "sport", "tech"];
  const categoryEntries = categories.map((c) => ({
    url: `${baseUrl}/categorie/${c}`,
    changeFrequency: "hourly",
    priority: 0.5,
  }));

  return [
    { url: baseUrl, changeFrequency: "hourly", priority: 1 },
    ...categoryEntries,
    ...articleEntries,
  ];
}

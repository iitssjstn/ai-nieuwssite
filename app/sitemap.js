import { getArticles, getCategories } from "@/lib/db";
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
    // Reflecteert de echte laatste wijziging (bijv. na een AI-update of
    // handmatige redactie-edit), niet alleen de oorspronkelijke
    // publicatiedatum — Google gebruikt lastmod als versheidssignaal om te
    // bepalen hoe vaak een pagina opnieuw gecrawld moet worden.
    lastModified: a.updated_at || a.published_at || a.created_at,
    changeFrequency: "hourly",
    priority: 0.8,
  }));

  const categories = getCategories().map((c) => c.name.toLowerCase());
  const categoryEntries = categories.map((c) => ({
    url: `${baseUrl}/categorie/${c}`,
    changeFrequency: "hourly",
    priority: 0.5,
  }));

  const allTags = [...new Set(published.flatMap((a) => a.tags || []))];
  const tagEntries = allTags.map((t) => ({
    url: `${baseUrl}/tags/${encodeURIComponent(t.toLowerCase())}`,
    changeFrequency: "daily",
    priority: 0.4,
  }));

  return [
    { url: baseUrl, changeFrequency: "hourly", priority: 1 },
    ...categoryEntries,
    ...tagEntries,
    ...articleEntries,
  ];
}

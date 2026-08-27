import Link from "next/link";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { getArticles, getSiteSettings } from "@/lib/db";
import { headers } from "next/headers";

function getBaseUrl() {
  const h = headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

export function generateMetadata({ params }) {
  const tag = decodeURIComponent(params.tag);
  const baseUrl = getBaseUrl();
  const { site_name } = getSiteSettings();
  const url = `${baseUrl}/tags/${encodeURIComponent(tag.toLowerCase())}`;
  const title = `#${tag} — ${site_name}`;
  const description = `All articles tagged with "${tag}", compiled with AI and reviewed by the editorial team.`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website", siteName: site_name },
    twitter: { card: "summary", title, description },
  };
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins} min. ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  return `${Math.floor(hours / 24)} day(s) ago`;
}

export default function TagPage({ params }) {
  const tag = decodeURIComponent(params.tag);
  const baseUrl = getBaseUrl();
  const articles = getArticles({ status: "published" })
    .filter((a) => (a.tags || []).some((t) => t.toLowerCase() === tag.toLowerCase()))
    .sort((a, b) => new Date(b.published_at) - new Date(a.published_at));

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `#${tag}`,
    itemListElement: articles.slice(0, 50).map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${baseUrl}/artikel/${a.slug}`,
      name: a.title,
    })),
  };

  return (
    <div className="container">
      {articles.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
        />
      )}
      <Header />
      <h1 style={{ fontSize: 20, fontWeight: 500, marginBottom: 16 }}>#{tag}</h1>

      {articles.length === 0 && (
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          No articles with this tag yet.
        </p>
      )}

      {articles.map((a) => (
        <Link key={a.id} href={`/artikel/${a.slug}`} className="list-row">
          <div>
            <span className="cat">{timeAgo(a.published_at)}</span>
            <p>{a.title}</p>
          </div>
        </Link>
      ))}
      <Footer />
    </div>
  );
}

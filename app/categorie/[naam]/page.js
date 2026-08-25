import Link from "next/link";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { getArticles, getSiteSettings, getCategories } from "@/lib/db";
import { headers } from "next/headers";

function getBaseUrl() {
  const h = headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

function resolveCategoryName(naam, categories) {
  const match = categories.find((c) => c.name.toLowerCase() === naam.toLowerCase());
  return match ? match.name : naam.charAt(0).toUpperCase() + naam.slice(1).toLowerCase();
}

export function generateMetadata({ params }) {
  const naam = decodeURIComponent(params.naam);
  const capitalized = resolveCategoryName(naam, getCategories());
  const baseUrl = getBaseUrl();
  const { site_name } = getSiteSettings();
  const url = `${baseUrl}/categorie/${encodeURIComponent(naam.toLowerCase())}`;
  const title = `${capitalized} news — ${site_name}`;
  const description = `The latest ${capitalized.toLowerCase()} news, compiled with AI and reviewed by the editorial team.`;
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

export default function CategoryPage({ params }) {
  const naam = decodeURIComponent(params.naam);
  const categories = getCategories();
  const capitalized = resolveCategoryName(naam, categories);
  const articles = getArticles({ status: "published" })
    .filter((a) => a.category?.toLowerCase() === naam.toLowerCase())
    .sort((a, b) => new Date(b.published_at) - new Date(a.published_at));

  return (
    <div className="container" style={{ maxWidth: 1000 }}>
      <Header activeCategory={capitalized} />
      <h1 style={{ fontSize: 20, fontWeight: 500, marginBottom: 16 }}>
        {capitalized}
      </h1>

      {articles.length === 0 && (
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          No articles in this category yet.
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

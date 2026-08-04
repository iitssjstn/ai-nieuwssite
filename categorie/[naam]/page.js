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
  const title = `${capitalized} nieuws — ${site_name}`;
  const description = `Het laatste ${capitalized.toLowerCase()}-nieuws, samengesteld met AI en gecontroleerd door de redactie.`;
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
  if (mins < 60) return `${mins} min. geleden`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} uur geleden`;
  return `${Math.floor(hours / 24)} dag(en) geleden`;
}

export default function CategoryPage({ params }) {
  const naam = decodeURIComponent(params.naam);
  const categories = getCategories();
  const capitalized = resolveCategoryName(naam, categories);
  const articles = getArticles({ status: "published" })
    .filter((a) => a.category?.toLowerCase() === naam.toLowerCase())
    .sort((a, b) => new Date(b.published_at) - new Date(a.published_at));

  return (
    <div className="container">
      <Header activeCategory={capitalized} />
      <h1 style={{ fontSize: 20, fontWeight: 500, marginBottom: 16 }}>
        {capitalized}
      </h1>

      {articles.length === 0 && (
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          Nog geen artikelen in deze categorie.
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

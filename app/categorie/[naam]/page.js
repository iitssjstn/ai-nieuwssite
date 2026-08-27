import Link from "next/link";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import AdSlot from "../../components/AdSlot";
import { getArticles, getSiteSettings, getCategories, getAdSlots } from "@/lib/db";
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
  const baseUrl = getBaseUrl();
  const adSlots = getAdSlots();
  const articles = getArticles({ status: "published" })
    .filter((a) => a.category?.toLowerCase() === naam.toLowerCase())
    .sort((a, b) => new Date(b.published_at) - new Date(a.published_at));

  // Vertelt Google expliciet dat dit een geordende lijst artikelen is
  // (i.p.v. dat Google zelf uit de HTML moet afleiden welke links de
  // "inhoud" van de pagina vormen) — kan meehelpen bij sitelinks en een
  // beter begrip van de categorie-hiërarchie.
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${capitalized} news`,
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
      <Header activeCategory={capitalized} />

      <div className="category-layout">
        <div className="category-layout-ad">
          <AdSlot config={{ ...adSlots.banners.category_left, width: adSlots.banners.category_left?.width || 160, height: adSlots.banners.category_left?.height || 600 }} label="Ad space 160 x 600" />
        </div>

        <div>
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
        </div>

        <div className="category-layout-ad">
          <AdSlot config={{ ...adSlots.banners.category_right, width: adSlots.banners.category_right?.width || 160, height: adSlots.banners.category_right?.height || 600 }} label="Ad space 160 x 600" />
        </div>
      </div>

      <Footer />
    </div>
  );
}

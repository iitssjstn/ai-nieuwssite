import Link from "next/link";
import Image from "next/image";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import AdSlot from "../../components/AdSlot";
import CategoryTabs from "../../components/CategoryTabs";
import { getArticles, getSiteSettings, getCategories, getAdSlots } from "@/lib/db";
import { getExcerpt, getReadingTime } from "@/lib/content";
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

  const matchedCategory = categories.find((c) => c.name.toLowerCase() === naam.toLowerCase());
  const children = matchedCategory ? categories.filter((c) => c.parent === matchedCategory.name) : [];
  // Op de pagina van een hoofdcategorie tonen we ook meteen de artikelen
  // van al zijn subcategorieën (bijv. Sport toont ook Voetbal- en
  // F1-artikelen) — een subcategoriepagina zelf blijft, zoals voorheen,
  // uitsluitend zijn eigen artikelen tonen.
  const namesToMatch = [capitalized, ...children.map((c) => c.name)].map((n) => n.toLowerCase());
  // Voor het actief markeren in de navigatiebalk (die alleen hoofdcategorieën
  // toont): bij een subcategorie moet de balk zijn hoofdcategorie oplichten,
  // niet niets, want de subcategorie zelf staat daar niet in.
  const activeNavCategory = matchedCategory?.parent || capitalized;

  const articles = getArticles({ status: "published" })
    .filter((a) => a.category && namesToMatch.includes(a.category.toLowerCase()))
    .sort((a, b) => new Date(b.published_at) - new Date(a.published_at));

  // Op de pagina van een hoofdcategorie mét subcategorieën: bovenaan de 5
  // laatste artikelen uit de hele categorie (zichzelf + subcategorieën
  // samen), en daaronder per subcategorie een eigen sectie met zijn
  // recentste artikelen — hergebruikt dezelfde CategoryTabs-component en
  // -opmaak als de homepage, voor een consistente ervaring.
  const latestOverall = children.length > 0 ? articles.slice(0, 5) : [];
  const articlesByChildCategory = {};
  if (children.length > 0) {
    const published = getArticles({ status: "published" }).sort(
      (a, b) => new Date(b.published_at) - new Date(a.published_at)
    );
    for (const child of children) {
      articlesByChildCategory[child.name] = published
        .filter((a) => a.category === child.name)
        .slice(0, 5)
        .map((a) => ({
          id: a.id,
          slug: a.slug,
          title: a.title,
          category: a.category,
          featured_image: a.featured_image,
          featured_image_credit: a.featured_image_credit,
          timeAgo: timeAgo(a.published_at),
          readingTime: getReadingTime(a.body),
          excerpt: getExcerpt(a.body, 140),
        }));
    }
  }

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
      <Header activeCategory={activeNavCategory} />

      <div className="category-layout">
        <div className="category-layout-ad">
          <AdSlot config={{ ...adSlots.banners.category_left, width: adSlots.banners.category_left?.width || 160, height: adSlots.banners.category_left?.height || 600 }} label="Ad space 160 x 600" />
        </div>

        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500, marginBottom: matchedCategory?.parent ? 4 : 16 }}>
            {capitalized}
          </h1>

          {matchedCategory?.parent && (
            <Link href={`/categorie/${encodeURIComponent(matchedCategory.parent.toLowerCase())}`} style={{ fontSize: 13, color: "var(--text-muted)", display: "inline-block", marginBottom: 16 }}>
              ← Back to {matchedCategory.parent}
            </Link>
          )}

          {articles.length === 0 && (
            <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
              No articles in this category yet.
            </p>
          )}

          {children.length > 0 ? (
            <>
              {latestOverall.map((a) => (
                <Link key={a.id} href={`/artikel/${a.slug}`} className="list-row" style={{ gap: 14, justifyContent: "flex-start" }}>
                  {a.featured_image && (
                    <Image src={a.featured_image} alt={a.featured_image_credit?.alt || a.title} width={130} height={88} className="list-row-thumb" />
                  )}
                  <div style={{ minWidth: 0 }}>
                    <span className="cat">{a.category} · {timeAgo(a.published_at)}</span>
                    <p>{a.title}</p>
                  </div>
                </Link>
              ))}

              {Object.values(articlesByChildCategory).some((items) => items.length > 0) && (
                <div style={{ marginTop: 32 }}>
                  <h2 style={{ fontSize: 15, fontWeight: 500, marginBottom: 12 }}>By subcategory</h2>
                  <CategoryTabs categories={children} articlesByCategory={articlesByChildCategory} />
                </div>
              )}
            </>
          ) : (
            articles.map((a) => (
              <Link key={a.id} href={`/artikel/${a.slug}`} className="list-row">
                <div>
                  <span className="cat">{timeAgo(a.published_at)}</span>
                  <p>{a.title}</p>
                </div>
              </Link>
            ))
          )}
        </div>

        <div className="category-layout-ad">
          <AdSlot config={{ ...adSlots.banners.category_right, width: adSlots.banners.category_right?.width || 160, height: adSlots.banners.category_right?.height || 600 }} label="Ad space 160 x 600" />
        </div>
      </div>

      <Footer />
    </div>
  );
}

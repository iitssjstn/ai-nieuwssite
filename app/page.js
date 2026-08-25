import Link from "next/link";
import Image from "next/image";
import Header from "./components/Header";
import Footer from "./components/Footer";
import LiveTimeLabel from "./components/LiveTimeLabel";
import AdSlot from "./components/AdSlot";
import AdSenseUnit from "./components/AdSenseUnit";
import CategoryTabs from "./components/CategoryTabs";
import NewsletterWidget from "./components/NewsletterWidget";
import Sparkline from "./components/Sparkline";
import PollWidget from "./components/PollWidget";
import { getArticles, getSiteSettings, getCategories, getAdSlots, getAdsenseClientId, getTrendingTags, getPolls, getNewsletterSettings } from "@/lib/db";
import { getExcerpt, formatImageCredit, getCategoryStyle, getReadingTime } from "@/lib/content";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

function getBaseUrl() {
  const h = headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

export function generateMetadata() {
  const baseUrl = getBaseUrl();
  const { site_name, site_description } = getSiteSettings();
  const title = `${site_name} — Actueel nieuws`;
  return {
    title,
    description: site_description,
    alternates: { canonical: baseUrl },
    openGraph: {
      title,
      description: site_description,
      url: baseUrl,
      type: "website",
      siteName: site_name,
    },
    twitter: {
      card: "summary",
      title,
      description: site_description,
    },
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

export default function HomePage() {
  const baseUrl = getBaseUrl();
  const { site_name, site_description } = getSiteSettings();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsMediaOrganization",
    name: site_name,
    url: baseUrl,
    description: site_description,
  };

  const categories = getCategories();
  const adSlots = getAdSlots();
  const adsenseClientId = getAdsenseClientId();
  const published = getArticles({ status: "published" }).sort(
    (a, b) => new Date(b.published_at) - new Date(a.published_at)
  );

  // Hero/grid show ONLY manually featured articles (most recently
  // featured first). If you don't feature anything, this area stays empty
  // and everything just lives in "Latest News" — no automatic fallback to
  // "newest first" anymore, that was deliberately undesired.
  const featured = published
    .filter((a) => a.featured)
    .sort((a, b) => new Date(b.featured_at) - new Date(a.featured_at));

  const [hero, ...rest] = featured;
  const gridItems = rest.slice(0, 4);
  const latestNews = published.slice(0, 5);
  const mostRead = [...published].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);
  const trendingTags = getTrendingTags();
  const { enabled: newsletterEnabled } = getNewsletterSettings();

  const activePoll = getPolls()
    .filter((p) => p.active)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

  // Prepare the 3 most recent articles per category, with pre-
  // computed reading time/timestamp/excerpt — CategoryTabs is a
  // client component and can't call these server-only helpers itself.
  const articlesByCategory = {};
  for (const c of categories) {
    articlesByCategory[c.name] = published
      .filter((a) => a.category === c.name)
      .slice(0, 3)
      .map((a) => ({
        id: a.id,
        slug: a.slug,
        title: a.title,
        category: a.category,
        featured_image: a.featured_image,
        timeAgo: timeAgo(a.published_at),
        readingTime: getReadingTime(a.body),
        excerpt: getExcerpt(a.body, 140),
      }));
  }

  return (
    <div className="container" style={{ maxWidth: 1350 }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />

      <div style={{ margin: "16px 0" }}>
        <AdSlot config={{ ...adSlots.banners.top_banner, width: adSlots.banners.top_banner?.width || 728, height: adSlots.banners.top_banner?.height || 90 }} />
      </div>
      <h1 className="sr-only">{site_name} — Actueel Nederlands nieuws</h1>

      <p style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "capitalize", margin: "0 0 16px" }}>
        {new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      </p>

      <div className="hero-row">
        {/* Hero */}
        <div>
          {hero && (
            <Link href={`/artikel/${hero.slug}`} style={{ textDecoration: "none", color: "inherit", display: "block", height: "100%" }}>
              <div className={`hero-card${hero.featured_image ? " has-image" : ""}`} style={{ height: "100%" }}>
                {hero.featured_image && (
                  <>
                    <Image src={hero.featured_image} alt={hero.title} fill sizes="(max-width: 780px) 100vw, 900px" className="hero-card-image" style={{ objectFit: "cover" }} priority />
                    <div className="hero-card-overlay" />
                  </>
                )}
                <div className={hero.featured_image ? "hero-card-content" : undefined}>
                  <span className="badge" style={getCategoryStyle(hero.category, categories)}>{hero.category}</span>
                  {hero.featured && (
                    <span className="badge badge-muted" style={{ marginLeft: 6 }}>★ Featured</span>
                  )}
                  <h2>{hero.title}</h2>
                  <p className="excerpt">{getExcerpt(hero.body)}</p>
                  <p className="meta">
                    {site_name} Editorial · {timeAgo(hero.published_at)} · {getReadingTime(hero.body)}
                    {formatImageCredit(hero.featured_image_credit) && ` · ${formatImageCredit(hero.featured_image_credit)}`}
                  </p>
                </div>
              </div>
            </Link>
          )}

          {!hero && published.length > 0 && (
            <div style={{ background: "var(--surface-1)", borderRadius: 12, padding: "24px 20px", textAlign: "center" }}>
              <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: 0 }}>
                No article featured on the homepage yet.
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "6px 0 0" }}>
                View all new articles in "Latest News" alongside.
              </p>
            </div>
          )}

          {published.length === 0 && (
            <p style={{ color: "var(--text-secondary)" }}>
              No published articles yet.
            </p>
          )}
        </div>

        {/* Latest News */}
        <div className="sidebar-box">
          <h3>Latest News</h3>
          {latestNews.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No articles yet.</p>
          )}
          {latestNews.map((a) => (
            <Link key={a.id} href={`/artikel/${a.slug}`} className="latest-news-row">
              <LiveTimeLabel publishedAt={a.published_at} category={a.category}>
                <p className="latest-news-title">{a.title}</p>
              </LiveTimeLabel>
            </Link>
          ))}
          {published.length > 5 && (
            <Link href="/nieuws" style={{ display: "block", textAlign: "center", fontSize: 13, color: "var(--accent-text)", marginTop: 12, paddingTop: 12, borderTop: "1px dashed var(--border)" }}>
              More news →
            </Link>
          )}
        </div>

        {/* Most read */}
        <div className="sidebar-box">
          <h3>Most Read</h3>
          {mostRead.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No views yet.</p>
          )}
          {mostRead.map((a, i) => (
            <Link key={a.id} href={`/artikel/${a.slug}`} className="sidebar-item">
              <span className="sidebar-rank">{i + 1}</span>
              <p>{a.title}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="home-layout">
        {/* Main column */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 500, margin: "0 0 10px" }}>Jump to</p>
          <div style={{ display: "flex", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
            {[
              {
                href: "/kaart", label: "Map",
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M9 20 3 17V4l6 3m0 13 6-3m-6 3V7m6 10 6 3V7l-6-3m0 13V4m0 3-6-3" />
                  </svg>
                ),
              },
              {
                href: "/polls", label: "Polls",
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M4 20V10m7 10V4m7 16v-7" />
                  </svg>
                ),
              },
              {
                href: "/liveblog", label: "Live Blog",
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
                    <path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8" />
                  </svg>
                ),
              },
              ...(newsletterEnabled
                ? [{
                    href: "/#nieuwsbrief", label: "Newsletter",
                    icon: (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <rect x="3" y="5" width="18" height="14" rx="2" />
                        <path d="m3 7 9 6 9-6" />
                      </svg>
                    ),
                  }]
                : []),
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                  width: 92, padding: "14px 8px", borderRadius: 12, border: "1px solid var(--border)",
                  background: "var(--surface-1)", textDecoration: "none", color: "var(--text-primary)",
                  fontSize: 12, textAlign: "center",
                }}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </div>

          {gridItems.length > 0 && (
            <>
              <h2 style={{ fontSize: 15, fontWeight: 500, margin: "24px 0 12px" }}>Featured</h2>
              <div className="grid-4">
              {gridItems.map((a) => (
                <Link key={a.id} href={`/artikel/${a.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div className="card">
                    {a.featured_image && (
                      <Image src={a.featured_image} alt={a.title} width={400} height={225} sizes="(max-width: 720px) 50vw, 25vw" style={{ width: "100%", height: "auto", borderRadius: 6, marginBottom: 12, display: "block" }} />
                    )}
                    <span className="badge badge-muted" style={getCategoryStyle(a.category, categories)}>{a.category}</span>
                    <h3>{a.title}</h3>
                    <p className="meta">{timeAgo(a.published_at)}</p>
                  </div>
                </Link>
              ))}
            </div>
            </>
          )}

          {categories.length > 0 && (
            <div style={{ marginTop: 28 }}>
              <h2 style={{ fontSize: 15, fontWeight: 500, marginBottom: 12 }}>Nieuws per categorie</h2>
              <CategoryTabs categories={categories} articlesByCategory={articlesByCategory} />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div>
          <div style={{ marginTop: 0 }}>
            <AdSlot config={{ ...adSlots.banners.homepage_sidebar, width: adSlots.banners.homepage_sidebar?.width || 300, height: adSlots.banners.homepage_sidebar?.height || 250 }} />
          </div>

          {trendingTags.length > 0 && (
            <div className="sidebar-box" style={{ marginTop: 20 }}>
              <h3>Trending onderwerpen</h3>
              {trendingTags.map((t, i) => (
                <Link key={t.tag} href={`/tags/${encodeURIComponent(t.tag.toLowerCase())}`} className="sidebar-item" style={{ justifyContent: "space-between" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <span className="sidebar-rank">{i + 1}</span>
                    <p style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.tag}</p>
                  </span>
                  <Sparkline data={t.sparkline} />
                </Link>
              ))}
            </div>
          )}

          {activePoll && (
            <div className="sidebar-box" style={{ marginTop: 20 }}>
              <h3>Poll of the Day</h3>
              <p style={{ fontSize: 13, fontWeight: 500, margin: "0 0 10px" }}>{activePoll.question}</p>
              <PollWidget pollId={activePoll.id} compact />
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
                <Link href="/polls" style={{ color: "var(--accent-text)" }}>Bekijk alle polls</Link>
              </p>
            </div>
          )}

          {newsletterEnabled && (
            <div style={{ marginTop: 20 }}>
              <NewsletterWidget />
            </div>
          )}
        </div>
      </div>

      {adSlots.adsense_slot && adsenseClientId && (
        <div style={{ margin: "28px 0" }}>
          <AdSenseUnit client={adsenseClientId} slot={adSlots.adsense_slot} />
        </div>
      )}

      <Footer />
    </div>
  );
}

import Image from "next/image";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import LiveTimeLabel from "../../components/LiveTimeLabel";
import Link from "next/link";
import LiveblogTimeline from "../../components/LiveblogTimeline";
import PollWidget from "../../components/PollWidget";
import AdSlot from "../../components/AdSlot";
import NativeAd from "../../components/NativeAd";
import KeyClaims from "../../components/KeyClaims";
import ShareButtons from "../../components/ShareButtons";
import { getArticle, getArticleBySlug, getArticles, getSiteSettings, getCategories, getAdSlots, incrementViews } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { isHtmlBody, getExcerpt, resolveImageUrl, getCategoryStyle } from "@/lib/content";
import { isBotUserAgent } from "@/lib/bot-detection";

// Voorkomt dat het bezoek van de ingelogde admin/redacteur zelf (bijv. even
// een net gepubliceerd artikel controleren) meetelt als een gewone
// paginaweergave in de statistieken.
async function isAdminSession() {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) return false;
  return Boolean(await verifySessionToken(token));
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.floor(mins / 60);
  return `${hours} hour${hours === 1 ? "" : "s"} ago`;
}

function getBaseUrl() {
  const h = headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

function resolveArticle(slug) {
  const bySlug = getArticleBySlug(slug);
  if (bySlug) return bySlug;

  // Terugwaartse compatibiliteit: oude links gebruikten het ruwe artikel-ID
  // als URL. Bestaat dat artikel nog, stuur dan door naar de nieuwe,
  // leesbare slug-URL — zo blijven gedeelde links en Google-indexering intact.
  const byId = getArticle(slug);
  if (byId?.status === "published" && byId.slug) {
    redirect(`/artikel/${byId.slug}`);
  }
  return null;
}

export function generateMetadata({ params }) {
  const article = resolveArticle(params.slug);
  if (!article || article.status !== "published") return {};

  const baseUrl = getBaseUrl();
  const { site_name } = getSiteSettings();
  const url = `${baseUrl}/artikel/${article.slug}`;
  const description = getExcerpt(article.body, 160);
  const images = article.featured_image ? [resolveImageUrl(article.featured_image, baseUrl)] : [];

  return {
    // Naast de kale titel ook de sitenaam meegeven: dit is wat Google
    // meestal als bladtitel/linktekst in de zoekresultaten toont en helpt
    // herkenning + merkopbouw bij herhaald zoeken.
    title: `${article.title} | ${site_name}`,
    description,
    keywords: article.tags?.length ? article.tags.join(", ") : undefined,
    alternates: { canonical: url },
    // Expliciet i.p.v. impliciet vertrouwen op de default — voorkomt dat een
    // toekomstige globale robots-wijziging per ongeluk artikelen uitsluit.
    robots: { index: true, follow: true },
    openGraph: {
      title: article.title,
      description,
      url,
      type: "article",
      images,
      siteName: site_name,
      locale: "en_US",
      publishedTime: article.published_at || undefined,
      modifiedTime: article.updated_at || article.published_at || undefined,
      section: article.category,
      tags: article.tags,
    },
    twitter: {
      card: images.length ? "summary_large_image" : "summary",
      title: article.title,
      description,
      images,
    },
  };
}

export default async function ArticlePage({ params }) {
  const article = resolveArticle(params.slug);
  if (!article || article.status !== "published") notFound();

  // Alleen echte, menselijke bezoeken meetellen — niet de admin zelf, en
  // niet crawlers/linkpreview-bots/scanners (zie lib/bot-detection.js).
  // Belangrijk voor betrouwbare cijfers, o.a. als basis voor
  // advertentietarieven.
  if (!(await isAdminSession()) && !isBotUserAgent(headers().get("user-agent"))) {
    incrementViews(article.id);
  }

  const { site_name } = getSiteSettings();
  const categories = getCategories();
  const adSlots = getAdSlots();
  const latestNews = getArticles({ status: "published" })
    .filter((a) => a.id !== article.id)
    .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
    .slice(0, 7);

  const baseUrl = getBaseUrl();
  const htmlBody = isHtmlBody(article.body);
  const paragraphs = htmlBody ? [] : article.body.split("\n").filter(Boolean);
  const mid = Math.ceil(paragraphs.length / 2);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: getExcerpt(article.body, 160),
    datePublished: article.published_at,
    dateModified: article.updated_at || article.published_at,
    inLanguage: "en-US",
    articleSection: article.category,
    keywords: article.tags?.length ? article.tags.join(", ") : undefined,
    image: article.featured_image
      ? {
          "@type": "ImageObject",
          url: resolveImageUrl(article.featured_image, baseUrl),
          // Komt overeen met de vaste afmetingen waarop de featured image
          // hierboven daadwerkelijk gerenderd wordt.
          width: 800,
          height: 450,
        }
      : undefined,
    author: {
      "@type": "Organization",
      name: site_name,
      url: baseUrl,
    },
    publisher: {
      "@type": "Organization",
      name: site_name,
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/icon.svg`,
        width: 512,
        height: 512,
      },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${baseUrl}/artikel/${article.slug}` },
  };

  // Helpt Google de plek van het artikel in de sitestructuur begrijpen en
  // kan als broodkruimel-pad in de zoekresultaten getoond worden i.p.v.
  // de kale URL.
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: article.category,
        item: `${baseUrl}/categorie/${encodeURIComponent(article.category.toLowerCase())}`,
      },
      { "@type": "ListItem", position: 3, name: article.title, item: `${baseUrl}/artikel/${article.slug}` },
    ],
  };

  return (
    <div className="container" style={{ maxWidth: 1350 }}>
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="home-layout">
        <div>
          <span className="badge" style={getCategoryStyle(article.category, categories)}>{article.category}</span>
      {article.is_liveblog && (
        <span className="badge" style={{ background: "#FF3B4D", color: "#fff", marginLeft: 6, display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", display: "inline-block" }} />
          LIVE
        </span>
      )}
      {article.updated_at && (
        <span className="badge badge-muted" style={{ marginLeft: 6 }} title={article.last_update_summary || undefined}>
          🔄 Updated: {article.last_update_summary || new Date(article.updated_at).toLocaleDateString("en-US")}
        </span>
      )}
      <article>
        <h1>{article.title}</h1>
        <div className="byline">
          <div className="icon-circle">{site_name.charAt(0)}</div>
          <div>
            <p>Written with AI, reviewed by our editorial team</p>
            <p className="small">{timeAgo(article.published_at)} · Source: {article.source_id}</p>
          </div>
        </div>

        <div style={{ margin: "0 0 20px" }}>
          <ShareButtons slug={article.slug} title={article.title} />
        </div>

        {article.featured_image && (
          <>
            <Image
              src={article.featured_image}
              alt={article.featured_image_credit?.alt || article.title}
              width={800}
              height={450}
              sizes="(max-width: 780px) 100vw, 780px"
              style={{ width: "100%", height: "auto", borderRadius: 12, marginBottom: article.featured_image_credit?.name ? 4 : 20, display: "block" }}
              priority
            />
            {article.featured_image_credit?.name && (
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20 }}>
                Foto:{" "}
                {article.featured_image_credit.url ? (
                  <a href={article.featured_image_credit.url} target="_blank" rel="noopener noreferrer" style={{ color: "inherit" }}>
                    {article.featured_image_credit.name}
                  </a>
                ) : (
                  article.featured_image_credit.name
                )}
                {article.featured_image_credit.source && ` via ${article.featured_image_credit.source}`}
              </p>
            )}
          </>
        )}

        <KeyClaims claims={article.claims} />

        {article.is_liveblog ? (
          <>
            {article.body && (
              htmlBody ? (
                <div dangerouslySetInnerHTML={{ __html: article.body }} style={{ marginBottom: 20 }} />
              ) : (
                paragraphs.map((p, i) => <p key={i}>{p}</p>)
              )
            )}
            <LiveblogTimeline articleId={article.id} initialUpdates={article.liveblog_updates || []} />
          </>
        ) : htmlBody ? (
          <div dangerouslySetInnerHTML={{ __html: article.body }} />
        ) : (
          <>
            {paragraphs.slice(0, mid).map((p, i) => <p key={i}>{p}</p>)}
            {paragraphs.length > 1 && (
              <div className="ad-slot" style={{ marginBottom: 20 }}>
                <NativeAd
                  scriptUrl={adSlots.native_banner?.script_url}
                  containerId={adSlots.native_banner?.container_id}
                />
              </div>
            )}
            {paragraphs.slice(mid).map((p, i) => <p key={"b" + i}>{p}</p>)}
          </>
        )}

        {htmlBody && (
          <div className="ad-slot" style={{ marginTop: 20 }}>
            <AdSlot config={{ ...adSlots.banners.article_incontent, width: adSlots.banners.article_incontent?.width || 468, height: adSlots.banners.article_incontent?.height || 60 }} />
          </div>
        )}

        {article.poll_id && <PollWidget pollId={article.poll_id} />}

        {article.tags?.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 24 }}>
            {article.tags.map((tag) => (
              <Link key={tag} href={`/tags/${encodeURIComponent(tag.toLowerCase())}`} className="badge badge-muted" style={{ textDecoration: "none" }}>
                #{tag}
              </Link>
            ))}
          </div>
        )}
      </article>

      <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
        This article was written with the help of AI based on a source from {article.source_id} and reviewed before publication.
      </p>
        </div>

        <div>
          <div className="sidebar-box">
            <h3>Latest News</h3>
            {latestNews.length === 0 && (
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No other articles yet.</p>
            )}
            {latestNews.map((a) => (
              <Link key={a.id} href={`/artikel/${a.slug}`} className="latest-news-row">
                <LiveTimeLabel publishedAt={a.published_at} category={a.category}>
                  <p className="latest-news-title">{a.title}</p>
                </LiveTimeLabel>
              </Link>
            ))}
          </div>

          <div className="ad-slot" style={{ marginTop: 20 }}>
            <AdSlot config={{ ...adSlots.banners.article_sidebar, width: adSlots.banners.article_sidebar?.width || 160, height: adSlots.banners.article_sidebar?.height || 300 }} />
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

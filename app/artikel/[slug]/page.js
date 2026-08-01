import Header from "../../components/Header";
import Link from "next/link";
import LiveblogTimeline from "../../components/LiveblogTimeline";
import PollWidget from "../../components/PollWidget";
import { getArticle, getArticleBySlug, incrementViews } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { isHtmlBody, getExcerpt, resolveImageUrl } from "@/lib/content";

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins} minuten geleden`;
  const hours = Math.floor(mins / 60);
  return `${hours} uur geleden`;
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
  const url = `${baseUrl}/artikel/${article.slug}`;
  const description = getExcerpt(article.body, 160);
  const images = article.featured_image ? [resolveImageUrl(article.featured_image, baseUrl)] : [];

  return {
    title: article.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: article.title,
      description,
      url,
      type: "article",
      images,
    },
    twitter: {
      card: images.length ? "summary_large_image" : "summary",
      title: article.title,
      description,
      images,
    },
  };
}

export default function ArticlePage({ params }) {
  const article = resolveArticle(params.slug);
  if (!article || article.status !== "published") notFound();

  incrementViews(article.id);

  const baseUrl = getBaseUrl();
  const htmlBody = isHtmlBody(article.body);
  const paragraphs = htmlBody ? [] : article.body.split("\n").filter(Boolean);
  const mid = Math.ceil(paragraphs.length / 2);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    datePublished: article.published_at,
    dateModified: article.published_at,
    image: article.featured_image ? [resolveImageUrl(article.featured_image, baseUrl)] : undefined,
    publisher: { "@type": "Organization", name: "Dagblad" },
    mainEntityOfPage: `${baseUrl}/artikel/${article.slug}`,
  };

  return (
    <div className="container">
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <span className="badge">{article.category}</span>
      {article.is_liveblog && (
        <span className="badge" style={{ background: "#a32d2d", color: "#fff", marginLeft: 6 }}>
          🔴 LIVE
        </span>
      )}
      <article>
        <h1>{article.title}</h1>
        <div className="byline">
          <div className="icon-circle">✦</div>
          <div>
            <p>Opgesteld met AI, gecontroleerd door redactie</p>
            <p className="small">{timeAgo(article.published_at)} · Bron: {article.source_id}</p>
          </div>
        </div>

        {article.featured_image && (
          <>
            <img
              src={article.featured_image}
              alt=""
              style={{ width: "100%", borderRadius: 12, marginBottom: article.featured_image_credit?.name ? 4 : 20, display: "block" }}
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
                <span className="badge badge-muted">Advertentie</span>
              </div>
            )}
            {paragraphs.slice(mid).map((p, i) => <p key={"b" + i}>{p}</p>)}
          </>
        )}

        {htmlBody && (
          <div className="ad-slot" style={{ marginTop: 20 }}>
            <span className="badge badge-muted">Advertentie</span>
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

      <div className="footer-note">
        Dit artikel is opgesteld met behulp van AI op basis van een bron van {article.source_id} en gecontroleerd voor publicatie.
      </div>
    </div>
  );
}

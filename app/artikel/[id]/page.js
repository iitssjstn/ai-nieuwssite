import Header from "../../components/Header";
import { getArticle, incrementViews } from "@/lib/db";
import { notFound } from "next/navigation";
import { isHtmlBody } from "@/lib/content";

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins} minuten geleden`;
  const hours = Math.floor(mins / 60);
  return `${hours} uur geleden`;
}

export default function ArticlePage({ params }) {
  const article = getArticle(params.id);
  if (!article || article.status !== "published") notFound();

  incrementViews(params.id);

  const htmlBody = isHtmlBody(article.body);
  const paragraphs = htmlBody ? [] : article.body.split("\n").filter(Boolean);
  const mid = Math.ceil(paragraphs.length / 2);

  return (
    <div className="container">
      <Header />
      <span className="badge">{article.category}</span>
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
          <img
            src={article.featured_image}
            alt=""
            style={{ width: "100%", borderRadius: 12, marginBottom: 20, display: "block" }}
          />
        )}

        {htmlBody ? (
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
      </article>

      <div className="footer-note">
        Dit artikel is opgesteld met behulp van AI op basis van een bron van {article.source_id} en gecontroleerd voor publicatie.
      </div>
    </div>
  );
}

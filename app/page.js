import Link from "next/link";
import Header from "./components/Header";
import { getArticles } from "@/lib/db";
import { getExcerpt } from "@/lib/content";

export const dynamic = "force-dynamic";

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins} min. geleden`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} uur geleden`;
  return `${Math.floor(hours / 24)} dag(en) geleden`;
}

function sourceLabel(sourceId) {
  const map = { "src-anp": "ANP", "src-rijksoverheid": "Rijksoverheid" };
  return map[sourceId] || sourceId;
}

export default function HomePage() {
  const published = getArticles({ status: "published" }).sort(
    (a, b) => new Date(b.published_at) - new Date(a.published_at)
  );

  const [hero, ...rest] = published;
  const gridItems = rest.slice(0, 2);
  const latestNews = published.slice(0, 12);
  const mostRead = [...published].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);

  return (
    <div className="container" style={{ maxWidth: 1080 }}>
      <Header />

      <div className="home-layout">
        {/* Hoofdkolom */}
        <div>
          {hero && (
            <Link href={`/artikel/${hero.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div className="hero-card">
                {hero.featured_image && (
                  <img src={hero.featured_image} alt="" style={{ width: "100%", borderRadius: 8, marginBottom: 12, display: "block" }} />
                )}
                <span className="badge">{hero.category}</span>
                <h2>{hero.title}</h2>
                <p className="excerpt">{getExcerpt(hero.body)}</p>
                <p className="meta">{timeAgo(hero.published_at)} · Bron: {sourceLabel(hero.source_id)}</p>
              </div>
            </Link>
          )}

          {gridItems.length > 0 && (
            <div className="grid-2">
              {gridItems.map((a) => (
                <Link key={a.id} href={`/artikel/${a.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div className="card">
                    {a.featured_image && (
                      <img src={a.featured_image} alt="" style={{ width: "100%", borderRadius: 6, marginBottom: 8, display: "block" }} />
                    )}
                    <span className="badge badge-muted">{a.category}</span>
                    <h3>{a.title}</h3>
                    <p className="meta">{timeAgo(a.published_at)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div style={{ marginTop: 8 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Laatste nieuws</h3>
            {latestNews.map((a) => (
              <Link key={a.id} href={`/artikel/${a.id}`} className="latest-news-row">
                <span className="latest-news-time">{timeAgo(a.published_at)}</span>
                <span className="latest-news-cat">{a.category}</span>
                <p className="latest-news-title">{a.title}</p>
              </Link>
            ))}
          </div>

          {published.length === 0 && (
            <p style={{ color: "var(--text-secondary)" }}>
              Nog geen gepubliceerde artikelen.
            </p>
          )}
        </div>

        {/* Sidebar */}
        <div>
          <div className="sidebar-box">
            <h3>Meest gelezen</h3>
            {mostRead.length === 0 && (
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Nog geen weergaven.</p>
            )}
            {mostRead.map((a, i) => (
              <Link key={a.id} href={`/artikel/${a.id}`} className="sidebar-item">
                <span className="sidebar-rank">{i + 1}</span>
                <p>{a.title}</p>
              </Link>
            ))}
          </div>

          <div className="ad-slot" style={{ marginTop: 20, border: "1px solid var(--border)", borderRadius: 12 }}>
            <span className="badge badge-muted">Advertentie</span>
          </div>
        </div>
      </div>

      <div className="footer-note">
        Artikelen worden opgesteld met behulp van AI op basis van geverifieerde bronnen en gecontroleerd voor publicatie.
      </div>
    </div>
  );
}

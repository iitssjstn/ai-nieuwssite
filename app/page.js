import Link from "next/link";
import Header from "./components/Header";
import Footer from "./components/Footer";
import LiveTimeLabel from "./components/LiveTimeLabel";
import { getArticles } from "@/lib/db";
import { getExcerpt, formatImageCredit, getCategoryStyle } from "@/lib/content";

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

  // Hero/grid tonen UITSLUITEND handmatig uitgelichte artikelen (nieuwst-
  // uitgelicht eerst). Licht je niets uit, dan blijft dit gebied leeg en
  // staat alles gewoon in "Laatste nieuws" — geen automatische terugval op
  // "nieuwste eerst" meer, dat was bewust ongewenst.
  const featured = published
    .filter((a) => a.featured)
    .sort((a, b) => new Date(b.featured_at) - new Date(a.featured_at));

  const [hero, ...rest] = featured;
  const gridItems = rest.slice(0, 2);
  const latestNews = published.slice(0, 7);
  const mostRead = [...published].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);

  return (
    <div className="container" style={{ maxWidth: 1080 }}>
      <Header />

      <p style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "capitalize", margin: "0 0 16px" }}>
        {new Date().toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      </p>

      <div className="home-layout">
        {/* Hoofdkolom */}
        <div>
          {hero && (
            <Link href={`/artikel/${hero.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div className="hero-card">
                {hero.featured_image && (
                  <>
                    <img src={hero.featured_image} alt="" style={{ width: "100%", borderRadius: 8, marginBottom: 4, display: "block" }} />
                    {formatImageCredit(hero.featured_image_credit) && (
                      <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>
                        {formatImageCredit(hero.featured_image_credit)}
                      </p>
                    )}
                  </>
                )}
                <span className="badge" style={getCategoryStyle(hero.category)}>{hero.category}</span>
                {hero.featured && (
                  <span className="badge badge-muted" style={{ marginLeft: 6 }}>★ Uitgelicht</span>
                )}
                <h2>{hero.title}</h2>
                <p className="excerpt">{getExcerpt(hero.body)}</p>
                <p className="meta">{timeAgo(hero.published_at)} · Bron: {sourceLabel(hero.source_id)}</p>
              </div>
            </Link>
          )}

          {gridItems.length > 0 && (
            <div className="grid-2">
              {gridItems.map((a) => (
                <Link key={a.id} href={`/artikel/${a.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div className="card">
                    {a.featured_image && (
                      <img src={a.featured_image} alt="" style={{ width: "100%", borderRadius: 6, marginBottom: 8, display: "block" }} />
                    )}
                    <span className="badge badge-muted" style={getCategoryStyle(a.category)}>{a.category}</span>
                    <h3>{a.title}</h3>
                    <p className="meta">{timeAgo(a.published_at)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {!hero && published.length > 0 && (
            <div style={{ background: "var(--surface-1)", borderRadius: 12, padding: "24px 20px", textAlign: "center" }}>
              <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: 0 }}>
                Nog geen artikel uitgelicht op de hoofdpagina.
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "6px 0 0" }}>
                Bekijk alle nieuwe artikelen in "Laatste nieuws" hiernaast.
              </p>
            </div>
          )}

          <div style={{ marginTop: 8 }}>
            {published.length === 0 && (
              <p style={{ color: "var(--text-secondary)" }}>
                Nog geen gepubliceerde artikelen.
              </p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div>
          <div className="sidebar-box">
            <h3>Laatste nieuws</h3>
            {latestNews.length === 0 && (
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Nog geen artikelen.</p>
            )}
            {latestNews.map((a) => (
              <Link key={a.id} href={`/artikel/${a.slug}`} className="latest-news-row">
                <LiveTimeLabel publishedAt={a.published_at} category={a.category}>
                  <p className="latest-news-title">{a.title}</p>
                </LiveTimeLabel>
              </Link>
            ))}
          </div>

          <div className="sidebar-box" style={{ marginTop: 20 }}>
            <h3>Meest gelezen</h3>
            {mostRead.length === 0 && (
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Nog geen weergaven.</p>
            )}
            {mostRead.map((a, i) => (
              <Link key={a.id} href={`/artikel/${a.slug}`} className="sidebar-item">
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

      <Footer />
    </div>
  );
}

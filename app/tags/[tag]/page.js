import Link from "next/link";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { getArticles } from "@/lib/db";

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins} min. geleden`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} uur geleden`;
  return `${Math.floor(hours / 24)} dag(en) geleden`;
}

export default function TagPage({ params }) {
  const tag = decodeURIComponent(params.tag);
  const articles = getArticles({ status: "published" })
    .filter((a) => (a.tags || []).some((t) => t.toLowerCase() === tag.toLowerCase()))
    .sort((a, b) => new Date(b.published_at) - new Date(a.published_at));

  return (
    <div className="container">
      <Header />
      <h1 style={{ fontSize: 20, fontWeight: 500, marginBottom: 16 }}>#{tag}</h1>

      {articles.length === 0 && (
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          Nog geen artikelen met deze tag.
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

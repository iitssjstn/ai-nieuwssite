import Header from "../components/Header";
import Footer from "../components/Footer";
import Link from "next/link";
import { getArticles, getSiteSettings } from "@/lib/db";
import { getExcerpt, getReadingTime } from "@/lib/content";

export function generateMetadata({ searchParams }) {
  const { site_name } = getSiteSettings();
  const q = searchParams?.q || "";
  return {
    title: q ? `Search: ${q} — ${site_name}` : `Search — ${site_name}`,
    // Search results shouldn't be indexed — every search query is
    // technically a separate URL (?q=...) with largely the same layout
    // around it, which Google sees as duplicate content without a
    // canonical. Google itself explicitly advises setting this kind of
    // page to noindex instead of choosing a canonical (there IS no
    // "main version" of a search result).
    robots: { index: false, follow: true },
  };
}

export default function SearchPage({ searchParams }) {
  const q = (searchParams?.q || "").trim();
  const qLower = q.toLowerCase();

  const results = q
    ? getArticles({ status: "published" })
        .filter((a) => a.title.toLowerCase().includes(qLower) || (a.body || "").toLowerCase().includes(qLower))
        .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
    : [];

  return (
    <div className="container">
      <Header />

      <form action="/zoeken" method="GET" style={{ marginBottom: 24 }}>
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search articles..."
          autoFocus
          style={{ fontSize: 15, padding: "10px 14px" }}
        />
      </form>

      {q && (
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
          {results.length} results for "{q}"
        </p>
      )}

      {q && results.length === 0 && (
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Nothing found. Try a different search term.</p>
      )}

      {results.map((a) => (
        <Link key={a.id} href={`/artikel/${a.slug}`} className="list-row">
          <div>
            <span className="cat">{a.category} · {getReadingTime(a.body)}</span>
            <p>{a.title}</p>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "4px 0 0" }}>{getExcerpt(a.body, 140)}</p>
          </div>
        </Link>
      ))}

      <Footer />
    </div>
  );
}

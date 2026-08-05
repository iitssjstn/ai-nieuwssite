import Header from "../components/Header";
import Footer from "../components/Footer";
import Link from "next/link";
import { getArticles, getSiteSettings } from "@/lib/db";

export function generateMetadata() {
  const { site_name } = getSiteSettings();
  return { title: `Liveblogs — ${site_name}`, description: `Alle doorlopende liveblogs van ${site_name}.` };
}

export default function LiveblogHubPage() {
  const liveArticles = getArticles({ status: "published" })
    .filter((a) => a.is_liveblog)
    .sort((a, b) => new Date(b.published_at) - new Date(a.published_at));

  return (
    <div className="container">
      <Header />
      <h1 style={{ fontSize: 20, fontWeight: 500, marginBottom: 16 }}>Liveblogs</h1>

      {liveArticles.length === 0 && (
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Er loopt momenteel geen liveblog.</p>
      )}

      {liveArticles.map((a) => (
        <Link key={a.id} href={`/artikel/${a.slug}`} className="list-row">
          <div>
            <span className="cat">
              <span className="badge" style={{ background: "#a32d2d", color: "#fff", marginRight: 6 }}>🔴 LIVE</span>
              {a.category}
            </span>
            <p>{a.title}</p>
          </div>
        </Link>
      ))}

      <Footer />
    </div>
  );
}

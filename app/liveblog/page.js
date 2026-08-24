import Header from "../components/Header";
import Footer from "../components/Footer";
import Link from "next/link";
import { getArticles, getSiteSettings } from "@/lib/db";
import { headers } from "next/headers";

function getBaseUrl() {
  const h = headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

export function generateMetadata() {
  const { site_name } = getSiteSettings();
  return {
    title: `Live Blogs — ${site_name}`,
    description: `All ongoing live blogs from ${site_name}.`,
    alternates: { canonical: `${getBaseUrl()}/liveblog` },
  };
}

export default function LiveblogHubPage() {
  const liveArticles = getArticles({ status: "published" })
    .filter((a) => a.is_liveblog)
    .sort((a, b) => new Date(b.published_at) - new Date(a.published_at));

  return (
    <div className="container">
      <Header />
      <h1 style={{ fontSize: 20, fontWeight: 500, marginBottom: 16 }}>Live Blogs</h1>

      {liveArticles.length === 0 && (
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>There is no live blog running at the moment.</p>
      )}

      {liveArticles.map((a) => (
        <Link key={a.id} href={`/artikel/${a.slug}`} className="list-row">
          <div>
            <span className="cat">
              <span className="badge" style={{ background: "#FF3B4D", color: "#fff", marginRight: 6, display: "inline-flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", display: "inline-block" }} />
                LIVE
              </span>
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

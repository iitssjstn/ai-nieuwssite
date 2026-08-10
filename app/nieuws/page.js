import Header from "../components/Header";
import Footer from "../components/Footer";
import LiveTimeLabel from "../components/LiveTimeLabel";
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
    title: `Al het nieuws — ${site_name}`,
    description: `Alle artikelen van ${site_name}, chronologisch.`,
    alternates: { canonical: `${getBaseUrl()}/nieuws` },
  };
}

export default function AllNewsPage() {
  const articles = getArticles({ status: "published" }).sort(
    (a, b) => new Date(b.published_at) - new Date(a.published_at)
  );

  return (
    <div className="container">
      <Header />
      <h1 style={{ fontSize: 20, fontWeight: 500, marginBottom: 16 }}>Al het nieuws</h1>

      {articles.length === 0 && (
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Nog geen gepubliceerde artikelen.</p>
      )}

      <div className="sidebar-box">
        {articles.map((a) => (
          <Link key={a.id} href={`/artikel/${a.slug}`} className="latest-news-row">
            <LiveTimeLabel publishedAt={a.published_at} category={a.category}>
              <p className="latest-news-title">{a.title}</p>
            </LiveTimeLabel>
          </Link>
        ))}
      </div>

      <Footer />
    </div>
  );
}

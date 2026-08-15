import Header from "../components/Header";
import Footer from "../components/Footer";
import LiveTimeLabel from "../components/LiveTimeLabel";
import Link from "next/link";
import Image from "next/image";
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
            {a.featured_image ? (
              <Image src={a.featured_image} alt="" width={130} height={88} className="list-row-thumb" />
            ) : (
              <div className="list-row-thumb" style={{
                background: "var(--surface-2)", display: "flex",
                alignItems: "center", justifyContent: "center",
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.8">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
              </div>
            )}
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

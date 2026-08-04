import Header from "../components/Header";
import Footer from "../components/Footer";
import NewsMap from "../components/NewsMap";
import { getArticles, getSiteSettings } from "@/lib/db";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

function getBaseUrl() {
  const h = headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

export function generateMetadata() {
  const baseUrl = getBaseUrl();
  const { site_name } = getSiteSettings();
  const url = `${baseUrl}/kaart`;
  const title = `Nieuwskaart — ${site_name}`;
  const description = `Bekijk waar het nieuws zich afspeelt op de interactieve kaart van ${site_name}.`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website", siteName: site_name },
    twitter: { card: "summary", title, description },
  };
}

export default function KaartPage() {
  const articles = getArticles({ status: "published" }).filter((a) => a.location?.lat && a.location?.lng);

  return (
    <div className="container" style={{ maxWidth: 1000 }}>
      <Header />
      <h1 style={{ fontSize: 20, fontWeight: 500, marginBottom: 16 }}>Nieuwskaart</h1>
      {articles.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          Nog geen artikelen met een gekoppelde locatie.
        </p>
      ) : (
        <NewsMap articles={articles} />
      )}
      <Footer />
    </div>
  );
}

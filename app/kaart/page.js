import Header from "../components/Header";
import Footer from "../components/Footer";
import NewsMap from "../components/NewsMap";
import { getArticles } from "@/lib/db";

export const dynamic = "force-dynamic";

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

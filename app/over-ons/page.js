import Header from "../components/Header";
import Footer from "../components/Footer";
import ArticleBody from "../components/ArticleBody";
import { getSiteSettings, getInfoPagesSettings, getInfoPageContent } from "@/lib/db";
import { notFound } from "next/navigation";
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
    title: `About Us — ${site_name}`,
    description: `How ${site_name} works: AI-generated articles, reviewed by our human editorial team.`,
    alternates: { canonical: `${getBaseUrl()}/over-ons` },
  };
}

export default function AboutPage() {
  if (!getInfoPagesSettings().about_enabled) notFound();
  const content = getInfoPageContent("about");

  return (
    <div className="container">
      <Header />
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 20 }}>{content.title}</h1>

      <div style={{ fontSize: 15, lineHeight: 1.7, color: "var(--text-primary)" }}>
        <ArticleBody body={content.body} />
      </div>

      <Footer />
    </div>
  );
}

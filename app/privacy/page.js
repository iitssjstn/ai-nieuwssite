import Header from "../components/Header";
import Footer from "../components/Footer";
import ArticleBody from "../components/ArticleBody";
import { getSiteSettings, getInfoPagesSettings, getInfoPageContent } from "@/lib/db";
import { notFound } from "next/navigation";

export function generateMetadata() {
  const { site_name } = getSiteSettings();
  return { title: `Privacyverklaring — ${site_name}` };
}

export default function PrivacyPage() {
  if (!getInfoPagesSettings().privacy_enabled) notFound();
  const content = getInfoPageContent("privacy");

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

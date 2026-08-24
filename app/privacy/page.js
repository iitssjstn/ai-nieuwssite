import Header from "../components/Header";
import Footer from "../components/Footer";
import ArticleBody from "../components/ArticleBody";
import { getSiteSettings, getInfoPagesSettings, getInfoPageContent, getNewsletterSettings } from "@/lib/db";
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
    title: `Privacy Policy — ${site_name}`,
    alternates: { canonical: `${getBaseUrl()}/privacy` },
  };
}

export default function PrivacyPage() {
  if (!getInfoPagesSettings().privacy_enabled) notFound();
  const content = getInfoPageContent("privacy");
  const { sender_email } = getNewsletterSettings();

  return (
    <div className="container">
      <Header />
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 20 }}>{content.title}</h1>

      <div style={{ fontSize: 15, lineHeight: 1.7, color: "var(--text-primary)" }}>
        <ArticleBody body={content.body} />

        {sender_email && (
          <>
            <h2 style={{ fontSize: 17, fontWeight: 600, margin: "28px 0 10px" }}>Contact</h2>
            <p>
              Voor vragen over deze privacyverklaring, of om je gegevens in te
              zien, te laten corrigeren of te laten verwijderen, kun je
              contact opnemen via{" "}
              <a href={`mailto:${sender_email}`} style={{ color: "var(--accent-text)" }}>{sender_email}</a>.
            </p>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}

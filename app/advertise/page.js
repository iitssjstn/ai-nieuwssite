import Header from "../components/Header";
import Footer from "../components/Footer";
import { getSiteSettings } from "@/lib/db";
import { headers } from "next/headers";
import AdvertiseForm from "./AdvertiseForm";

function getBaseUrl() {
  const h = headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

export function generateMetadata() {
  const { site_name } = getSiteSettings();
  return {
    title: `Advertise with us — ${site_name}`,
    description: `Submit your own banner ad for a placement on ${site_name}.`,
    alternates: { canonical: `${getBaseUrl()}/advertise` },
    robots: { index: false, follow: true }, // een aanmeldformulier hoeft niet in Google's zoekresultaten
  };
}

export default function AdvertisePage() {
  return (
    <div className="container" style={{ maxWidth: 700 }}>
      <Header />
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Advertise with us</h1>
      <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 24 }}>
        Submit your own banner for one of the placements below. Upload it at exactly the required
        size, and once we approve it, it goes live on the site directly.
      </p>
      <AdvertiseForm />
      <Footer />
    </div>
  );
}

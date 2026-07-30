import Link from "next/link";
import { getArticles } from "@/lib/db";
import PageviewTracker from "./PageviewTracker";

const CATEGORIES = ["Binnenland", "Economie", "Sport", "Tech"];

export default function Header() {
  const breaking = getArticles({ status: "published" })
    .filter((a) => a.breaking)
    .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))[0];

  return (
    <>
      <PageviewTracker />
      {breaking && (
        <Link href={`/artikel/${breaking.slug}`} className="breaking-bar">
          <span className="breaking-label">Breaking</span>
          <span className="breaking-title">{breaking.title}</span>
        </Link>
      )}
      <div className="site-header">
        <Link href="/" className="logo">Dagblad</Link>
        <div className="nav">
          {CATEGORIES.map((c) => (
            <Link key={c} href={`/categorie/${encodeURIComponent(c.toLowerCase())}`} style={{ color: "var(--text-secondary)" }}>
              {c}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

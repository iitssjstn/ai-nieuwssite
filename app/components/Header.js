import Link from "next/link";
import { getArticles, getSiteSettings } from "@/lib/db";
import PageviewTracker from "./PageviewTracker";
import SettingsPanel from "./SettingsPanel";

const CATEGORIES = ["Binnenland", "Economie", "Sport", "Tech", "Overig"];

export default function Header({ activeCategory }) {
  const { site_name } = getSiteSettings();
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
        <Link href="/" className="logo">{site_name}</Link>
        <SettingsPanel />
      </div>

      <nav className="category-bar">
        <Link href="/" className={`category-pill${!activeCategory ? " active" : ""}`}>Voorpagina</Link>
        {CATEGORIES.map((c) => (
          <Link
            key={c}
            href={`/categorie/${encodeURIComponent(c.toLowerCase())}`}
            className={`category-pill${activeCategory === c ? " active" : ""}`}
          >
            {c}
          </Link>
        ))}
      </nav>
    </>
  );
}

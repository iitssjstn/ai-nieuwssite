import Link from "next/link";
import { getArticles, getSiteSettings, getCategories } from "@/lib/db";
import PageviewTracker from "./PageviewTracker";
import SettingsPanel from "./SettingsPanel";

export default function Header({ activeCategory }) {
  const { site_name } = getSiteSettings();
  const categories = getCategories();
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
        {categories.map((c) => {
          const active = activeCategory === c.name;
          return (
            <Link
              key={c.name}
              href={`/categorie/${encodeURIComponent(c.name.toLowerCase())}`}
              className={`category-pill${active ? " active" : ""}`}
              style={active ? { background: c.color + "22", color: c.color } : undefined}
            >
              {c.name}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

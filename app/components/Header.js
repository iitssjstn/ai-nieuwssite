import Link from "next/link";
import { getArticles, getSiteSettings, getCategories } from "@/lib/db";
import PageviewTracker from "./PageviewTracker";
import VisitorHeartbeat from "./VisitorHeartbeat";
import SettingsPanel from "./SettingsPanel";

export default function Header({ activeCategory, articleId }) {
  const { site_name, favicon_url } = getSiteSettings();
  // Alleen hoofdcategorieën als pillen in de navigatiebalk — subcategorieën
  // (Voetbal, F1, ...) worden nu op de pagina van hun hoofdcategorie zelf
  // getoond (bovenaan de 5 laatste artikelen, daaronder per subcategorie
  // een eigen sectie) i.p.v. via een dropdown hier in de balk.
  const categories = getCategories().filter((c) => !c.parent);
  const breaking = getArticles({ status: "published" })
    .filter((a) => a.breaking)
    .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))[0];

  return (
    <>
      <PageviewTracker articleId={articleId} />
      <VisitorHeartbeat />
      {breaking && (
        <Link href={`/artikel/${breaking.slug}`} className="breaking-bar">
          <span className="breaking-label">Breaking</span>
          <span className="breaking-title">{breaking.title}</span>
        </Link>
      )}

      <div className="site-header">
        <div style={{ display: "flex", alignItems: "center", gap: 20, minWidth: 0, flex: 1 }}>
          <Link href="/" className="logo" aria-label={site_name} style={{ flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={favicon_url || "/icon.svg"} alt={site_name} width={30} height={30} style={{ borderRadius: 6, objectFit: "contain" }} />
          </Link>
          <nav className="category-bar">
            <Link href="/" className={`category-pill${!activeCategory ? " active" : ""}`}>Home</Link>
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
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <Link href="/zoeken" aria-label="Search" style={{ display: "flex", alignItems: "center", padding: "6px 8px", borderRadius: 8, border: "1px solid var(--border)" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </Link>
          <SettingsPanel />
        </div>
      </div>
    </>
  );
}

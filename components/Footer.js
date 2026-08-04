import Link from "next/link";
import { getSiteSettings, getCategories } from "@/lib/db";

export default function Footer() {
  const { site_name, site_description } = getSiteSettings();
  const categories = getCategories();

  return (
    <footer className="site-footer">
      <div className="site-footer-top">
        <div className="site-footer-about">
          <p className="site-footer-logo">{site_name}</p>
          <p className="site-footer-tagline">{site_description}</p>
        </div>

        <div className="site-footer-links">
          <p className="site-footer-heading">Categorieën</p>
          {categories.map((c) => (
            <Link key={c.name} href={`/categorie/${encodeURIComponent(c.name.toLowerCase())}`}>{c.name}</Link>
          ))}
        </div>

        <div className="site-footer-links">
          <p className="site-footer-heading">Meer</p>
          <Link href="/">Voorpagina</Link>
          <Link href="/kaart">Nieuwskaart</Link>
        </div>
      </div>

      <div className="site-footer-bottom">
        © {new Date().getFullYear()} {site_name}
      </div>
    </footer>
  );
}

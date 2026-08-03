import Link from "next/link";
import { getSiteSettings } from "@/lib/db";

const CATEGORIES = ["Binnenland", "Economie", "Sport", "Tech", "Overig"];

export default function Footer() {
  const { site_name, site_description } = getSiteSettings();

  return (
    <footer className="site-footer">
      <div className="site-footer-top">
        <div className="site-footer-about">
          <p className="site-footer-logo">{site_name}</p>
          <p className="site-footer-tagline">{site_description}</p>
        </div>

        <div className="site-footer-links">
          <p className="site-footer-heading">Categorieën</p>
          {CATEGORIES.map((c) => (
            <Link key={c} href={`/categorie/${encodeURIComponent(c.toLowerCase())}`}>{c}</Link>
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

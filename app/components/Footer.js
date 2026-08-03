import Link from "next/link";

const CATEGORIES = ["Binnenland", "Economie", "Sport", "Tech", "Overig"];

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-top">
        <div className="site-footer-about">
          <p className="site-footer-logo">Dagblad</p>
          <p className="site-footer-tagline">
            Artikelen worden opgesteld met behulp van AI op basis van geverifieerde bronnen en
            gecontroleerd voor publicatie.
          </p>
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
        © {new Date().getFullYear()} Dagblad
      </div>
    </footer>
  );
}

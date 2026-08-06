import Link from "next/link";
import { getSiteSettings, getCategories, getNewsletterSettings, getSocialLinks, getInfoPagesSettings } from "@/lib/db";

const SOCIAL_ICONS = {
  twitter: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-7.6 8.7L23.3 22h-7l-5.5-7.2L4.5 22H1.4l8.1-9.3L1 2h7.2l5 6.6L18.9 2Z" /></svg>
  ),
  facebook: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 21v-8h2.7l.4-3.1h-3.1V8c0-.9.3-1.5 1.6-1.5H17V3.6C16.6 3.5 15.6 3.4 14.5 3.4c-2.4 0-4 1.5-4 4.1v2.4H8v3.1h2.5V21h3Z" /></svg>
  ),
  instagram: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>
  ),
  youtube: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12s0-3.4-.4-5a2.8 2.8 0 0 0-2-2C17.9 4.5 12 4.5 12 4.5s-5.9 0-7.6.5a2.8 2.8 0 0 0-2 2C2 8.6 2 12 2 12s0 3.4.4 5a2.8 2.8 0 0 0 2 2c1.7.5 7.6.5 7.6.5s5.9 0 7.6-.5a2.8 2.8 0 0 0 2-2c.4-1.6.4-5 .4-5ZM10 15.5v-7l6 3.5-6 3.5Z" /></svg>
  ),
};

export default function Footer() {
  const { site_name, site_description } = getSiteSettings();
  const categories = getCategories();
  const { enabled: newsletterEnabled } = getNewsletterSettings();
  const { about_enabled, privacy_enabled } = getInfoPagesSettings();
  const social = getSocialLinks();
  const socialEntries = Object.entries(social).filter(([, url]) => url);

  return (
    <footer className="site-footer">
      <div className="site-footer-top">
        <div className="site-footer-about">
          <p className="site-footer-logo">{site_name}</p>
          <p className="site-footer-tagline">{site_description}</p>
          {socialEntries.length > 0 && (
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              {socialEntries.map(([key, url]) => (
                <a
                  key={key}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={key}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: "50%", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                >
                  {SOCIAL_ICONS[key]}
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="site-footer-links">
          <p className="site-footer-heading">Categorieën</p>
          {categories.map((c) => (
            <Link key={c.name} href={`/categorie/${encodeURIComponent(c.name.toLowerCase())}`}>{c.name}</Link>
          ))}
        </div>

        <div className="site-footer-links">
          <p className="site-footer-heading">Diensten</p>
          <Link href="/kaart">Nieuwskaart</Link>
          <Link href="/polls">Polls</Link>
          <Link href="/liveblog">Liveblogs</Link>
          {newsletterEnabled && <Link href="/#nieuwsbrief">Nieuwsbrief</Link>}
          <Link href="/feed.xml">RSS Feed</Link>
        </div>

        {(about_enabled || privacy_enabled) && (
          <div className="site-footer-links">
            <p className="site-footer-heading">Informatie</p>
            {about_enabled && <Link href="/over-ons">Over ons</Link>}
            {privacy_enabled && <Link href="/privacy">Privacy</Link>}
          </div>
        )}
      </div>

      <div className="site-footer-bottom">
        © {new Date().getFullYear()} {site_name}
      </div>
    </footer>
  );
}

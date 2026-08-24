"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTIONS = [
  { href: "/review/settings/seo", label: "SEO & Branding", desc: "Site name, description, and favicon" },
  { href: "/review/settings/categories", label: "Categories", desc: "Add/edit your own categories with color" },
  { href: "/review/settings/ai", label: "AI Providers", desc: "Free text AIs for generating drafts" },
  { href: "/review/settings/automation", label: "Automation", desc: "Turn automatic RSS import on/off and configure it" },
  { href: "/review/settings/rss-schedule", label: "RSS Schedule", desc: "How often and when sources are fetched" },
  { href: "/review/settings/images", label: "Images", desc: "Free stock photo providers for articles" },
  { href: "/review/settings/adsense", label: "Google AdSense", desc: "Publisher ID and the large ad unit" },
  { href: "/review/settings/adsterra", label: "Adsterra", desc: "Social Bar, native banner, and ad slots" },
  { href: "/review/settings/ezoic", label: "Ezoic", desc: "Turn Ezoic integration on/off" },
  { href: "/review/settings/newsletter", label: "Newsletter", desc: "Sender email address and subscriptions" },
  { href: "/review/settings/social", label: "Social Media", desc: "Links to your profiles for the footer" },
  { href: "/review/settings/info-pages", label: "Info Pages", desc: "Turn About Us & Privacy on/off and edit them" },
  { href: "/review/settings/backups", label: "Backups", desc: "View and download automatic daily backups" },
  { href: "/review/settings/users", label: "Editors", desc: "Accounts, roles, and contact details" },
];

export default function SettingsLayout({ children }) {
  const pathname = usePathname();

  return (
    <div className="container">
      <h1 style={{ fontSize: 18, fontWeight: 500, marginBottom: 20 }}>Settings</h1>

      <div className="settings-layout">
        <nav className="settings-subnav">
          {SECTIONS.map((s) => {
            const active = pathname.startsWith(s.href);
            return (
              <Link key={s.href} href={s.href} className={`settings-subnav-item${active ? " active" : ""}`}>
                <span className="settings-subnav-label">{s.label}</span>
                <span className="settings-subnav-desc">{s.desc}</span>
              </Link>
            );
          })}
        </nav>

        <div className="settings-content">{children}</div>
      </div>
    </div>
  );
}

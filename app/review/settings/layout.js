"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTIONS = [
  { href: "/review/settings/seo", label: "SEO & Branding", desc: "Sitenaam, beschrijving en favicon" },
  { href: "/review/settings/categories", label: "Categorieën", desc: "Zelf categorieën met kleur toevoegen/bewerken" },
  { href: "/review/settings/ai", label: "AI-providers", desc: "Gratis tekst-AI's voor het genereren van concepten" },
  { href: "/review/settings/automation", label: "Automatisering", desc: "De automatische RSS-import aan/uit en instellen" },
  { href: "/review/settings/images", label: "Afbeeldingen", desc: "Gratis stockfoto-providers voor artikelen" },
  { href: "/review/settings/ads", label: "Advertenties", desc: "Google AdSense-koppeling" },
  { href: "/review/settings/users", label: "Redacteuren", desc: "Accounts, rollen en contactgegevens" },
];

export default function SettingsLayout({ children }) {
  const pathname = usePathname();

  return (
    <div className="container">
      <h1 style={{ fontSize: 18, fontWeight: 500, marginBottom: 20 }}>Instellingen</h1>

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

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  {
    href: "/review",
    label: "Dashboard",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="8" height="8" rx="2" />
        <rect x="13" y="3" width="8" height="8" rx="2" />
        <rect x="3" y="13" width="8" height="8" rx="2" />
        <rect x="13" y="13" width="8" height="8" rx="2" />
      </svg>
    ),
  },
  {
    href: "/review/published",
    label: "Gepubliceerd",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 4h13a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2-3-2V6a2 2 0 0 1 2-2Z" />
        <path d="M8 9h8M8 13h5" />
      </svg>
    ),
  },
  {
    href: "/review/sources",
    label: "Bronnen",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M5 5c8 0 14 6 14 14" />
        <path d="M5 11c5 0 8 3 8 8" />
        <circle cx="5.5" cy="18.5" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: "/review/settings",
    label: "Instellingen",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 0 1-4 0v-.09A1.7 1.7 0 0 0 9 19.35a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.65 15a1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 0 1 0-4h.09A1.7 1.7 0 0 0 4.65 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.65a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 0 1 4 0v.09a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.35 9a1.7 1.7 0 0 0 1.56 1.04H21a2 2 0 0 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z" />
      </svg>
    ),
  },
];

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M19 12H5M11 18l-6-6 6-6" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

function pageTitle(pathname) {
  if (pathname === "/review") return "Dashboard";
  if (pathname.startsWith("/review/published")) return "Gepubliceerd";
  if (pathname.startsWith("/review/sources")) return "Bronnen";
  if (pathname.startsWith("/review/settings")) return "Instellingen";
  if (/^\/review\/[^/]+$/.test(pathname)) return "Artikel reviewen";
  return "Redactie";
}

export default function ReviewLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  function goToPublicSite() {
    if (typeof window === "undefined") return;
    const host = window.location.hostname.replace(/^admin\./, "");
    const port = window.location.port ? `:${window.location.port}` : "";
    window.location.href = `${window.location.protocol}//${host}${port}/`;
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <span className="admin-brand">Novapers</span>

        {NAV.map((item) => {
          const active = item.href === "/review" ? pathname === "/review" : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={`admin-nav-item${active ? " active" : ""}`}>
              {item.icon}
              {item.label}
            </Link>
          );
        })}

        <a
          href="#"
          onClick={(e) => { e.preventDefault(); goToPublicSite(); }}
          className="admin-nav-item"
        >
          <ArrowLeftIcon />
          Naar de site
        </a>

        <div className="admin-sidebar-spacer" />

        <div className="admin-user-chip">
          <div className="admin-user-avatar">A</div>
          <div>
            <p>Redacteur</p>
            <p className="role">Admin</p>
          </div>
          <button
            className="admin-logout-btn"
            aria-label="Uitloggen"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              router.push("/login");
            }}
          >
            <LogoutIcon />
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <div className="admin-topbar">
          <span className="admin-breadcrumb">
            REDACTIE / <strong>{pageTitle(pathname).toUpperCase()}</strong>
          </span>
        </div>
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  {
    href: "/review",
    label: "Dashboard",
    group: null,
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
    href: "/review/account",
    label: "Mijn account",
    group: null,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
      </svg>
    ),
  },
  {
    href: "/review/queue",
    label: "Wachtrij",
    group: "Content",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3v18M5 8l7-5 7 5M5 16l7 5 7-5" />
      </svg>
    ),
  },
  {
    href: "/review/published",
    label: "Gepubliceerd",
    group: "Content",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 4h13a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2-3-2V6a2 2 0 0 1 2-2Z" />
        <path d="M8 9h8M8 13h5" />
      </svg>
    ),
  },
  {
    href: "/review/polls",
    label: "Polls",
    group: "Content",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="4" y="10" width="4" height="10" rx="1" />
        <rect x="10" y="5" width="4" height="15" rx="1" />
        <rect x="16" y="13" width="4" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: "/review/kaart",
    label: "Kaart",
    group: "Content",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11Z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    ),
  },
  {
    href: "/review/sources",
    label: "Bronnen",
    adminOnly: true,
    group: "Beheer",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M5 5c8 0 14 6 14 14" />
        <path d="M5 11c5 0 8 3 8 8" />
        <circle cx="5.5" cy="18.5" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: "/review/webhooks",
    label: "Webhooks & API",
    adminOnly: true,
    group: "Beheer",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M8 12a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    ),
  },
  {
    href: "/review/settings",
    label: "Instellingen",
    adminOnly: true,
    group: "Beheer",
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
  if (pathname.startsWith("/review/queue")) return "Wachtrij";
  if (pathname.startsWith("/review/published")) return "Gepubliceerd";
  if (pathname.startsWith("/review/polls")) return "Polls";
  if (pathname.startsWith("/review/kaart")) return "Kaart";
  if (pathname.startsWith("/review/webhooks")) return "Webhooks & API";
  if (pathname.startsWith("/review/sources")) return "Bronnen";
  if (pathname.startsWith("/review/settings")) return "Instellingen";
  if (/^\/review\/[^/]+$/.test(pathname)) return "Artikel reviewen";
  return "Redactie";
}

export default function ReviewLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingUpdatesCount, setPendingUpdatesCount] = useState(0);
  const [notifPermission, setNotifPermission] = useState("default");
  const lastCount = useRef(0);
  const notifiedOnce = useRef(false);

  useEffect(() => {
    if (typeof Notification !== "undefined") setNotifPermission(Notification.permission);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  useEffect(() => {
    async function poll() {
      try {
        fetch("/api/auth/heartbeat", { method: "POST" }).catch(() => {});

        const res = await fetch("/api/stats");
        if (!res.ok) return;
        const stats = await res.json();
        const count = stats.pending_review || 0;

        // Alleen een browsermelding tonen bij een ECHTE toename (niet bij de
        // allereerste keer laden, anders krijg je 'm bij elke paginabezoek).
        if (notifiedOnce.current && count > lastCount.current && typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification("Novapers — nieuwe review", {
            body: `${count} artikel(en) wachten op review`,
          });
        }
        notifiedOnce.current = true;
        lastCount.current = count;
        setPendingCount(count);
        setPendingUpdatesCount(stats.pending_updates || 0);
      } catch {
        // volgende poll probeert het gewoon opnieuw
      }
    }
    poll();
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, []);

  const isAdmin = me?.role === "admin";
  const visibleNav = NAV.filter((item) => !item.adminOnly || isAdmin);

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

        <div className="admin-sidebar-profile">
          <div className="admin-sidebar-avatar">{(me?.full_name || me?.username || "?")[0].toUpperCase()}</div>
          <p className="name">{me?.full_name || me?.username || "..."}</p>
          <p className="role">{me?.role === "admin" ? "Admin" : "Redacteur"}</p>
        </div>

        {visibleNav.map((item, i) => {
          const active = item.href === "/review" ? pathname === "/review" : pathname.startsWith(item.href);
          const showBadge = item.href === "/review/queue" && pendingCount > 0;
          const showUpdateBadge = item.href === "/review/published" && pendingUpdatesCount > 0;
          const showGroupHeader = item.group && item.group !== visibleNav[i - 1]?.group;
          return (
            <div key={item.href}>
              {showGroupHeader && (
                <p style={{
                  fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em",
                  color: "var(--text-muted)", margin: "16px 12px 6px", fontWeight: 600,
                }}>
                  {item.group}
                </p>
              )}
              <Link href={item.href} className={`admin-nav-item${active ? " active" : ""}`}>
                {item.icon}
                {item.label}
                {showBadge && (
                  <span style={{
                    marginLeft: "auto", background: "#a32d2d", color: "#fff", borderRadius: 10,
                    fontSize: 11, padding: "1px 7px", fontWeight: 600,
                  }}>
                    {pendingCount}
                  </span>
                )}
                {showUpdateBadge && (
                  <span title="Artikelen met een nieuwe-informatie-melding" style={{
                    marginLeft: "auto", background: "var(--accent-text)", color: "#fff", borderRadius: 10,
                    fontSize: 11, padding: "1px 7px", fontWeight: 600,
                  }}>
                    🔔 {pendingUpdatesCount}
                  </span>
                )}
              </Link>
            </div>
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

        {notifPermission === "default" && (
          <button
            className="admin-nav-item"
            style={{ width: "100%", textAlign: "left", background: "none", cursor: "pointer" }}
            onClick={async () => {
              const result = await Notification.requestPermission();
              setNotifPermission(result);
            }}
          >
            🔔 Meldingen aanzetten
          </button>
        )}

        <div className="admin-user-chip" style={{ justifyContent: "center" }}>
          <button
            className="admin-logout-btn"
            aria-label="Uitloggen"
            style={{ marginLeft: 0, display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              router.push("/login");
            }}
          >
            <LogoutIcon />
            Uitloggen
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

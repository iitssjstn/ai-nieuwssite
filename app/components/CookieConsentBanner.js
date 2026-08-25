"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function CookieConsentBanner() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("cookie_consent")) return;
    setVisible(true);
  }, []);

  // Not shown on the admin panel or login page — that's for the
  // editorial team, not for visitors.
  if (pathname?.startsWith("/review") || pathname?.startsWith("/login")) return null;
  if (!visible) return null;

  function choose(value) {
    localStorage.setItem("cookie_consent", value);
    window.dispatchEvent(new Event("cookie-consent-changed"));
    setVisible(false);
  }

  return (
    <div
      style={{
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 100,
        background: "var(--surface-1)", borderTop: "1px solid var(--border)",
        padding: "16px 20px", display: "flex", alignItems: "center", gap: 16,
        flexWrap: "wrap", justifyContent: "space-between",
      }}
    >
      <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", maxWidth: 640 }}>
        We use functional cookies to make the site work.{" "}
        <a href="/privacy" style={{ color: "var(--accent-text)" }}>Read more</a>.
      </p>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button onClick={() => choose("declined")} style={{ width: "auto", padding: "8px 16px", fontSize: 13 }}>
          Necessary only
        </button>
        <button onClick={() => choose("accepted")} className="primary" style={{ width: "auto", padding: "8px 16px", fontSize: 13 }}>
          Accept
        </button>
      </div>
    </div>
  );
}

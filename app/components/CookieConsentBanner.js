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

  // Niet tonen op het adminpaneel of de inlogpagina — dat is voor de
  // redactie, niet voor bezoekers.
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
        We gebruiken functionele cookies om de site te laten werken.{" "}
        <a href="/privacy" style={{ color: "var(--accent-text)" }}>Meer lezen</a>.
      </p>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button onClick={() => choose("declined")} style={{ width: "auto", padding: "8px 16px", fontSize: 13 }}>
          Alleen noodzakelijk
        </button>
        <button onClick={() => choose("accepted")} className="primary" style={{ width: "auto", padding: "8px 16px", fontSize: 13 }}>
          Accepteren
        </button>
      </div>
    </div>
  );
}

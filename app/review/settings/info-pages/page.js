"use client";

import { useEffect, useState } from "react";

export default function InfoPagesSettingsPage() {
  const [infoPages, setInfoPages] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/settings/info-pages");
    setInfoPages(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function toggle(field) {
    setBusy(true);
    const res = await fetch("/api/settings/info-pages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: !infoPages[field] }),
    });
    setBusy(false);
    if (res.ok) setInfoPages(await res.json());
  }

  if (!infoPages) return null;

  return (
    <>
      <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>Informatiepagina's</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
        Zet je een pagina uit, dan verdwijnt de link uit de footer én geeft de pagina zelf een
        "niet gevonden" i.p.v. de inhoud.
      </p>

      <div style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 13 }}>Over ons</span>
          <div style={{ display: "flex", gap: 8 }}>
            <a href="/review/settings/info-pages/about" style={{ fontSize: 13, color: "var(--accent-text)", alignSelf: "center" }}>Bewerken</a>
            <button onClick={() => toggle("about_enabled")} disabled={busy} className={infoPages.about_enabled ? "danger" : "primary"} style={{ width: "auto", padding: "6px 14px", fontSize: 13 }}>
              {infoPages.about_enabled ? "Uitzetten" : "Aanzetten"}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13 }}>Privacy</span>
          <div style={{ display: "flex", gap: 8 }}>
            <a href="/review/settings/info-pages/privacy" style={{ fontSize: 13, color: "var(--accent-text)", alignSelf: "center" }}>Bewerken</a>
            <button onClick={() => toggle("privacy_enabled")} disabled={busy} className={infoPages.privacy_enabled ? "danger" : "primary"} style={{ width: "auto", padding: "6px 14px", fontSize: 13 }}>
              {infoPages.privacy_enabled ? "Uitzetten" : "Aanzetten"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

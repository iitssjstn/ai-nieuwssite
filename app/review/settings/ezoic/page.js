"use client";

import { useEffect, useState } from "react";

export default function EzoicPage() {
  const [enabled, setEnabled] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/settings/ezoic");
    const data = await res.json();
    setEnabled(data.enabled);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggle() {
    setBusy(true);
    const res = await fetch("/api/settings/ezoic", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !enabled }),
    });
    setBusy(false);
    if (res.ok) {
      const data = await res.json();
      setEnabled(data.enabled);
    }
  }

  if (enabled === null) return null;

  return (
    <>
      <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>Ezoic</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
        Ezoic doesn't require a publisher ID or code snippet — the connection with your site happens
        via domain verification in the Ezoic dashboard itself. Once you've completed that there,
        turn this on below to have the necessary script load on the site.
      </p>
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20 }}>
        Just like with AdSense, this script only loads after a visitor has accepted cookies
        — Ezoic's own consent popup is deliberately not used, to prevent
        visitors from seeing two different consent screens.
      </p>

      <div className="admin-glass-card" style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Ezoic script</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
              {enabled ? "Active — the script loads after consent" : "Disabled"}
            </p>
          </div>
          <button onClick={toggle} disabled={busy} className={enabled ? "danger" : "primary"} style={{ width: "auto", padding: "8px 16px" }}>
            {enabled ? "Turn Off" : "Turn On"}
          </button>
        </div>
      </div>
    </>
  );
}

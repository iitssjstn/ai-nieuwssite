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
        Ezoic vraagt geen publisher-ID of code-snippet — de koppeling met je site gebeurt via
        domeinverificatie in het Ezoic-dashboard zelf. Zodra je dat daar hebt afgerond, zet je
        het hieronder aan om het benodigde scriptje op de site te laten laden.
      </p>
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20 }}>
        Net als bij AdSense laadt dit scriptje pas nadat een bezoeker cookies heeft geaccepteerd
        — Ezoic's eigen toestemmingsvenster wordt bewust niet gebruikt, om te voorkomen dat
        bezoekers twee verschillende toestemmingsschermen te zien krijgen.
      </p>

      <div className="admin-glass-card" style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Ezoic-script</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
              {enabled ? "Actief — het scriptje wordt geladen na toestemming" : "Uitgeschakeld"}
            </p>
          </div>
          <button onClick={toggle} disabled={busy} className={enabled ? "danger" : "primary"} style={{ width: "auto", padding: "8px 16px" }}>
            {enabled ? "Uitzetten" : "Aanzetten"}
          </button>
        </div>
      </div>
    </>
  );
}

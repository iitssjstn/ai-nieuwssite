"use client";

import { useEffect, useState } from "react";

export default function AutomationPage() {
  const [settings, setSettings] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function load() {
    const res = await fetch("/api/settings/automation");
    setSettings(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function toggle() {
    setBusy(true);
    setSaved(false);
    const res = await fetch("/api/settings/automation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !settings.enabled }),
    });
    setSettings(await res.json());
    setBusy(false);
    setSaved(true);
  }

  async function updateMaxPerSource(value) {
    setBusy(true);
    setSaved(false);
    const res = await fetch("/api/settings/automation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ max_per_source: parseInt(value, 10) }),
    });
    setSettings(await res.json());
    setBusy(false);
    setSaved(true);
  }

  if (!settings) return null;

  return (
    <>
      <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>Automatisering</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
        De automatische RSS-import gebruikt dezelfde gratis AI-quota als het handmatig genereren
        van concepten. Loop je tegen een limiet aan, zet 'm hier tijdelijk uit — geen herbuild
        nodig, dit werkt meteen bij de volgende controleronde van de achtergrondtaak.
      </p>

      <div style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Automatische RSS-import</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0" }}>
              {settings.enabled ? "Actief — haalt periodiek nieuwe items op" : "Uitgeschakeld"}
            </p>
          </div>
          <button onClick={toggle} disabled={busy} className={settings.enabled ? "danger" : "primary"} style={{ width: "auto", padding: "8px 16px" }}>
            {settings.enabled ? "Uitzetten" : "Aanzetten"}
          </button>
        </div>

        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
          Max. nieuwe concepten per bron, per controleronde
        </p>
        <input
          type="number"
          min="1"
          max="20"
          value={settings.max_per_source}
          onChange={(e) => updateMaxPerSource(e.target.value)}
          disabled={busy}
          style={{ width: 100 }}
        />

        {saved && <p style={{ color: "var(--success-text)", fontSize: 13, marginTop: 10 }}>Opgeslagen.</p>}
      </div>
    </>
  );
}

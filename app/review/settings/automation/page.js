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

  async function toggleAutoPublish() {
    setBusy(true);
    setSaved(false);
    const res = await fetch("/api/settings/automation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auto_publish: !settings.auto_publish }),
    });
    setSettings(await res.json());
    setBusy(false);
    setSaved(true);
  }

  async function updateMinConfidence(value) {
    setBusy(true);
    setSaved(false);
    const res = await fetch("/api/settings/automation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auto_publish_min_confidence: parseFloat(value) }),
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

      <div style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16, border: settings.auto_publish ? "1px solid var(--danger-text)" : "1px solid transparent" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Automatisch publiceren</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0" }}>
              {settings.auto_publish ? "Actief — geen menselijke controle voor publicatie" : "Uitgeschakeld — alles wacht op jouw goedkeuring"}
            </p>
          </div>
          <button onClick={toggleAutoPublish} disabled={busy} className={settings.auto_publish ? "danger" : "primary"} style={{ width: "auto", padding: "8px 16px" }}>
            {settings.auto_publish ? "Uitzetten" : "Aanzetten"}
          </button>
        </div>

        <p style={{ fontSize: 12, color: "var(--danger-text)", marginBottom: 14, lineHeight: 1.5 }}>
          ⚠ Bij inschakelen publiceert de site zelfstandig, zonder dat jij het artikel ooit hebt
          gezien — bijvoorbeeld 's nachts. Een concept wordt alleen automatisch gepubliceerd als
          het aan ALLE voorwaarden voldoet: geen ongeverifieerd citaat, geen afwijkend cijfer,
          geen mogelijk duplicaat, geen onbevestigde claim, én minstens de confidence-score
          hieronder. Twijfelt de AI, dan blijft het gewoon in de wachtrij staan.
        </p>

        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
          Minimale confidence-score om automatisch te publiceren ({Math.round(settings.auto_publish_min_confidence * 100)}%)
        </p>
        <input
          type="range"
          min="0.5"
          max="1"
          step="0.05"
          value={settings.auto_publish_min_confidence}
          onChange={(e) => updateMinConfidence(e.target.value)}
          disabled={busy}
          style={{ width: "100%" }}
        />
      </div>
    </>
  );
}

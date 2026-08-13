"use client";

import { useEffect, useState } from "react";

const INTERVAL_OPTIONS = [5, 10, 15, 30, 60, 120, 240];

export default function RssSchedulePage() {
  const [settings, setSettings] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  async function load() {
    const res = await fetch("/api/settings/automation");
    setSettings(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function patchField(field, value) {
    setError(null);
    setSaved(false);
    setBusy(true);
    const res = await fetch("/api/settings/automation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    setBusy(false);
    if (res.ok) {
      setSettings(await res.json());
      setSaved(true);
    } else {
      const data = await res.json();
      setError(data.error || "Opslaan mislukt");
    }
  }

  if (!settings) return null;

  return (
    <>
      <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>RSS-schema</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
        Bepaal hier hoe vaak je bronnen automatisch worden opgehaald, en optioneel binnen welk
        tijdvenster dat mag gebeuren. Wijzigingen zijn binnen enkele minuten actief, geen herstart
        nodig.
      </p>

      <div className="admin-glass-card" style={{ padding: 16, marginBottom: 16 }}>
        <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 10px" }}>Hoe vaak</p>
        <select
          value={settings.poll_interval_minutes}
          onChange={(e) => patchField("poll_interval_minutes", parseInt(e.target.value, 10))}
          disabled={busy}
          style={{ padding: 8, borderRadius: 8, border: "1px solid var(--border)" }}
        >
          {INTERVAL_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {m < 60 ? `Elke ${m} minuten` : `Elke ${m / 60} uur`}
            </option>
          ))}
        </select>
      </div>

      <div className="admin-glass-card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: settings.active_hours_enabled ? 14 : 0 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Alleen binnen een tijdvenster</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
              {settings.active_hours_enabled
                ? `Actief van ${settings.active_hours_start} tot ${settings.active_hours_end}`
                : "Uitgeschakeld — draait de hele dag door"}
            </p>
          </div>
          <button
            onClick={() => patchField("active_hours_enabled", !settings.active_hours_enabled)}
            disabled={busy}
            className={settings.active_hours_enabled ? "danger" : "primary"}
            style={{ width: "auto", padding: "8px 16px" }}
          >
            {settings.active_hours_enabled ? "Uitzetten" : "Aanzetten"}
          </button>
        </div>

        {settings.active_hours_enabled && (
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Van</p>
              <input
                type="time"
                defaultValue={settings.active_hours_start}
                onBlur={(e) => patchField("active_hours_start", e.target.value)}
                disabled={busy}
              />
            </div>
            <div>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Tot</p>
              <input
                type="time"
                defaultValue={settings.active_hours_end}
                onBlur={(e) => patchField("active_hours_end", e.target.value)}
                disabled={busy}
              />
            </div>
          </div>
        )}
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 10 }}>
          Een tijdvenster dat over middernacht heen loopt (bijv. 22:00 tot 06:00) werkt ook —
          dan draait de scheduler juist 's nachts, en niet overdag.
        </p>
      </div>

      {error && <p style={{ color: "var(--danger-text)", fontSize: 13 }}>{error}</p>}
      {saved && <p style={{ color: "var(--success-text)", fontSize: 13 }}>Opgeslagen.</p>}
    </>
  );
}

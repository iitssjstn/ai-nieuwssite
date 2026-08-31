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
    // Ververst puur de hartslag-weergave periodiek, zodat je op deze
    // pagina kunt zien of de planner nog "leeft" zonder zelf te hoeven
    // verversen — verder verandert er dan niets aan het formulier, want
    // elk veld wordt al direct bij wijzigen opgeslagen (geen concept-status
    // die hierdoor verloren zou kunnen gaan).
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
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
      setError(data.error || "Save failed");
    }
  }

  if (!settings) return null;

  const heartbeatMinutesAgo = settings.scheduler_heartbeat
    ? Math.round((Date.now() - new Date(settings.scheduler_heartbeat).getTime()) / 60000)
    : null;
  // De planner werkt zijn hartslag na elke voltooide tick bij (elke 60s) —
  // een paar minuten speling voor normale schommelingen, ruim boven wat
  // een proces dat daadwerkelijk is vastgelopen/gecrasht zou halen.
  const heartbeatStale = heartbeatMinutesAgo === null || heartbeatMinutesAgo > 5;

  return (
    <>
      <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>RSS Schedule</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
        Set how often your sources are fetched automatically here, and optionally within which
        time window that's allowed to happen. Changes take effect within a few minutes, no restart
        needed.
      </p>

      <div
        className="admin-glass-card"
        style={{
          padding: 16,
          marginBottom: 16,
          borderLeft: `3px solid ${heartbeatStale ? "var(--danger-text)" : "var(--success-text)"}`,
        }}
      >
        <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 4px" }}>Background scheduler status</p>
        {heartbeatMinutesAgo === null ? (
          <p style={{ fontSize: 13, color: "var(--danger-text)" }}>
            Never checked in — the background process may not be running. Redeploying the site
            should start it.
          </p>
        ) : heartbeatStale ? (
          <p style={{ fontSize: 13, color: "var(--danger-text)" }}>
            Last checked in {heartbeatMinutesAgo} minute{heartbeatMinutesAgo === 1 ? "" : "s"} ago —
            this is longer than expected (normally every ~1 minute). The background process may
            have stopped; it should restart automatically, but if this stays stale, a redeploy
            will restart it.
          </p>
        ) : (
          <p style={{ fontSize: 13, color: "var(--success-text)" }}>
            Running — last checked in {heartbeatMinutesAgo === 0 ? "less than a minute" : `${heartbeatMinutesAgo} minute${heartbeatMinutesAgo === 1 ? "" : "s"}`} ago.
          </p>
        )}
      </div>

      <div className="admin-glass-card" style={{ padding: 16, marginBottom: 16 }}>
        <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 10px" }}>How often</p>
        <select
          value={settings.poll_interval_minutes}
          onChange={(e) => patchField("poll_interval_minutes", parseInt(e.target.value, 10))}
          disabled={busy}
          style={{ padding: 8, borderRadius: 8, border: "1px solid var(--border)" }}
        >
          {INTERVAL_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {m < 60 ? `Every ${m} minutes` : `Every ${m / 60} hours`}
            </option>
          ))}
        </select>
      </div>

      <div className="admin-glass-card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: settings.active_hours_enabled ? 14 : 0 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Only within a time window</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
              {settings.active_hours_enabled
                ? `Active from ${settings.active_hours_start} to ${settings.active_hours_end}`
                : "Disabled — runs all day"}
            </p>
          </div>
          <button
            onClick={() => patchField("active_hours_enabled", !settings.active_hours_enabled)}
            disabled={busy}
            className={settings.active_hours_enabled ? "danger" : "primary"}
            style={{ width: "auto", padding: "8px 16px" }}
          >
            {settings.active_hours_enabled ? "Turn Off" : "Turn On"}
          </button>
        </div>

        {settings.active_hours_enabled && (
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>From</p>
              <input
                type="time"
                defaultValue={settings.active_hours_start}
                onBlur={(e) => patchField("active_hours_start", e.target.value)}
                disabled={busy}
              />
            </div>
            <div>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>To</p>
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
          A time window that spans midnight (e.g. 22:00 to 06:00) works too —
          then the scheduler runs at night instead of during the day.
        </p>
      </div>

      {error && <p style={{ color: "var(--danger-text)", fontSize: 13 }}>{error}</p>}
      {saved && <p style={{ color: "var(--success-text)", fontSize: 13 }}>Saved.</p>}
    </>
  );
}

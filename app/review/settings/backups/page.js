"use client";

import { useEffect, useState } from "react";

const FREQUENCY_OPTIONS = [1, 3, 6, 12, 24, 48, 168];

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatMoment(iso) {
  return new Date(iso).toLocaleString("nl-NL", {
    timeZone: "Europe/Amsterdam", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatFrequencyLabel(hours) {
  if (hours === 168) return "Elke week";
  if (hours === 24) return "Elke dag";
  if (hours === 48) return "Elke 2 dagen";
  return `Elke ${hours} uur`;
}

export default function BackupsPage() {
  const [backups, setBackups] = useState(null);
  const [settings, setSettings] = useState(null);
  const [busy, setBusy] = useState(false);
  const [freqBusy, setFreqBusy] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    try {
      const res = await fetch("/api/backups");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ophalen van back-ups mislukt");
        setBackups([]);
        return;
      }
      setBackups(data.backups || []);
    } catch {
      setError("Kon geen verbinding maken om back-ups op te halen. Ververs de pagina om het opnieuw te proberen.");
      setBackups([]);
    }
  }

  async function loadSettings() {
    const res = await fetch("/api/settings/automation");
    if (res.ok) setSettings(await res.json());
  }

  useEffect(() => {
    load();
    loadSettings();
  }, []);

  async function handleBackupNow() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/backups", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setBackups(data.backups || []);
      } else {
        setError(data.error || "Back-uppen mislukt");
      }
    } catch {
      setError("Kon geen verbinding maken met de server om te back-uppen. Probeer het opnieuw, en check zo nodig de serverlogs.");
    } finally {
      setBusy(false);
    }
  }

  async function handleFrequencyChange(hours) {
    setFreqBusy(true);
    const res = await fetch("/api/settings/automation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ backup_frequency_hours: hours }),
    });
    setFreqBusy(false);
    if (res.ok) setSettings(await res.json());
  }

  if (!backups || !settings) return null;

  const newest = backups[0];

  return (
    <>
      <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>Back-ups</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
        Er wordt automatisch een kopie van het databestand gemaakt (artikelen, instellingen,
        gebruikers — alles), op de frequentie die je hieronder instelt. Er blijft altijd ongeveer
        14 dagen aan geschiedenis bewaard, ongeacht hoe vaak je back-upt; oudere back-ups worden
        automatisch opgeruimd. Download regelmatig een kopie naar je eigen computer voor extra
        zekerheid — deze back-ups staan namelijk op dezelfde server als de site zelf.
      </p>

      <div className="admin-glass-card" style={{ padding: 16, marginBottom: 16 }}>
        <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 10px" }}>Hoe vaak</p>
        <select
          value={settings.backup_frequency_hours}
          onChange={(e) => handleFrequencyChange(parseInt(e.target.value, 10))}
          disabled={freqBusy}
          style={{ padding: 8, borderRadius: 8, border: "1px solid var(--border)" }}
        >
          {FREQUENCY_OPTIONS.map((h) => (
            <option key={h} value={h}>{formatFrequencyLabel(h)}</option>
          ))}
        </select>
      </div>

      <div className="admin-glass-card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>
              {newest ? `Laatste back-up: ${formatMoment(newest.createdAt)}` : "Nog geen back-up gemaakt"}
            </p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
              {backups.length} back-up(s) beschikbaar
            </p>
          </div>
          <button onClick={handleBackupNow} disabled={busy} className="primary" style={{ width: "auto", padding: "8px 16px" }}>
            {busy ? "Bezig..." : "Nu back-uppen"}
          </button>
        </div>
        {error && <p style={{ color: "var(--danger-text)", fontSize: 13, marginTop: 10 }}>{error}</p>}
      </div>

      {backups.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Nog geen back-ups — de eerste wordt automatisch binnen een kwartier aangemaakt, of klik
          op "Nu back-uppen" hierboven.
        </p>
      ) : (
        <div className="admin-glass-card" style={{ padding: 0, overflow: "hidden" }}>
          {backups.map((b, i) => (
            <div
              key={b.filename}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "12px 16px", borderTop: i > 0 ? "1px solid var(--border)" : "none",
              }}
            >
              <span style={{ fontSize: 13 }}>{formatMoment(b.createdAt)}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{formatBytes(b.sizeBytes)}</span>
                <a href={`/api/backups/download/${b.filename}`} style={{ fontSize: 13, color: "var(--accent-text)" }}>
                  Downloaden
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

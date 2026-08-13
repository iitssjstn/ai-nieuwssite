"use client";

import { useEffect, useState } from "react";

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function BackupsPage() {
  const [backups, setBackups] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    const res = await fetch("/api/backups");
    const data = await res.json();
    setBackups(data.backups || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleBackupNow() {
    setError(null);
    setBusy(true);
    const res = await fetch("/api/backups", { method: "POST" });
    setBusy(false);
    if (res.ok) {
      const data = await res.json();
      setBackups(data.backups || []);
    } else {
      const data = await res.json();
      setError(data.error || "Back-uppen mislukt");
    }
  }

  if (!backups) return null;

  const newest = backups[0];

  return (
    <>
      <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>Back-ups</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
        Elke dag wordt automatisch een kopie van het databestand gemaakt (artikelen, instellingen,
        gebruikers — alles). De laatste 14 dagelijkse back-ups blijven bewaard; oudere worden
        automatisch opgeruimd. Download regelmatig een kopie naar je eigen computer voor extra
        zekerheid — deze back-ups staan namelijk op dezelfde server als de site zelf.
      </p>

      <div className="admin-glass-card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>
              {newest ? `Laatste back-up: ${newest.date}` : "Nog geen back-up gemaakt"}
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
          Nog geen back-ups — de eerste wordt automatisch binnen een uur aangemaakt, of klik op
          "Nu back-uppen" hierboven.
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
              <span style={{ fontSize: 13 }}>{b.date}</span>
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

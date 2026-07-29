"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [status, setStatus] = useState(null);
  const [newKey, setNewKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  async function load() {
    const res = await fetch("/api/settings");
    setStatus(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setBusy(true);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ googleApiKey: newKey }),
    });
    setBusy(false);
    if (res.ok) {
      setNewKey("");
      setSaved(true);
      await load();
    } else {
      const data = await res.json();
      setError(data.error || "Opslaan mislukt");
    }
  }

  return (
    <div className="container">
      <h1 style={{ fontSize: 18, fontWeight: 500, marginBottom: 16 }}>Instellingen</h1>

      <div style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 500, margin: "0 0 8px" }}>Google API-key</p>
        {status && (
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>
            {status.hasKey ? `Huidige key: ${status.masked}` : "Nog geen key ingesteld."}
          </p>
        )}
        <form onSubmit={handleSave}>
          <input
            type="text"
            placeholder="Nieuwe API-key (AIza...)"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            style={{ marginBottom: 8 }}
          />
          {error && <p style={{ color: "var(--danger-text)", fontSize: 13, marginBottom: 8 }}>{error}</p>}
          {saved && <p style={{ color: "var(--success-text)", fontSize: 13, marginBottom: 8 }}>Opgeslagen.</p>}
          <button type="submit" className="primary" disabled={busy} style={{ width: "auto", padding: "8px 16px" }}>
            Opslaan
          </button>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

export default function AdsPage() {
  const [clientId, setClientId] = useState(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  async function load() {
    const res = await fetch("/api/settings/ads");
    const data = await res.json();
    setClientId(data.clientId);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setBusy(true);
    const res = await fetch("/api/settings/ads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: draft }),
    });
    setBusy(false);
    if (res.ok) {
      setDraft("");
      setSaved(true);
      await load();
    } else {
      const data = await res.json();
      setError(data.error || "Opslaan mislukt");
    }
  }

  return (
    <>
      <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>Advertenties</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
        Je Google AdSense publisher-ID. Wordt gebruikt voor het advertentiescript op elke pagina
        én voor <code>/ads.txt</code> — beide passen zich automatisch aan zodra je hier opslaat,
        zonder dat er een herbuild nodig is.
      </p>

      <div style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Google AdSense</p>
          <span className={`badge ${clientId ? "badge-muted" : ""}`} style={{ fontSize: 11 }}>
            {clientId ? `Actief · ${clientId}` : "Niet ingesteld"}
          </span>
        </div>

        <form onSubmit={handleSave}>
          <input
            type="text"
            placeholder="ca-pub-XXXXXXXXXXXXXXXX"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            style={{ marginBottom: 10 }}
          />
          {error && <p style={{ color: "var(--danger-text)", fontSize: 13, marginBottom: 8 }}>{error}</p>}
          {saved && <p style={{ color: "var(--success-text)", fontSize: 13, marginBottom: 8 }}>Opgeslagen.</p>}
          <button type="submit" className="primary" disabled={busy} style={{ width: "auto", padding: "8px 16px" }}>
            {busy ? "Bezig..." : "Opslaan"}
          </button>
        </form>
      </div>
    </>
  );
}

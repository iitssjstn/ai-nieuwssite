"use client";

import { useEffect, useState } from "react";

export default function ImagesPage() {
  const [providers, setProviders] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);
  const [savedId, setSavedId] = useState(null);

  async function load() {
    const res = await fetch("/api/settings/images");
    const data = await res.json();
    setProviders(data.providers);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave(provider) {
    setError(null);
    setSavedId(null);
    setBusyId(provider.id);
    const res = await fetch("/api/settings/images", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerId: provider.id, apiKey: drafts[provider.id] || "" }),
    });
    setBusyId(null);
    if (res.ok) {
      setDrafts((d) => ({ ...d, [provider.id]: "" }));
      setSavedId(provider.id);
      await load();
    } else {
      const data = await res.json();
      setError(data.error || "Opslaan mislukt");
    }
  }

  return (
    <>
      <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>Afbeeldingen</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
        Zodra je hier minstens één key instelt, zoekt de AI automatisch een passende gratis
        stockfoto bij elk nieuw concept — op basis van trefwoorden die de AI zelf bedenkt.
        Werkt de eerste provider niet, dan valt het systeem terug op de volgende.
      </p>

      {providers.map((p) => (
        <div key={p.id} style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>{p.label}</p>
            <span className={`badge ${p.hasKey ? "badge-muted" : ""}`} style={{ fontSize: 11 }}>
              {p.hasKey ? `Actief · ${p.masked}` : "Niet ingesteld"}
            </span>
          </div>

          <input
            type="text"
            placeholder={p.hasKey ? "Nieuwe API-key (laat leeg om te behouden)" : "API-key"}
            value={drafts[p.id] ?? ""}
            onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
            style={{ marginBottom: 10 }}
          />

          {error && busyId === null && <p style={{ color: "var(--danger-text)", fontSize: 13, marginBottom: 8 }}>{error}</p>}
          {savedId === p.id && <p style={{ color: "var(--success-text)", fontSize: 13, marginBottom: 8 }}>Opgeslagen.</p>}

          <button
            onClick={() => handleSave(p)}
            className="primary"
            disabled={busyId === p.id}
            style={{ width: "auto", padding: "8px 16px" }}
          >
            {busyId === p.id ? "Bezig..." : "Opslaan"}
          </button>
        </div>
      ))}

      <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
        Gratis keys: <a href="https://www.pexels.com/api/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-text)" }}>pexels.com/api</a>
        {" · "}
        <a href="https://unsplash.com/developers" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-text)" }}>unsplash.com/developers</a>
      </p>
    </>
  );
}

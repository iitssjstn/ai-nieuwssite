"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [providers, setProviders] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);
  const [savedId, setSavedId] = useState(null);

  async function load() {
    const res = await fetch("/api/settings");
    const data = await res.json();
    setProviders(data.providers);
  }

  useEffect(() => {
    load();
  }, []);

  function updateDraft(id, field, value) {
    setDrafts((d) => ({ ...d, [id]: { ...d[id], [field]: value } }));
  }

  async function handleSave(provider) {
    setError(null);
    setSavedId(null);
    setBusyId(provider.id);
    const draft = drafts[provider.id] || {};
    const body = { providerId: provider.id };
    if (draft.apiKey !== undefined) body.apiKey = draft.apiKey;
    if (draft.model !== undefined) body.model = draft.model;

    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusyId(null);
    if (res.ok) {
      setDrafts((d) => ({ ...d, [provider.id]: {} }));
      setSavedId(provider.id);
      await load();
    } else {
      const data = await res.json();
      setError(data.error || "Opslaan mislukt");
    }
  }

  return (
    <div className="container">
      <h1 style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>AI-providers</h1>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
        Stel meerdere gratis providers in — als de eerste faalt (limiet bereikt, storing),
        valt het systeem automatisch terug op de volgende in deze volgorde.
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
            value={drafts[p.id]?.apiKey ?? ""}
            onChange={(e) => updateDraft(p.id, "apiKey", e.target.value)}
            style={{ marginBottom: 8 }}
          />
          <input
            type="text"
            placeholder={`Model (standaard: ${p.defaultModel})`}
            value={drafts[p.id]?.model ?? p.model ?? ""}
            onChange={(e) => updateDraft(p.id, "model", e.target.value)}
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
    </div>
  );
}

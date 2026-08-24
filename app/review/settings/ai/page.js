"use client";

import { useEffect, useState } from "react";

export default function AiProvidersPage() {
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
      setError(data.error || "Save failed");
    }
  }

  return (
    <>
      <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>AI Providers</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
        Configure multiple free providers — if the first one fails (limit reached, outage),
        the system automatically falls back to the next one in this order.
      </p>

      {providers.map((p) => (
        <div key={p.id} style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>{p.label}</p>
            <span className={`badge ${p.hasKey ? "badge-muted" : ""}`} style={{ fontSize: 11 }}>
              {p.hasKey ? `Active · ${p.masked}` : "Not configured"}
            </span>
          </div>

          <input
            type="text"
            placeholder={p.hasKey ? "New API key (leave blank to keep)" : "API key"}
            value={drafts[p.id]?.apiKey ?? ""}
            onChange={(e) => updateDraft(p.id, "apiKey", e.target.value)}
            style={{ marginBottom: 8 }}
          />
          <input
            type="text"
            placeholder={`Model (default: ${p.defaultModel})`}
            value={drafts[p.id]?.model ?? p.model ?? ""}
            onChange={(e) => updateDraft(p.id, "model", e.target.value)}
            style={{ marginBottom: 10 }}
          />

          {error && busyId === null && <p style={{ color: "var(--danger-text)", fontSize: 13, marginBottom: 8 }}>{error}</p>}
          {savedId === p.id && <p style={{ color: "var(--success-text)", fontSize: 13, marginBottom: 8 }}>Saved.</p>}

          <button
            onClick={() => handleSave(p)}
            className="primary"
            disabled={busyId === p.id}
            style={{ width: "auto", padding: "8px 16px" }}
          >
            {busyId === p.id ? "Working..." : "Save"}
          </button>
        </div>
      ))}
    </>
  );
}

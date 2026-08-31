"use client";

import { useEffect, useState } from "react";
import { useConfirmDialog } from "../../../components/ConfirmDialog";

export default function AiProvidersPage() {
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [providers, setProviders] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);
  const [savedId, setSavedId] = useState(null);

  // Per provider-id: null (nog niet getest deze sessie), "testing",
  // { response, latencyMs }, of { error }.
  const [testResults, setTestResults] = useState({});

  const [showAddForm, setShowAddForm] = useState(false);
  const [newProvider, setNewProvider] = useState({ label: "", base_url: "", default_model: "" });
  const [addError, setAddError] = useState(null);
  const [addBusy, setAddBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/settings");
    const data = await res.json();
    setProviders(data.providers);
  }

  useEffect(() => {
    load();
    // Ververst periodiek zodat een aftellende cooldown ("nog 12 min")
    // zichtbaar bijwerkt zonder dat je zelf de pagina hoeft te verversen.
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
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

  async function handleTest(providerId) {
    setTestResults((r) => ({ ...r, [providerId]: "testing" }));
    try {
      const res = await fetch("/api/settings/test-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Test failed");
      setTestResults((r) => ({ ...r, [providerId]: data }));
    } catch (err) {
      setTestResults((r) => ({ ...r, [providerId]: { error: err.message } }));
    }
  }

  async function handleAddProvider(e) {
    e.preventDefault();
    setAddError(null);
    setAddBusy(true);
    const res = await fetch("/api/settings/custom-ai-providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newProvider),
    });
    setAddBusy(false);
    if (res.ok) {
      setNewProvider({ label: "", base_url: "", default_model: "" });
      setShowAddForm(false);
      await load();
    } else {
      const data = await res.json();
      setAddError(data.error || "Could not add provider");
    }
  }

  async function removeCustomProvider(id, label) {
    if (!(await confirm(`Delete provider "${label}"? This also removes the saved API key.`))) return;
    await fetch(`/api/settings/custom-ai-providers/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <>
      {ConfirmDialog}
      <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>AI Providers</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
        Configure multiple free providers — if the first one fails (limit reached, outage),
        the system automatically falls back to the next one in this order. Custom providers
        (added below) are tried last, after all of these. A provider that hits a quota/rate
        limit is automatically skipped for ~15 minutes afterward, so generation doesn't waste
        time retrying it on every article. Use "Test" to quickly try out a provider on its own,
        without waiting for a real article generation.
      </p>

      {providers.map((p) => {
        const test = testResults[p.id];
        const cooldownMinutesLeft = p.cooldownUntil
          ? Math.max(0, Math.ceil((new Date(p.cooldownUntil).getTime() - Date.now()) / 60000))
          : 0;
        return (
          <div key={p.id} style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
              <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>
                {p.label}
                {p.custom && <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 8 }}>Custom</span>}
              </p>
              <span className={`badge ${p.hasKey ? "badge-muted" : ""}`} style={{ fontSize: 11 }}>
                {p.hasKey ? `Active · ${p.masked}` : "Not configured"}
              </span>
            </div>
            {p.custom && (
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>{p.baseUrl}/chat/completions</p>
            )}
            {cooldownMinutesLeft > 0 && (
              <p style={{ fontSize: 12, color: "#f0b154", marginBottom: 8 }}>
                ⏸ Temporarily skipped for ~{cooldownMinutesLeft} more minute{cooldownMinutesLeft === 1 ? "" : "s"} — hit a
                quota/rate limit recently, so generation won't retry it until then (avoids
                wasting time on every article). Use "Test" to check right now and clear this early.
              </p>
            )}

            <input
              type="text"
              placeholder={p.hasKey ? "New API key (leave blank to keep)" : "API key"}
              value={drafts[p.id]?.apiKey ?? ""}
              onChange={(e) => updateDraft(p.id, "apiKey", e.target.value)}
              style={{ marginBottom: 8 }}
            />
            <input
              type="text"
              placeholder={`Model${p.defaultModel ? ` (default: ${p.defaultModel})` : ""}`}
              value={drafts[p.id]?.model ?? p.model ?? ""}
              onChange={(e) => updateDraft(p.id, "model", e.target.value)}
              style={{ marginBottom: 10 }}
            />

            {error && busyId === null && <p style={{ color: "var(--danger-text)", fontSize: 13, marginBottom: 8 }}>{error}</p>}
            {savedId === p.id && <p style={{ color: "var(--success-text)", fontSize: 13, marginBottom: 8 }}>Saved.</p>}

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => handleSave(p)}
                className="primary"
                disabled={busyId === p.id}
                style={{ width: "auto", padding: "8px 16px" }}
              >
                {busyId === p.id ? "Working..." : "Save"}
              </button>
              <button
                onClick={() => handleTest(p.id)}
                disabled={!p.hasKey || test === "testing"}
                style={{ width: "auto", padding: "8px 16px" }}
              >
                {test === "testing" ? "Testing..." : "Test"}
              </button>
              {p.custom && (
                <button
                  onClick={() => removeCustomProvider(p.id, p.label)}
                  className="danger"
                  style={{ width: "auto", padding: "8px 16px" }}
                >
                  Delete
                </button>
              )}
            </div>

            {test && test !== "testing" && (
              <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: test.error ? "#3a1414" : "var(--surface-2)", fontSize: 12 }}>
                {test.error ? (
                  <span style={{ color: "#f28b8b" }}>✗ {test.error}</span>
                ) : (
                  <>
                    <span style={{ color: "var(--success-text)" }}>✓ Responded in {test.latencyMs}ms:</span>{" "}
                    <span style={{ color: "var(--text-secondary)" }}>&quot;{test.response}&quot;</span>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}

      <div style={{ marginTop: 8 }}>
        {!showAddForm ? (
          <button onClick={() => setShowAddForm(true)} style={{ width: "auto", padding: "8px 16px" }}>
            + Add custom provider
          </button>
        ) : (
          <form onSubmit={handleAddProvider} style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Add a custom AI provider</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
              Works for any provider with an OpenAI-compatible chat-completions API (most free/paid
              LLM APIs are). After adding it here, set its API key and model above like any other
              provider — no code changes or redeploy needed.
            </p>
            <input
              type="text"
              placeholder="Name (e.g. Together AI)"
              value={newProvider.label}
              onChange={(e) => setNewProvider((n) => ({ ...n, label: e.target.value }))}
              required
              style={{ marginBottom: 8 }}
            />
            <input
              type="text"
              placeholder="Base URL, e.g. https://api.together.xyz/v1"
              value={newProvider.base_url}
              onChange={(e) => setNewProvider((n) => ({ ...n, base_url: e.target.value }))}
              required
              style={{ marginBottom: 8 }}
            />
            <input
              type="text"
              placeholder="Default model (optional — can also just set it above after adding)"
              value={newProvider.default_model}
              onChange={(e) => setNewProvider((n) => ({ ...n, default_model: e.target.value }))}
              style={{ marginBottom: 10 }}
            />
            {addError && <p style={{ color: "var(--danger-text)", fontSize: 13, marginBottom: 8 }}>{addError}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" className="primary" disabled={addBusy} style={{ width: "auto", padding: "8px 16px" }}>
                {addBusy ? "Adding..." : "Add provider"}
              </button>
              <button type="button" onClick={() => setShowAddForm(false)} style={{ width: "auto", padding: "8px 16px" }}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}

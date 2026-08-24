"use client";

import { useEffect, useState } from "react";
import { useConfirmDialog } from "../../../components/ConfirmDialog";

export default function ImagesPage() {
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [providers, setProviders] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);
  const [savedId, setSavedId] = useState(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newProvider, setNewProvider] = useState({
    label: "", url_template: "", auth_type: "query",
    auth_header_name: "", auth_header_prefix: "", auth_query_param: "key",
    results_path: "", image_field: "", thumb_field: "", credit_name_field: "", credit_url_field: "",
  });
  const [addError, setAddError] = useState(null);
  const [addBusy, setAddBusy] = useState(false);

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
      setError(data.error || "Save failed");
    }
  }

  async function removeCustomProvider(id, label) {
    if (!(await confirm(`Delete provider "${label}"? This also removes the saved API key.`))) return;
    await fetch(`/api/settings/custom-image-providers/${id}`, { method: "DELETE" });
    await load();
  }

  async function handleAddProvider(e) {
    e.preventDefault();
    setAddError(null);
    setAddBusy(true);
    const res = await fetch("/api/settings/custom-image-providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newProvider),
    });
    setAddBusy(false);
    if (res.ok) {
      setNewProvider({
        label: "", url_template: "", auth_type: "query",
        auth_header_name: "", auth_header_prefix: "", auth_query_param: "key",
        results_path: "", image_field: "", thumb_field: "", credit_name_field: "", credit_url_field: "",
      });
      setShowAddForm(false);
      await load();
    } else {
      const data = await res.json();
      setAddError(data.error || "Add failed");
    }
  }

  return (
    <>
      {ConfirmDialog}
      <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>Images</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
        Once you set at least one key here, the AI automatically searches for a matching free
        stock photo for each new draft — based on keywords the AI comes up with itself.
        If the first provider doesn't work, the system falls back to the next one.
      </p>

      {providers.map((p) => (
        <div key={p.id} style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>
              {p.label} {p.custom && <span className="badge badge-muted" style={{ fontSize: 10, marginLeft: 6 }}>custom provider</span>}
            </p>
            <span className={`badge ${p.hasKey ? "badge-muted" : ""}`} style={{ fontSize: 11 }}>
              {p.hasKey ? `Active · ${p.masked}` : "Not configured"}
            </span>
          </div>

          <input
            type="text"
            placeholder={p.hasKey ? "New API key (leave blank to keep)" : "API key"}
            value={drafts[p.id] ?? ""}
            onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
            style={{ marginBottom: 10 }}
          />

          {error && busyId === null && <p style={{ color: "var(--danger-text)", fontSize: 13, marginBottom: 8 }}>{error}</p>}
          {savedId === p.id && <p style={{ color: "var(--success-text)", fontSize: 13, marginBottom: 8 }}>Saved.</p>}

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => handleSave(p)}
              className="primary"
              disabled={busyId === p.id}
              style={{ width: "auto", padding: "8px 16px" }}
            >
              {busyId === p.id ? "Working..." : "Save"}
            </button>
            {p.custom && (
              <button
                onClick={() => removeCustomProvider(p.id, p.label)}
                className="danger"
                style={{ width: "auto", padding: "8px 16px" }}
              >
                Delete provider
              </button>
            )}
          </div>
        </div>
      ))}

      <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20 }}>
        Free keys: <a href="https://www.pexels.com/api/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-text)" }}>pexels.com/api</a>
        {" · "}
        <a href="https://unsplash.com/developers" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-text)" }}>unsplash.com/developers</a>
        {" · "}
        <a href="https://pixabay.com/api/docs/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-text)" }}>pixabay.com/api/docs</a>
      </p>

      {!showAddForm ? (
        <button onClick={() => setShowAddForm(true)} style={{ width: "auto", padding: "8px 16px" }}>
          + Add custom photo provider
        </button>
      ) : (
        <form onSubmit={handleAddProvider} style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16 }}>
          <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 4px" }}>Add custom photo provider</p>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14, lineHeight: 1.5 }}>
            For any API that returns search results as JSON. Use <code>{"{q}"}</code> in the
            URL as the placeholder for the search term. The field names below refer to the structure of
            that API's JSON response (e.g. for Pixabay: results path "hits", image field
            "largeImageURL").
          </p>

          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Name</p>
          <input
            type="text"
            placeholder="e.g. MyPhotoAPI"
            value={newProvider.label}
            onChange={(e) => setNewProvider((p) => ({ ...p, label: e.target.value }))}
            style={{ marginBottom: 10 }}
          />

          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
            Search URL (with <code>{"{q}"}</code> as the placeholder for the search term)
          </p>
          <input
            type="text"
            placeholder="https://api.example.com/search?query={q}&per_page=6"
            value={newProvider.url_template}
            onChange={(e) => setNewProvider((p) => ({ ...p, url_template: e.target.value }))}
            style={{ marginBottom: 10 }}
          />

          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>How is the API key sent?</p>
          <select
            value={newProvider.auth_type}
            onChange={(e) => setNewProvider((p) => ({ ...p, auth_type: e.target.value }))}
            style={{ marginBottom: 10, padding: 8, borderRadius: 8, border: "1px solid var(--border)" }}
          >
            <option value="query">As a query parameter in the URL (e.g. Pixabay: ?key=...)</option>
            <option value="header">As a header (e.g. Pexels/Unsplash: Authorization header)</option>
          </select>

          {newProvider.auth_type === "query" ? (
            <>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Name of the query parameter</p>
              <input
                type="text"
                placeholder="key"
                value={newProvider.auth_query_param}
                onChange={(e) => setNewProvider((p) => ({ ...p, auth_query_param: e.target.value }))}
                style={{ marginBottom: 10 }}
              />
            </>
          ) : (
            <>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Header name</p>
              <input
                type="text"
                placeholder="Authorization"
                value={newProvider.auth_header_name}
                onChange={(e) => setNewProvider((p) => ({ ...p, auth_header_name: e.target.value }))}
                style={{ marginBottom: 10 }}
              />
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
                Prefix before the key (optional, e.g. "Bearer " or "Client-ID ")
              </p>
              <input
                type="text"
                placeholder="Bearer "
                value={newProvider.auth_header_prefix}
                onChange={(e) => setNewProvider((p) => ({ ...p, auth_header_prefix: e.target.value }))}
                style={{ marginBottom: 10 }}
              />
            </>
          )}

          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
            Path to the results list in the JSON response
          </p>
          <input
            type="text"
            placeholder="e.g. photos or data.items"
            value={newProvider.results_path}
            onChange={(e) => setNewProvider((p) => ({ ...p, results_path: e.target.value }))}
            style={{ marginBottom: 10 }}
          />

          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
            Field with the image URL (within each item)
          </p>
          <input
            type="text"
            placeholder="e.g. src.large or imageURL"
            value={newProvider.image_field}
            onChange={(e) => setNewProvider((p) => ({ ...p, image_field: e.target.value }))}
            style={{ marginBottom: 10 }}
          />

          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Field with a smaller thumbnail (optional)</p>
          <input
            type="text"
            placeholder="e.g. src.medium"
            value={newProvider.thumb_field}
            onChange={(e) => setNewProvider((p) => ({ ...p, thumb_field: e.target.value }))}
            style={{ marginBottom: 10 }}
          />

          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Field with the creator's name (optional)</p>
          <input
            type="text"
            placeholder="e.g. photographer or user.name"
            value={newProvider.credit_name_field}
            onChange={(e) => setNewProvider((p) => ({ ...p, credit_name_field: e.target.value }))}
            style={{ marginBottom: 10 }}
          />

          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Field with a link to the photo/creator (optional)</p>
          <input
            type="text"
            placeholder="e.g. url or pageURL"
            value={newProvider.credit_url_field}
            onChange={(e) => setNewProvider((p) => ({ ...p, credit_url_field: e.target.value }))}
            style={{ marginBottom: 10 }}
          />

          {addError && <p style={{ color: "var(--danger-text)", fontSize: 13, marginBottom: 8 }}>{addError}</p>}

          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" className="primary" disabled={addBusy} style={{ width: "auto", padding: "8px 16px" }}>
              {addBusy ? "Working..." : "Add"}
            </button>
            <button type="button" onClick={() => setShowAddForm(false)} style={{ width: "auto", padding: "8px 16px" }}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </>
  );
}

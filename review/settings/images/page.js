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
      setError(data.error || "Opslaan mislukt");
    }
  }

  async function removeCustomProvider(id, label) {
    if (!(await confirm(`Provider "${label}" verwijderen? Dit verwijdert ook de opgeslagen API-key.`))) return;
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
      setAddError(data.error || "Toevoegen mislukt");
    }
  }

  return (
    <>
      {ConfirmDialog}
      <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>Afbeeldingen</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
        Zodra je hier minstens één key instelt, zoekt de AI automatisch een passende gratis
        stockfoto bij elk nieuw concept — op basis van trefwoorden die de AI zelf bedenkt.
        Werkt de eerste provider niet, dan valt het systeem terug op de volgende.
      </p>

      {providers.map((p) => (
        <div key={p.id} style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>
              {p.label} {p.custom && <span className="badge badge-muted" style={{ fontSize: 10, marginLeft: 6 }}>eigen provider</span>}
            </p>
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

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => handleSave(p)}
              className="primary"
              disabled={busyId === p.id}
              style={{ width: "auto", padding: "8px 16px" }}
            >
              {busyId === p.id ? "Bezig..." : "Opslaan"}
            </button>
            {p.custom && (
              <button
                onClick={() => removeCustomProvider(p.id, p.label)}
                className="danger"
                style={{ width: "auto", padding: "8px 16px" }}
              >
                Provider verwijderen
              </button>
            )}
          </div>
        </div>
      ))}

      <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20 }}>
        Gratis keys: <a href="https://www.pexels.com/api/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-text)" }}>pexels.com/api</a>
        {" · "}
        <a href="https://unsplash.com/developers" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-text)" }}>unsplash.com/developers</a>
        {" · "}
        <a href="https://pixabay.com/api/docs/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-text)" }}>pixabay.com/api/docs</a>
      </p>

      {!showAddForm ? (
        <button onClick={() => setShowAddForm(true)} style={{ width: "auto", padding: "8px 16px" }}>
          + Eigen fotoprovider toevoegen
        </button>
      ) : (
        <form onSubmit={handleAddProvider} style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16 }}>
          <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 4px" }}>Eigen fotoprovider toevoegen</p>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14, lineHeight: 1.5 }}>
            Voor elke API die zoekresultaten als JSON teruggeeft. Gebruik <code>{"{q}"}</code> in de
            URL als plek voor de zoekterm. De veldnamen hieronder verwijzen naar de structuur van
            het JSON-antwoord van die API (bijv. bij Pixabay: resultatenpad "hits", afbeeldingsveld
            "largeImageURL").
          </p>

          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Naam</p>
          <input
            type="text"
            placeholder="Bijv. MijnFotoAPI"
            value={newProvider.label}
            onChange={(e) => setNewProvider((p) => ({ ...p, label: e.target.value }))}
            style={{ marginBottom: 10 }}
          />

          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
            Zoek-URL (met <code>{"{q}"}</code> als placeholder voor de zoekterm)
          </p>
          <input
            type="text"
            placeholder="https://api.voorbeeld.com/search?query={q}&per_page=6"
            value={newProvider.url_template}
            onChange={(e) => setNewProvider((p) => ({ ...p, url_template: e.target.value }))}
            style={{ marginBottom: 10 }}
          />

          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Hoe wordt de API-key meegestuurd?</p>
          <select
            value={newProvider.auth_type}
            onChange={(e) => setNewProvider((p) => ({ ...p, auth_type: e.target.value }))}
            style={{ marginBottom: 10, padding: 8, borderRadius: 8, border: "1px solid var(--border)" }}
          >
            <option value="query">Als queryparameter in de URL (bijv. Pixabay: ?key=...)</option>
            <option value="header">Als header (bijv. Pexels/Unsplash: Authorization-header)</option>
          </select>

          {newProvider.auth_type === "query" ? (
            <>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Naam van de queryparameter</p>
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
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Headernaam</p>
              <input
                type="text"
                placeholder="Authorization"
                value={newProvider.auth_header_name}
                onChange={(e) => setNewProvider((p) => ({ ...p, auth_header_name: e.target.value }))}
                style={{ marginBottom: 10 }}
              />
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
                Voorvoegsel vóór de key (optioneel, bijv. "Bearer " of "Client-ID ")
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
            Pad naar de resultatenlijst in de JSON-respons
          </p>
          <input
            type="text"
            placeholder="Bijv. photos of data.items"
            value={newProvider.results_path}
            onChange={(e) => setNewProvider((p) => ({ ...p, results_path: e.target.value }))}
            style={{ marginBottom: 10 }}
          />

          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
            Veld met de afbeeldings-URL (binnen elk item)
          </p>
          <input
            type="text"
            placeholder="Bijv. src.large of imageURL"
            value={newProvider.image_field}
            onChange={(e) => setNewProvider((p) => ({ ...p, image_field: e.target.value }))}
            style={{ marginBottom: 10 }}
          />

          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Veld met een kleinere thumbnail (optioneel)</p>
          <input
            type="text"
            placeholder="Bijv. src.medium"
            value={newProvider.thumb_field}
            onChange={(e) => setNewProvider((p) => ({ ...p, thumb_field: e.target.value }))}
            style={{ marginBottom: 10 }}
          />

          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Veld met de naam van de maker (optioneel)</p>
          <input
            type="text"
            placeholder="Bijv. photographer of user.name"
            value={newProvider.credit_name_field}
            onChange={(e) => setNewProvider((p) => ({ ...p, credit_name_field: e.target.value }))}
            style={{ marginBottom: 10 }}
          />

          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Veld met een link naar de foto/maker (optioneel)</p>
          <input
            type="text"
            placeholder="Bijv. url of pageURL"
            value={newProvider.credit_url_field}
            onChange={(e) => setNewProvider((p) => ({ ...p, credit_url_field: e.target.value }))}
            style={{ marginBottom: 10 }}
          />

          {addError && <p style={{ color: "var(--danger-text)", fontSize: 13, marginBottom: 8 }}>{addError}</p>}

          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" className="primary" disabled={addBusy} style={{ width: "auto", padding: "8px 16px" }}>
              {addBusy ? "Bezig..." : "Toevoegen"}
            </button>
            <button type="button" onClick={() => setShowAddForm(false)} style={{ width: "auto", padding: "8px 16px" }}>
              Annuleren
            </button>
          </div>
        </form>
      )}
    </>
  );
}

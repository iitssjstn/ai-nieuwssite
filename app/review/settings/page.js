"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [tab, setTab] = useState("ai");

  return (
    <div className="container">
      <h1 style={{ fontSize: 18, fontWeight: 500, marginBottom: 16 }}>Instellingen</h1>

      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--border)", paddingBottom: 10 }}>
        <TabButton active={tab === "ai"} onClick={() => setTab("ai")}>AI-providers</TabButton>
        <TabButton active={tab === "ads"} onClick={() => setTab("ads")}>Advertenties</TabButton>
        <TabButton active={tab === "users"} onClick={() => setTab("users")}>Redacteuren</TabButton>
      </div>

      {tab === "ai" && <AiProvidersTab />}
      {tab === "ads" && <AdsTab />}
      {tab === "users" && <UsersTab />}
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "auto",
        padding: "6px 14px",
        fontSize: 13,
        border: "none",
        borderRadius: 6,
        background: active ? "var(--accent-bg)" : "transparent",
        color: active ? "var(--accent-text)" : "var(--text-secondary)",
      }}
    >
      {children}
    </button>
  );
}

function AiProvidersTab() {
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
    <>
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
    </>
  );
}

function AdsTab() {
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

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("editor");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(data.users || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, role }),
    });
    setBusy(false);
    if (res.ok) {
      setUsername("");
      setPassword("");
      await load();
    } else {
      const data = await res.json();
      setError(data.error || "Aanmaken mislukt");
    }
  }

  async function remove(id) {
    if (!confirm("Deze gebruiker verwijderen?")) return;
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      await load();
    } else {
      const data = await res.json();
      alert(data.error || "Verwijderen mislukt");
    }
  }

  return (
    <>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
        Redacteuren kunnen concepten genereren en bewerken, maar niet goedkeuren, publiceren of
        instellingen wijzigen — dat blijft voorbehouden aan admins.
      </p>

      <form onSubmit={handleAdd} style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <p style={{ fontSize: 13, fontWeight: 500, margin: "0 0 10px" }}>Nieuwe gebruiker toevoegen</p>
        <input
          type="text"
          placeholder="Gebruikersnaam"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ marginBottom: 8 }}
        />
        <input
          type="password"
          placeholder="Wachtwoord (min. 8 tekens)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ marginBottom: 8 }}
        />
        <select value={role} onChange={(e) => setRole(e.target.value)} style={{ marginBottom: 10, padding: 8, borderRadius: 8, border: "1px solid var(--border)" }}>
          <option value="editor">Redacteur</option>
          <option value="admin">Admin</option>
        </select>
        {error && <p style={{ color: "var(--danger-text)", fontSize: 13, marginBottom: 8 }}>{error}</p>}
        <button type="submit" className="primary" disabled={busy} style={{ width: "auto", padding: "8px 16px" }}>
          Toevoegen
        </button>
      </form>

      {users.map((u) => (
        <div key={u.id} className="pending-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontWeight: 500, margin: 0 }}>{u.username}</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
              {u.role === "admin" ? "Admin" : "Redacteur"}
            </p>
          </div>
          <button onClick={() => remove(u.id)} className="danger" style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}>
            Verwijderen
          </button>
        </div>
      ))}
    </>
  );
}

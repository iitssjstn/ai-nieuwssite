"use client";

import { useEffect, useState } from "react";

export default function PollsPage() {
  const [polls, setPolls] = useState([]);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    const res = await fetch("/api/polls");
    const data = await res.json();
    setPolls(data.polls || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/polls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, options }),
    });
    setBusy(false);
    if (res.ok) {
      setQuestion("");
      setOptions(["", ""]);
      await load();
    } else {
      const data = await res.json();
      setError(data.error || "Aanmaken mislukt");
    }
  }

  async function remove(id) {
    if (!confirm("Deze poll verwijderen?")) return;
    await fetch(`/api/polls/${id}`, { method: "DELETE" });
    await load();
  }

  async function toggleActive(id) {
    await fetch(`/api/polls/${id}`, { method: "PATCH" });
    await load();
  }

  function updateOption(i, value) {
    const copy = [...options];
    copy[i] = value;
    setOptions(copy);
  }

  return (
    <div className="container">
      <h1 style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>Polls</h1>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
        Maak een poll aan en koppel het poll-ID bij het bewerken van een artikel om 'm daaronder te tonen.
      </p>

      <form onSubmit={handleCreate} style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <p style={{ fontSize: 13, fontWeight: 500, margin: "0 0 10px" }}>Nieuwe poll</p>
        <input
          type="text"
          placeholder="Vraag"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          style={{ marginBottom: 8 }}
        />
        {options.map((opt, i) => (
          <input
            key={i}
            type="text"
            placeholder={`Optie ${i + 1}`}
            value={opt}
            onChange={(e) => updateOption(i, e.target.value)}
            style={{ marginBottom: 8 }}
          />
        ))}
        <button type="button" onClick={() => setOptions((o) => [...o, ""])} style={{ width: "auto", padding: "5px 10px", fontSize: 12, marginBottom: 10 }}>
          + Optie toevoegen
        </button>
        <br />
        {error && <p style={{ color: "var(--danger-text)", fontSize: 13, marginBottom: 8 }}>{error}</p>}
        <button type="submit" className="primary" disabled={busy} style={{ width: "auto", padding: "8px 16px" }}>
          Aanmaken
        </button>
      </form>

      {polls.map((p) => (
        <div key={p.id} className="pending-item">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <p style={{ fontWeight: 500, margin: 0 }}>{p.question}</p>
            <span className="badge badge-muted">{p.active ? "Actief" : "Inactief"}</span>
          </div>
          {p.options.map((o) => {
            const total = p.options.reduce((s, x) => s + x.votes, 0);
            const pct = total > 0 ? Math.round((o.votes / total) * 100) : 0;
            return (
              <p key={o.id} style={{ fontSize: 13, margin: "4px 0" }}>
                {o.text} — {o.votes} stemmen ({pct}%)
              </p>
            );
          })}
          <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "6px 0" }}>Poll-ID: {p.id}</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => toggleActive(p.id)} style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}>
              {p.active ? "Deactiveren" : "Activeren"}
            </button>
            <button onClick={() => remove(p.id)} className="danger" style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}>
              Verwijderen
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

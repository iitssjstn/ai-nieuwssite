"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function QueuePage() {
  const [pending, setPending] = useState([]);
  const [sources, setSources] = useState([]);
  const [sourceId, setSourceId] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [extraSources, setExtraSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function loadAll() {
    const [pendingRes, sourcesRes] = await Promise.all([
      fetch("/api/articles?status=pending_review"),
      fetch("/api/sources"),
    ]);
    const pendingData = await pendingRes.json();
    const sourcesData = await sourcesRes.json();
    setPending(pendingData);
    setSources(sourcesData);
    if (sourcesData.length > 0 && !sourceId) setSourceId(sourcesData[0].id);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGenerate(e) {
    e.preventDefault();
    setError(null);
    if (!sourceText.trim() || !sourceId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_id: sourceId,
          source_text: sourceText,
          source_url: sourceUrl,
          additional_sources: extraSources,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Onbekende fout");
      setSourceText("");
      setSourceUrl("");
      setExtraSources([]);
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <h1 style={{ fontSize: 18, fontWeight: 500 }}>Nieuw concept genereren</h1>
      <form onSubmit={handleGenerate} style={{ marginBottom: 32 }}>
        <div style={{ marginBottom: 10 }}>
          {sources.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Nog geen bronnen. Voeg er eerst een toe bij <Link href="/review/sources">Bronnen</Link>.
            </p>
          ) : (
            <select value={sourceId} onChange={(e) => setSourceId(e.target.value)} style={{ padding: 8, borderRadius: 8, border: "1px solid var(--border)" }}>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
        </div>
        <input
          type="text"
          placeholder="Link naar het bronartikel (optioneel, voor verificatie)"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          style={{ marginBottom: 8 }}
        />
        <textarea
          rows={4}
          placeholder="Plak hier de brontekst (bijv. uit een RSS-item of persbericht)..."
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          style={{ marginBottom: 10 }}
        />

        {extraSources.map((s, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
              Extra bron {i + 2} (voor fact-checking)
            </p>
            <input
              type="text"
              placeholder="Naam van deze bron (bijv. NOS)"
              value={s.name}
              onChange={(e) => {
                const copy = [...extraSources];
                copy[i] = { ...copy[i], name: e.target.value };
                setExtraSources(copy);
              }}
              style={{ marginBottom: 4 }}
            />
            <input
              type="text"
              placeholder="Link naar deze bron (optioneel)"
              value={s.url || ""}
              onChange={(e) => {
                const copy = [...extraSources];
                copy[i] = { ...copy[i], url: e.target.value };
                setExtraSources(copy);
              }}
              style={{ marginBottom: 4 }}
            />
            <textarea
              rows={3}
              placeholder="Brontekst van deze extra bron..."
              value={s.text}
              onChange={(e) => {
                const copy = [...extraSources];
                copy[i] = { ...copy[i], text: e.target.value };
                setExtraSources(copy);
              }}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => setExtraSources((s) => [...s, { name: "", text: "" }])}
          style={{ width: "auto", padding: "5px 10px", fontSize: 12, marginBottom: 10 }}
        >
          + Nog een bron toevoegen (fact-check)
        </button>
        <br />

        {error && <p style={{ color: "var(--danger-text)", fontSize: 13 }}>{error}</p>}
        <button type="submit" className="primary" disabled={loading || sources.length === 0} style={{ width: "auto", padding: "10px 20px" }}>
          {loading ? "Bezig met genereren..." : "Concept genereren"}
        </button>
      </form>

      <h2 style={{ fontSize: 16, fontWeight: 500 }}>Wachtrij ({pending.length})</h2>
      {pending.length === 0 && (
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Niets te reviewen.</p>
      )}
      {pending.map((a) => (
        <Link key={a.id} href={`/review/${a.id}`} className="pending-item">
          <span className="badge badge-muted" style={{ marginBottom: 8, display: "inline-block" }}>{a.category}</span>
          {a.possible_duplicate && (
            <span className="flag flag-warn" style={{ marginLeft: 8 }}>⚠ mogelijk duplicaat</span>
          )}
          <p style={{ fontWeight: 500, margin: 0 }}>{a.title}</p>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
            Confidence: {a.confidence_score != null ? Math.round(a.confidence_score * 100) + "%" : "-"}
            {a.source_url && " · 🔗 bron-link beschikbaar"}
          </p>
        </Link>
      ))}
    </div>
  );
}

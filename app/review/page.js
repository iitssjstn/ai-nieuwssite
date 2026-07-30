"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ReviewOverview() {
  const [pending, setPending] = useState([]);
  const [sources, setSources] = useState([]);
  const [stats, setStats] = useState(null);
  const [sourceId, setSourceId] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function loadAll() {
    const [pendingRes, sourcesRes, statsRes] = await Promise.all([
      fetch("/api/articles?status=pending_review"),
      fetch("/api/sources"),
      fetch("/api/stats"),
    ]);
    const pendingData = await pendingRes.json();
    const sourcesData = await sourcesRes.json();
    const statsData = await statsRes.json();
    setPending(pendingData);
    setSources(sourcesData);
    setStats(statsData);
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
        body: JSON.stringify({ source_id: sourceId, source_text: sourceText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Onbekende fout");
      setSourceText("");
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      {stats && (
        <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
          <StatCard label="Gepubliceerd" value={stats.published} color="#173404" text="#9fd15d" />
          <StatCard label="Te reviewen" value={stats.pending_review} color="#412402" text="#f0b154" />
          <StatCard label="Afgekeurd" value={stats.rejected} color="#501313" text="#f09595" />
          <StatCard label="Bronnen" value={stats.sources} color="#042c53" text="#6fa8e8" />
        </div>
      )}

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
        <textarea
          rows={4}
          placeholder="Plak hier de brontekst (bijv. uit een RSS-item of persbericht)..."
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          style={{ marginBottom: 10 }}
        />
        {error && <p style={{ color: "var(--danger-text)", fontSize: 13 }}>{error}</p>}
        <button type="submit" className="primary" disabled={loading || sources.length === 0} style={{ width: "auto", padding: "10px 20px" }}>
          {loading ? "Bezig met genereren..." : "Concept genereren"}
        </button>
      </form>

      <h2 style={{ fontSize: 16, fontWeight: 500 }}>Wachtrij</h2>
      {pending.length === 0 && (
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Niets te reviewen.</p>
      )}
      {pending.map((a) => (
        <Link key={a.id} href={`/review/${a.id}`} className="pending-item">
          <span className="badge badge-muted" style={{ marginBottom: 8, display: "inline-block" }}>{a.category}</span>
          <p style={{ fontWeight: 500, margin: 0 }}>{a.title}</p>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
            Confidence: {a.confidence_score != null ? Math.round(a.confidence_score * 100) + "%" : "-"}
          </p>
        </Link>
      ))}
    </div>
  );
}

function StatCard({ label, value, color, text }) {
  return (
    <div style={{ background: "var(--surface-1)", borderRadius: 10, padding: "12px 18px", minWidth: 130 }}>
      <p style={{ fontSize: 24, fontWeight: 600, margin: 0, color: text || "var(--text-primary)" }}>{value}</p>
      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0" }}>{label}</p>
    </div>
  );
}

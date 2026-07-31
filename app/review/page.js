"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ReviewOverview() {
  const [pending, setPending] = useState([]);
  const [sources, setSources] = useState([]);
  const [stats, setStats] = useState(null);
  const [pageviews, setPageviews] = useState([]);
  const [hoveredDay, setHoveredDay] = useState(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState("today");
  const [analytics, setAnalytics] = useState(null);
  const [sourceId, setSourceId] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [extraSources, setExtraSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function loadAll() {
    const [pendingRes, sourcesRes, statsRes, pvRes] = await Promise.all([
      fetch("/api/articles?status=pending_review"),
      fetch("/api/sources"),
      fetch("/api/stats"),
      fetch("/api/stats/pageviews"),
    ]);
    const pendingData = await pendingRes.json();
    const sourcesData = await sourcesRes.json();
    const statsData = await statsRes.json();
    const pvData = await pvRes.json();
    setPending(pendingData);
    setSources(sourcesData);
    setStats(statsData);
    setPageviews(pvData.days || []);
    if (sourcesData.length > 0 && !sourceId) setSourceId(sourcesData[0].id);
  }

  async function loadAnalytics(period) {
    const res = await fetch(`/api/stats/analytics?period=${period}`);
    setAnalytics(await res.json());
  }

  useEffect(() => {
    loadAnalytics(analyticsPeriod);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyticsPeriod]);

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

  const maxViews = Math.max(1, ...pageviews.map((d) => d.views));

  return (
    <div className="container">
      {stats && (
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <StatCard label="Gepubliceerd" value={stats.published} text="#9fd15d" href="/review/published?tab=published" />
          <StatCard label="Te reviewen" value={stats.pending_review} text="#f0b154" href="/review" />
          <StatCard label="Goedgekeurd" value={stats.approved} text="#6fa8e8" href="/review/published?tab=approved" />
          <StatCard label="Gepland" value={stats.scheduled} text="#6fa8e8" href="/review/published?tab=scheduled" />
          <StatCard label="Afgekeurd" value={stats.rejected} text="#f09595" href="/review/published?tab=rejected" />
          <StatCard label="Bronnen" value={stats.sources} text="#6fa8e8" href="/review/sources" />
        </div>
      )}

      {pageviews.length > 0 && (
        <div style={{ background: "var(--surface-1)", borderRadius: 10, padding: 16, marginBottom: 28 }}>
          <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Paginaweergaven — laatste 14 dagen</p>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 60, position: "relative" }}>
            {pageviews.map((d, i) => (
              <div
                key={d.date}
                onMouseEnter={() => setHoveredDay(i)}
                onMouseLeave={() => setHoveredDay(null)}
                style={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end", position: "relative", cursor: "default" }}
              >
                {hoveredDay === i && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "100%",
                      left: "50%",
                      transform: "translateX(-50%)",
                      marginBottom: 8,
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      padding: "6px 10px",
                      whiteSpace: "nowrap",
                      fontSize: 12,
                      zIndex: 10,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                    }}
                  >
                    <strong>{d.views}</strong> weergave{d.views === 1 ? "" : "n"}
                    <div style={{ color: "var(--text-muted)", fontSize: 11 }}>{formatDayLabel(d.date)}</div>
                  </div>
                )}
                <div
                  style={{
                    width: "100%",
                    height: `${Math.max(4, (d.views / maxViews) * 60)}px`,
                    background: "var(--accent-text)",
                    opacity: hoveredDay === i ? 1 : 0.85,
                    borderRadius: 2,
                  }}
                />
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
            Totaal deze periode: {pageviews.reduce((sum, d) => sum + d.views, 0)} weergaven
          </p>
        </div>
      )}

      {analytics && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
          <div style={{ background: "var(--surface-1)", borderRadius: 10, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>Meest gelezen</p>
              <select value={analyticsPeriod} onChange={(e) => setAnalyticsPeriod(e.target.value)} style={{ width: "auto", padding: "3px 6px", fontSize: 12 }}>
                <option value="today">Vandaag</option>
                <option value="week">Deze week</option>
                <option value="month">Deze maand</option>
              </select>
            </div>
            {analytics.top_articles.length === 0 && (
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Nog geen weergaven in deze periode.</p>
            )}
            {analytics.top_articles.map((a, i) => (
              <Link key={a.id} href={`/review/${a.id}`} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0", color: "inherit", textDecoration: "none" }}>
                <span>{i + 1}. {a.title}</span>
                <span style={{ color: "var(--text-muted)", flexShrink: 0, marginLeft: 8 }}>{a.views}</span>
              </Link>
            ))}
          </div>

          <div style={{ background: "var(--surface-1)", borderRadius: 10, padding: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Weergaven per categorie</p>
            {analytics.by_category.length === 0 && (
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Nog geen data.</p>
            )}
            {analytics.by_category.map((c) => (
              <div key={c.category} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0" }}>
                <span>{c.category}</span>
                <span style={{ color: "var(--text-muted)" }}>{c.views}</span>
              </div>
            ))}
          </div>
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

      <h2 style={{ fontSize: 16, fontWeight: 500 }}>Wachtrij</h2>
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

function formatDayLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });
}

function StatCard({ label, value, text, href }) {
  return (
    <Link
      href={href}
      style={{
        background: "var(--surface-1)", borderRadius: 10, padding: "12px 18px", minWidth: 120,
        display: "block", textDecoration: "none", border: "1px solid transparent",
        transition: "border-color 0.15s",
      }}
      className="stat-card-link"
    >
      <p style={{ fontSize: 22, fontWeight: 600, margin: 0, color: text || "var(--text-primary)" }}>{value}</p>
      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0" }}>{label}</p>
    </Link>
  );
}

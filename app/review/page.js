"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ReviewOverview() {
  const [stats, setStats] = useState(null);
  const [pageviews, setPageviews] = useState([]);
  const [hoveredDay, setHoveredDay] = useState(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState("today");
  const [analytics, setAnalytics] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  async function loadOnlineUsers() {
    const res = await fetch("/api/users/online");
    if (res.ok) setOnlineUsers((await res.json()).users || []);
  }

  async function loadAll() {
    const [statsRes, pvRes] = await Promise.all([
      fetch("/api/stats"),
      fetch("/api/stats/pageviews"),
    ]);
    setStats(await statsRes.json());
    const pvData = await pvRes.json();
    setPageviews(pvData.days || []);
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
  }, []);

  useEffect(() => {
    loadOnlineUsers();
    const interval = setInterval(loadOnlineUsers, 30000);
    return () => clearInterval(interval);
  }, []);

  const maxViews = Math.max(1, ...pageviews.map((d) => d.views));

  return (
    <div className="container">
      {onlineUsers.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Nu online:</span>
          {onlineUsers.map((u) => (
            <span key={u.id} className="badge badge-muted" style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#9fd15d", display: "inline-block" }} />
              {u.full_name || u.username}
            </span>
          ))}
        </div>
      )}

      {stats && (
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <StatCard label="Gepubliceerd" value={stats.published} text="#9fd15d" href="/review/published?tab=published" />
          <StatCard label="Te reviewen" value={stats.pending_review} text="#f0b154" href="/review/queue" />
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

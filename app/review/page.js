"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ReviewOverview() {
  const [stats, setStats] = useState(null);
  const [pageviews, setPageviews] = useState([]);
  const [hoveredDay, setHoveredDay] = useState(null);
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState("today");
  const [analytics, setAnalytics] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [activeVisitors, setActiveVisitors] = useState(null);
  const [categories, setCategories] = useState([]);
  const [recentArticles, setRecentArticles] = useState([]);
  const [me, setMe] = useState(null);

  async function loadOnlineUsers() {
    const res = await fetch("/api/users/online");
    if (res.ok) setOnlineUsers((await res.json()).users || []);
  }

  async function loadActiveVisitors() {
    const res = await fetch("/api/stats/active-visitors");
    if (res.ok) setActiveVisitors((await res.json()).count);
  }

  async function loadAll() {
    const [statsRes, pvRes, catRes, artRes, meRes] = await Promise.all([
      fetch("/api/stats"),
      fetch("/api/stats/pageviews"),
      fetch("/api/categories"),
      fetch("/api/articles?status=published"),
      fetch("/api/auth/me"),
    ]);
    setStats(await statsRes.json());
    const pvData = await pvRes.json();
    setPageviews(pvData.days || []);
    setCategories((await catRes.json()).categories || []);
    const articles = await artRes.json();
    setRecentArticles(
      [...articles].sort((a, b) => new Date(b.published_at) - new Date(a.published_at)).slice(0, 5)
    );
    if (meRes.ok) setMe(await meRes.json());
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

  useEffect(() => {
    loadActiveVisitors();
    const interval = setInterval(loadActiveVisitors, 10000);
    return () => clearInterval(interval);
  }, []);

  const maxViews = Math.max(1, ...pageviews.map((d) => d.views));

  // Real trend: last 7 days vs. the 7 days before that (no invented
  // percentage — if there isn't enough data for a meaningful comparison,
  // we simply leave it out instead of making something up).
  let viewsTrend = null;
  if (pageviews.length >= 14) {
    const last7 = pageviews.slice(-7).reduce((s, d) => s + d.views, 0);
    const prev7 = pageviews.slice(-14, -7).reduce((s, d) => s + d.views, 0);
    if (prev7 > 0) viewsTrend = Math.round(((last7 - prev7) / prev7) * 100);
  }

  const categoryData = (analytics?.by_category || [])
    .map((c) => ({
      label: c.category,
      value: c.views,
      color: categories.find((cat) => cat.name === c.category)?.color || "#6fa8e8",
    }))
    .filter((c) => c.value > 0);

  const alerts = [];
  if (stats?.pending_review > 0) {
    alerts.push({ type: "warn", text: `${stats.pending_review} article(s) awaiting review`, href: "/review/queue" });
  }
  if (stats?.pending_updates > 0) {
    alerts.push({ type: "info", text: `${stats.pending_updates} article(s) have an update notification`, href: "/review/published" });
  }
  if (alerts.length === 0 && stats) {
    alerts.push({ type: "ok", text: "Alles is bijgewerkt — niets wacht op actie", href: null });
  }

  const firstName = (me?.full_name || me?.username || "").split(" ")[0];

  return (
    <div className="container">
      {/* Begroeting */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 600, margin: 0 }}>
          {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: "6px 0 0" }}>
          {stats ? `${stats.published} articles live, ${stats.pending_review} awaiting your review.` : "Loading..."}
        </p>
      </div>

      {/* Cirkelvormige kernstatistieken */}
      {stats && (
        <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
          <CircularStat label="Published" value={stats.published} color="#9fd15d" href="/review/published?tab=published" />
          <CircularStat label="To Review" value={stats.pending_review} color="#f0b154" href="/review/queue" />
          <CircularStat label="Approved" value={stats.approved} color="#6fa8e8" href="/review/published?tab=approved" />
          <CircularStat label="Scheduled" value={stats.scheduled} color="#6fa8e8" href="/review/published?tab=scheduled" />
          <CircularStat label="Rejected" value={stats.rejected} color="#f09595" href="/review/published?tab=rejected" />
          <CircularStat label="Sources" value={stats.sources} color="#c79ef0" href="/review/sources" />
          {activeVisitors !== null && (
            <CircularStat label="On site now" value={activeVisitors} color="#22C55E" />
          )}
        </div>
      )}

      {/* Grafiek + donut naast elkaar */}
      <div className="dashboard-chart-row" style={{ marginBottom: 16 }}>
        {pageviews.length > 0 && (
          <div className="admin-glass-card" style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
              <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Page views — last 14 days</p>
              {viewsTrend !== null && (
                <span style={{ fontSize: 12, color: viewsTrend >= 0 ? "var(--success-text)" : "var(--danger-text)" }}>
                  {viewsTrend >= 0 ? "+" : ""}{viewsTrend}% t.o.v. vorige week
                </span>
              )}
            </div>
            <p style={{ fontSize: 22, fontWeight: 700, margin: "2px 0 14px" }}>
              {pageviews.reduce((sum, d) => sum + d.views, 0)} <span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-muted)" }}>total views</span>
            </p>
            <PageviewsChart data={pageviews} maxViews={maxViews} hoveredDay={hoveredDay} setHoveredDay={setHoveredDay} />
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {onlineUsers.length > 0 && (
            <div className="admin-glass-card" style={{ padding: "12px 16px" }}>
              <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                Online now
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {onlineUsers.map((u) => (
                  <span key={u.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#9fd15d", display: "inline-block", flexShrink: 0 }} />
                    {u.full_name || u.username}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="admin-glass-card" style={{ padding: 20, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <p style={{ fontSize: 14, fontWeight: 600, margin: "0 0 14px", alignSelf: "flex-start" }}>Categories</p>
            {categoryData.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No views yet.</p>
            ) : (
              <>
                <DonutChart data={categoryData} hoveredLabel={hoveredCategory} onHover={setHoveredCategory} />
                <div style={{ width: "100%", marginTop: 14 }}>
                  {categoryData.map((c) => {
                    const isHovered = c.label === hoveredCategory;
                    return (
                      <div
                        key={c.label}
                        onMouseEnter={() => setHoveredCategory(c.label)}
                        onMouseLeave={() => setHoveredCategory(null)}
                        style={{
                          display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginBottom: 6,
                          padding: "3px 6px", marginLeft: -6, marginRight: -6, borderRadius: 6,
                          background: isHovered ? "rgba(255,255,255,0.06)" : "transparent",
                          fontWeight: isHovered ? 600 : 400,
                          transition: "background 0.12s",
                          cursor: "default",
                        }}
                      >
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
                        <span style={{ flex: 1 }}>{c.label}</span>
                        <span style={{ color: isHovered ? c.color : "var(--text-muted)" }}>{Math.round((c.value / categoryData.reduce((s, d) => s + d.value, 0)) * 100)}%</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Waarschuwingen + meest gelezen naast elkaar */}
      <div className="dashboard-secondary-row" style={{ marginBottom: 16 }}>
        <div className="admin-glass-card" style={{ padding: 20 }}>
          <p style={{ fontSize: 14, fontWeight: 600, margin: "0 0 12px" }}>Meldingen</p>
          {alerts.map((a, i) => {
            const content = (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: i > 0 ? "1px solid var(--border)" : "none" }}>
                <AlertIcon type={a.type} />
                <span style={{ fontSize: 13 }}>{a.text}</span>
              </div>
            );
            return a.href ? <Link key={i} href={a.href} style={{ color: "inherit", textDecoration: "none", display: "block" }}>{content}</Link> : content;
          })}
        </div>

        {analytics && (
          <div className="admin-glass-card" style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Most Read</p>
              <select value={analyticsPeriod} onChange={(e) => setAnalyticsPeriod(e.target.value)} style={{ width: "auto", padding: "3px 6px", fontSize: 12 }}>
                <option value="today">Vandaag</option>
                <option value="week">Deze week</option>
                <option value="month">Deze maand</option>
              </select>
            </div>
            {analytics.top_articles.length === 0 && (
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No views in this period yet.</p>
            )}
            {analytics.top_articles.map((a, i) => (
              <Link key={a.id} href={`/review/${a.id}`} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", color: "inherit", textDecoration: "none" }}>
                <span>{i + 1}. {a.title}</span>
                <span style={{ color: "var(--text-muted)", flexShrink: 0, marginLeft: 8 }}>{a.views}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent articles — table */}
      {recentArticles.length > 0 && (
        <div className="admin-glass-card" style={{ padding: 20, marginBottom: 16 }}>
          <p style={{ fontSize: 14, fontWeight: 600, margin: "0 0 14px" }}>Recent gepubliceerd</p>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {recentArticles.map((a, i) => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderTop: i > 0 ? "1px solid var(--border)" : "none" }}>
                <span className="badge badge-muted" style={{ flexShrink: 0 }}>{a.category}</span>
                <span style={{ flex: 1, fontSize: 13, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</span>
                <span style={{ fontSize: 12, color: "var(--text-muted)", flexShrink: 0 }}>
                  {new Date(a.published_at).toLocaleDateString("en-US", { day: "numeric", month: "short" })}
                </span>
                <Link href={`/review/${a.id}`} style={{ flexShrink: 0 }}>
                  <button style={{ width: "auto", padding: "5px 12px", fontSize: 12 }}>Bewerken</button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CircularStat({ label, value, color, href }) {
  const Wrapper = href ? Link : "div";
  return (
    <Wrapper
      {...(href ? { href } : {})}
      className="admin-glass-card"
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "18px 20px", textDecoration: "none", minWidth: 120,
        transition: "transform 0.15s",
      }}
    >
      <div style={{
        width: 58, height: 58, borderRadius: "50%",
        border: `3px solid ${color}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 17, fontWeight: 700, color: "var(--text-primary)",
        marginBottom: 8,
      }}>
        {value}
      </div>
      <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", textAlign: "center" }}>{label}</p>
    </Wrapper>
  );
}

function PageviewsChart({ data, maxViews, hoveredDay, setHoveredDay }) {
  const width = 600;
  const height = 140;
  const stepX = data.length > 1 ? width / (data.length - 1) : width;
  const points = data.map((d, i) => ({
    x: i * stepX,
    y: height - (d.views / maxViews) * (height - 20) - 10,
    views: d.views,
    date: d.date,
  }));
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x},${height} L0,${height} Z`;

  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none">
        <defs>
          <linearGradient id="pv-area-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6fa8e8" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#6fa8e8" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#pv-area-fill)" />
        <path d={linePath} fill="none" stroke="#6fa8e8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={hoveredDay === i ? 5 : 3}
            fill="#6fa8e8"
            stroke="#0d0e14"
            strokeWidth="1.5"
            onMouseEnter={() => setHoveredDay(i)}
            onMouseLeave={() => setHoveredDay(null)}
            style={{ cursor: "default" }}
          />
        ))}
      </svg>
      {hoveredDay !== null && (
        <div
          style={{
            position: "absolute",
            left: `${(points[hoveredDay].x / width) * 100}%`,
            top: `${(points[hoveredDay].y / height) * 100}%`,
            transform: "translate(-50%, -130%)",
            background: "#1a1b23",
            border: "1px solid var(--border)",
            borderRadius: 6,
            padding: "6px 10px",
            whiteSpace: "nowrap",
            fontSize: 12,
            zIndex: 10,
            pointerEvents: "none",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          <strong>{points[hoveredDay].views}</strong> weergave{points[hoveredDay].views === 1 ? "" : "n"}
          <div style={{ color: "var(--text-muted)", fontSize: 11 }}>{formatDayLabel(points[hoveredDay].date)}</div>
        </div>
      )}
    </div>
  );
}

function DonutChart({ data, hoveredLabel, onHover }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  const hovered = data.find((d) => d.label === hoveredLabel);
  const hoveredPct = hovered ? Math.round((hovered.value / total) * 100) : null;

  return (
    <svg viewBox="0 0 160 160" width={160} height={160}>
      <g transform="rotate(-90 80 80)">
        <circle cx={80} cy={80} r={radius} fill="none" stroke="var(--border)" strokeWidth={16} />
        {data.map((d) => {
          const pct = d.value / total;
          const dash = pct * circumference;
          const isHovered = d.label === hoveredLabel;
          const el = (
            <circle
              key={d.label}
              cx={80} cy={80} r={radius} fill="none" stroke={d.color}
              strokeWidth={isHovered ? 20 : 16}
              strokeOpacity={hoveredLabel && !isHovered ? 0.45 : 1}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              onMouseEnter={() => onHover(d.label)}
              onMouseLeave={() => onHover(null)}
              style={{ cursor: "default", transition: "stroke-width 0.12s, stroke-opacity 0.12s" }}
            />
          );
          offset += dash;
          return el;
        })}
      </g>
      {hovered ? (
        <>
          <text x={80} y={76} textAnchor="middle" fontSize={20} fontWeight={700} fill={hovered.color}>{hoveredPct}%</text>
          <text x={80} y={95} textAnchor="middle" fontSize={11} fill="var(--text-muted)">{hovered.label}</text>
        </>
      ) : (
        <>
          <text x={80} y={76} textAnchor="middle" fontSize={22} fontWeight={700} fill="var(--text-primary)">{total}</text>
          <text x={80} y={95} textAnchor="middle" fontSize={11} fill="var(--text-muted)">views</text>
        </>
      )}
    </svg>
  );
}

function AlertIcon({ type }) {
  const config = {
    warn: { bg: "#412402", color: "#f0b154", symbol: "!" },
    info: { bg: "#1a2c47", color: "#6fa8e8", symbol: "i" },
    ok: { bg: "#173404", color: "#9fd15d", symbol: "✓" },
  }[type];
  return (
    <span style={{
      width: 22, height: 22, borderRadius: "50%", background: config.bg, color: config.color,
      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0,
    }}>
      {config.symbol}
    </span>
  );
}

function formatDayLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
}

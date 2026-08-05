"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useConfirmDialog } from "../../components/ConfirmDialog";

const TABS = [
  { id: "published", label: "Gepubliceerd" },
  { id: "approved", label: "Goedgekeurd" },
  { id: "scheduled", label: "Gepland" },
  { id: "rejected", label: "Afgekeurd" },
  { id: "archived", label: "Gearchiveerd" },
];

export default function PublishedArticles() {
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab");
  const [tab, setTab] = useState(TABS.some((t) => t.id === initialTab) ? initialTab : "published");
  const [articles, setArticles] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [me, setMe] = useState(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [categories, setCategories] = useState([]);
  const [sortBy, setSortBy] = useState("newest");

  async function load() {
    const res = await fetch(`/api/articles?status=${tab}`);
    setArticles(await res.json());
  }

  useEffect(() => {
    fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)).then(setMe).catch(() => {});
    fetch("/api/categories").then((r) => r.json()).then((d) => setCategories(d.categories || [])).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  function categoryStyle(name) {
    const c = categories.find((c) => c.name === name);
    return c ? { background: c.color + "22", color: c.color } : {};
  }

  async function doAction(id, action) {
    setBusyId(id);
    await fetch(`/api/articles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await load();
    setBusyId(null);
  }

  async function remove(id) {
    if (!(await confirm("Dit artikel definitief verwijderen? Dit kan niet ongedaan worden gemaakt."))) return;
    setBusyId(id);
    await fetch(`/api/articles/${id}`, { method: "DELETE" });
    await load();
    setBusyId(null);
  }

  const filtered = useMemo(() => {
    let result = articles;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (a) => a.title.toLowerCase().includes(q) || (a.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    }
    if (categoryFilter) {
      result = result.filter((a) => a.category === categoryFilter);
    }
    result = [...result].sort((a, b) => {
      const da = new Date(a.published_at || a.reviewed_at || a.created_at);
      const db = new Date(b.published_at || b.reviewed_at || b.created_at);
      if (sortBy === "newest") return db - da;
      if (sortBy === "oldest") return da - db;
      if (sortBy === "most_read") return (b.views || 0) - (a.views || 0);
      return 0;
    });
    return result;
  }, [articles, search, categoryFilter, sortBy]);

  const isAdmin = me?.role === "admin";
  const activeTabLabel = TABS.find((t) => t.id === tab)?.label || "";

  function dateLine(a) {
    if (tab === "scheduled" && a.scheduled_at) return `Gepland voor: ${new Date(a.scheduled_at).toLocaleString("nl-NL")}`;
    if ((tab === "approved" || tab === "rejected") && a.reviewed_at) return `Beoordeeld: ${new Date(a.reviewed_at).toLocaleString("nl-NL")}`;
    if (a.published_at) return `Gepubliceerd: ${new Date(a.published_at).toLocaleString("nl-NL")} · ${a.views || 0} weergaven`;
    return `Aangemaakt: ${new Date(a.created_at).toLocaleString("nl-NL")}`;
  }

  return (
    <div className="container">
      {ConfirmDialog}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              width: "auto", padding: "6px 14px", fontSize: 13, border: "none",
              background: tab === t.id ? "var(--accent-bg)" : "transparent",
              color: tab === t.id ? "var(--accent-text)" : "var(--text-secondary)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <h1 style={{ fontSize: 18, fontWeight: 500, marginBottom: 16 }}>
        {activeTabLabel} ({filtered.length} van {articles.length})
      </h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Zoeken op titel of tag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: "1 1 220px" }}
        />
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ width: "auto" }}>
          <option value="">Alle categorieën</option>
          {categories.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ width: "auto" }}>
          <option value="newest">Nieuwste eerst</option>
          <option value="oldest">Oudste eerst</option>
          <option value="most_read">Meest gelezen</option>
        </select>
      </div>

      {filtered.length === 0 && (
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          {articles.length === 0
            ? `Nog niets in "${activeTabLabel}".`
            : "Geen artikelen komen overeen met je zoekopdracht/filter."}
        </p>
      )}

      {filtered.map((a) => (
        <div key={a.id} className="pending-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <span className="badge badge-muted" style={{ marginBottom: 8, display: "inline-block", ...categoryStyle(a.category) }}>{a.category}</span>
            {a.reviewer_id === "auto" && (
              <span className="badge" style={{ marginBottom: 8, marginLeft: 6, display: "inline-block", background: "var(--accent-bg)", color: "var(--accent-text)" }}>
                🤖 Automatisch gepubliceerd
              </span>
            )}
            {a.pending_update && (
              <Link href={`/review/${a.id}`} className="badge" style={{ marginBottom: 8, marginLeft: 6, display: "inline-block", background: "var(--accent-bg)", color: "var(--accent-text)", textDecoration: "none" }}>
                🔔 Nieuwe informatie gevonden
              </Link>
            )}
            <p style={{ fontWeight: 500, margin: 0 }}>{a.title}</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
              {dateLine(a)}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <Link href={`/review/${a.id}`}>
              <button disabled={busyId === a.id} style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}>Bewerken</button>
            </Link>
            {isAdmin && tab === "published" && (
              <>
                <button disabled={busyId === a.id} onClick={() => doAction(a.id, "unpublish")} style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}>
                  Depubliceren
                </button>
                <button disabled={busyId === a.id} onClick={() => doAction(a.id, "archive")} style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}>
                  Archiveren
                </button>
              </>
            )}
            {isAdmin && tab === "approved" && (
              <>
                <button disabled={busyId === a.id} onClick={() => doAction(a.id, "publish")} className="primary" style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}>
                  Publiceren
                </button>
                <button disabled={busyId === a.id} onClick={() => doAction(a.id, "unpublish")} style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}>
                  Terug naar wachtrij
                </button>
              </>
            )}
            {isAdmin && tab === "scheduled" && (
              <button disabled={busyId === a.id} onClick={() => doAction(a.id, "unschedule")} style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}>
                Planning annuleren
              </button>
            )}
            {isAdmin && tab === "rejected" && (
              <button disabled={busyId === a.id} onClick={() => doAction(a.id, "unpublish")} style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}>
                Opnieuw indienen
              </button>
            )}
            {isAdmin && tab === "archived" && (
              <button disabled={busyId === a.id} onClick={() => doAction(a.id, "unarchive")} style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}>
                Terugzetten
              </button>
            )}
            {isAdmin && (
              <button disabled={busyId === a.id} onClick={() => remove(a.id)} className="danger" style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}>
                Verwijderen
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

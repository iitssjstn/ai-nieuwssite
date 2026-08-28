"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useConfirmDialog } from "../../components/ConfirmDialog";
import ShareButtons from "../../components/ShareButtons";

const TABS = [
  { id: "published", label: "Published" },
  { id: "approved", label: "Approved" },
  { id: "scheduled", label: "Scheduled" },
  { id: "rejected", label: "Rejected" },
  { id: "archived", label: "Archived" },
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
    if (!(await confirm("Permanently delete this article? This cannot be undone."))) return;
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
    if (tab === "scheduled" && a.scheduled_at) return `Scheduled for: ${new Date(a.scheduled_at).toLocaleString("en-US")}`;
    if ((tab === "approved" || tab === "rejected") && a.reviewed_at) return `Reviewed: ${new Date(a.reviewed_at).toLocaleString("en-US")}`;
    if (a.published_at) return `Published: ${new Date(a.published_at).toLocaleString("en-US")} · ${a.views || 0} views`;
    return `Created: ${new Date(a.created_at).toLocaleString("en-US")}`;
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
        {activeTabLabel} ({filtered.length} of {articles.length})
      </h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search by title or tag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: "1 1 220px" }}
        />
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ width: "auto" }}>
          <option value="">Alle categorieën</option>
          {categories.filter((c) => !c.parent).map((top) => (
            <optgroup key={top.name} label={top.name}>
              <option value={top.name}>{top.name}</option>
              {categories.filter((c) => c.parent === top.name).map((sub) => (
                <option key={sub.name} value={sub.name}>&nbsp;↳ {sub.name}</option>
              ))}
            </optgroup>
          ))}
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
            : "No articles match your search/filter."}
        </p>
      )}

      {filtered.map((a) => (
        <div key={a.id} className="pending-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
            {a.featured_image ? (
              <Image
                src={a.featured_image}
                alt=""
                width={52}
                height={52}
                style={{ width: 52, height: 52, borderRadius: 8, objectFit: "cover", flexShrink: 0, border: "1px solid var(--border)" }}
              />
            ) : (
              <div style={{
                width: 52, height: 52, borderRadius: 8, flexShrink: 0, border: "1px solid var(--border)",
                background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.8">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
              </div>
            )}
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
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
            <Link href={`/review/${a.id}`}>
              <button disabled={busyId === a.id} style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}>Edit</button>
            </Link>
            {tab === "published" && <ShareButtons slug={a.slug} title={a.title} />}
            {isAdmin && tab === "published" && (
              <>
                <button disabled={busyId === a.id} onClick={() => doAction(a.id, "unpublish")} style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}>
                  Unpublish
                </button>
                <button disabled={busyId === a.id} onClick={() => doAction(a.id, "archive")} style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}>
                  Archive
                </button>
              </>
            )}
            {isAdmin && tab === "approved" && (
              <>
                <button disabled={busyId === a.id} onClick={() => doAction(a.id, "publish")} className="primary" style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}>
                  Publish
                </button>
                <button disabled={busyId === a.id} onClick={() => doAction(a.id, "unpublish")} style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}>
                  Back to queue
                </button>
              </>
            )}
            {isAdmin && tab === "scheduled" && (
              <button disabled={busyId === a.id} onClick={() => doAction(a.id, "unschedule")} style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}>
                Cancel schedule
              </button>
            )}
            {isAdmin && tab === "rejected" && (
              <button disabled={busyId === a.id} onClick={() => doAction(a.id, "unpublish")} style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}>
                Resubmit
              </button>
            )}
            {isAdmin && tab === "archived" && (
              <button disabled={busyId === a.id} onClick={() => doAction(a.id, "unarchive")} style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}>
                Restore
              </button>
            )}
            {isAdmin && (
              <button disabled={busyId === a.id} onClick={() => remove(a.id)} className="danger" style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}>
                Delete
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

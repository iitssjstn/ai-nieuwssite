"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function PublishedArticles() {
  const [tab, setTab] = useState("published");
  const [articles, setArticles] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [me, setMe] = useState(null);

  async function load() {
    const res = await fetch(`/api/articles?status=${tab}`);
    setArticles(await res.json());
  }

  useEffect(() => {
    fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)).then(setMe).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

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
    if (!confirm("Dit artikel definitief verwijderen? Dit kan niet ongedaan worden gemaakt.")) return;
    setBusyId(id);
    await fetch(`/api/articles/${id}`, { method: "DELETE" });
    await load();
    setBusyId(null);
  }

  const isAdmin = me?.role === "admin";

  return (
    <div className="container">
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        <button onClick={() => setTab("published")} style={{ width: "auto", padding: "6px 14px", fontSize: 13, background: tab === "published" ? "var(--accent-bg)" : "transparent", color: tab === "published" ? "var(--accent-text)" : "var(--text-secondary)", border: "none" }}>
          Gepubliceerd
        </button>
        <button onClick={() => setTab("archived")} style={{ width: "auto", padding: "6px 14px", fontSize: 13, background: tab === "archived" ? "var(--accent-bg)" : "transparent", color: tab === "archived" ? "var(--accent-text)" : "var(--text-secondary)", border: "none" }}>
          Gearchiveerd
        </button>
      </div>

      <h1 style={{ fontSize: 18, fontWeight: 500, marginBottom: 16 }}>
        {tab === "published" ? "Gepubliceerde" : "Gearchiveerde"} artikelen ({articles.length})
      </h1>

      {articles.length === 0 && (
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          {tab === "published" ? "Nog niets gepubliceerd." : "Nog niets gearchiveerd."}
        </p>
      )}

      {articles.map((a) => (
        <div key={a.id} className="pending-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <span className="badge badge-muted" style={{ marginBottom: 8, display: "inline-block" }}>{a.category}</span>
            <p style={{ fontWeight: 500, margin: 0 }}>{a.title}</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
              Gepubliceerd: {a.published_at ? new Date(a.published_at).toLocaleString("nl-NL") : "-"}
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

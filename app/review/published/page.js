"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function PublishedArticles() {
  const [articles, setArticles] = useState([]);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    const res = await fetch("/api/articles?status=published");
    setArticles(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function unpublish(id) {
    setBusyId(id);
    await fetch(`/api/articles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unpublish" }),
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

  return (
    <div className="container">
      <h1 style={{ fontSize: 18, fontWeight: 500, marginBottom: 16 }}>
        Gepubliceerde artikelen ({articles.length})
      </h1>

      {articles.length === 0 && (
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Nog niets gepubliceerd.</p>
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
            <button disabled={busyId === a.id} onClick={() => unpublish(a.id)} style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}>
              Depubliceren
            </button>
            <button disabled={busyId === a.id} onClick={() => remove(a.id)} className="danger" style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}>
              Verwijderen
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

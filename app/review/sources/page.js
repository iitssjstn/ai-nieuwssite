"use client";

import { useEffect, useState } from "react";
import { useConfirmDialog } from "../../components/ConfirmDialog";

export default function SourcesPage() {
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [sources, setSources] = useState([]);
  const [name, setName] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [trustLevel, setTrustLevel] = useState("official");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [fetchingId, setFetchingId] = useState(null);
  const [fetchResult, setFetchResult] = useState({});

  async function load() {
    const res = await fetch("/api/sources");
    setSources(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, feed_url: feedUrl, trust_level: trustLevel }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Unknown error");
      setName("");
      setFeedUrl("");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    if (!(await confirm("Delete this source?"))) return;
    await fetch(`/api/sources/${id}`, { method: "DELETE" });
    await load();
  }

  async function fetchNow(id) {
    setFetchingId(id);
    setFetchResult((r) => ({ ...r, [id]: null }));
    try {
      const res = await fetch(`/api/sources/${id}/fetch`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFetchResult((r) => ({
        ...r,
        [id]: `${data.created} new draft(s)` +
          (data.merged > 0 ? `, ${data.merged} source(s) merged` : "") +
          (data.updated > 0 ? `, ${data.updated} article(s) automatically updated` : "") +
          (data.errors?.length ? `, ${data.errors.length} error(s)` : ""),
      }));
    } catch (err) {
      setFetchResult((r) => ({ ...r, [id]: "Error: " + err.message }));
    } finally {
      setFetchingId(null);
    }
  }

  return (
    <div className="container">
      {ConfirmDialog}
      <h1 style={{ fontSize: 18, fontWeight: 500, marginBottom: 16 }}>Sources ({sources.length})</h1>

      <form onSubmit={handleAdd} style={{ marginBottom: 32, background: "var(--surface-1)", borderRadius: 12, padding: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 500, margin: "0 0 10px" }}>Add new source</p>
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ marginBottom: 8 }}
        />
        <input
          type="text"
          placeholder="RSS feed URL (optional)"
          value={feedUrl}
          onChange={(e) => setFeedUrl(e.target.value)}
          style={{ marginBottom: 8 }}
        />
        <select value={trustLevel} onChange={(e) => setTrustLevel(e.target.value)} style={{ marginBottom: 10, padding: 8, borderRadius: 8, border: "1px solid var(--border)" }}>
          <option value="official">Official (government)</option>
          <option value="press_agency">Press agency</option>
          <option value="other">Other</option>
        </select>
        {error && <p style={{ color: "var(--danger-text)", fontSize: 13, marginBottom: 8 }}>{error}</p>}
        <button type="submit" className="primary" disabled={busy} style={{ width: "auto", padding: "8px 16px" }}>
          Add
        </button>
      </form>

      {sources.map((s) => (
        <div key={s.id} className="pending-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontWeight: 500, margin: 0 }}>{s.name}</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
              {trustLabel(s.trust_level)}{s.feed_url ? ` · ${s.feed_url}` : ""}
            </p>
            {fetchResult[s.id] && (
              <p style={{ fontSize: 12, color: "var(--accent-text)", margin: "4px 0 0" }}>{fetchResult[s.id]}</p>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            {s.feed_url && (
              <button onClick={() => fetchNow(s.id)} disabled={fetchingId === s.id} style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}>
                {fetchingId === s.id ? "Working..." : "Fetch Now"}
              </button>
            )}
            <button onClick={() => remove(s.id)} className="danger" style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}>
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function trustLabel(level) {
  return { official: "Official", press_agency: "Press agency", other: "Other" }[level] || level;
}

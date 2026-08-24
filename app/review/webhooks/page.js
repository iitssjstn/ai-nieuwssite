"use client";

import { useEffect, useState } from "react";
import { useConfirmDialog } from "../../components/ConfirmDialog";

export default function WebhooksPage() {
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [webhooks, setWebhooks] = useState([]);
  const [keys, setKeys] = useState([]);
  const [url, setUrl] = useState("");
  const [keyName, setKeyName] = useState("");
  const [newKeyValue, setNewKeyValue] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    const [wRes, kRes] = await Promise.all([fetch("/api/webhooks"), fetch("/api/keys")]);
    setWebhooks((await wRes.json()).webhooks || []);
    setKeys((await kRes.json()).keys || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function addWebhook(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, events: ["article.published"] }),
    });
    setBusy(false);
    if (res.ok) {
      setUrl("");
      await load();
    } else {
      setError((await res.json()).error || "Creation failed");
    }
  }

  async function removeWebhook(id) {
    if (!(await confirm("Delete this webhook?"))) return;
    await fetch(`/api/webhooks/${id}`, { method: "DELETE" });
    await load();
  }

  async function toggleWebhook(id) {
    await fetch(`/api/webhooks/${id}`, { method: "PATCH" });
    await load();
  }

  async function addKey(e) {
    e.preventDefault();
    if (!keyName.trim()) return;
    setBusy(true);
    const res = await fetch("/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: keyName }),
    });
    setBusy(false);
    if (res.ok) {
      const data = await res.json();
      setNewKeyValue(data.key);
      setKeyName("");
      await load();
    }
  }

  async function removeKey(id) {
    if (!(await confirm("Delete this API key? Applications using it will stop working."))) return;
    await fetch(`/api/keys/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="container">
      {ConfirmDialog}
      <h1 style={{ fontSize: 18, fontWeight: 500, marginBottom: 16 }}>Webhooks & API</h1>

      <h2 style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>Webhooks</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
        Automatically receives a POST request as soon as an article is published, with an
        HMAC-SHA256 signature (header <code>X-Webhook-Signature</code>) so you can
        verify that the request really came from this site.
      </p>
      <form onSubmit={addWebhook} style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="https://your-app.com/webhook"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={{ marginBottom: 8 }}
        />
        {error && <p style={{ color: "var(--danger-text)", fontSize: 13, marginBottom: 8 }}>{error}</p>}
        <button type="submit" className="primary" disabled={busy} style={{ width: "auto", padding: "8px 16px" }}>
          Add
        </button>
      </form>
      {webhooks.map((w) => (
        <div key={w.id} className="pending-item">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontWeight: 500, margin: 0, wordBreak: "break-all" }}>{w.url}</p>
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "4px 0 0" }}>
                Secret: {w.secret} · {w.events.join(", ")}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button onClick={() => toggleWebhook(w.id)} style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}>
                {w.active ? "Deactivate" : "Activate"}
              </button>
              <button onClick={() => removeWebhook(w.id)} className="danger" style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}

      <h2 style={{ fontSize: 15, fontWeight: 500, margin: "28px 0 8px" }}>External API</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
        Other applications can fetch published articles via{" "}
        <code>GET /api/v1/articles</code> with an <code>X-API-Key</code> header.
      </p>
      <form onSubmit={addKey} style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Name (e.g. 'My app')"
          value={keyName}
          onChange={(e) => setKeyName(e.target.value)}
          style={{ marginBottom: 8 }}
        />
        <button type="submit" className="primary" disabled={busy} style={{ width: "auto", padding: "8px 16px" }}>
          Generate New Key
        </button>
      </form>
      {newKeyValue && (
        <div style={{ background: "#412402", color: "#f0b154", borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13 }}>
          <p style={{ margin: "0 0 6px", fontWeight: 500 }}>Save this key now — it will not be shown again:</p>
          <code style={{ wordBreak: "break-all" }}>{newKeyValue}</code>
        </div>
      )}
      {keys.map((k) => (
        <div key={k.id} className="pending-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontWeight: 500, margin: 0 }}>{k.name}</p>
            <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "4px 0 0" }}>
              Created: {new Date(k.created_at).toLocaleDateString("en-US")}
            </p>
          </div>
          <button onClick={() => removeKey(k.id)} className="danger" style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}

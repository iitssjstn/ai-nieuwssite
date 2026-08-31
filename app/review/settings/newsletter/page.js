"use client";

import { useEffect, useState } from "react";

export default function NewsletterSettingsPage() {
  const [newsletter, setNewsletter] = useState(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [loadError, setLoadError] = useState(null);

  async function load() {
    setLoadError(null);
    try {
      const res = await fetch("/api/settings/newsletter");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setNewsletter(data);
      setDraft(data.sender_email || "");
    } catch (err) {
      setLoadError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setBusy(true);
    const res = await fetch("/api/settings/newsletter", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sender_email: draft.trim() || null }),
    });
    setBusy(false);
    if (res.ok) {
      setNewsletter(await res.json());
      setSaved(true);
    } else {
      const data = await res.json();
      setError(data.error || "Save failed");
    }
  }

  if (loadError) {
    return (
      <>
        <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>Newsletter</h2>
        <p style={{ color: "var(--danger-text)", fontSize: 13 }}>Could not load settings: {loadError}</p>
        <button onClick={load} style={{ width: "auto", padding: "6px 12px", fontSize: 13, marginTop: 8 }}>
          Retry
        </button>
      </>
    );
  }
  if (!newsletter) return null;

  return (
    <>
      <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>Newsletter</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
        Without a sender email address, the signup form stays hidden from visitors — only once
        you fill something in here does it appear on the site. Signups are stored in a list
        you can see below; no newsletter is sent automatically yet.
      </p>

      <form onSubmit={handleSave} style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16 }}>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Sender email address</p>
        <input
          type="text"
          placeholder="editorial@novapers.nl"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          style={{ marginBottom: 10 }}
        />
        {error && <p style={{ color: "var(--danger-text)", fontSize: 13, marginBottom: 8 }}>{error}</p>}
        {saved && <p style={{ color: "var(--success-text)", fontSize: 13, marginBottom: 8 }}>Saved.</p>}
        {newsletter.subscriber_count !== undefined && (
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
            {newsletter.subscriber_count} signup(s) so far.
          </p>
        )}
        <button type="submit" className="primary" disabled={busy} style={{ width: "auto", padding: "8px 16px" }}>
          Save
        </button>
      </form>
    </>
  );
}

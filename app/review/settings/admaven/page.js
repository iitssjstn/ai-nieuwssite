"use client";

import { useEffect, useState } from "react";

export default function AdMavenPage() {
  const [placementId, setPlacementId] = useState(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function load() {
    const res = await fetch("/api/settings/admaven");
    const data = await res.json();
    setPlacementId(data.placementId);
    setDraft(data.placementId || "");
  }

  useEffect(() => {
    load();
  }, []);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    const res = await fetch("/api/settings/admaven", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placementId: draft }),
    });
    setBusy(false);
    if (res.ok) {
      const data = await res.json();
      setPlacementId(data.placementId);
      setSaved(true);
    }
  }

  if (placementId === null && draft === "") return null;

  return (
    <>
      <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>AdMaven</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
        AdMaven verifies site ownership through a placement meta tag — copy the "content" value
        from the tag AdMaven gave you (e.g. from{" "}
        <code>{'<meta name="admaven-placement" content="...">'}</code>) and paste it below. This
        renders directly in every page's <code>&lt;head&gt;</code> — it's a static tag, not a
        script, so it isn't gated behind cookie consent like the ad networks below it in this menu.
      </p>

      <form onSubmit={save} className="admin-glass-card" style={{ padding: 16 }}>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Placement ID</p>
        <input
          type="text"
          placeholder="e.g. BqHY7pjaH"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={busy}
          style={{ marginBottom: 10 }}
        />
        {saved && <p style={{ color: "var(--success-text)", fontSize: 13, marginBottom: 8 }}>Saved.</p>}
        <button type="submit" className="primary" disabled={busy} style={{ width: "auto", padding: "8px 16px" }}>
          {busy ? "Working..." : "Save"}
        </button>
      </form>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";

export default function InfoPagesSettingsPage() {
  const [infoPages, setInfoPages] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState(null);

  async function load() {
    setLoadError(null);
    try {
      const res = await fetch("/api/settings/info-pages");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setInfoPages(data);
    } catch (err) {
      setLoadError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggle(field) {
    setBusy(true);
    const res = await fetch("/api/settings/info-pages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: !infoPages[field] }),
    });
    setBusy(false);
    if (res.ok) setInfoPages(await res.json());
  }

  if (loadError) {
    return (
      <>
        <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>Info Pages</h2>
        <p style={{ color: "var(--danger-text)", fontSize: 13 }}>Could not load settings: {loadError}</p>
        <button onClick={load} style={{ width: "auto", padding: "6px 12px", fontSize: 13, marginTop: 8 }}>
          Retry
        </button>
      </>
    );
  }
  if (!infoPages) return null;

  return (
    <>
      <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>Info Pages</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
        If you turn a page off, its link disappears from the footer and the page itself shows a
        "not found" instead of the content.
      </p>

      <div style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 13 }}>About Us</span>
          <div style={{ display: "flex", gap: 8 }}>
            <a href="/review/settings/info-pages/about" style={{ fontSize: 13, color: "var(--accent-text)", alignSelf: "center" }}>Edit</a>
            <button onClick={() => toggle("about_enabled")} disabled={busy} className={infoPages.about_enabled ? "danger" : "primary"} style={{ width: "auto", padding: "6px 14px", fontSize: 13 }}>
              {infoPages.about_enabled ? "Turn Off" : "Turn On"}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13 }}>Privacy</span>
          <div style={{ display: "flex", gap: 8 }}>
            <a href="/review/settings/info-pages/privacy" style={{ fontSize: 13, color: "var(--accent-text)", alignSelf: "center" }}>Edit</a>
            <button onClick={() => toggle("privacy_enabled")} disabled={busy} className={infoPages.privacy_enabled ? "danger" : "primary"} style={{ width: "auto", padding: "6px 14px", fontSize: 13 }}>
              {infoPages.privacy_enabled ? "Turn Off" : "Turn On"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

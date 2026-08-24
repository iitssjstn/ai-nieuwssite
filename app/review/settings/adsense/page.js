"use client";

import { useEffect, useState } from "react";

export default function AdSensePage() {
  const [clientId, setClientId] = useState(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  const [slots, setSlots] = useState(null);
  const [slotBusy, setSlotBusy] = useState(false);
  const [slotSaved, setSlotSaved] = useState(false);

  async function load() {
    const res = await fetch("/api/settings/ads");
    const data = await res.json();
    setClientId(data.clientId);
  }

  async function loadSlots() {
    const res = await fetch("/api/settings/ad-slots");
    setSlots(await res.json());
  }

  useEffect(() => {
    load();
    loadSlots();
  }, []);

  async function saveSlots(updated) {
    setSlotBusy(true);
    setSlotSaved(false);
    const res = await fetch("/api/settings/ad-slots", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    setSlotBusy(false);
    if (res.ok) {
      setSlots(await res.json());
      setSlotSaved(true);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setBusy(true);
    const res = await fetch("/api/settings/ads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: draft }),
    });
    setBusy(false);
    if (res.ok) {
      setDraft("");
      setSaved(true);
      await load();
    } else {
      const data = await res.json();
      setError(data.error || "Save failed");
    }
  }

  return (
    <>
      <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>Google AdSense</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
        Your Google AdSense publisher ID. Used for the ad script on every page
        and for <code>/ads.txt</code> — both update automatically as soon as you save here,
        no rebuild needed.
      </p>

      <div style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Publisher ID</p>
          <span className={`badge ${clientId ? "badge-muted" : ""}`} style={{ fontSize: 11 }}>
            {clientId ? `Active · ${clientId}` : "Not configured"}
          </span>
        </div>

        <form onSubmit={handleSave}>
          <input
            type="text"
            placeholder="ca-pub-XXXXXXXXXXXXXXXX"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            style={{ marginBottom: 10 }}
          />
          {error && <p style={{ color: "var(--danger-text)", fontSize: 13, marginBottom: 8 }}>{error}</p>}
          {saved && <p style={{ color: "var(--success-text)", fontSize: 13, marginBottom: 8 }}>Saved.</p>}
          <button type="submit" className="primary" disabled={busy} style={{ width: "auto", padding: "8px 16px" }}>
            {busy ? "Working..." : "Save"}
          </button>
        </form>

        {slots && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
            <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Large, responsive ad unit</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
              The <code>data-ad-slot</code> value of an AdSense ad unit. Appears
              as a wide strip at the bottom of the homepage.
            </p>
            <input
              type="text"
              placeholder="e.g. 7555171901"
              defaultValue={slots.adsense_slot || ""}
              onBlur={(e) => saveSlots({ ...slots, adsense_slot: e.target.value.trim() || null })}
              disabled={slotBusy}
            />
            {slotSaved && <p style={{ color: "var(--success-text)", fontSize: 13, marginTop: 8 }}>Saved.</p>}
          </div>
        )}
      </div>
    </>
  );
}

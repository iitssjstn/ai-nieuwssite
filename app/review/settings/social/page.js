"use client";

import { useEffect, useState } from "react";

export default function SocialSettingsPage() {
  const [social, setSocial] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function load() {
    const res = await fetch("/api/settings/social");
    setSocial(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function save(updated) {
    setBusy(true);
    setSaved(false);
    const res = await fetch("/api/settings/social", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    setBusy(false);
    if (res.ok) {
      setSocial(await res.json());
      setSaved(true);
    }
  }

  if (!social) return null;

  return (
    <>
      <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>Social Media</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
        Only filled-in profiles get an icon in the footer — leave a field blank to hide
        that icon.
      </p>

      <div style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16 }}>
        {["twitter", "facebook", "instagram", "youtube"].map((key) => (
          <div key={key} style={{ marginBottom: 8 }}>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4, textTransform: "capitalize" }}>{key}</p>
            <input
              type="text"
              placeholder={`https://${key}.com/...`}
              defaultValue={social[key] || ""}
              onBlur={(e) => save({ ...social, [key]: e.target.value.trim() || null })}
              disabled={busy}
            />
          </div>
        ))}
        {saved && <p style={{ color: "var(--success-text)", fontSize: 13, marginTop: 8 }}>Saved.</p>}
      </div>
    </>
  );
}

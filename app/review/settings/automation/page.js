"use client";

import { useEffect, useState } from "react";

export default function AutomationPage() {
  const [settings, setSettings] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function load() {
    const res = await fetch("/api/settings/automation");
    setSettings(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function toggle() {
    setBusy(true);
    setSaved(false);
    const res = await fetch("/api/settings/automation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !settings.enabled }),
    });
    setSettings(await res.json());
    setBusy(false);
    setSaved(true);
  }

  async function updateMaxPerSource(value) {
    setBusy(true);
    setSaved(false);
    const res = await fetch("/api/settings/automation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ max_per_source: parseInt(value, 10) }),
    });
    setSettings(await res.json());
    setBusy(false);
    setSaved(true);
  }

  async function toggleAutoPublish() {
    setBusy(true);
    setSaved(false);
    const res = await fetch("/api/settings/automation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auto_publish: !settings.auto_publish }),
    });
    setSettings(await res.json());
    setBusy(false);
    setSaved(true);
  }

  async function updateMinConfidence(value) {
    setBusy(true);
    setSaved(false);
    const res = await fetch("/api/settings/automation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auto_publish_min_confidence: parseFloat(value) }),
    });
    setSettings(await res.json());
    setBusy(false);
    setSaved(true);
  }

  async function patchField(field, value) {
    setBusy(true);
    setSaved(false);
    const res = await fetch("/api/settings/automation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    setSettings(await res.json());
    setBusy(false);
    setSaved(true);
  }

  if (!settings) return null;

  return (
    <>
      <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>Automation</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
        Automatic RSS import uses the same free AI quota as manually generating
        drafts. If you hit a limit, turn it off here temporarily — no rebuild
        needed, this takes effect on the background task's next check cycle.
      </p>

      <div style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Automatic RSS import</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0" }}>
              {settings.enabled ? "Active — periodically fetches new items" : "Disabled"}
            </p>
          </div>
          <button onClick={toggle} disabled={busy} className={settings.enabled ? "danger" : "primary"} style={{ width: "auto", padding: "8px 16px" }}>
            {settings.enabled ? "Turn Off" : "Turn On"}
          </button>
        </div>

        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
          Max new drafts per source, per check cycle
        </p>
        <input
          type="number"
          min="1"
          max="20"
          value={settings.max_per_source}
          onChange={(e) => updateMaxPerSource(e.target.value)}
          disabled={busy}
          style={{ width: 100 }}
        />

        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "14px 0 4px" }}>
          Minimum word count per generated article — if the first attempt comes in shorter, one
          automatic follow-up call expands it using only the original source text(s) (no new
          facts). This is what directly prevents very short articles.
        </p>
        <input
          type="number"
          min="50"
          max="1000"
          value={settings.min_word_count}
          onChange={(e) => patchField("min_word_count", parseInt(e.target.value, 10))}
          disabled={busy}
          style={{ width: 100 }}
        />

        {saved && <p style={{ color: "var(--success-text)", fontSize: 13, marginTop: 10 }}>Saved.</p>}
      </div>

      <div style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16, border: settings.auto_publish ? "1px solid var(--danger-text)" : "1px solid transparent" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Automatic publishing</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0" }}>
              {settings.auto_publish ? "Active — no human review before publishing" : "Disabled — everything awaits your approval"}
            </p>
          </div>
          <button onClick={toggleAutoPublish} disabled={busy} className={settings.auto_publish ? "danger" : "primary"} style={{ width: "auto", padding: "8px 16px" }}>
            {settings.auto_publish ? "Turn Off" : "Turn On"}
          </button>
        </div>

        <p style={{ fontSize: 12, color: "var(--danger-text)", marginBottom: 14, lineHeight: 1.5 }}>
          ⚠ When enabled, the site publishes autonomously, without you ever having
          seen the article — for example, overnight. A draft is only published automatically if
          it meets ALL conditions: no unverified quote, no deviating figure,
          no possible duplicate, no unconfirmed claim, AND at least the confidence score
          below. If the AI is uncertain, it simply stays in the queue.
        </p>

        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
          Minimum confidence score to publish automatically ({Math.round(settings.auto_publish_min_confidence * 100)}%)
        </p>
        <input
          type="range"
          min="0.5"
          max="1"
          step="0.05"
          value={settings.auto_publish_min_confidence}
          onChange={(e) => updateMinConfidence(e.target.value)}
          disabled={busy}
          style={{ width: "100%" }}
        />
      </div>

      <div style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16, marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Automatically merge sources</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0" }}>
              {settings.auto_gather_sources ? "Active" : "Disabled"}
            </p>
          </div>
          <button onClick={() => patchField("auto_gather_sources", !settings.auto_gather_sources)} disabled={busy} className={settings.auto_gather_sources ? "danger" : "primary"} style={{ width: "auto", padding: "8px 16px" }}>
            {settings.auto_gather_sources ? "Turn Off" : "Turn On"}
          </button>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
          If a new RSS item comes in that likely covers the same topic as a
          draft still in the queue (based on title similarity), the
          new source is automatically merged into one better-supported draft — instead of
          creating a separate, possibly duplicate draft. Your
          approval is still required before publication either way.
        </p>
      </div>

      <div style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16, marginTop: 16, border: settings.auto_update_published ? "1px solid var(--danger-text)" : "1px solid transparent" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Automatically update published articles</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0" }}>
              {settings.auto_update_published ? "Active — content already live can change" : "Disabled — everything awaits your approval"}
            </p>
          </div>
          <button onClick={() => patchField("auto_update_published", !settings.auto_update_published)} disabled={busy} className={settings.auto_update_published ? "danger" : "primary"} style={{ width: "auto", padding: "8px 16px" }}>
            {settings.auto_update_published ? "Turn Off" : "Turn On"}
          </button>
        </div>

        <p style={{ fontSize: 12, color: "var(--danger-text)", marginBottom: 14, lineHeight: 1.5 }}>
          ⚠ For "developing" topics (e.g. an ongoing event): if a new
          source comes in that demonstrably contains new information about an already published
          article, the system updates the article text itself — without you ever having seen it.
          The previous version is always kept in the revision history. Only if the new
          information AND the confidence score below are met is the update applied; otherwise
          nothing happens.
        </p>

        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
          Minimum confidence score to update automatically ({Math.round(settings.auto_update_min_confidence * 100)}%)
        </p>
        <input
          type="range"
          min="0.5"
          max="1"
          step="0.05"
          value={settings.auto_update_min_confidence}
          onChange={(e) => patchField("auto_update_min_confidence", parseFloat(e.target.value))}
          disabled={busy}
          style={{ width: "100%" }}
        />
      </div>

      <div style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16, marginTop: 16, border: settings.use_source_image ? "1px solid var(--danger-text)" : "1px solid transparent" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Use source image</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0" }}>
              {settings.use_source_image ? "Active" : "Disabled — a stock photo will be searched for"}
            </p>
          </div>
          <button onClick={() => patchField("use_source_image", !settings.use_source_image)} disabled={busy} className={settings.use_source_image ? "danger" : "primary"} style={{ width: "auto", padding: "8px 16px" }}>
            {settings.use_source_image ? "Turn Off" : "Turn On"}
          </button>
        </div>
        <p style={{ fontSize: 12, color: "var(--danger-text)", lineHeight: 1.5 }}>
          ⚠ If an RSS source itself supplies an image (via their feed), we use that
          instead of searching for a stock photo. Note: that photo is often owned by the source or their
          photographer — check whether reuse is allowed under your sources' terms;
          we don't check this automatically. If this is off, everything stays as
          before (Pexels/Unsplash/Pixabay stock photos).
        </p>
      </div>

      <div style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16, marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Prioritize speed</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0" }}>
              {settings.prioritize_speed ? "Active — fastest provider tried first" : "Disabled — Gemini tried first (current default)"}
            </p>
          </div>
          <button onClick={() => patchField("prioritize_speed", !settings.prioritize_speed)} disabled={busy} className={settings.prioritize_speed ? "danger" : "primary"} style={{ width: "auto", padding: "8px 16px" }}>
            {settings.prioritize_speed ? "Turn Off" : "Turn On"}
          </button>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
          Tries Groq first (typically the fastest of the configured free providers) instead of
          always starting with Gemini. Only affects the ORDER providers are tried in — all
          other fallback behavior stays the same. No effect if Groq isn't configured under
          Settings → AI Providers.
        </p>
      </div>

      <div style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16, marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Verification pass</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0" }}>
              {settings.verification_pass_enabled ? "Active — adds an extra AI check per draft" : "Disabled"}
            </p>
          </div>
          <button onClick={() => patchField("verification_pass_enabled", !settings.verification_pass_enabled)} disabled={busy} className={settings.verification_pass_enabled ? "danger" : "primary"} style={{ width: "auto", padding: "8px 16px" }}>
            {settings.verification_pass_enabled ? "Turn Off" : "Turn On"}
          </button>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
          After writing a draft, a second AI call reviews it against the original source text(s)
          and corrects anything that looks invented, exaggerated, or unsupported — flagged issues
          are shown to you in the review screen. This is a full extra AI call per draft, so it
          adds generation time and uses more of your free-tier quota. Your approval is still
          required before publication either way.
        </p>
      </div>
    </>
  );
}

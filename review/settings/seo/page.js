"use client";

import { useEffect, useState } from "react";

export default function SeoPage() {
  const [settings, setSettings] = useState(null);
  const [nameDraft, setNameDraft] = useState("");
  const [descDraft, setDescDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  async function load() {
    const res = await fetch("/api/settings/site");
    const data = await res.json();
    setSettings(data);
    setNameDraft(data.site_name);
    setDescDraft(data.site_description);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSaveText(e) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setBusy(true);
    const res = await fetch("/api/settings/site", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ site_name: nameDraft, site_description: descDraft }),
    });
    setBusy(false);
    if (res.ok) {
      setSettings(await res.json());
      setSaved(true);
    } else {
      const data = await res.json();
      setError(data.error || "Opslaan mislukt");
    }
  }

  async function handleFaviconUpload(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingFavicon(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/uploads", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || "Upload mislukt");

      const res = await fetch("/api/settings/site", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favicon_url: uploadData.url }),
      });
      if (!res.ok) throw new Error("Favicon opslaan mislukt");
      setSettings(await res.json());
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingFavicon(false);
    }
  }

  async function removeFavicon() {
    setBusy(true);
    const res = await fetch("/api/settings/site", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favicon_url: null }),
    });
    setBusy(false);
    if (res.ok) setSettings(await res.json());
  }

  if (!settings) return null;

  return (
    <>
      <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>SEO & Branding</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
        Deze naam en beschrijving verschijnen in Google-zoekresultaten, browsertabbladen, en als
        je site wordt gedeeld op social media. Wijzigingen zijn direct actief, geen herbuild nodig.
      </p>

      <form onSubmit={handleSaveText} style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 10px" }}>Sitenaam & beschrijving</p>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Sitenaam</p>
        <input
          type="text"
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          style={{ marginBottom: 10 }}
        />
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
          Beschrijving (voor zoekmachines, max. ~160 tekens werkt het best)
        </p>
        <textarea
          rows={3}
          value={descDraft}
          onChange={(e) => setDescDraft(e.target.value)}
          style={{ marginBottom: 10 }}
        />
        {error && <p style={{ color: "var(--danger-text)", fontSize: 13, marginBottom: 8 }}>{error}</p>}
        {saved && <p style={{ color: "var(--success-text)", fontSize: 13, marginBottom: 8 }}>Opgeslagen.</p>}
        <button type="submit" className="primary" disabled={busy} style={{ width: "auto", padding: "8px 16px" }}>
          Opslaan
        </button>
      </form>

      <div style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16 }}>
        <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 10px" }}>Favicon</p>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
          Het icoontje in het browsertabblad. Vierkante afbeelding werkt het best (bijv. 512×512px).
          Geen eigen favicon geüpload? Dan gebruikt de site een eigen standaardicoon.
        </p>
        {settings.favicon_url && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <img src={settings.favicon_url} alt="Huidige favicon" style={{ width: 32, height: 32, borderRadius: 6, border: "1px solid var(--border)" }} />
            <button onClick={removeFavicon} disabled={busy} style={{ width: "auto", padding: "5px 10px", fontSize: 12 }}>
              Terugzetten naar standaard
            </button>
          </div>
        )}
        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleFaviconUpload} disabled={uploadingFavicon} />
        {uploadingFavicon && <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>Bezig met uploaden...</p>}
      </div>
    </>
  );
}

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

  const [newsletter, setNewsletter] = useState(null);
  const [newsletterDraft, setNewsletterDraft] = useState("");
  const [newsletterBusy, setNewsletterBusy] = useState(false);
  const [newsletterSaved, setNewsletterSaved] = useState(false);
  const [newsletterError, setNewsletterError] = useState(null);

  const [social, setSocial] = useState(null);
  const [socialBusy, setSocialBusy] = useState(false);
  const [socialSaved, setSocialSaved] = useState(false);

  async function load() {
    const res = await fetch("/api/settings/site");
    const data = await res.json();
    setSettings(data);
    setNameDraft(data.site_name);
    setDescDraft(data.site_description);
  }

  async function loadNewsletter() {
    const res = await fetch("/api/settings/newsletter");
    const data = await res.json();
    setNewsletter(data);
    setNewsletterDraft(data.sender_email || "");
  }

  async function loadSocial() {
    const res = await fetch("/api/settings/social");
    setSocial(await res.json());
  }

  useEffect(() => {
    load();
    loadNewsletter();
    loadSocial();
  }, []);

  async function handleSaveNewsletter(e) {
    e.preventDefault();
    setNewsletterError(null);
    setNewsletterSaved(false);
    setNewsletterBusy(true);
    const res = await fetch("/api/settings/newsletter", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sender_email: newsletterDraft.trim() || null }),
    });
    setNewsletterBusy(false);
    if (res.ok) {
      setNewsletter(await res.json());
      setNewsletterSaved(true);
    } else {
      const data = await res.json();
      setNewsletterError(data.error || "Opslaan mislukt");
    }
  }

  async function saveSocial(updated) {
    setSocialBusy(true);
    setSocialSaved(false);
    const res = await fetch("/api/settings/social", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    setSocialBusy(false);
    if (res.ok) {
      setSocial(await res.json());
      setSocialSaved(true);
    }
  }

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

      {newsletter && (
        <form onSubmit={handleSaveNewsletter} style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16, marginTop: 16 }}>
          <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 4px" }}>Nieuwsbrief</p>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
            Zonder afzender-e-mailadres blijft het aanmeldformulier voor bezoekers verborgen — pas
            als je hier iets invult, verschijnt het op de site. Aanmeldingen worden opgeslagen in
            een lijst die je hier kunt zien; er wordt nog geen nieuwsbrief automatisch verstuurd.
          </p>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Afzender-e-mailadres</p>
          <input
            type="text"
            placeholder="redactie@novapers.nl"
            value={newsletterDraft}
            onChange={(e) => setNewsletterDraft(e.target.value)}
            style={{ marginBottom: 10 }}
          />
          {newsletterError && <p style={{ color: "var(--danger-text)", fontSize: 13, marginBottom: 8 }}>{newsletterError}</p>}
          {newsletterSaved && <p style={{ color: "var(--success-text)", fontSize: 13, marginBottom: 8 }}>Opgeslagen.</p>}
          {newsletter.subscriber_count !== undefined && (
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
              {newsletter.subscriber_count} aanmelding(en) tot nu toe.
            </p>
          )}
          <button type="submit" className="primary" disabled={newsletterBusy} style={{ width: "auto", padding: "8px 16px" }}>
            Opslaan
          </button>
        </form>
      )}

      {social && (
        <div style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16, marginTop: 16 }}>
          <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 4px" }}>Social media</p>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
            Alleen ingevulde profielen krijgen een icoontje in de footer — laat een veld leeg om
            dat icoon te verbergen.
          </p>
          {["twitter", "facebook", "instagram", "youtube"].map((key) => (
            <div key={key} style={{ marginBottom: 8 }}>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4, textTransform: "capitalize" }}>{key}</p>
              <input
                type="text"
                placeholder={`https://${key}.com/...`}
                defaultValue={social[key] || ""}
                onBlur={(e) => saveSocial({ ...social, [key]: e.target.value.trim() || null })}
                disabled={socialBusy}
              />
            </div>
          ))}
          {socialSaved && <p style={{ color: "var(--success-text)", fontSize: 13, marginTop: 8 }}>Opgeslagen.</p>}
        </div>
      )}
    </>
  );
}

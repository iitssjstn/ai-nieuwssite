"use client";

import { useEffect, useState } from "react";

export default function SeoPage() {
  const [settings, setSettings] = useState(null);
  const [nameDraft, setNameDraft] = useState("");
  const [descDraft, setDescDraft] = useState("");
  const [googleVerificationDraft, setGoogleVerificationDraft] = useState("");
  const [bingVerificationDraft, setBingVerificationDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [verificationSaved, setVerificationSaved] = useState(false);

  async function load() {
    const res = await fetch("/api/settings/site");
    const data = await res.json();
    setSettings(data);
    setNameDraft(data.site_name);
    setDescDraft(data.site_description);
    setGoogleVerificationDraft(data.google_site_verification || "");
    setBingVerificationDraft(data.bing_site_verification || "");
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
      setError(data.error || "Save failed");
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
      if (!uploadRes.ok) throw new Error(uploadData.error || "Upload failed");

      const res = await fetch("/api/settings/site", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favicon_url: uploadData.url }),
      });
      if (!res.ok) throw new Error("Failed to save favicon");
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

  async function handleSaveVerification(e) {
    e.preventDefault();
    setError(null);
    setVerificationSaved(false);
    setBusy(true);
    const res = await fetch("/api/settings/site", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        google_site_verification: googleVerificationDraft,
        bing_site_verification: bingVerificationDraft,
      }),
    });
    setBusy(false);
    if (res.ok) {
      setSettings(await res.json());
      setVerificationSaved(true);
    } else {
      const data = await res.json();
      setError(data.error || "Save failed");
    }
  }

  if (!settings) return null;

  return (
    <>
      <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>SEO & Branding</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
        This name and description appear in Google search results, browser tabs, and when
        your site is shared on social media. Changes take effect immediately, no rebuild needed.
      </p>

      <form onSubmit={handleSaveText} style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 10px" }}>Site name & description</p>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Site name</p>
        <input
          type="text"
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          style={{ marginBottom: 10 }}
        />
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
          Description (for search engines, max ~160 characters works best)
        </p>
        <textarea
          rows={3}
          value={descDraft}
          onChange={(e) => setDescDraft(e.target.value)}
          style={{ marginBottom: 10 }}
        />
        {error && <p style={{ color: "var(--danger-text)", fontSize: 13, marginBottom: 8 }}>{error}</p>}
        {saved && <p style={{ color: "var(--success-text)", fontSize: 13, marginBottom: 8 }}>Saved.</p>}
        <button type="submit" className="primary" disabled={busy} style={{ width: "auto", padding: "8px 16px" }}>
          Save
        </button>
      </form>

      <div style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16 }}>
        <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 10px" }}>Favicon</p>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
          The icon shown in the browser tab. A square image works best (e.g. 512×512px).
          No custom favicon uploaded? Then the site uses its own default icon.
        </p>
        {settings.favicon_url && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <img src={settings.favicon_url} alt="Current favicon" style={{ width: 32, height: 32, borderRadius: 6, border: "1px solid var(--border)" }} />
            <button onClick={removeFavicon} disabled={busy} style={{ width: "auto", padding: "5px 10px", fontSize: 12 }}>
              Restore default
            </button>
          </div>
        )}
        <input type="file" accept="image/png,image/jpeg,image/webp,image/avif,image/gif" onChange={handleFaviconUpload} disabled={uploadingFavicon} />
        {uploadingFavicon && <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>Uploading...</p>}
      </div>

      <div style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16, marginTop: 16 }}>
        <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 10px" }}>Search engine ownership verification</p>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
          Paste only the verification code itself here — not the full HTML tag. Get it from{" "}
          <strong>Google Search Console</strong> (Settings → Ownership verification → HTML tag method)
          or <strong>Bing Webmaster Tools</strong> (Settings → your site → verify by meta tag). Once
          saved, it appears in the site's &lt;head&gt; immediately — no rebuild needed — so you can
          click "Verify" on their end right after.
        </p>
        <form onSubmit={handleSaveVerification}>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
            Google Search Console verification code
          </p>
          <input
            type="text"
            placeholder="e.g. AbCdEf12345..."
            value={googleVerificationDraft}
            onChange={(e) => setGoogleVerificationDraft(e.target.value)}
            style={{ marginBottom: 10 }}
          />
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
            Bing Webmaster Tools verification code
          </p>
          <input
            type="text"
            placeholder="e.g. 1234ABCD..."
            value={bingVerificationDraft}
            onChange={(e) => setBingVerificationDraft(e.target.value)}
            style={{ marginBottom: 10 }}
          />
          {verificationSaved && <p style={{ color: "var(--success-text)", fontSize: 13, marginBottom: 8 }}>Saved.</p>}
          <button type="submit" className="primary" disabled={busy} style={{ width: "auto", padding: "8px 16px" }}>
            Save
          </button>
        </form>
      </div>

      <div style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16, marginTop: 16 }}>
        <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 10px" }}>Faster indexing</p>
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
          Every article automatically pings IndexNow when published or updated, so Bing, Yandex,
          and Seznam pick it up right away instead of waiting for their next scheduled crawl.
          Google doesn't support this protocol directly — for Google, freshness comes from the
          sitemap (regenerated on every publish) and correct structured data, both of which are
          already in place.
        </p>
      </div>
    </>
  );
}

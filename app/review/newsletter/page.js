"use client";

import { useEffect, useState } from "react";

export default function NewsletterSettingsPage() {
  const [newsletter, setNewsletter] = useState(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    const res = await fetch("/api/settings/newsletter");
    const data = await res.json();
    setNewsletter(data);
    setDraft(data.sender_email || "");
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
      setError(data.error || "Opslaan mislukt");
    }
  }

  if (!newsletter) return null;

  return (
    <>
      <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>Nieuwsbrief</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
        Zonder afzender-e-mailadres blijft het aanmeldformulier voor bezoekers verborgen — pas als
        je hier iets invult, verschijnt het op de site. Aanmeldingen worden opgeslagen in een lijst
        die je hieronder kunt zien; er wordt nog geen nieuwsbrief automatisch verstuurd.
      </p>

      <form onSubmit={handleSave} style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16 }}>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Afzender-e-mailadres</p>
        <input
          type="text"
          placeholder="redactie@novapers.nl"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          style={{ marginBottom: 10 }}
        />
        {error && <p style={{ color: "var(--danger-text)", fontSize: 13, marginBottom: 8 }}>{error}</p>}
        {saved && <p style={{ color: "var(--success-text)", fontSize: 13, marginBottom: 8 }}>Opgeslagen.</p>}
        {newsletter.subscriber_count !== undefined && (
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
            {newsletter.subscriber_count} aanmelding(en) tot nu toe.
          </p>
        )}
        <button type="submit" className="primary" disabled={busy} style={{ width: "auto", padding: "8px 16px" }}>
          Opslaan
        </button>
      </form>
    </>
  );
}

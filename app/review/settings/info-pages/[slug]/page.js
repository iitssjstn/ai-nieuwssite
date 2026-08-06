"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import RichEditor from "../../../../components/RichEditor";

const LABELS = { about: "Over ons", privacy: "Privacy" };

export default function EditInfoPage() {
  const { slug } = useParams();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!LABELS[slug]) return;
    fetch(`/api/settings/info-pages/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        setTitle(data.title);
        setBody(data.body);
        setLoading(false);
      });
  }, [slug]);

  async function handleSave() {
    setBusy(true);
    setError(null);
    setSaved(false);
    const res = await fetch(`/api/settings/info-pages/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body }),
    });
    setBusy(false);
    if (res.ok) {
      setSaved(true);
    } else {
      const data = await res.json();
      setError(data.error || "Opslaan mislukt");
    }
  }

  if (!LABELS[slug]) {
    return <div className="container"><p>Onbekende pagina.</p></div>;
  }

  if (loading) return null;

  return (
    <div className="container">
      <button onClick={() => router.push("/review/settings/seo")} style={{ width: "auto", padding: "6px 12px", fontSize: 13, marginBottom: 16 }}>
        ← Terug naar instellingen
      </button>

      <h1 style={{ fontSize: 18, fontWeight: 500, marginBottom: 16 }}>{LABELS[slug]} bewerken</h1>

      <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Titel (verschijnt bovenaan de pagina)</p>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{ marginBottom: 16, fontWeight: 500 }}
      />

      <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Inhoud</p>
      <RichEditor value={body} onChange={setBody} />

      {error && <p style={{ color: "var(--danger-text)", fontSize: 13, margin: "10px 0" }}>{error}</p>}
      {saved && <p style={{ color: "var(--success-text)", fontSize: 13, margin: "10px 0" }}>Opgeslagen.</p>}

      <button onClick={handleSave} disabled={busy} className="primary" style={{ width: "auto", padding: "8px 16px", marginTop: 10 }}>
        {busy ? "Bezig..." : "Opslaan"}
      </button>
    </div>
  );
}

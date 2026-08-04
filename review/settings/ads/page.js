"use client";

import { useEffect, useState } from "react";

const BANNER_SLOTS = [
  { id: "homepage_sidebar", label: "Zijbalk homepage", hint: "Kleine banner, bijv. 320×50" },
  { id: "article_sidebar", label: "Zijbalk artikelpagina", hint: "Staande banner, bijv. 160×300" },
  { id: "article_incontent", label: "Onder het artikel", hint: "Brede banner, bijv. 468×60" },
];

export default function AdsPage() {
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
      setError(data.error || "Opslaan mislukt");
    }
  }

  return (
    <>
      <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>Advertenties</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
        Je Google AdSense publisher-ID. Wordt gebruikt voor het advertentiescript op elke pagina
        én voor <code>/ads.txt</code> — beide passen zich automatisch aan zodra je hier opslaat,
        zonder dat er een herbuild nodig is.
      </p>

      <div style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Google AdSense</p>
          <span className={`badge ${clientId ? "badge-muted" : ""}`} style={{ fontSize: 11 }}>
            {clientId ? `Actief · ${clientId}` : "Niet ingesteld"}
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
          {saved && <p style={{ color: "var(--success-text)", fontSize: 13, marginBottom: 8 }}>Opgeslagen.</p>}
          <button type="submit" className="primary" disabled={busy} style={{ width: "auto", padding: "8px 16px" }}>
            {busy ? "Bezig..." : "Opslaan"}
          </button>
        </form>
      </div>

      {slots && (
        <>
          <h2 style={{ fontSize: 16, fontWeight: 500, margin: "28px 0 6px" }}>Overige advertentienetwerken</h2>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
            Voor netwerken als Adsterra, die met losse code-snippets werken i.p.v. één publisher-ID.
            Elk veld is optioneel — laat leeg om die advertentie niet te tonen.
          </p>

          <div style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 4px" }}>Social Bar</p>
            <p style={{ fontSize: 12, color: "var(--danger-text)", marginBottom: 10, lineHeight: 1.5 }}>
              ⚠ Dit is doorgaans het meest opdringerige advertentieformaat (zwevende
              meldingen/pop-up-achtige balken, site-breed). Overweeg dit uit te laten als je
              bezoekerservaring belangrijker vindt dan maximale inkomsten.
            </p>
            <input
              type="text"
              placeholder="Volledige script-URL (bijv. https://.../invoke.js)"
              defaultValue={slots.social_bar_url || ""}
              onBlur={(e) => saveSlots({ ...slots, social_bar_url: e.target.value.trim() || null })}
              disabled={slotBusy}
            />
          </div>

          <div style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 10px" }}>Native banner (blendt met content)</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Script-URL</p>
            <input
              type="text"
              placeholder="https://.../invoke.js"
              defaultValue={slots.native_banner?.script_url || ""}
              onBlur={(e) => saveSlots({ ...slots, native_banner: { ...slots.native_banner, script_url: e.target.value.trim() || null } })}
              disabled={slotBusy}
              style={{ marginBottom: 8 }}
            />
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Container-ID</p>
            <input
              type="text"
              placeholder="container-xxxxxxxx"
              defaultValue={slots.native_banner?.container_id || ""}
              onBlur={(e) => saveSlots({ ...slots, native_banner: { ...slots.native_banner, container_id: e.target.value.trim() || null } })}
              disabled={slotBusy}
            />
          </div>

          {BANNER_SLOTS.map((slot) => {
            const current = slots.banners[slot.id] || {};
            return (
              <div key={slot.id} style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 2px" }}>{slot.label}</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>{slot.hint}</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    placeholder="Ad key"
                    defaultValue={current.key || ""}
                    onBlur={(e) => saveSlots({ ...slots, banners: { ...slots.banners, [slot.id]: { ...current, key: e.target.value.trim() || null } } })}
                    disabled={slotBusy}
                    style={{ flex: 2 }}
                  />
                  <input
                    type="number"
                    placeholder="Breedte"
                    defaultValue={current.width || ""}
                    onBlur={(e) => saveSlots({ ...slots, banners: { ...slots.banners, [slot.id]: { ...current, width: parseInt(e.target.value, 10) || null } } })}
                    disabled={slotBusy}
                    style={{ flex: 1 }}
                  />
                  <input
                    type="number"
                    placeholder="Hoogte"
                    defaultValue={current.height || ""}
                    onBlur={(e) => saveSlots({ ...slots, banners: { ...slots.banners, [slot.id]: { ...current, height: parseInt(e.target.value, 10) || null } } })}
                    disabled={slotBusy}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
            );
          })}

          {slotSaved && <p style={{ color: "var(--success-text)", fontSize: 13 }}>Opgeslagen.</p>}
        </>
      )}
    </>
  );
}

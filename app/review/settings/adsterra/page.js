"use client";

import { useEffect, useState } from "react";

const BANNER_SLOTS = [
  { id: "top_banner", label: "Top of homepage", hint: "Wide banner, e.g. 728×90" },
  { id: "homepage_sidebar", label: "Homepage sidebar", hint: "Small banner, e.g. 320×50" },
  { id: "article_sidebar", label: "Article page sidebar", hint: "Vertical banner, e.g. 160×300" },
  { id: "article_incontent", label: "Below the article", hint: "Wide banner, e.g. 468×60" },
  { id: "category_left", label: "Category page — left side", hint: "Skyscraper, e.g. 160×600" },
  { id: "category_right", label: "Category page — right side", hint: "Skyscraper, e.g. 160×600" },
];

export default function AdsterraPage() {
  const [slots, setSlots] = useState(null);
  const [slotBusy, setSlotBusy] = useState(false);
  const [slotSaved, setSlotSaved] = useState(false);

  async function loadSlots() {
    const res = await fetch("/api/settings/ad-slots");
    setSlots(await res.json());
  }

  useEffect(() => {
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

  if (!slots) return null;

  return (
    <>
      <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>Adsterra</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
        For networks like Adsterra, which work with separate code snippets instead of a single
        publisher ID. Each field is optional — leave blank to not show that ad.
      </p>

      <div style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 4px" }}>Social Bar</p>
        <p style={{ fontSize: 12, color: "var(--danger-text)", marginBottom: 10, lineHeight: 1.5 }}>
          ⚠ This is typically the most intrusive ad format (floating
          notifications/pop-up-like bars, site-wide). Consider leaving this off if
          you value visitor experience over maximum revenue.
        </p>
        <input
          type="text"
          placeholder="Full script URL (e.g. https://.../invoke.js)"
          defaultValue={slots.social_bar_url || ""}
          onBlur={(e) => saveSlots({ ...slots, social_bar_url: e.target.value.trim() || null })}
          disabled={slotBusy}
        />
      </div>

      <div style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 10px" }}>Native banner (blends with content)</p>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Script URL</p>
        <input
          type="text"
          placeholder="https://.../invoke.js"
          defaultValue={slots.native_banner?.script_url || ""}
          onBlur={(e) => saveSlots({ ...slots, native_banner: { ...slots.native_banner, script_url: e.target.value.trim() || null } })}
          disabled={slotBusy}
          style={{ marginBottom: 8 }}
        />
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Container ID</p>
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
                placeholder="Width"
                defaultValue={current.width || ""}
                onBlur={(e) => saveSlots({ ...slots, banners: { ...slots.banners, [slot.id]: { ...current, width: parseInt(e.target.value, 10) || null } } })}
                disabled={slotBusy}
                style={{ flex: 1 }}
              />
              <input
                type="number"
                placeholder="Height"
                defaultValue={current.height || ""}
                onBlur={(e) => saveSlots({ ...slots, banners: { ...slots.banners, [slot.id]: { ...current, height: parseInt(e.target.value, 10) || null } } })}
                disabled={slotBusy}
                style={{ flex: 1 }}
              />
            </div>
          </div>
        );
      })}

      {slotSaved && <p style={{ color: "var(--success-text)", fontSize: 13 }}>Saved.</p>}
    </>
  );
}

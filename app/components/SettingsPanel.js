"use client";

import { useEffect, useRef, useState } from "react";

function applyTheme(theme) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const wantsDark = theme === "dark" || (theme === "auto" && prefersDark);
  root.classList.toggle("dark", wantsDark);
}

export default function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState("auto");
  const panelRef = useRef(null);

  useEffect(() => {
    setTheme(localStorage.getItem("theme") || "auto");
  }, []);

  // "Automatisch" moet ook live meebewegen als het systeemthema verandert
  // terwijl de site open staat, niet alleen bij het laden.
  useEffect(() => {
    if (theme !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("auto");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function choose(value) {
    setTheme(value);
    localStorage.setItem("theme", value);
    applyTheme(value);
  }

  const OPTIONS = [
    { id: "auto", label: "Automatisch", sub: "Volgt je systeeminstelling" },
    { id: "light", label: "Lichte weergave", sub: null },
    { id: "dark", label: "Donkere weergave", sub: null },
  ];

  return (
    <div ref={panelRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Instellingen"
        style={{ width: "auto", padding: "6px 10px", display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 0 1-4 0v-.09A1.7 1.7 0 0 0 9 19.35a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.65 15a1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 0 1 0-4h.09A1.7 1.7 0 0 0 4.65 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.65a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 0 1 4 0v.09a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.35 9a1.7 1.7 0 0 0 1.56 1.04H21a2 2 0 0 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z" />
        </svg>
        Instellingen
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 240,
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
            padding: 10,
            zIndex: 30,
          }}
        >
          <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", margin: "4px 6px 8px" }}>
            Weergave
          </p>
          {OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => choose(opt.id)}
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                textAlign: "left",
                padding: "8px 10px",
                borderRadius: 8,
                border: "none",
                background: theme === opt.id ? "var(--accent-bg)" : "transparent",
                marginBottom: 2,
              }}
            >
              <span>
                <span style={{ display: "block", fontSize: 13, color: theme === opt.id ? "var(--accent-text)" : "var(--text-primary)" }}>
                  {opt.label}
                </span>
                {opt.sub && (
                  <span style={{ display: "block", fontSize: 11, color: "var(--text-muted)" }}>{opt.sub}</span>
                )}
              </span>
              {theme === opt.id && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

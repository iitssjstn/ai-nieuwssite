"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

// De navigatiebalk heeft bewust overflow-x: auto (voor horizontaal
// scrollen op mobiel bij veel categorieën) — maar daardoor knipt de
// browser volgens de CSS-spec ook automatisch alles wat verticaal
// buiten die balk uitsteekt, zoals een simpele <details>-dropdown eronder
// zou doen. Om dat te omzeilen renderen we het menu via een portal
// rechtstreeks in <body>, met position: fixed op basis van de
// daadwerkelijke schermpositie van de knop — dat ontsnapt volledig aan de
// overflow-clipping van elke ouder-container.
export default function CategoryDropdown({ category, href, active, activeStyle, subcategories }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    function updatePosition() {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + 6, left: rect.left });
    }
    updatePosition();

    function handlePointerDown(e) {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === "Escape") setOpen(false);
    }
    // Sluiten bij scrollen/resizen i.p.v. continu herpositioneren — een
    // opengeklapt dropdown-menu dat "blijft plakken" tijdens het scrollen
    // van de pagina eronder is verwarrender dan het gewoon te sluiten.
    function handleScrollOrResize() {
      setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [open]);

  return (
    <div style={{ display: "inline-flex", flexShrink: 0 }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`category-pill${active ? " active" : ""}`}
        style={{ background: "none", ...activeStyle, display: "inline-flex", alignItems: "center", gap: 4, border: "1px solid transparent", cursor: "pointer" }}
      >
        {category}
        <span className="chevron" style={{ transform: open ? "rotate(180deg)" : undefined }}>▾</span>
      </button>

      {open &&
        position &&
        createPortal(
          <div
            ref={menuRef}
            className="category-dropdown-menu"
            style={{ position: "fixed", top: position.top, left: position.left }}
          >
            <Link href={href} onClick={() => setOpen(false)}>
              All {category}
            </Link>
            {subcategories.map((c) => (
              <Link key={c.name} href={`/categorie/${encodeURIComponent(c.name.toLowerCase())}`} onClick={() => setOpen(false)}>
                {c.name}
              </Link>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}

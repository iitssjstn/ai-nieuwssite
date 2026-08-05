"use client";

import { useState } from "react";
import Link from "next/link";

export default function CategoryTabs({ categories, articlesByCategory }) {
  const [active, setActive] = useState(categories[0]?.name);
  const items = (articlesByCategory[active] || []).slice(0, 3);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto" }}>
        {categories.map((c) => {
          const isActive = active === c.name;
          return (
            <button
              key={c.name}
              onClick={() => setActive(c.name)}
              style={{
                padding: "8px 16px",
                borderRadius: 999,
                border: `1px solid ${isActive ? c.color : "var(--border)"}`,
                background: isActive ? c.color + "22" : "var(--surface-1)",
                color: isActive ? c.color : "var(--text-secondary)",
                fontWeight: isActive ? 600 : 400,
                fontSize: 13,
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              {c.name}
            </button>
          );
        })}
      </div>

      {items.length === 0 && (
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Nog geen artikelen in deze categorie.</p>
      )}

      {items.map((a) => (
        <Link key={a.id} href={`/artikel/${a.slug}`} className="list-row" style={{ gap: 14, justifyContent: "flex-start" }}>
          {a.featured_image && (
            <img src={a.featured_image} alt={a.title} style={{ width: 130, height: 88, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />
          )}
          <div style={{ minWidth: 0 }}>
            <span className="cat">{a.category} · {a.timeAgo} · {a.readingTime}</span>
            <p>{a.title}</p>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "4px 0 0" }}>{a.excerpt}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

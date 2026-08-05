"use client";

import { useState } from "react";
import Link from "next/link";

export default function CategoryTabs({ categories, articlesByCategory }) {
  const [active, setActive] = useState(categories[0]?.name);
  const items = (articlesByCategory[active] || []).slice(0, 3);

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto" }}>
        {categories.map((c) => (
          <button
            key={c.name}
            onClick={() => setActive(c.name)}
            className="category-pill"
            style={{
              border: "1px solid var(--border)",
              background: active === c.name ? c.color + "22" : "transparent",
              color: active === c.name ? c.color : "var(--text-secondary)",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            {c.name}
          </button>
        ))}
      </div>

      {items.length === 0 && (
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Nog geen artikelen in deze categorie.</p>
      )}

      {items.map((a) => (
        <Link key={a.id} href={`/artikel/${a.slug}`} className="list-row">
          {a.featured_image && (
            <img src={a.featured_image} alt={a.title} style={{ width: 96, height: 64, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />
          )}
          <div>
            <span className="cat">{a.category} · {a.timeAgo} · {a.readingTime}</span>
            <p>{a.title}</p>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "4px 0 0" }}>{a.excerpt}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

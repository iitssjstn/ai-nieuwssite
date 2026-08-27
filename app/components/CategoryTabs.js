import Link from "next/link";
import Image from "next/image";

export default function CategoryTabs({ categories, articlesByCategory }) {
  const sections = categories
    .map((c) => ({ category: c, items: articlesByCategory[c.name] || [] }))
    .filter((s) => s.items.length > 0);

  if (sections.length === 0) {
    return <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>No articles yet.</p>;
  }

  return (
    <div>
      {sections.map((s, i) => (
        <div key={s.category.name} style={{ marginTop: i > 0 ? 28 : 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span
              style={{
                display: "inline-block",
                padding: "6px 14px",
                borderRadius: 999,
                border: `1px solid ${s.category.color}`,
                background: s.category.color + "22",
                color: s.category.color,
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              {s.category.name}
            </span>
            <Link
              href={`/categorie/${encodeURIComponent(s.category.name.toLowerCase())}`}
              style={{ fontSize: 13, color: "var(--text-secondary)" }}
            >
              View all →
            </Link>
          </div>

          {s.items.map((a) => (
            <Link key={a.id} href={`/artikel/${a.slug}`} className="list-row" style={{ gap: 14, justifyContent: "flex-start" }}>
              {a.featured_image && (
                <Image src={a.featured_image} alt={a.featured_image_credit?.alt || a.title} width={130} height={88} className="list-row-thumb" />
              )}
              <div style={{ minWidth: 0 }}>
                <span className="cat">{a.category} · {a.timeAgo} · {a.readingTime}</span>
                <p>{a.title}</p>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "4px 0 0" }}>{a.excerpt}</p>
              </div>
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function KeyClaims({ claims }) {
  const relevant = (claims || []).filter((c) => c.text);
  if (relevant.length === 0) return null;

  return (
    <div style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 18px", margin: "20px 0" }}>
      <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-muted)", margin: "0 0 10px" }}>
        Key Facts
      </p>
      {relevant.map((c, i) => (
        <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: i < relevant.length - 1 ? 10 : 0 }}>
          <span style={{ fontSize: 13, lineHeight: 1.5, flex: 1 }}>{c.text}</span>
          {c.confirmed_by_sources >= 2 ? (
            <span style={{ fontSize: 11, color: "var(--success-text)", whiteSpace: "nowrap", flexShrink: 0 }}>
              ✓ Confirmed by {c.confirmed_by_sources} sources
            </span>
          ) : c.verified ? (
            <span style={{ fontSize: 11, color: "var(--success-text)", whiteSpace: "nowrap", flexShrink: 0 }}>
              ✓ Confirmed by the source
            </span>
          ) : (
            <span style={{ fontSize: 11, color: "var(--danger-text)", whiteSpace: "nowrap", flexShrink: 0 }}>
              ⚠ Not verbatim in the source
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

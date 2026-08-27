export default function ListingLoading() {
  return (
    <div className="container">
      <div className="skeleton-header-bar" />
      <div className="skeleton-block" style={{ width: 220, height: 26, marginBottom: 20 }} />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ display: "flex", gap: 16, marginBottom: 22, alignItems: "flex-start" }}>
          <div className="skeleton-block" style={{ width: 130, height: 88, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton-block" style={{ width: 90, height: 12, marginBottom: 8 }} />
            <div className="skeleton-block" style={{ width: "85%", height: 18, marginBottom: 8 }} />
            <div className="skeleton-block" style={{ width: "60%", height: 18, marginBottom: 10 }} />
            <div className="skeleton-block" style={{ width: "95%", height: 12, marginBottom: 6 }} />
            <div className="skeleton-block" style={{ width: "70%", height: 12 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

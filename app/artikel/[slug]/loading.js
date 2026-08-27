export default function ArticleLoading() {
  return (
    <div className="container" style={{ maxWidth: 1350 }}>
      <div className="skeleton-header-bar" />
      <div style={{ maxWidth: 780 }}>
        <div className="skeleton-block" style={{ width: 90, height: 18, marginBottom: 14 }} />
        <div className="skeleton-block" style={{ width: "90%", height: 34, marginBottom: 10 }} />
        <div className="skeleton-block" style={{ width: "60%", height: 34, marginBottom: 16 }} />
        <div className="skeleton-block" style={{ width: 220, height: 14, marginBottom: 20 }} />
        <div className="skeleton-block" style={{ width: "100%", aspectRatio: "800 / 450", marginBottom: 20 }} />
        {[100, 100, 95, 100, 60, 0, 100, 90, 100, 40].map((w, i) =>
          w === 0 ? (
            <div key={i} style={{ height: 12 }} />
          ) : (
            <div key={i} className="skeleton-block" style={{ width: `${w}%`, height: 14, marginBottom: 10 }} />
          )
        )}
      </div>
    </div>
  );
}

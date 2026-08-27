import AdBanner from "./AdBanner";

export default function AdSlot({ config, label }) {
  if (config?.key) {
    return <AdBanner adKey={config.key} width={config.width} height={config.height} />;
  }

  const width = config?.width || 300;
  const height = config?.height || 90;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: width,
        height,
        border: "1px dashed var(--border)",
        background: "var(--ad-bg)",
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-muted)",
        fontSize: 12,
        textAlign: "center",
        margin: "0 auto",
      }}
    >
      {label || `Ad space ${width} x ${height}`}
    </div>
  );
}

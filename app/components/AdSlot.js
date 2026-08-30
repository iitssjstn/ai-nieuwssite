import AdBanner from "./AdBanner";
import { getActiveAdForSlot } from "@/lib/db";

export default function AdSlot({ config, label, slot }) {
  // Een goedgekeurde, eigen advertentie (via het Ad Center) heeft altijd
  // voorrang op de netwerkadvertentie-config hieronder — een plek toont
  // nooit beide tegelijk.
  const activeAd = slot ? getActiveAdForSlot(slot) : null;
  if (activeAd) {
    const width = config?.width || 300;
    const height = config?.height || 90;
    return (
      <a
        href={activeAd.destination_url}
        target="_blank"
        // sponsored: Google's aanbevolen rel-waarde voor betaalde/gesponsorde
        // links, zodat dit nooit als een organische aanbeveling overkomt.
        rel="sponsored noopener noreferrer"
        style={{ display: "block", maxWidth: width, margin: "0 auto" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={activeAd.image_url}
          alt={`Advertisement: ${activeAd.advertiser_name}`}
          width={width}
          height={height}
          style={{ width: "100%", height: "auto", display: "block", borderRadius: 6 }}
        />
      </a>
    );
  }

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

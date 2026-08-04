"use client";

import Script from "next/script";

export default function NativeAd({ scriptUrl, containerId }) {
  if (!scriptUrl || !containerId) return null;

  return (
    <div style={{ margin: "20px 0" }}>
      <span className="badge badge-muted" style={{ marginBottom: 8, display: "inline-block" }}>Advertentie</span>
      <div id={containerId} />
      <Script src={scriptUrl} strategy="afterInteractive" data-cfasync="false" />
    </div>
  );
}

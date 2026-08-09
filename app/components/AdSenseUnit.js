"use client";

import { useEffect, useRef } from "react";
import { useHasAdConsent } from "./useHasAdConsent";

export default function AdSenseUnit({ client, slot }) {
  const pushedRef = useRef(false);
  const hasConsent = useHasAdConsent();

  useEffect(() => {
    if (!client || !slot || !hasConsent || pushedRef.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushedRef.current = true;
    } catch {
      // AdSense-script nog niet geladen of geblokkeerd (bijv. adblocker) —
      // dan blijft dit gewoon een lege ruimte, geen kapotte pagina.
    }
  }, [client, slot, hasConsent]);

  if (!client || !slot || !hasConsent) return null;

  return (
    <ins
      className="adsbygoogle"
      style={{ display: "block" }}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}

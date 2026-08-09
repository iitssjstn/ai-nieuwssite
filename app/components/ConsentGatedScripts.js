"use client";

import Script from "next/script";
import { useHasAdConsent } from "./useHasAdConsent";

export default function ConsentGatedScripts({ adsenseClientId, socialBarUrl }) {
  const hasConsent = useHasAdConsent();
  if (!hasConsent) return null;

  return (
    <>
      {adsenseClientId && (
        <Script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      )}
      {socialBarUrl && (
        <Script src={socialBarUrl} strategy="afterInteractive" />
      )}
    </>
  );
}

"use client";

import Script from "next/script";
import { useHasAdConsent } from "./useHasAdConsent";

export default function ConsentGatedScripts({ adsenseClientId, socialBarUrl, ezoicEnabled }) {
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
      {ezoicEnabled && (
        <>
          <Script async src="https://www.ezojs.com/ezoic/sa.min.js" strategy="afterInteractive" />
          <Script id="ezoic-standalone-init" strategy="afterInteractive">
            {`window.ezstandalone = window.ezstandalone || {}; ezstandalone.cmd = ezstandalone.cmd || [];`}
          </Script>
        </>
      )}
    </>
  );
}

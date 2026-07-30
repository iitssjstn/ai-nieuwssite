import Script from "next/script";
import "./globals.css";
import { getAdsenseClientId } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dagblad",
  description: "Nieuws, samengesteld met AI en gecontroleerd door de redactie.",
};

export default function RootLayout({ children }) {
  const adsenseClientId = getAdsenseClientId();

  return (
    <html lang="nl">
      <body>
        {children}
        {adsenseClientId && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}

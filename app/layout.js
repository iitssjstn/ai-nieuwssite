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
      <head>
        {/* Vóór React laadt al de juiste modus instellen — anders zie je
            eerst kort de lichte site en dan een flits naar donker. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var stored = localStorage.getItem("theme") || "auto";
                var wantsDark = stored === "dark" || (stored === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
                if (wantsDark) document.documentElement.classList.add("dark");
              } catch (e) {}
            `,
          }}
        />
      </head>
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

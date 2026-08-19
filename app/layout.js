import "./globals.css";
import { getAdsenseClientId, getSiteSettings, getAdSlots, getEzoicEnabled } from "@/lib/db";
import ConsentGatedScripts from "./components/ConsentGatedScripts";
import CookieConsentBanner from "./components/CookieConsentBanner";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  const { site_name, site_description, favicon_url } = getSiteSettings();
  return {
    title: site_name,
    description: site_description,
    // Zonder favicon_url gebruikt Next.js gewoon automatisch app/icon.svg —
    // hier expliciet overschrijven zodra er via Instellingen een eigen
    // favicon is geüpload.
    ...(favicon_url ? { icons: { icon: favicon_url } } : {}),
  };
}

export default function RootLayout({ children }) {
  const adsenseClientId = getAdsenseClientId();
  const ezoicEnabled = getEzoicEnabled();
  const { social_bar_url } = getAdSlots();

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
        <CookieConsentBanner />
        <ConsentGatedScripts adsenseClientId={adsenseClientId} socialBarUrl={social_bar_url} ezoicEnabled={ezoicEnabled} />
      </body>
    </html>
  );
}

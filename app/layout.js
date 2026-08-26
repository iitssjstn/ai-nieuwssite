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
    // Without favicon_url, Next.js simply falls back to app/icon.svg
    // automatically — explicitly overridden here as soon as a custom
    // favicon has been uploaded via Settings.
    ...(favicon_url ? { icons: { icon: favicon_url } } : {}),
  };
}

export default function RootLayout({ children }) {
  const adsenseClientId = getAdsenseClientId();
  const ezoicEnabled = getEzoicEnabled();
  const { social_bar_url } = getAdSlots();

  return (
    <html lang="en">
      <head>
        {/* Set the correct mode before React loads — otherwise you'd
            briefly see the light site and then a flash to dark. */}
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

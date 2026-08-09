"use client";

import { useHasAdConsent } from "./useHasAdConsent";

// Adsterra-achtige bannerformaten werken met een globale "atOptions"-
// variabele die het invoke.js-script uitleest. Staan er meerdere van deze
// advertenties op dezelfde pagina (met verschillende keys), dan overschrijven
// ze elkaars instelling als je ze los in de pagina zou plakken. Door elke
// advertentie in zijn eigen iframe te laden, krijgt elke advertentie een
// volledig geïsoleerde omgeving — dat voorkomt dat ze elkaar breken.
export default function AdBanner({ adKey, width, height }) {
  const hasConsent = useHasAdConsent();
  if (!adKey || !hasConsent) return null;

  const html = `<!DOCTYPE html><html><head><style>body{margin:0;padding:0;overflow:hidden;}</style></head><body>
<script>
  atOptions = { key: '${adKey}', format: 'iframe', height: ${height}, width: ${width}, params: {} };
</script>
<script src="https://www.highperformanceformat.com/${adKey}/invoke.js"></script>
</body></html>`;

  return (
    <iframe
      srcDoc={html}
      width={width}
      height={height}
      style={{ border: "none", overflow: "hidden", display: "block", maxWidth: "100%" }}
      scrolling="no"
      title="Advertentie"
      loading="lazy"
    />
  );
}

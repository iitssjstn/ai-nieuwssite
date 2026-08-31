/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // geoip-lite (gebruikt voor de "Visitors by country"-statistiek) leest
  // zijn databestand op basis van een __dirname-relatief pad — webpack's
  // bundeling herschrijft dat soort paden, waardoor het bestand na het
  // bundelen niet meer op de verwachte plek staat (build crashte met
  // ENOENT bij het openen van geoip-country.dat). serverComponentsExternalPackages
  // houdt dit pakket volledig buiten de webpack-bundeling — het wordt dan
  // gewoon normaal vanuit node_modules gerequired, met zijn originele,
  // onaangetaste bestandsstructuur intact.
  experimental: {
    serverComponentsExternalPackages: ["geoip-lite"],
    // Alleen "external" maken is niet genoeg — dat voorkomt de webpack-
    // bundelfout, maar de standalone-build kopieert normaal alleen de
    // bestanden die via een gewone import/require zichtbaar zijn. Deze
    // .dat-bestanden worden puur via een fs-bestandspad geladen, dus
    // zonder deze regel expliciet ontbreken ze alsnog in .next/standalone
        // en crasht het pas bij het eerste daadwerkelijke gebruik op de
    // server, niet al bij het bouwen.
    outputFileTracingIncludes: {
      "/api/track": ["./node_modules/geoip-lite/data/**"],
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "pixabay.com" },
      { protocol: "https", hostname: "cdn.pixabay.com" },
      // Alleen relevant als Instellingen → Automatisering →
      // "Bron-afbeelding gebruiken" aanstaat: dan kunnen afbeeldingen van
      // willekeurige RSS-bron-domeinen komen (admin-beheerde bronnenlijst,
      // geen publieke input) — vandaar deze bewust brede regel, alleen
      // relevant zodra die instelling actief is.
      { protocol: "https", hostname: "**" },
    ],
  },
};

module.exports = nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
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

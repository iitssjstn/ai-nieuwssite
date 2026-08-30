// Gedeelde bron van waarheid voor de zes bestaande advertentieplekken op
// de site — dezelfde plekken die al gebruikt worden voor de Adsterra-
// bannerinstellingen (zie app/review/settings/adsterra/page.js). Bewust
// een apart, node/fs-vrij bestand: dit wordt zowel server-side (API-routes)
// als client-side (het publieke advertentie-aanmeldformulier) gebruikt, en
// een client-component mag lib/db.js niet importeren (die gebruikt fs).
export const AD_SLOT_DEFINITIONS = [
  { id: "top_banner", label: "Top of homepage", width: 728, height: 90 },
  { id: "homepage_sidebar", label: "Homepage sidebar", width: 300, height: 250 },
  { id: "article_sidebar", label: "Article page sidebar", width: 160, height: 300 },
  { id: "article_incontent", label: "Below the article", width: 468, height: 60 },
  { id: "category_left", label: "Category page — left side", width: 160, height: 600 },
  { id: "category_right", label: "Category page — right side", width: 160, height: 600 },
];

export function getAdSlotDefinition(id) {
  return AD_SLOT_DEFINITIONS.find((s) => s.id === id) || null;
}

// Zoekt een passende stockfoto bij Pexels en/of Unsplash. Beide gratis, met
// dezelfde fallback-gedachte als de AI-tekst-providers: lukt de eerste niet
// (geen key, storing, geen resultaat), dan wordt de volgende geprobeerd.

export const IMAGE_PROVIDERS = [
  { id: "pexels", label: "Pexels" },
  { id: "unsplash", label: "Unsplash" },
];

async function searchPexels(query, apiKey) {
  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
    { headers: { Authorization: apiKey } }
  );
  if (!res.ok) throw new Error(`Pexels HTTP ${res.status}`);
  const data = await res.json();
  const photo = data.photos?.[0];
  if (!photo) return null;
  return {
    url: photo.src.large,
    credit_name: photo.photographer,
    credit_url: photo.url,
    source: "Pexels",
  };
}

async function searchUnsplash(query, apiKey) {
  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
    { headers: { Authorization: `Client-ID ${apiKey}` } }
  );
  if (!res.ok) throw new Error(`Unsplash HTTP ${res.status}`);
  const data = await res.json();
  const photo = data.results?.[0];
  if (!photo) return null;

  // Unsplash-richtlijnen: bij daadwerkelijk gebruik van een foto (niet alleen
  // tonen in zoekresultaten) moet de download-locatie getriggerd worden, ten
  // behoeve van het tellen van downloads voor de fotograaf. Bewust niet
  // ge-await: dit mag de eigenlijke aanvraag niet vertragen of laten falen.
  if (photo.links?.download_location) {
    fetch(photo.links.download_location, {
      headers: { Authorization: `Client-ID ${apiKey}` },
    }).catch(() => {});
  }

  return {
    url: photo.urls.regular,
    credit_name: photo.user.name,
    credit_url: photo.user.links.html,
    source: "Unsplash",
  };
}

export async function searchStockPhoto(query, providerConfigs) {
  if (providerConfigs.pexels?.api_key) {
    try {
      const result = await searchPexels(query, providerConfigs.pexels.api_key);
      if (result) return result;
    } catch {
      // stil doorgaan naar de volgende provider
    }
  }
  if (providerConfigs.unsplash?.api_key) {
    try {
      const result = await searchUnsplash(query, providerConfigs.unsplash.api_key);
      if (result) return result;
    } catch {
      // geen enkele provider leverde een resultaat — dat is prima, het
      // artikel wordt dan gewoon zonder uitgelichte afbeelding aangemaakt
    }
  }
  return null;
}

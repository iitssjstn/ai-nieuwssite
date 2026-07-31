// Zoekt een passende stockfoto bij Pexels en/of Unsplash. Beide gratis, met
// dezelfde fallback-gedachte als de AI-tekst-providers: lukt de eerste niet
// (geen key, storing, geen resultaat), dan wordt de volgende geprobeerd.

export const IMAGE_PROVIDERS = [
  { id: "pexels", label: "Pexels" },
  { id: "unsplash", label: "Unsplash" },
];

// Haalt een paar resultaten op i.p.v. precies 1, en kiest er willekeurig een
// uit — anders geeft eenzelfde zoekopdracht (bijv. bij twee keer op "nieuwe
// stockfoto zoeken" klikken met dezelfde titel) altijd exact dezelfde foto
// terug, wat aanvoelt alsof de knop niets doet.
const RESULTS_PER_SEARCH = 6;

async function searchPexels(query, apiKey) {
  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${RESULTS_PER_SEARCH}&orientation=landscape`,
    { headers: { Authorization: apiKey } }
  );
  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new Error(`Pexels HTTP ${res.status} — ${bodyText.slice(0, 150)}`);
  }
  const data = await res.json();
  const photos = data.photos || [];
  if (photos.length === 0) return null;
  const photo = photos[Math.floor(Math.random() * photos.length)];
  return {
    url: photo.src.large,
    credit_name: photo.photographer,
    credit_url: photo.url,
    source: "Pexels",
  };
}

async function searchUnsplash(query, apiKey) {
  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${RESULTS_PER_SEARCH}&orientation=landscape`,
    { headers: { Authorization: `Client-ID ${apiKey}` } }
  );
  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new Error(`Unsplash HTTP ${res.status} — ${bodyText.slice(0, 150)}`);
  }
  const data = await res.json();
  const results = data.results || [];
  if (results.length === 0) return null;
  const photo = results[Math.floor(Math.random() * results.length)];

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
  const attempted = [];

  if (providerConfigs.pexels?.api_key) {
    try {
      const result = await searchPexels(query, providerConfigs.pexels.api_key);
      if (result) return result;
      attempted.push("Pexels: geen resultaten voor deze zoekopdracht");
    } catch (err) {
      attempted.push(`Pexels: ${err.message}`);
    }
  }
  if (providerConfigs.unsplash?.api_key) {
    try {
      const result = await searchUnsplash(query, providerConfigs.unsplash.api_key);
      if (result) return result;
      attempted.push("Unsplash: geen resultaten voor deze zoekopdracht");
    } catch (err) {
      attempted.push(`Unsplash: ${err.message}`);
    }
  }

  if (attempted.length === 0) {
    return null;
  }

  const error = new Error(attempted.join(" | "));
  error.isStockPhotoSearchFailure = true;
  throw error;
}

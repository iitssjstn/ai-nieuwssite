// Zoekt een passende stockfoto bij Pexels en/of Unsplash. Beide gratis, met
// dezelfde fallback-gedachte als de AI-tekst-providers: lukt de eerste niet
// (geen key, storing, geen resultaat), dan wordt de volgende geprobeerd.

export const IMAGE_PROVIDERS = [
  { id: "pexels", label: "Pexels" },
  { id: "unsplash", label: "Unsplash" },
];

const RESULTS_PER_SEARCH = 6;

async function fetchPexelsResults(query, apiKey) {
  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${RESULTS_PER_SEARCH}&orientation=landscape`,
    { headers: { Authorization: apiKey } }
  );
  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new Error(`Pexels HTTP ${res.status} — ${bodyText.slice(0, 150)}`);
  }
  const data = await res.json();
  return (data.photos || []).map((photo) => ({
    url: photo.src.large,
    thumb: photo.src.medium,
    credit_name: photo.photographer,
    credit_url: photo.url,
    source: "Pexels",
  }));
}

async function fetchUnsplashResults(query, apiKey) {
  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${RESULTS_PER_SEARCH}&orientation=landscape`,
    { headers: { Authorization: `Client-ID ${apiKey}` } }
  );
  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new Error(`Unsplash HTTP ${res.status} — ${bodyText.slice(0, 150)}`);
  }
  const data = await res.json();
  return (data.results || []).map((photo) => ({
    url: photo.urls.regular,
    thumb: photo.urls.small,
    credit_name: photo.user.name,
    credit_url: photo.user.links.html,
    source: "Unsplash",
    // download_location bewaren zodat we 'm pas triggeren zodra de admin
    // deze specifieke foto echt kiest — niet voor alle 6 getoonde opties.
    _downloadLocation: photo.links?.download_location || null,
  }));
}

// Geeft een lijst met opties terug (voor de foto-picker in het
// redactiescherm) — probeert Pexels eerst, dan Unsplash, zoals gewoonlijk.
export async function searchStockPhotoOptions(query, providerConfigs) {
  const attempted = [];

  if (providerConfigs.pexels?.api_key) {
    try {
      const results = await fetchPexelsResults(query, providerConfigs.pexels.api_key);
      if (results.length > 0) return results;
      attempted.push("Pexels: geen resultaten voor deze zoekopdracht");
    } catch (err) {
      attempted.push(`Pexels: ${err.message}`);
    }
  }
  if (providerConfigs.unsplash?.api_key) {
    try {
      const results = await fetchUnsplashResults(query, providerConfigs.unsplash.api_key);
      if (results.length > 0) return results;
      attempted.push("Unsplash: geen resultaten voor deze zoekopdracht");
    } catch (err) {
      attempted.push(`Unsplash: ${err.message}`);
    }
  }

  if (attempted.length === 0) return [];
  const error = new Error(attempted.join(" | "));
  error.isStockPhotoSearchFailure = true;
  throw error;
}

// Bevestigt bij Unsplash dat een specifieke, gekozen foto daadwerkelijk
// gebruikt wordt (verplicht volgens hun richtlijnen). Wordt aangeroepen met
// de Unsplash-key vers uit de instellingen — nooit met een key die via de
// browser is meegestuurd, om te voorkomen dat die ooit naar de client lekt.
export function confirmUnsplashDownload(confirmUrl, apiKey) {
  if (!confirmUrl || !apiKey) return;
  fetch(confirmUrl, { headers: { Authorization: `Client-ID ${apiKey}` } }).catch(() => {});
}

// Kiest automatisch één willekeurige optie — gebruikt door de automatische
// flow tijdens het genereren van een concept, waar geen mens een keuze
// maakt (en Unsplash-downloads dus ook meteen bevestigd worden).
export async function searchStockPhoto(query, providerConfigs) {
  const options = await searchStockPhotoOptions(query, providerConfigs);
  if (options.length === 0) return null;
  const picked = options[Math.floor(Math.random() * options.length)];
  if (picked.source === "Unsplash") {
    confirmUnsplashDownload(picked._downloadLocation, providerConfigs.unsplash?.api_key);
  }
  const { _downloadLocation, _apiKey, thumb, ...clean } = picked;
  return clean;
}

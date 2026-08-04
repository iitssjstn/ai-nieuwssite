// Zoekt een passende stockfoto bij Pexels, Unsplash en/of Pixabay. Alle drie
// gratis, met dezelfde fallback-gedachte als de AI-tekst-providers: lukt de
// eerste niet (geen key, storing, geen resultaat), dan wordt de volgende
// geprobeerd.

export const IMAGE_PROVIDERS = [
  { id: "pexels", label: "Pexels" },
  { id: "unsplash", label: "Unsplash" },
  { id: "pixabay", label: "Pixabay" },
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

// Pixabay gebruikt de key als queryparameter i.p.v. een Authorization-header
// (anders dan Pexels/Unsplash), en vereist geen attributie — die geven we
// toch netjes mee, puur als beleefdheid richting de fotograaf.
async function fetchPixabayResults(query, apiKey) {
  const res = await fetch(
    `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&per_page=${RESULTS_PER_SEARCH}`
  );
  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new Error(`Pixabay HTTP ${res.status} — ${bodyText.slice(0, 150)}`);
  }
  const data = await res.json();
  return (data.hits || []).map((photo) => ({
    url: photo.largeImageURL,
    thumb: photo.webformatURL,
    credit_name: photo.user,
    credit_url: photo.pageURL,
    source: "Pixabay",
  }));
}

// Haalt een waarde op uit een object via een simpel pad met puntjes, bijv.
// "src.large" of "user.name" — voor het uitlezen van velden uit de
// respons van een door de admin zelf gedefinieerde provider, waarvan de
// exacte JSON-vorm niet vooraf bekend is.
function getPath(obj, path) {
  if (!path) return undefined;
  return path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

// Generieke fetcher voor een door de admin zelf toegevoegde provider. De
// URL komt uit een sjabloon met {q} als placeholder voor de zoekterm; de
// key gaat via een header (bijv. "Authorization: Bearer <key>") of via een
// queryparameter (bijv. "?key=<key>", zoals Pixabay), afhankelijk van hoe
// de admin het heeft ingesteld. De resultaten worden uit de JSON-respons
// gehaald via de opgegeven veldpaden.
async function fetchCustomProviderResults(query, apiKey, provider) {
  let url = provider.url_template.replace("{q}", encodeURIComponent(query));
  const headers = {};

  if (provider.auth_type === "header" && provider.auth_header_name) {
    headers[provider.auth_header_name] = `${provider.auth_header_prefix || ""}${apiKey}`;
  } else if (provider.auth_type === "query" && provider.auth_query_param) {
    const sep = url.includes("?") ? "&" : "?";
    url += `${sep}${provider.auth_query_param}=${encodeURIComponent(apiKey)}`;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new Error(`${provider.label} HTTP ${res.status} — ${bodyText.slice(0, 150)}`);
  }
  const data = await res.json();
  const items = getPath(data, provider.results_path);
  if (!Array.isArray(items)) {
    throw new Error(`${provider.label}: kon geen resultatenlijst vinden op pad "${provider.results_path}"`);
  }

  return items.map((item) => ({
    url: getPath(item, provider.image_field),
    thumb: provider.thumb_field ? getPath(item, provider.thumb_field) : getPath(item, provider.image_field),
    credit_name: provider.credit_name_field ? getPath(item, provider.credit_name_field) : provider.label,
    credit_url: provider.credit_url_field ? getPath(item, provider.credit_url_field) : null,
    source: provider.label,
  })).filter((r) => r.url);
}

// Geeft een lijst met opties terug (voor de foto-picker in het
// redactiescherm) — probeert Pexels, Unsplash, Pixabay en dan eventuele
// door de admin zelf toegevoegde providers, in die volgorde.
export async function searchStockPhotoOptions(query, providerConfigs, customProviders = []) {
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
  if (providerConfigs.pixabay?.api_key) {
    try {
      const results = await fetchPixabayResults(query, providerConfigs.pixabay.api_key);
      if (results.length > 0) return results;
      attempted.push("Pixabay: geen resultaten voor deze zoekopdracht");
    } catch (err) {
      attempted.push(`Pixabay: ${err.message}`);
    }
  }

  for (const provider of customProviders) {
    const cfg = providerConfigs[provider.id];
    if (!cfg?.api_key) continue;
    try {
      const results = await fetchCustomProviderResults(query, cfg.api_key, provider);
      if (results.length > 0) return results;
      attempted.push(`${provider.label}: geen resultaten voor deze zoekopdracht`);
    } catch (err) {
      attempted.push(`${provider.label}: ${err.message}`);
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
export async function searchStockPhoto(query, providerConfigs, customProviders = []) {
  const options = await searchStockPhotoOptions(query, providerConfigs, customProviders);
  if (options.length === 0) return null;
  const picked = options[Math.floor(Math.random() * options.length)];
  if (picked.source === "Unsplash") {
    confirmUnsplashDownload(picked._downloadLocation, providerConfigs.unsplash?.api_key);
  }
  const { _downloadLocation, _apiKey, thumb, ...clean } = picked;
  return clean;
}

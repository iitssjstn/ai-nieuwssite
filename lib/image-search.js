// Searches for a matching stock photo from Pexels, Unsplash, and/or Pixabay. All three
// are free, with the same fallback approach as the AI text providers: if the
// first one doesn't work (no key, outage, no result), the next one
// is tried.

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
    // Keep download_location so we only trigger it once the admin
    // actually chooses this specific photo — not for all 6 displayed options.
    _downloadLocation: photo.links?.download_location || null,
  }));
}

// Pixabay uses the key as a query parameter instead of an Authorization header
// (unlike Pexels/Unsplash), and doesn't require attribution — we
// include it anyway, purely as a courtesy to the photographer.
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

// Retrieves a value from an object via a simple dot-notation path, e.g.
// "src.large" or "user.name" — for reading fields from the
// response of a provider the admin defined themselves, whose
// exact JSON shape isn't known in advance.
function getPath(obj, path) {
  if (!path) return undefined;
  return path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

// Generic fetcher for a provider the admin added themselves. The
// URL comes from a template with {q} as the placeholder for the search term; the
// key is sent via a header (e.g. "Authorization: Bearer <key>") or via a
// query parameter (e.g. "?key=<key>", like Pixabay), depending on how
// the admin configured it. The results are extracted from the JSON response
// via the specified field paths.
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
    throw new Error(`${provider.label}: could not find a results list at path "${provider.results_path}"`);
  }

  return items.map((item) => ({
    url: getPath(item, provider.image_field),
    thumb: provider.thumb_field ? getPath(item, provider.thumb_field) : getPath(item, provider.image_field),
    credit_name: provider.credit_name_field ? getPath(item, provider.credit_name_field) : provider.label,
    credit_url: provider.credit_url_field ? getPath(item, provider.credit_url_field) : null,
    source: provider.label,
  })).filter((r) => r.url);
}

// Returns a list of options (for the photo picker in the
// editorial screen) — tries Pexels, Unsplash, Pixabay, and then any
// providers the admin added themselves, in that order.
export async function searchStockPhotoOptions(query, providerConfigs, customProviders = []) {
  const attempted = [];

  if (providerConfigs.pexels?.api_key) {
    try {
      const results = await fetchPexelsResults(query, providerConfigs.pexels.api_key);
      if (results.length > 0) return results;
      attempted.push("Pexels: no results for this search query");
    } catch (err) {
      attempted.push(`Pexels: ${err.message}`);
    }
  }
  if (providerConfigs.unsplash?.api_key) {
    try {
      const results = await fetchUnsplashResults(query, providerConfigs.unsplash.api_key);
      if (results.length > 0) return results;
      attempted.push("Unsplash: no results for this search query");
    } catch (err) {
      attempted.push(`Unsplash: ${err.message}`);
    }
  }
  if (providerConfigs.pixabay?.api_key) {
    try {
      const results = await fetchPixabayResults(query, providerConfigs.pixabay.api_key);
      if (results.length > 0) return results;
      attempted.push("Pixabay: no results for this search query");
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
      attempted.push(`${provider.label}: no results for this search query`);
    } catch (err) {
      attempted.push(`${provider.label}: ${err.message}`);
    }
  }

  if (attempted.length === 0) return [];
  const error = new Error(attempted.join(" | "));
  error.isStockPhotoSearchFailure = true;
  throw error;
}

// Confirms to Unsplash that a specific, chosen photo is actually
// being used (required per their guidelines). Called with
// the Unsplash key fresh from settings — never with a key that was
// sent via the browser, to prevent it from ever leaking to the client.
export function confirmUnsplashDownload(confirmUrl, apiKey) {
  if (!confirmUrl || !apiKey) return;
  fetch(confirmUrl, { headers: { Authorization: `Client-ID ${apiKey}` } }).catch(() => {});
}

// Automatically picks one random option — used by the automatic
// flow during draft generation, where no human makes a choice
// (so Unsplash downloads are also confirmed immediately).
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

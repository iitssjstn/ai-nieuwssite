// Converts a place name to coordinates via Nominatim (OpenStreetMap) — the
// server-side variant, so with a proper identifying User-Agent as
// Nominatim's terms of use require for programmatic calls
// (as opposed to the call from the admin browser for manual
// lookups, where the browser supplies its own User-Agent).
export async function geocodeLocation(label) {
  if (!label || !label.trim()) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(label)}&format=json&limit=1`,
      { headers: { "User-Agent": "novapers.nl nieuwssite (contact via siteinstellingen)" } }
    );
    if (!res.ok) return null;
    const results = await res.json();
    if (!results[0]) return null;
    return { lat: results[0].lat, lng: results[0].lon, label };
  } catch {
    return null;
  }
}

// Zet een plaatsnaam om naar coördinaten via Nominatim (OpenStreetMap) — de
// server-side variant, dus met een correcte identificerende User-Agent zoals
// Nominatim's gebruiksvoorwaarden vereisen voor programmatische aanroepen
// (in tegenstelling tot de aanroep vanuit de admin-browser bij handmatig
// opzoeken, die de browser z'n eigen User-Agent meegeeft).
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

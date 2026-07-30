// AI-gegenereerde concepten zijn platte tekst met "\n" tussen alinea's. Zodra
// een redacteur de rich-text-editor gebruikt, wordt de body HTML. Deze
// helpers zorgen dat beide vormen overal correct worden weergegeven, ook
// voor oudere artikelen die nog plat zijn.

// Geüploade afbeeldingen zijn relatieve paden (/media/...), stockfoto's van
// Pexels/Unsplash zijn al volledige externe URL's — deze helper zorgt dat
// beide overal correct worden opgebouwd, zonder dubbele of kapotte URL's.
export function resolveImageUrl(imagePath, baseUrl) {
  if (!imagePath) return null;
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  return `${baseUrl}${imagePath}`;
}

export function isHtmlBody(body) {
  return /<\/?(p|div|img|strong|em|b|i|h[1-6]|ul|ol|li|br)[^>]*>/i.test(body || "");
}

export function getExcerpt(body, maxLen = 160) {
  if (!body) return "";
  if (isHtmlBody(body)) {
    const text = body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return text.length > maxLen ? text.slice(0, maxLen) + "…" : text;
  }
  return body.split("\n")[0];
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Zet platte tekst (met \n) om naar veilige HTML-paragrafen, voor gebruik
// als startwaarde in de rich-text-editor bij het bewerken van een AI-concept.
export function plainTextToHtml(body) {
  if (isHtmlBody(body)) return body;
  return (body || "")
    .split("\n")
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("");
}

// AI-generated drafts are plain text with "\n" between paragraphs. Once
// an editor uses the rich text editor, the body becomes HTML. These
// helpers make sure both forms are displayed correctly everywhere, also
// for older articles that are still plain.

// Uploaded images are relative paths (/media/...), stock photos from
// Pexels/Unsplash are already full external URLs — this helper makes sure
// both are built correctly everywhere, without duplicate or broken URLs.
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

// Converts plain text (with \n) to safe HTML paragraphs, for use
// as the starting value in the rich text editor when editing an AI draft.
export function plainTextToHtml(body) {
  if (isHtmlBody(body)) return body;
  return (body || "")
    .split("\n")
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("");
}

// Builds the credit line for a featured image — "Photo: Name via
// Source" for an automatically found stock photo, or just "Photo: Name" for
// a manually entered name (e.g. for a self-uploaded photo without an
// external source).
export function formatImageCredit(credit) {
  if (!credit?.name) return null;
  return credit.source ? `Foto: ${credit.name} via ${credit.source}` : `Foto: ${credit.name}`;
}

// Returns a color combination per category for the badge, so
// looks up the color set by the admin for a category name (from
// Settings → Categories) and converts it to a badge style — a
// light tint of the color as background, the full color as text. This way
// it automatically works with any custom-created category, not just the
// original default names.
export function getCategoryStyle(categoryName, categories) {
  const cat = categories?.find((c) => c.name === categoryName);
  if (!cat) return null;
  return { background: cat.color + "22", color: cat.color };
}

// Estimates reading time based on word count (assuming
// ~200 words per minute, a common rule of thumb).
export function getReadingTime(body) {
  if (!body) return "1 min read";
  const text = isHtmlBody(body) ? body.replace(/<[^>]+>/g, " ") : body;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min read`;
}

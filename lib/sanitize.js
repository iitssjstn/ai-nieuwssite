import sanitizeHtml from "sanitize-html";

// article.body wordt op de publieke site rechtstreeks als HTML gerenderd
// (dangerouslySetInnerHTML) — zonder dit zou elke tag/attribuut die er ooit
// in terechtkomt (AI-generatie, of een admin die iets plakt in de
// RichEditor, die zelf geen paste-opschoning heeft) zonder filter naar
// elke bezoeker gaan. Dit is de laatste, meest robuuste verdedigingslinie:
// werkt ongeacht HOE onveilige content ooit in de database terechtkwam.
//
// Alleen de opmaak-tags toestaan die de site zelf ook daadwerkelijk
// gebruikt/verwacht (zie isHtmlBody() in lib/content.js) — geen
// <script>, geen inline event-handlers (onerror/onclick/etc.), geen
// javascript:-links.
const ALLOWED_TAGS = ["p", "div", "strong", "em", "b", "i", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "br", "a", "img", "blockquote", "span"];

export function sanitizeArticleBody(html) {
  if (!html) return html;
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "width", "height"],
    },
    // Voorkomt javascript:/data:-achtige links — alleen echte http(s)-URL's.
    allowedSchemes: ["http", "https", "mailto"],
    // Iedere externe link krijgt sowieso al rel="noopener noreferrer" mee,
    // ongeacht wat erin stond — voorkomt reverse-tabnabbing via een link
    // die zelf target="_blank" had zonder de juiste rel.
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }, true),
    },
  });
}

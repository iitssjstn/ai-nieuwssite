import Parser from "rss-parser";
import { getSources, createArticle, markGuidsImported, findPossibleDuplicate, getAllImageProviderConfigs, getCustomImageProviders, getAutomationSettings } from "./db.js";
import { generateDraft } from "./ai.js";
import { searchStockPhoto } from "./image-search.js";
import { geocodeLocation } from "./geocode.js";
import { triggerWebhooks } from "./webhooks.js";

const parser = new Parser();

// Bepaalt of een automatisch gegenereerd concept veilig genoeg is om direct
// live te zetten, zonder menselijke review — bewust streng: elke twijfel
// (lage confidence, een ongeverifieerd citaat, een afwijkend cijfer, een
// mogelijk duplicaat, of een AI-claim die zichzelf niet kon bevestigen)
// betekent dat het gewoon in de wachtrij blijft staan voor handmatige
// beoordeling, in plaats van te gokken.
function passesAutoPublishGate(draft, possibleDuplicate, minConfidence) {
  if (possibleDuplicate) return false;
  if ((draft.confidence_score ?? 0) < minConfidence) return false;
  if (draft.flags?.figures_verified === false) return false;
  if (draft.flags?.quote_unverified === true) return false;
  if ((draft.claims || []).some((c) => c.verified === false)) return false;
  return true;
}

// Haalt de RSS-feed van een bron op en maakt voor elk nieuw item (niet
// eerder geïmporteerd) automatisch een AI-concept aan. Items die al eerder
// zijn gezien (op guid/link) worden overgeslagen. Wordt aangeroepen via de
// "Nu ophalen"-knop, én automatisch door de achtergrond-scheduler in
// instrumentation.js.
export async function fetchAndImportFromSource(sourceId, { limit = 5 } = {}) {
  const source = getSources().find((s) => s.id === sourceId);
  if (!source) throw new Error("Onbekende bron");
  if (!source.feed_url) throw new Error("Deze bron heeft geen RSS feed-URL ingesteld");

  const feed = await parser.parseURL(source.feed_url);
  const alreadyImported = new Set(source.imported_guids || []);

  const newItems = feed.items
    .filter((item) => {
      const guid = item.guid || item.link;
      return guid && !alreadyImported.has(guid);
    })
    .slice(0, limit);

  const created = [];
  const errors = [];
  const successfulGuids = [];

  for (const item of newItems) {
    const guid = item.guid || item.link;
    const sourceText = (item.contentSnippet || item.content || item.title || "").trim();
    if (!sourceText) {
      successfulGuids.push(guid); // niets zinvols in dit item, niet opnieuw proberen
      continue;
    }

    try {
      const draft = await generateDraft({ sourceText, sourceName: source.name });
      const possibleDuplicate = findPossibleDuplicate(draft.title);

      let featuredImage = null;
      let featuredImageCredit = null;
      if (draft.image_keywords) {
        try {
          const photo = await searchStockPhoto(draft.image_keywords, getAllImageProviderConfigs(), getCustomImageProviders());
          if (photo) {
            featuredImage = photo.url;
            featuredImageCredit = { name: photo.credit_name, url: photo.credit_url, source: photo.source };
          }
        } catch {
          // geen afbeelding is niet erg genoeg om de import te laten mislukken
        }
      }

      const location = draft.location_hint ? await geocodeLocation(draft.location_hint) : null;

      const { auto_publish, auto_publish_min_confidence } = getAutomationSettings();
      const shouldAutoPublish =
        auto_publish && passesAutoPublishGate(draft, possibleDuplicate, auto_publish_min_confidence);

      const article = createArticle({
        source_id: source.id,
        source_raw_text: sourceText,
        source_url: item.link || null,
        title: draft.title,
        body: draft.body,
        category: draft.category,
        flags: draft.flags,
        confidence_score: draft.confidence_score,
        generated_by: draft.provider,
        possible_duplicate: possibleDuplicate,
        featured_image: featuredImage,
        featured_image_credit: featuredImageCredit,
        claims: draft.claims || [],
        location,
        ...(shouldAutoPublish
          ? { status: "published", published_at: new Date().toISOString(), reviewer_id: "auto" }
          : {}),
      });

      if (shouldAutoPublish) {
        triggerWebhooks("article.published", article).catch(() => {});
      }

      created.push(article);
      successfulGuids.push(guid);
    } catch (err) {
      errors.push(`${item.title || guid}: ${err.message}`);
      // Bewust NIET als geïmporteerd markeren — bij een tijdelijke
      // AI-storing kan dit item bij de volgende "Nu ophalen" alsnog lukken.
    }
  }

  markGuidsImported(source.id, successfulGuids);

  return {
    created: created.length,
    skipped: feed.items.length - newItems.length,
    errors,
  };
}

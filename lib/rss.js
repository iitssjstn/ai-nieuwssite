import Parser from "rss-parser";
import { getSources, createArticle, markGuidsImported, findPossibleDuplicate } from "./db";
import { generateDraft } from "./ai";

const parser = new Parser();

// Haalt de RSS-feed van een bron op en maakt voor elk nieuw item (niet
// eerder geïmporteerd) automatisch een AI-concept aan. Items die al eerder
// zijn gezien (op guid/link) worden overgeslagen. Bewust geen automatische
// achtergrondtaak/cron in deze architectuur — dit wordt aangeroepen via de
// "Nu ophalen"-knop, of je kunt zelf een externe cron op dit endpoint zetten.
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

      const article = createArticle({
        source_id: source.id,
        source_raw_text: sourceText,
        title: draft.title,
        body: draft.body,
        category: draft.category,
        flags: draft.flags,
        confidence_score: draft.confidence_score,
        generated_by: draft.provider,
        possible_duplicate: possibleDuplicate,
      });
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

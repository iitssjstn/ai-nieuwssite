import Parser from "rss-parser";
import {
  getSources, createArticle, getArticle, updateArticle, editArticleWithRevision,
  markGuidsImported, findPossibleDuplicate, findRelatedArticle,
  getAllImageProviderConfigs, getCustomImageProviders, getAutomationSettings,
} from "./db.js";
import { generateDraft, generateUpdatedDraft } from "./ai.js";
import { searchStockPhoto } from "./image-search.js";
import { getRemoteImageDimensions } from "./image-dimensions.js";
import { geocodeLocation } from "./geocode.js";
import { triggerWebhooks } from "./webhooks.js";

// Onder deze breedte (in pixels) beschouwen we een bron-afbeelding als een
// preview-thumbnail, niet geschikt voor onze hero-weergave (die tot ~900px
// breed kan tonen) — dan valt het systeem terug op een stockfoto-zoekactie.
const MIN_SOURCE_IMAGE_WIDTH = 600;

const parser = new Parser({
  customFields: {
    item: [
      ["media:content", "mediaContent"],
      ["media:thumbnail", "mediaThumbnail"],
    ],
  },
});

// Haalt een afbeelding op die de bron ZELF in de RSS-feed heeft meegegeven
// (via <enclosure> of de media:content/media:thumbnail-uitbreiding) — dus
// geen scraping van de bron-website, alleen wat de bron expliciet in hun
// eigen syndicatie-feed publiceert.
function extractSourceImage(item) {
  if (item.enclosure?.url && item.enclosure.type?.startsWith("image/")) {
    return item.enclosure.url;
  }
  const mediaContentUrl = item.mediaContent?.["$"]?.url || item.mediaContent?.url;
  if (mediaContentUrl) return mediaContentUrl;
  const mediaThumbUrl = item.mediaThumbnail?.["$"]?.url || item.mediaThumbnail?.url;
  if (mediaThumbUrl) return mediaThumbUrl;
  return null;
}

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

// Zelfde soort strenge poort, maar dan voor het automatisch bijwerken van
// een artikel dat al gepubliceerd staat — dat verandert content die
// bezoekers al hebben kunnen lezen, dus de lat ligt hier niet lager.
function passesAutoUpdateGate(updateResult, minConfidence) {
  if (!updateResult.has_new_info) return false;
  if ((updateResult.confidence_score ?? 0) < minConfidence) return false;
  return true;
}

// Haalt de RSS-feed van een bron op en verwerkt elk nieuw item (niet eerder
// geïmporteerd). Voordat er een nieuw concept wordt geschreven, checkt het
// systeem eerst of dit item waarschijnlijk over hetzelfde onderwerp gaat als
// een bestaand artikel:
// - Staat dat artikel nog in de wachtrij (pending_review)? Dan wordt de
//   nieuwe bron er automatisch bij samengevoegd (multi-bron-herschrijving),
//   i.p.v. een los, mogelijk dubbel concept aan te maken.
// - Staat het al gepubliceerd? Dan wordt gecontroleerd of de nieuwe bron
//   daadwerkelijk nieuwe informatie bevat — zo ja én de instelling staat
//   aan, wordt het artikel automatisch bijgewerkt (met revisiegeschiedenis).
// Is er geen gerelateerd artikel gevonden, dan werkt alles zoals voorheen:
// een nieuw concept per item.
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
  const merged = [];
  const updated = [];
  const flagged = [];
  const errors = [];
  const successfulGuids = [];

  const {
    auto_publish, auto_publish_min_confidence,
    auto_gather_sources, auto_update_published, auto_update_min_confidence,
    use_source_image,
  } = getAutomationSettings();

  for (const item of newItems) {
    const guid = item.guid || item.link;
    const sourceText = (item.contentSnippet || item.content || item.title || "").trim();
    if (!sourceText) {
      successfulGuids.push(guid); // niets zinvols in dit item, niet opnieuw proberen
      continue;
    }

    try {
      const related = item.title ? findRelatedArticle(item.title) : null;

      // --- Pad 1: samenvoegen met een concept dat nog in de wachtrij staat ---
      if (related && related.status === "pending_review" && auto_gather_sources) {
        const existing = getArticle(related.id);
        if (existing) {
          const originalSource = getSources().find((s) => s.id === existing.source_id);
          // Eerdere aanvullende bronnen zijn alleen als naam/link bewaard
          // (niet de ruwe tekst) — die informatie zit al verwerkt in de
          // huidige artikeltekst. We geven dus de bestaande, al eerder
          // samengestelde tekst mee als hoofdbron, plus deze ene nieuwe
          // bron als aanvulling.
          const draft = await generateDraft({
            sourceText: existing.source_raw_text || existing.body,
            sourceName: originalSource?.name || "onbekende bron",
            additionalSources: [{ name: source.name, text: sourceText, url: item.link || null }],
          });

          editArticleWithRevision(existing.id, { title: draft.title, body: draft.body, category: draft.category });
          updateArticle(existing.id, {
            flags: draft.flags,
            confidence_score: draft.confidence_score,
            claims: draft.claims || [],
            consistency_notes: draft.consistency_notes || [],
            additional_sources: [...(existing.additional_sources || []), { name: source.name, url: item.link || null }],
          });

          merged.push(existing.id);
          successfulGuids.push(guid);
          continue;
        }
      }

      // --- Pad 2: een al gepubliceerd artikel automatisch bijwerken ---
      if (related && related.status === "published" && auto_update_published) {
        const existing = getArticle(related.id);
        if (existing) {
          const updateResult = await generateUpdatedDraft({
            existingTitle: existing.title,
            existingBody: existing.body,
            newSourceText: sourceText,
            newSourceName: source.name,
          });

          if (passesAutoUpdateGate(updateResult, auto_update_min_confidence)) {
            editArticleWithRevision(existing.id, { title: existing.title, body: updateResult.updated_body });
            const updatedArticle = updateArticle(existing.id, {
              updated_at: new Date().toISOString(),
              last_update_summary: updateResult.update_summary,
              pending_update: null,
            });
            triggerWebhooks("article.updated", updatedArticle).catch(() => {});
            updated.push(existing.id);
          } else if (updateResult.has_new_info) {
            // Wél nieuwe informatie gevonden, maar niet zeker genoeg (of de
            // instelling staat uit) om automatisch toe te passen — laat een
            // melding achter zodat de redacteur het zelf kan beoordelen,
            // i.p.v. de informatie stilzwijgend te laten verdwijnen.
            updateArticle(existing.id, {
              pending_update: {
                update_summary: updateResult.update_summary,
                updated_body: updateResult.updated_body,
                confidence_score: updateResult.confidence_score,
                detected_at: new Date().toISOString(),
                source_name: source.name,
                source_url: item.link || null,
              },
            });
            flagged.push(existing.id);
          }

          successfulGuids.push(guid);
          continue;
        }
      }

      // --- Pad 3: geen (bruikbaar) gerelateerd artikel — normaal genereren ---
      const draft = await generateDraft({ sourceText, sourceName: source.name });
      const possibleDuplicate = findPossibleDuplicate(draft.title);

      let featuredImage = null;
      let featuredImageCredit = null;

      if (use_source_image) {
        const sourceImageUrl = extractSourceImage(item);
        if (sourceImageUrl) {
          // Bron-afbeeldingen zijn vaak kleine preview-thumbnails, bedoeld
          // voor een RSS-lezer — niet voor een grote hero-weergave op onze
          // site. Gebruiken we die toch op volle breedte, dan rekt Next.js
          // 'm uit tot boven de eigen resolutie, wat de kwaliteit merkbaar
          // slechter maakt. Daarom eerst de daadwerkelijke afmetingen
          // checken, en alleen gebruiken als die groot genoeg zijn.
          const dimensions = await getRemoteImageDimensions(sourceImageUrl);
          if (dimensions && dimensions.width >= MIN_SOURCE_IMAGE_WIDTH) {
            featuredImage = sourceImageUrl;
            featuredImageCredit = { name: source.name, url: item.link || null, source: source.name };
          }
        }
      }

      if (!featuredImage && draft.image_keywords) {
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
    merged: merged.length,
    updated: updated.length,
    flagged: flagged.length,
    skipped: feed.items.length - newItems.length,
    errors,
  };
}

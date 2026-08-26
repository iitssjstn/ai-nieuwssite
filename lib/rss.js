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

// Below this width (in pixels) we consider a source image a
// preview thumbnail, not suitable for our hero display (which can show
// up to ~900px wide) — then the system falls back to a stock photo search.
// Deliberately set to 300px (was 600px): many news feeds only supply
// small preview thumbnails in their RSS feed, so a higher
// threshold would almost never accept a source image.
const MIN_SOURCE_IMAGE_WIDTH = 300;

const parser = new Parser({
  customFields: {
    item: [
      ["media:content", "mediaContent"],
      ["media:thumbnail", "mediaThumbnail"],
      ["media:group", "mediaGroup"],
      ["content:encoded", "contentEncoded"],
    ],
  },
});

// Fetches an image that the source ITSELF supplied in the RSS feed
// (via <enclosure> or the media:content/media:thumbnail extension) — so
// no scraping of the source website, only what the source explicitly
// publishes in their own syndication feed.
function extractImageFromHtml(html) {
  if (!html) return null;
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

// Some publishers' image CDNs deliver the RSS thumbnail at a fixed, small
// width (well under our MIN_SOURCE_IMAGE_WIDTH threshold below), but embed
// that width directly in the URL path — so a larger rendition of the same
// photo can be requested by swapping in a bigger number. If this ever
// doesn't work (invalid path, removed photo, etc.), the existing
// dimension check below simply catches that and falls back to a stock
// photo — so this upgrade can never make things worse than before.
function upgradeKnownThumbnailUrl(url) {
  if (!url) return url;
  const match = url.match(/^(https?:\/\/ichef\.bbci\.co\.uk\/ace\/standard\/)\d+(\/.+)$/);
  if (match) return `${match[1]}1024${match[2]}`;
  return url;
}

function extractSourceImage(item) {
  if (item.enclosure?.url && item.enclosure.type?.startsWith("image/")) {
    return upgradeKnownThumbnailUrl(item.enclosure.url);
  }
  const mediaContentUrl = item.mediaContent?.["$"]?.url || item.mediaContent?.url;
  if (mediaContentUrl) return upgradeKnownThumbnailUrl(mediaContentUrl);
  const mediaThumbUrl = item.mediaThumbnail?.["$"]?.url || item.mediaThumbnail?.url;
  if (mediaThumbUrl) return upgradeKnownThumbnailUrl(mediaThumbUrl);
  // Some publishers nest media:content within a media:group element
  // instead of directly on the item — and that's then an array.
  const groupContent = item.mediaGroup?.["media:content"];
  const groupContentUrl = Array.isArray(groupContent)
    ? groupContent[0]?.["$"]?.url || groupContent[0]?.url
    : groupContent?.["$"]?.url || groupContent?.url;
  if (groupContentUrl) return upgradeKnownThumbnailUrl(groupContentUrl);
  // Fallback: some publishers don't use a separate media/enclosure tag,
  // but put the image as a plain <img> tag in the HTML content itself
  // (content:encoded). Grabs the first <img> found there.
  const htmlImage = extractImageFromHtml(item.contentEncoded || item.content);
  if (htmlImage) return upgradeKnownThumbnailUrl(htmlImage);
  return null;
}

// Determines whether an automatically generated draft is safe enough to
// go live immediately, without human review — deliberately strict: any doubt
// (low confidence, an unverified quote, a deviating figure, a
// possible duplicate, or an AI claim that couldn't confirm itself)
// means it simply stays in the queue for manual
// review, instead of guessing.
function passesAutoPublishGate(draft, possibleDuplicate, minConfidence) {
  if (possibleDuplicate) return false;
  if ((draft.confidence_score ?? 0) < minConfidence) return false;
  if (draft.flags?.figures_verified === false) return false;
  if (draft.flags?.quote_unverified === true) return false;
  if (draft.flags?.body_too_short === true) return false;
  if ((draft.claims || []).some((c) => c.verified === false)) return false;
  return true;
}

// Same kind of strict gate, but for automatically updating
// an article that's already published — that changes content
// visitors may have already read, so the bar isn't lower here.
function passesAutoUpdateGate(updateResult, minConfidence) {
  if (!updateResult.has_new_info) return false;
  if ((updateResult.confidence_score ?? 0) < minConfidence) return false;
  return true;
}

// Fetches a source's RSS feed and processes each new item (not previously
// imported). Before writing a new draft, the
// system first checks whether this item likely covers the same topic as
// an existing article:
// - Is that article still in the queue (pending_review)? Then the
//   new source is automatically merged into it (multi-source rewrite),
//   instead of creating a separate, possibly duplicate draft.
// - Is it already published? Then it's checked whether the new source
//   actually contains new information — if so AND the setting is
//   on, the article is automatically updated (with revision history).
// If no related article is found, everything works as before:
// a new draft per item.
// Some RSS items are video-only stories with little to no real article
// text — feeding that thin content to the AI risks it padding/inventing
// content to reach the target length, which is exactly what we want to
// avoid. This checks several independent signals, any one of which is
// enough to treat the item as video:
// - Media RSS's own <media:content medium="video" ...> marker (the
//   standard, most reliable signal when a publisher supplies it).
// - A standard <enclosure type="video/...">.
// - Common URL/title conventions publishers use for video-only stories
//   (e.g. BBC's "/av/" path segment, or a title starting with "Video:"
//   or "Watch:").
function isVideoItem(item) {
  const mediaContent = item.mediaContent;
  const hasVideoMedium = Array.isArray(mediaContent)
    ? mediaContent.some((m) => m?.["$"]?.medium === "video")
    : mediaContent?.["$"]?.medium === "video";
  if (hasVideoMedium) return true;

  if (item.enclosure?.type?.startsWith("video/")) return true;

  const link = item.link || "";
  const title = (item.title || "").trim();
  if (/\/av\/|\/video\//i.test(link)) return true;
  if (/^(video|watch):/i.test(title)) return true;

  return false;
}

export async function fetchAndImportFromSource(sourceId, { limit = 5 } = {}) {
  const source = getSources().find((s) => s.id === sourceId);
  if (!source) throw new Error("Unknown source");
  if (!source.feed_url) throw new Error("This source has no RSS feed URL configured");

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
  let skippedVideo = 0;

  const {
    auto_publish, auto_publish_min_confidence,
    auto_gather_sources, auto_update_published, auto_update_min_confidence,
    use_source_image,
  } = getAutomationSettings();

  for (const item of newItems) {
    const guid = item.guid || item.link;
    if (isVideoItem(item)) {
      skippedVideo++;
      successfulGuids.push(guid); // video-only story, nothing to write an article from
      continue;
    }
    const sourceText = (item.contentSnippet || item.content || item.title || "").trim();
    if (!sourceText) {
      successfulGuids.push(guid); // nothing usable in this item, don't retry
      continue;
    }

    try {
      const related = item.title ? findRelatedArticle(item.title) : null;

      // --- Path 1: merge with a draft still in the queue ---
      if (related && related.status === "pending_review" && auto_gather_sources) {
        const existing = getArticle(related.id);
        if (existing) {
          const originalSource = getSources().find((s) => s.id === existing.source_id);
          // Earlier additional sources are only kept as name/link
          // (not the raw text) — that information is already incorporated
          // into the current article text. So we pass the existing, already
          // compiled text as the main source, plus this one new
          // source as an addition.
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

      // --- Path 2: automatically update an already published article ---
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
            // New information WAS found, but not confident enough (or the
            // setting is off) to apply automatically — leave a
            // notification so the editor can review it themselves,
            // instead of silently letting the information disappear.
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

      // --- Path 3: no (usable) related article — generate normally ---
      const draft = await generateDraft({ sourceText, sourceName: source.name });
      const possibleDuplicate = findPossibleDuplicate(draft.title);

      let featuredImage = null;
      let featuredImageCredit = null;

      if (use_source_image) {
        const sourceImageUrl = extractSourceImage(item);
        if (sourceImageUrl) {
          // Source images are often small preview thumbnails, meant
          // for an RSS reader — not for a large hero display on our
          // site. If we use them at full width anyway, Next.js stretches
          // it beyond its own resolution, which noticeably degrades
          // quality. So first check the actual dimensions,
          // and only use it if they're large enough.
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
          // no image isn't serious enough to fail the import
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
      // Deliberately NOT marking as imported — in case of a temporary
      // AI outage, this item can still succeed on the next "Fetch Now".
    }
  }

  markGuidsImported(source.id, successfulGuids);

  return {
    created: created.length,
    merged: merged.length,
    updated: updated.length,
    flagged: flagged.length,
    skipped: feed.items.length - newItems.length,
    skipped_video: skippedVideo,
    errors,
  };
}

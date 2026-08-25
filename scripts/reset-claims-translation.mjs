// One-time helper: some articles were already migrated (translated_to_en:
// true) BEFORE claims translation was added to the migration script — so
// their title/body are English, but their "claims" (Key Facts) are still
// Dutch. This script finds exactly those articles and resets
// translated_to_en so scripts/migrate-translate-articles.mjs picks them up
// again. Articles whose claims are already English (or have no claims at
// all) are left untouched — this avoids needlessly re-translating
// title/body that's already fine.
//
// Usage (on the VPS, in the folder with docker-compose.yml):
//   docker compose exec ai-nieuwssite node scripts/reset-claims-translation.mjs --dry-run
//   docker compose exec ai-nieuwssite node scripts/reset-claims-translation.mjs
//
// --dry-run : shows which articles would be reset, without changing anything.
import { getArticles, updateArticle } from "../lib/db.js";

const DRY_RUN = process.argv.includes("--dry-run");

// A simple, deliberately conservative heuristic — common Dutch function
// words that are very unlikely to appear in genuine English claim text.
// A false negative (missing a Dutch claim) just means it's skipped this
// round and can be caught by running this script again later; a false
// positive would needlessly re-translate an already-fine article, which
// is harmless but wastes AI quota — so conservative is the safer choice
// either way.
const DUTCH_WORD_PATTERN = /\b(een|het|de|niet|voor|met|dit|die|dat|geen|ook|naar|worden|wordt|zijn|bij|en|van|op|in|te|aan|door)\b/i;

function hasDutchClaims(article) {
  if (!Array.isArray(article.claims) || article.claims.length === 0) return false;
  return article.claims.some((c) => c.text && DUTCH_WORD_PATTERN.test(c.text));
}

function main() {
  const all = getArticles({});
  const targets = all.filter((a) => a.translated_to_en && hasDutchClaims(a));

  console.log(`[reset] ${all.length} articles total, ${targets.length} have Dutch-looking claims despite already being marked translated.`);
  if (DRY_RUN) console.log("[reset] DRY RUN — nothing will actually be changed.");

  if (targets.length === 0) {
    console.log("[reset] nothing to do.");
    return;
  }

  for (const article of targets) {
    console.log(`[reset] ${article.id}: "${article.title.slice(0, 60)}" — ${article.claims.length} claim(s)`);
    if (!DRY_RUN) {
      updateArticle(article.id, { translated_to_en: false });
    }
  }

  console.log(`\n[reset] ${DRY_RUN ? "would reset" : "reset"} ${targets.length} article(s).`);
  if (!DRY_RUN) {
    console.log("[reset] run scripts/migrate-translate-articles.mjs again to translate their claims.");
  }
}

main();

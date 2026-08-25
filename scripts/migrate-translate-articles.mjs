// Eenmalig migratiescript: vertaalt alle bestaande Nederlandse artikelen
// naar het Engels, nu de site zelf is omgezet. Draai dit los op de server
// (niet via de webinterface) — bij 800+ artikelen duurt dit een tijd, en
// dit is bewust zo gebouwd dat het veilig onderbroken en herstart kan
// worden zonder dubbel werk of dataverlies.
//
// Gebruik (op de VPS, in de map met docker-compose.yml):
//   docker compose exec ai-nieuwssite node scripts/migrate-translate-articles.mjs --dry-run
//   docker compose exec ai-nieuwssite node scripts/migrate-translate-articles.mjs
//   docker compose exec ai-nieuwssite node scripts/migrate-translate-articles.mjs --limit=10
//
// --dry-run  : laat zien wat er zou gebeuren, slaat niets daadwerkelijk op.
// --limit=N  : stop na N succesvolle vertalingen (handig om eerst een klein
//              aantal te proberen voordat je alle 800+ in één keer doet).
//
// Elk artikel krijgt na een geslaagde vertaling het veld
// "translated_to_en: true" — een artikel dat dat al heeft, wordt bij een
// volgende run overgeslagen. Je kunt dit script dus gewoon opnieuw
// aanroepen als het halverwege stopt (bijv. door een netwerkstoring), of
// om artikelen te vertalen die na de eerste run zijn toegevoegd.
import { getArticles, updateArticle } from "../lib/db.js";
import { translateArticleToEnglish } from "../lib/ai.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const DRY_RUN = process.argv.includes("--dry-run");
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? parseInt(limitArg.split("=")[1], 10) : 0;
// Pauze tussen aanroepen — voorkomt dat je in korte tijd tegen de
// rate-limit van de gratis AI-providers aanloopt. Aanpasbaar via
// MIGRATE_DELAY_MS als 4 seconden te snel of onnodig traag blijkt.
const DELAY_MS = parseInt(process.env.MIGRATE_DELAY_MS || "4000", 10);

async function main() {
  // Vers ophalen bij elke run — geen probleem als de site ondertussen
  // nieuwe artikelen heeft aangemaakt, die komen dan gewoon mee als "nog
  // te vertalen" bij een volgende keer dat je dit script draait.
  const all = getArticles({});
  const todo = all.filter((a) => !a.translated_to_en && a.title && a.body);
  const targets = LIMIT > 0 ? todo.slice(0, LIMIT) : todo;

  console.log(`[migratie] ${all.length} artikelen totaal, ${todo.length} nog te vertalen.`);
  if (LIMIT > 0) console.log(`[migratie] gestopt na ${LIMIT} (--limit) voor deze run.`);
  if (DRY_RUN) console.log("[migratie] DRY RUN — er wordt niets daadwerkelijk opgeslagen.");
  if (targets.length === 0) {
    console.log("[migratie] niets te doen.");
    return;
  }

  let done = 0;
  let failed = 0;
  const errors = [];
  // Bij dit specifieke soort fout (het AI-model levert géén geldige JSON,
  // bijv. omdat een "redenerend" model zijn eigen denkstappen laat lekken
  // in plaats van het antwoord) helpt simpelweg opnieuw proberen vaak al —
  // het is doorgaans een kwestie van pech bij die ene aanroep, niet een
  // structureel probleem met dat specifieke artikel.
  const MAX_ATTEMPTS = 3;

  for (const article of targets) {
    const position = done + failed + 1;
    let lastErr = null;
    let success = false;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS && !success; attempt++) {
      try {
        const { title, body } = await translateArticleToEnglish({
          title: article.title,
          body: article.body,
        });
        if (!DRY_RUN) {
          // updateArticle leest zelf vers van schijf en schrijft meteen weg
          // — voortgang gaat dus nooit verloren, ook niet bij een crash
          // halverwege de volledige lijst.
          updateArticle(article.id, { title, body, translated_to_en: true });
        }
        done++;
        success = true;
        const attemptNote = attempt > 1 ? ` (na ${attempt} pogingen)` : "";
        console.log(`[migratie] (${position}/${targets.length}) OK${attemptNote} — ${article.id}: "${title.slice(0, 70)}"`);
      } catch (err) {
        lastErr = err;
        const isParseError = err.message.includes("could not parse AI response as JSON") || err.message.includes("No valid translation received");
        if (isParseError && attempt < MAX_ATTEMPTS) {
          console.error(`[migratie] (${position}/${targets.length}) poging ${attempt} mislukte (ongeldig AI-antwoord) — ${article.id}, probeer opnieuw...`);
          await sleep(2000);
        }
      }
    }

    if (!success) {
      failed++;
      errors.push({ id: article.id, title: article.title, error: lastErr.message });
      console.error(`[migratie] (${position}/${targets.length}) FOUT (na ${MAX_ATTEMPTS} pogingen) — ${article.id}: ${lastErr.message}`);
    }
    // Geen pauze na de allerlaatste — scheelt onnodig wachten aan het einde.
    if (position < targets.length) await sleep(DELAY_MS);
  }

  console.log(`\n[migratie] klaar. ${done} gelukt, ${failed} mislukt van ${targets.length} geprobeerd.`);
  if (errors.length > 0) {
    console.log("[migratie] mislukte artikelen (draai het script opnieuw om deze alsnog te proberen):");
    for (const e of errors) console.log(`  - ${e.id} ("${e.title.slice(0, 50)}"): ${e.error}`);
  }
  const remaining = todo.length - done;
  if (remaining > 0) {
    console.log(`[migratie] nog ${remaining} artikelen te gaan — draai het script gewoon nogmaals om verder te gaan.`);
  }
}

main().catch((err) => {
  console.error("[migratie] onverwachte fout, script gestopt:", err);
  process.exit(1);
});

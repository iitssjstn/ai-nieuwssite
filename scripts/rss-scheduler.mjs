// Losstaand van de Next.js-server/bundelaar — wordt door
// docker-entrypoint.sh als eigen achtergrondproces gestart. Dit omzeilt een
// bevestigde Next.js-bug (instrumentation.js kan geen Node-only modules
// als fs/crypto importeren zonder de standalone-build kapot te maken,
// vercel/next.js#49565) door de scheduler volledig los van Next.js' eigen
// bundelproces te draaien — gewoon een normaal Node-script.
import { getSources, getAutomationSettings } from "../lib/db.js";
import { fetchAndImportFromSource } from "../lib/rss.js";

const intervalMinutes = parseFloat(process.env.RSS_POLL_INTERVAL_MINUTES || "30");

if (!intervalMinutes || intervalMinutes <= 0) {
  console.log("[RSS-scheduler] uitgeschakeld (RSS_POLL_INTERVAL_MINUTES <= 0)");
  process.exit(0);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollAllSources() {
  // Bij elke ronde opnieuw checken (niet alleen bij opstarten) — zo werkt
  // de aan/uit-schakelaar in Instellingen meteen, zonder herstart nodig.
  const { enabled, max_per_source } = getAutomationSettings();
  if (!enabled) {
    console.log("[RSS-scheduler] overgeslagen — automatisering staat uit in Instellingen");
    return;
  }

  const sources = getSources().filter((s) => s.feed_url);
  for (const source of sources) {
    try {
      const result = await fetchAndImportFromSource(source.id, { limit: max_per_source });
      if (result.created > 0) {
        console.log(`[RSS-scheduler] ${source.name}: ${result.created} nieuw(e) concept(en)`);
      }
      if (result.errors?.length > 0) {
        console.error(`[RSS-scheduler] ${source.name}: ${result.errors.length} fout(en) — ${result.errors[0]}`);
      }
    } catch (err) {
      console.error(`[RSS-scheduler] fout bij bron ${source.name}:`, err.message);
    }
    // Korte pauze tussen bronnen — voorkomt dat meerdere bronnen met veel
    // nieuwe items ineens een burst aan AI-aanroepen afvuren, wat sneller
    // tegen de gratis rate-limit aanloopt dan wanneer je zelf handmatig af
    // en toe een concept genereert.
    await sleep(3000);
  }
}

console.log(`[RSS-scheduler] gestart, elke ${intervalMinutes} minuten`);
// Niet meteen bij opstarten (voorkomt een piek aan AI-aanroepen bij elke
// herstart/redeploy) — de eerste ronde start na één interval.
setInterval(pollAllSources, intervalMinutes * 60 * 1000);

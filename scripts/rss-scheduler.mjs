// Losstaand van de Next.js-server/bundelaar — wordt door
// docker-entrypoint.sh als eigen achtergrondproces gestart. Dit omzeilt een
// bevestigde Next.js-bug (instrumentation.js kan geen Node-only modules
// als fs/crypto importeren zonder de standalone-build kapot te maken,
// vercel/next.js#49565) door de scheduler volledig los van Next.js' eigen
// bundelproces te draaien — gewoon een normaal Node-script.
import { getSources } from "../lib/db.js";
import { fetchAndImportFromSource } from "../lib/rss.js";

const intervalMinutes = parseFloat(process.env.RSS_POLL_INTERVAL_MINUTES || "30");

if (!intervalMinutes || intervalMinutes <= 0) {
  console.log("[RSS-scheduler] uitgeschakeld (RSS_POLL_INTERVAL_MINUTES <= 0)");
  process.exit(0);
}

async function pollAllSources() {
  const sources = getSources().filter((s) => s.feed_url);
  for (const source of sources) {
    try {
      const result = await fetchAndImportFromSource(source.id);
      if (result.created > 0) {
        console.log(`[RSS-scheduler] ${source.name}: ${result.created} nieuw(e) concept(en)`);
      }
      if (result.errors?.length > 0) {
        console.error(`[RSS-scheduler] ${source.name}: ${result.errors.length} fout(en) — ${result.errors[0]}`);
      }
    } catch (err) {
      console.error(`[RSS-scheduler] fout bij bron ${source.name}:`, err.message);
    }
  }
}

console.log(`[RSS-scheduler] gestart, elke ${intervalMinutes} minuten`);
// Niet meteen bij opstarten (voorkomt een piek aan AI-aanroepen bij elke
// herstart/redeploy) — de eerste ronde start na één interval.
setInterval(pollAllSources, intervalMinutes * 60 * 1000);

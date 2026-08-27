// Losstaand van de Next.js-server/bundelaar — wordt door
// docker-entrypoint.sh als eigen achtergrondproces gestart. Dit omzeilt een
// bevestigde Next.js-bug (instrumentation.js kan geen Node-only modules
// als fs/crypto importeren zonder de standalone-build kapot te maken,
// vercel/next.js#49565) door de scheduler volledig los van Next.js' eigen
// bundelproces te draaien — gewoon een normaal Node-script.
import { getSources, getAutomationSettings, isWithinActiveHours, getRemoteBackupSettings } from "../lib/db.js";
import { fetchAndImportFromSource } from "../lib/rss.js";
import { runScheduledBackupIfNeeded, pushBackupToRemote } from "../lib/backup.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Elke bron mag zijn eigen poll_interval_minutes hebben (ingesteld via
// Instellingen → Bronnen); staat die op null, dan geldt het globale
// interval uit Instellingen → RSS-schema. Om dat per bron te kunnen
// respecteren, draait deze "tick" elke minuut i.p.v. één keer per
// (variabel) globaal interval — en bepaalt per bron zelf of die al aan de
// beurt is, op basis van last_polled_at.
const TICK_MS = 60 * 1000;

function isSourceDue(source, globalIntervalMinutes) {
  if (!source.last_polled_at) return true; // nog nooit gepolld
  const intervalMinutes = source.poll_interval_minutes ?? globalIntervalMinutes;
  const dueAt = new Date(source.last_polled_at).getTime() + Math.max(1, intervalMinutes) * 60 * 1000;
  return Date.now() >= dueAt;
}

async function pollDueSources() {
  // Bij elke tick opnieuw checken (niet alleen bij opstarten) — zo werkt
  // de aan/uit-schakelaar en het tijdvenster in Instellingen meteen,
  // zonder herstart nodig.
  const settings = getAutomationSettings();
  if (!settings.enabled) return;
  if (!isWithinActiveHours(settings)) return;

  const sources = getSources().filter((s) => s.feed_url && isSourceDue(s, settings.poll_interval_minutes));
  for (const source of sources) {
    try {
      const result = await fetchAndImportFromSource(source.id, { limit: settings.max_per_source });
      if (result.created > 0) {
        console.log(`[RSS-scheduler] ${source.name}: ${result.created} nieuw(e) concept(en)`);
      }
      if (result.merged > 0) {
        console.log(`[RSS-scheduler] ${source.name}: ${result.merged} bron(nen) samengevoegd met bestaand concept`);
      }
      if (result.updated > 0) {
        console.log(`[RSS-scheduler] ${source.name}: ${result.updated} gepubliceerd artikel automatisch bijgewerkt`);
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

async function checkScheduledBackup() {
  try {
    const { backup_frequency_hours } = getAutomationSettings();
    const created = runScheduledBackupIfNeeded(backup_frequency_hours);
    if (created) {
      console.log(`[Backup] back-up aangemaakt: ${created}`);
      const remoteSettings = getRemoteBackupSettings();
      if (remoteSettings.url && remoteSettings.key) {
        const result = await pushBackupToRemote(created, remoteSettings);
        if (result.success) {
          console.log(`[Backup] ook verstuurd naar externe ontvanger: ${created}`);
        } else if (!result.skipped) {
          console.error(`[Backup] versturen naar externe ontvanger mislukt: ${result.error}`);
        }
      }
    }
  } catch (err) {
    console.error("[Backup] fout bij aanmaken back-up:", err.message);
  }
}

// De back-up-taak staat los van de RSS-planning hieronder — ook als
// automatisch RSS-ophalen (tijdelijk) uitstaat, moet het databestand toch
// volgens de ingestelde frequentie geback-upt blijven worden. Elke 15
// minuten checken (goedkoop) zodat ook kortere frequenties (bijv. elke 6
// uur) zonder te veel vertraging worden opgepikt.
checkScheduledBackup();
setInterval(checkScheduledBackup, 15 * 60 * 1000);

// RSS-polling gebruikt een vaste tick van 1 minuut i.p.v. het globale
// interval als sleep-duur — dat is wat per-bron-intervallen mogelijk maakt
// (zie isSourceDue hierboven). Niet meteen bij opstarten pollen (voorkomt
// een piek aan AI-aanroepen bij elke herstart/redeploy) — de eerste tick
// start na TICK_MS.
async function tick() {
  await sleep(TICK_MS);
  try {
    await pollDueSources();
  } catch (err) {
    console.error("[RSS-scheduler] onverwachte fout tijdens pollen:", err.message);
  }
  tick();
}

console.log("[RSS-scheduler] gestart — interval per bron instelbaar via Instellingen → Bronnen, globaal via Instellingen → RSS-schema");
tick();

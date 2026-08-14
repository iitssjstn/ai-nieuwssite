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

async function pollAllSources() {
  // Bij elke ronde opnieuw checken (niet alleen bij opstarten) — zo werkt
  // de aan/uit-schakelaar, interval en tijdvenster in Instellingen meteen,
  // zonder herstart nodig.
  const settings = getAutomationSettings();
  if (!settings.enabled) {
    console.log("[RSS-scheduler] overgeslagen — automatisering staat uit in Instellingen");
    return;
  }
  if (!isWithinActiveHours(settings)) {
    console.log(`[RSS-scheduler] overgeslagen — buiten het ingestelde tijdvenster (${settings.active_hours_start}–${settings.active_hours_end})`);
    return;
  }

  const sources = getSources().filter((s) => s.feed_url);
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

// RSS-polling gebruikt bewust een zichzelf-herplannende setTimeout i.p.v.
// een vaste setInterval — zo werkt een wijziging van de interval- of
// tijdvenster-instelling in Instellingen → RSS-schema meteen, zonder dat
// de container herstart hoeft te worden. Niet meteen bij opstarten pollen
// (voorkomt een piek aan AI-aanroepen bij elke herstart/redeploy) — de
// eerste ronde start na één interval.
async function scheduleNextPoll() {
  const { poll_interval_minutes } = getAutomationSettings();
  const intervalMs = Math.max(1, poll_interval_minutes || 30) * 60 * 1000;
  await sleep(intervalMs);
  try {
    await pollAllSources();
  } catch (err) {
    console.error("[RSS-scheduler] onverwachte fout tijdens pollen:", err.message);
  }
  scheduleNextPoll();
}

console.log("[RSS-scheduler] gestart — interval en tijdvenster instelbaar via Instellingen → RSS-schema");
scheduleNextPoll();

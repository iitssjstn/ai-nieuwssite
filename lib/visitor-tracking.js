// Houdt bij welke (volledig anonieme) bezoekerssessies de site de laatste
// paar minuten actief hebben gehad — puur in het geheugen van het
// draaiende serverproces, niet in het databestand. Dat is bewust: dit zijn
// vluchtige gegevens die na een herstart toch weer leeg beginnen, en met
// mogelijk honderden gelijktijdige bezoekers zou wegschrijven naar het
// gedeelde databestand bij elke "heartbeat" nodeloos zwaar zijn.
//
// Er wordt geen IP-adres, cookie, of ander persoonsgegeven bijgehouden —
// alleen een willekeurig, bij elk bezoek opnieuw gegenereerd ID (clientside
// aangemaakt) gekoppeld aan een tijdstip.
const lastSeen = new Map();

const ACTIVE_THRESHOLD_MS = 1 * 60 * 1000; // 1 minuut zonder heartbeat = niet meer "actief"

export function recordVisitorHeartbeat(visitorId) {
  if (!visitorId || typeof visitorId !== "string" || visitorId.length > 100) return;
  lastSeen.set(visitorId, Date.now());
}

export function getActiveVisitorCount() {
  const cutoff = Date.now() - ACTIVE_THRESHOLD_MS;
  // Meteen ook verlopen sessies opruimen, zodat de Map niet onbeperkt
  // doorgroeit op een drukke site.
  for (const [id, ts] of lastSeen) {
    if (ts < cutoff) lastSeen.delete(id);
  }
  return lastSeen.size;
}

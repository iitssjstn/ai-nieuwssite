// Keeps track of which (fully anonymous) visitor sessions have been
// active on the site in the last few minutes — purely in the memory of the
// running server process, not in the database file. That's deliberate: this is
// volatile data that starts empty again after a restart anyway, and with
// potentially hundreds of concurrent visitors, writing to the
// shared database file on every "heartbeat" would be needlessly heavy.
//
// No IP address, cookie, or other personal data is stored —
// only a random ID (generated client-side on each visit)
// linked to a timestamp.
const lastSeen = new Map();

const ACTIVE_THRESHOLD_MS = 60 * 1000; // 1 minute without heartbeat = no longer "active"

export function recordVisitorHeartbeat(visitorId) {
  if (!visitorId || typeof visitorId !== "string" || visitorId.length > 100) return;
  lastSeen.set(visitorId, Date.now());
}

export function getActiveVisitorCount() {
  const cutoff = Date.now() - ACTIVE_THRESHOLD_MS;
  // Also immediately clean up expired sessions, so the Map doesn't grow
  // unboundedly on a busy site.
  for (const [id, ts] of lastSeen) {
    if (ts < cutoff) lastSeen.delete(id);
  }
  return lastSeen.size;
}

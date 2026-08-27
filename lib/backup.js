import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "db.json");
const BACKUP_DIR = path.join(process.cwd(), "data", "backups");

// Recognizes the old file format (db-YYYY-MM-DD.json, one per day, from
// before configurable frequency), the current format with a timestamp
// (db-YYYY-MM-DDTHH-mm.json), and that same format with a "-2", "-3", ...
// suffix (added automatically when two backups would otherwise collide
// within the same clock-minute) — so previously made backups of any of
// these forms stay visible and downloadable.
const FILENAME_REGEX = /^db-\d{4}-\d{2}-\d{2}(T\d{2}-\d{2})?(-\d+)?\.json$/;

// How many days of history we want to keep, regardless of how often
// backups are made — at a frequency of every 6 hours this therefore
// automatically means more retained files than at once per day.
const RETENTION_TARGET_DAYS = 14;

function backupFilename(date = new Date()) {
  // ISO timestamp, down to the minute, with a readable dash instead of
  // a colon (which isn't allowed in a filename on most systems).
  const stamp = date.toISOString().slice(0, 16).replace(":", "-");
  let filename = `db-${stamp}.json`;
  let counter = 2;
  // A collision can happen whenever two backups occur within the same
  // clock-minute (e.g. a manual "Backup Now" quickly followed by a
  // restore, which always takes its own safety backup first) — silently
  // overwriting an existing, different backup would be a real data-loss
  // bug, so a free suffixed name is used instead whenever that happens.
  while (fs.existsSync(path.join(BACKUP_DIR, filename))) {
    filename = `db-${stamp}-${counter}.json`;
    counter++;
  }
  return filename;
}

function ensureBackupDir() {
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  } catch (err) {
    if (err.code === "EACCES" || err.code === "EPERM") {
      throw new Error(
        `No write permission for the backup directory (${BACKUP_DIR}). On the server, run ` +
        `something like: sudo chown -R 1001:1001 ~/npm/ai-nieuwssite-data`
      );
    }
    throw err;
  }
}

function listBackupFilenames() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs.readdirSync(BACKUP_DIR).filter((f) => FILENAME_REGEX.test(f)).sort();
}

function pruneOldBackups(frequencyHours) {
  const files = listBackupFilenames();
  const keepCount = Math.max(1, Math.ceil((RETENTION_TARGET_DAYS * 24) / Math.max(1, frequencyHours)));
  const excess = files.length - keepCount;
  if (excess > 0) {
    for (const file of files.slice(0, excess)) {
      fs.unlinkSync(path.join(BACKUP_DIR, file));
    }
  }
}

// Creates a new copy of the current database file if the configured
// frequency has elapsed since the last backup. Deliberately a copy, not a
// reference — if db.json later becomes corrupted, this backup
// simply stays intact.
export function runScheduledBackupIfNeeded(frequencyHours = 24) {
  if (!fs.existsSync(DB_PATH)) return null;
  ensureBackupDir();

  const files = listBackupFilenames();
  if (files.length > 0) {
    const lastPath = path.join(BACKUP_DIR, files[files.length - 1]);
    const elapsedHours = (Date.now() - fs.statSync(lastPath).mtimeMs) / (1000 * 60 * 60);
    if (elapsedHours < frequencyHours) return null; // not due yet
  }

  const filename = backupFilename();
  fs.copyFileSync(DB_PATH, path.join(BACKUP_DIR, filename));
  pruneOldBackups(frequencyHours);
  return filename;
}

// For the "Backup Now" button in the admin panel — always immediately creates a
// fresh backup, regardless of when the previous one was.
export function createBackupNow(frequencyHours = 24) {
  if (!fs.existsSync(DB_PATH)) throw new Error("No database file found to back up.");
  ensureBackupDir();
  const filename = backupFilename();
  fs.copyFileSync(DB_PATH, path.join(BACKUP_DIR, filename));
  pruneOldBackups(frequencyHours);
  return filename;
}

// For the admin panel: a list of available backups with timestamp and
// file size, newest first.
export function listBackups() {
  return listBackupFilenames()
    .map((f) => {
      const stat = fs.statSync(path.join(BACKUP_DIR, f));
      return { filename: f, sizeBytes: stat.size, createdAt: stat.mtime.toISOString() };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// Sends an already locally created backup to the remote receiver
// (the separate "backup-receiver" application on a second server). Deliberately
// best-effort: if this fails (server unreachable, wrong
// password, etc.) we don't throw an error — the local backup has and
// remains successful either way, this is purely an extra copy.
export async function pushBackupToRemote(filename, { url, key }) {
  if (!url || !key) return { success: false, skipped: true };

  const fullPath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(fullPath)) return { success: false, error: "Local backup not found" };

  try {
    const content = fs.readFileSync(fullPath);
    const target = `${url.replace(/\/$/, "")}/upload/${encodeURIComponent(filename)}`;
    const res = await fetch(target, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: content,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data.error || `HTTP ${res.status}` };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Reads one specific backup (for download) — with a strict check on the
// filename, so this can never be used to read arbitrary
// files from the server (path traversal).
export function readBackupFile(filename) {
  if (!FILENAME_REGEX.test(filename)) return null;
  const fullPath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath);
}

// Permanently deletes one local backup file — same strict filename check
// as readBackupFile, for the same path-traversal reason. This only ever
// removes the local copy; if a remote receiver is configured, that copy
// is untouched (the admin manages retention there separately, e.g. via
// backup-receiver's own bulk-delete).
export function deleteBackup(filename) {
  if (!FILENAME_REGEX.test(filename)) throw new Error("Invalid filename");
  const fullPath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(fullPath)) throw new Error("Backup not found");
  fs.unlinkSync(fullPath);
}

// Rejects anything that isn't at least plausibly a database backup —
// restoring a corrupt or unrelated file must never partially overwrite
// the live site. Deliberately a light check (valid JSON + an "articles"
// array), not a full schema validation: this only needs to catch "this
// clearly isn't a novapers backup", not enforce every field.
function assertLooksLikeBackup(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("This file isn't valid JSON — restore aborted, nothing was changed.");
  }
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.articles)) {
    throw new Error("This file doesn't look like a novapers database backup — restore aborted, nothing was changed.");
  }
  return raw;
}

// Overwrites the live database with the given (already-validated) raw
// backup content. Always takes a fresh safety backup of the CURRENT live
// state first, so a restore that turns out to be a mistake can itself be
// undone by restoring that safety backup. lib/db.js's in-memory cache
// picks up this change automatically on its next read (it checks the
// file's mtime), so no server restart is needed.
function overwriteLiveDb(raw) {
  let safetyBackupFilename = null;
  try {
    safetyBackupFilename = createBackupNow();
  } catch {
    // If even that fails (e.g. no live db.json yet to back up), proceed
    // anyway — restoring is still the whole point of this action.
  }
  fs.writeFileSync(DB_PATH, raw);
  return { safetyBackupFilename };
}

// Restores from a backup that's already stored locally (in data/backups/).
export function restoreFromBackup(filename) {
  if (!FILENAME_REGEX.test(filename)) throw new Error("Invalid filename");
  const fullPath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(fullPath)) throw new Error("Backup not found");
  const raw = fs.readFileSync(fullPath, "utf-8");
  assertLooksLikeBackup(raw);
  return overwriteLiveDb(raw);
}

// Restores from raw file content the admin uploaded through the browser —
// for disaster recovery, e.g. when the local backups themselves are also
// gone and only a copy downloaded from the remote receiver is left.
export function restoreFromUploadedContent(raw) {
  assertLooksLikeBackup(raw);
  return overwriteLiveDb(raw);
}

import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "db.json");
const BACKUP_DIR = path.join(process.cwd(), "data", "backups");

// Recognizes both the old file format (db-YYYY-MM-DD.json, one per day,
// from before configurable frequency) and the new format with a timestamp
// (db-YYYY-MM-DDTHH-mm.json) — so previously made backups stay
// visible and downloadable.
const FILENAME_REGEX = /^db-\d{4}-\d{2}-\d{2}(T\d{2}-\d{2})?\.json$/;

// How many days of history we want to keep, regardless of how often
// backups are made — at a frequency of every 6 hours this therefore
// automatically means more retained files than at once per day.
const RETENTION_TARGET_DAYS = 14;

function backupFilename(date = new Date()) {
  // ISO timestamp, down to the minute, with a readable dash instead of
  // a colon (which isn't allowed in a filename on most systems).
  const stamp = date.toISOString().slice(0, 16).replace(":", "-");
  return `db-${stamp}.json`;
}

function ensureBackupDir() {
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  } catch (err) {
    if (err.code === "EACCES" || err.code === "EPERM") {
      throw new Error(
        `No write permission for the backup directory (${BACKUP_DIR}). Run on the server ` +
        `waarschijnlijk: sudo chown -R 1001:1001 ~/npm/ai-nieuwssite-data`
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

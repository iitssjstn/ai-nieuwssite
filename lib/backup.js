import fs from "fs";
import path from "path";
import { getLocalDateKey } from "./db.js";

const DB_PATH = path.join(process.cwd(), "data", "db.json");
const BACKUP_DIR = path.join(process.cwd(), "data", "backups");

// Hoeveel dagelijkse back-ups we bewaren voordat de oudste wordt opgeruimd.
// 14 dagen geeft ruim de tijd om een fout op te merken, zonder dat de
// back-up-map onbeperkt blijft groeien.
const RETENTION_DAYS = 14;

function backupFilename(dateKey) {
  return `db-${dateKey}.json`;
}

// Maakt, als dat voor vandaag nog niet is gebeurd, een kopie van het
// huidige databestand. Bewust een kopie ipv een verwijzing — als db.json
// later corrupt raakt, blijft deze back-up gewoon intact staan.
export function runDailyBackupIfNeeded() {
  if (!fs.existsSync(DB_PATH)) return null;
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const todayKey = getLocalDateKey();
  const backupPath = path.join(BACKUP_DIR, backupFilename(todayKey));
  if (fs.existsSync(backupPath)) return null; // vandaag al gedaan

  fs.copyFileSync(DB_PATH, backupPath);
  pruneOldBackups();
  return backupFilename(todayKey);
}

// Voor de "Nu back-uppen"-knop in het adminpaneel — maakt altijd een verse
// back-up aan, ook als er vandaag al één bestaat (dan wordt die overschreven
// met de meest actuele stand).
export function createBackupNow() {
  if (!fs.existsSync(DB_PATH)) throw new Error("Geen databestand gevonden om te back-uppen.");
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const todayKey = getLocalDateKey();
  const filename = backupFilename(todayKey);
  fs.copyFileSync(DB_PATH, path.join(BACKUP_DIR, filename));
  pruneOldBackups();
  return filename;
}

function pruneOldBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return;
  const files = fs.readdirSync(BACKUP_DIR)
    .filter((f) => /^db-\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort();
  const excess = files.length - RETENTION_DAYS;
  if (excess > 0) {
    for (const file of files.slice(0, excess)) {
      fs.unlinkSync(path.join(BACKUP_DIR, file));
    }
  }
}

// Voor het adminpaneel: een lijst van beschikbare back-ups met datum en
// bestandsgrootte, nieuwste eerst.
export function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs.readdirSync(BACKUP_DIR)
    .filter((f) => /^db-\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .map((f) => {
      const stat = fs.statSync(path.join(BACKUP_DIR, f));
      return { filename: f, date: f.replace("db-", "").replace(".json", ""), sizeBytes: stat.size, createdAt: stat.mtime.toISOString() };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

// Leest één specifieke back-up (voor download) — met een striktecheck op de
// bestandsnaam, zodat dit nooit gebruikt kan worden om willekeurige
// bestanden van de server te lezen (path traversal).
export function readBackupFile(filename) {
  if (!/^db-\d{4}-\d{2}-\d{2}\.json$/.test(filename)) return null;
  const fullPath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath);
}

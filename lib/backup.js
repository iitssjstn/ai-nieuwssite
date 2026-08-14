import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "db.json");
const BACKUP_DIR = path.join(process.cwd(), "data", "backups");

// Herkent zowel het oude bestandsformaat (db-JJJJ-MM-DD.json, één per dag,
// van vóór instelbare frequentie) als het nieuwe formaat met tijdstip
// (db-JJJJ-MM-DDTUU-mm.json) — zo blijven eerder gemaakte back-ups gewoon
// zichtbaar en downloadbaar.
const FILENAME_REGEX = /^db-\d{4}-\d{2}-\d{2}(T\d{2}-\d{2})?\.json$/;

// Hoeveel dagen aan geschiedenis we willen bewaren, ongeacht hoe vaak er
// wordt geback-upt — bij een frequentie van elke 6 uur betekent dit dus
// automatisch meer bewaarde bestanden dan bij één keer per dag.
const RETENTION_TARGET_DAYS = 14;

function backupFilename(date = new Date()) {
  // ISO-tijdstip, tot op de minuut, met een leesbaar streepje i.p.v.
  // dubbele punt (die mag niet in een bestandsnaam op de meeste systemen).
  const stamp = date.toISOString().slice(0, 16).replace(":", "-");
  return `db-${stamp}.json`;
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

// Maakt, als de ingestelde frequentie sinds de laatste back-up is verstreken,
// een nieuwe kopie van het huidige databestand. Bewust een kopie ipv een
// verwijzing — als db.json later corrupt raakt, blijft deze back-up gewoon
// intact staan.
export function runScheduledBackupIfNeeded(frequencyHours = 24) {
  if (!fs.existsSync(DB_PATH)) return null;
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const files = listBackupFilenames();
  if (files.length > 0) {
    const lastPath = path.join(BACKUP_DIR, files[files.length - 1]);
    const elapsedHours = (Date.now() - fs.statSync(lastPath).mtimeMs) / (1000 * 60 * 60);
    if (elapsedHours < frequencyHours) return null; // nog niet aan de beurt
  }

  const filename = backupFilename();
  fs.copyFileSync(DB_PATH, path.join(BACKUP_DIR, filename));
  pruneOldBackups(frequencyHours);
  return filename;
}

// Voor de "Nu back-uppen"-knop in het adminpaneel — maakt altijd meteen een
// verse back-up, ongeacht wanneer de vorige was.
export function createBackupNow(frequencyHours = 24) {
  if (!fs.existsSync(DB_PATH)) throw new Error("Geen databestand gevonden om te back-uppen.");
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const filename = backupFilename();
  fs.copyFileSync(DB_PATH, path.join(BACKUP_DIR, filename));
  pruneOldBackups(frequencyHours);
  return filename;
}

// Voor het adminpaneel: een lijst van beschikbare back-ups met tijdstip en
// bestandsgrootte, nieuwste eerst.
export function listBackups() {
  return listBackupFilenames()
    .map((f) => {
      const stat = fs.statSync(path.join(BACKUP_DIR, f));
      return { filename: f, sizeBytes: stat.size, createdAt: stat.mtime.toISOString() };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// Leest één specifieke back-up (voor download) — met een strikte check op de
// bestandsnaam, zodat dit nooit gebruikt kan worden om willekeurige
// bestanden van de server te lezen (path traversal).
export function readBackupFile(filename) {
  if (!FILENAME_REGEX.test(filename)) return null;
  const fullPath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath);
}

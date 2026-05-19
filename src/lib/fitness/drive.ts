// ─── Google Drive — HealthFit-mapp ───────────────────────────────────────────
// Hittar senaste Workouts_vN.xlsx / Health_Metrics_vN.xlsx och laddar ner dem.

import { google } from "googleapis";
import type { drive_v3 } from "googleapis";

const FOLDER_ID = process.env.GOOGLE_DRIVE_HEALTHFIT_FOLDER_ID ?? "";
const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL ?? "";
// Private key lagras som en envrad med \n-escape — rena till riktiga radbrytningar
const PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");

let driveClient: drive_v3.Drive | null = null;

function getDrive(): drive_v3.Drive {
  if (driveClient) return driveClient;
  if (!CLIENT_EMAIL || !PRIVATE_KEY) {
    throw new Error("GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY saknas i env");
  }
  const auth = new google.auth.JWT({
    email: CLIENT_EMAIL,
    key: PRIVATE_KEY,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
  driveClient = google.drive({ version: "v3", auth });
  return driveClient;
}

interface CacheEntry {
  timestamp: number;
  buffer: Buffer;
  filename: string;
  modifiedTime: string | null;
}
const CACHE_TTL = 5 * 60 * 1000; // 5 min
const cache = new Map<string, CacheEntry>();

const GOOGLE_SHEET_MIME = "application/vnd.google-apps.spreadsheet";
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * Hitta senaste fil som matchar ett namnmönster (t.ex. "Workouts_v").
 * HealthFit exporterar antingen `Workouts_vN.xlsx` eller konverterat till Google Sheet `Workouts_vN`.
 * Vi sorterar på versionsnummer N i filnamnet, annars på modifiedTime.
 */
async function findLatestFile(prefix: string): Promise<drive_v3.Schema$File | null> {
  const drive = getDrive();
  // Söker globalt bland filer som delats med service-kontot — mappen används
  // inte alltid som parent (HealthFit exporterar ibland direkt till My Drive).
  const q = FOLDER_ID
    ? `(('${FOLDER_ID}' in parents) or sharedWithMe) and name contains '${prefix}' and trashed = false`
    : `name contains '${prefix}' and trashed = false`;
  const res = await drive.files.list({
    q,
    fields: "files(id, name, mimeType, modifiedTime)",
    pageSize: 50,
    orderBy: "modifiedTime desc",
  });
  const files = res.data.files ?? [];
  if (files.length === 0) return null;

  const re = new RegExp(`${prefix}(\\d+)(?:\\.xlsx)?$`, "i");
  let best: { file: drive_v3.Schema$File; n: number } | null = null;
  for (const f of files) {
    const m = f.name?.match(re);
    if (!m) continue;
    const n = parseInt(m[1], 10);
    if (!best || n > best.n) best = { file: f, n };
  }
  return best?.file ?? files[0];
}

/** Ladda ner en fil som Buffer. Konverterar Google Sheets → xlsx via export. */
async function downloadFile(file: drive_v3.Schema$File): Promise<Buffer> {
  if (!file.id) throw new Error("Fil saknar id");
  const drive = getDrive();
  if (file.mimeType === GOOGLE_SHEET_MIME) {
    const res = await drive.files.export(
      { fileId: file.id, mimeType: XLSX_MIME },
      { responseType: "arraybuffer" }
    );
    return Buffer.from(res.data as ArrayBuffer);
  }
  const res = await drive.files.get(
    { fileId: file.id, alt: "media" },
    { responseType: "arraybuffer" }
  );
  return Buffer.from(res.data as ArrayBuffer);
}

/**
 * Hämta senaste Workouts_vN.xlsx som Buffer, med 5-min cache.
 * Returnerar även filnamn och modifiedTime (senaste HealthFit-export till Drive).
 * Sätt `opts.skipCache=true` för att tvinga fram ett färskt anrop mot Drive.
 */
export async function getLatestWorkoutsXlsx(opts: { skipCache?: boolean } = {}): Promise<{ buffer: Buffer; filename: string; modifiedTime: string | null } | null> {
  if (!opts.skipCache) {
    const cached = cache.get("workouts");
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return { buffer: cached.buffer, filename: cached.filename, modifiedTime: cached.modifiedTime };
    }
  }
  const file = await findLatestFile("Workouts_v");
  if (!file?.id || !file.name) return null;
  const buffer = await downloadFile(file);
  const modifiedTime = file.modifiedTime ?? null;
  cache.set("workouts", { timestamp: Date.now(), buffer, filename: file.name, modifiedTime });
  return { buffer, filename: file.name, modifiedTime };
}

// ─── FIT-filer ───────────────────────────────────────────────────────────────
// Filnamn: `YYYY-MM-DD-HHMMSS-Type-Device.fit` (t.ex. `2026-04-14-063215-Running-AppleWatch.fit`).

const FIT_CACHE_TTL = 30 * 60 * 1000; // 30 min — en FIT-fil ändras aldrig efter att den laddats upp
interface FitCacheEntry { timestamp: number; buffer: Buffer; filename: string; fileId: string; }
const fitCache = new Map<string, FitCacheEntry>();

/** Metadata för en FIT-fil i Drive. */
export interface FitFileMeta {
  id: string;
  name: string;
  /** Parsed datum från filnamn, YYYY-MM-DD */
  date: string;
  /** Parsed tid HH:MM:SS från filnamn */
  time: string;
  /** Typ från filnamnet (t.ex. "Running") */
  type: string;
  modifiedTime: string;
}

const FIT_NAME_RE = /^(\d{4}-\d{2}-\d{2})-(\d{2})(\d{2})(\d{2})-([^-.]+)/;

function parseFitName(name: string): Omit<FitFileMeta, "id" | "modifiedTime"> | null {
  const m = name.match(FIT_NAME_RE);
  if (!m) return null;
  return {
    name,
    date: m[1],
    time: `${m[2]}:${m[3]}:${m[4]}`,
    type: m[5],
  };
}

/**
 * Lista FIT-filer som service-kontot har tillgång till, filtrerat på datum-prefix.
 * Cachas inte — Drive-list är billigt och vi vill se nya filer direkt.
 */
export async function listFitFiles(datePrefix?: string): Promise<FitFileMeta[]> {
  const drive = getDrive();
  const q = [
    "name contains '.fit'",
    "trashed = false",
    ...(datePrefix ? [`name contains '${datePrefix}'`] : []),
    FOLDER_ID ? `(('${FOLDER_ID}' in parents) or sharedWithMe)` : "",
  ].filter(Boolean).join(" and ");
  const res = await drive.files.list({
    q,
    fields: "files(id, name, modifiedTime)",
    pageSize: 200,
    orderBy: "name desc",
  });
  const files = res.data.files ?? [];
  const out: FitFileMeta[] = [];
  for (const f of files) {
    if (!f.id || !f.name) continue;
    const parsed = parseFitName(f.name);
    if (!parsed) continue;
    out.push({ id: f.id, modifiedTime: f.modifiedTime ?? "", ...parsed });
  }
  return out;
}

/**
 * Hitta FIT-fil för ett pass givet datum + (valfri) HH:MM-prefix + (valfri) typ.
 * Tidsmatchning är tolerant — passhistoriken har HH:MM, filnamnet HHMMSS.
 */
export async function findFitFileForWorkout(
  date: string,
  time?: string,
  type?: string,
): Promise<FitFileMeta | null> {
  const files = await listFitFiles(date);
  if (files.length === 0) return null;
  const hhmm = time ? time.replace(":", "").slice(0, 4) : null;
  const typeLower = type?.toLowerCase().replace(/\s+/g, "");

  // Poängsätt varje kandidat — viktiga kriterier väger mer.
  let best: { file: FitFileMeta; score: number } | null = null;
  for (const f of files) {
    if (f.date !== date) continue;
    let score = 1; // matchande datum
    if (hhmm && f.time.replace(":", "").slice(0, 4) === hhmm) score += 10;
    else if (hhmm) {
      // Räkna minuter-diff — närmare är bättre
      const [fh, fm] = f.time.split(":").map((s) => parseInt(s, 10));
      const [wh, wm] = [parseInt(hhmm.slice(0, 2), 10), parseInt(hhmm.slice(2), 10)];
      const diffMin = Math.abs((fh * 60 + fm) - (wh * 60 + wm));
      if (diffMin <= 5) score += 5;
      else if (diffMin <= 30) score += 2;
    }
    if (typeLower && f.type.toLowerCase().replace(/\s+/g, "") === typeLower) score += 3;
    if (!best || score > best.score) best = { file: f, score };
  }
  return best?.file ?? null;
}

/** Ladda ner en FIT-fil som Buffer med 30-min cache.
 *
 * Säkerhet: servicekontot har potentiellt tillgång till fler filer än
 * HealthFit-mappen (sharedWithMe-fallback). En attacker med fritt val av
 * fileId skulle annars kunna hämta vad som helst som kontot är delat med.
 * Vi verifierar att filnamnet faktiskt slutar på .fit innan vi laddar ner. */
export async function downloadFitFile(fileId: string): Promise<{ buffer: Buffer; filename: string } | null> {
  const cached = fitCache.get(fileId);
  if (cached && Date.now() - cached.timestamp < FIT_CACHE_TTL) {
    return { buffer: cached.buffer, filename: cached.filename };
  }
  const drive = getDrive();
  const meta = await drive.files.get({ fileId, fields: "name" });
  const filename = meta.data.name ?? "";
  if (!filename.toLowerCase().endsWith(".fit")) {
    throw new Error(`Filen är inte en .fit-fil: ${filename || fileId}`);
  }
  const res = await drive.files.get({ fileId, alt: "media" }, { responseType: "arraybuffer" });
  const buffer = Buffer.from(res.data as ArrayBuffer);
  fitCache.set(fileId, { timestamp: Date.now(), buffer, filename, fileId });
  return { buffer, filename };
}

/** Hämta senaste Health_Metrics_vN.xlsx som Buffer. */
export async function getLatestHealthMetricsXlsx(opts: { skipCache?: boolean } = {}): Promise<{ buffer: Buffer; filename: string; modifiedTime: string | null } | null> {
  if (!opts.skipCache) {
    const cached = cache.get("health");
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return { buffer: cached.buffer, filename: cached.filename, modifiedTime: cached.modifiedTime };
    }
  }
  // HealthFit exporterar som "Health Metrics_vN" (med mellanslag),
  // men äldre versioner kan ha hetat "Health_Metrics_vN".
  const file =
    (await findLatestFile("Health Metrics_v")) ??
    (await findLatestFile("Health_Metrics_v"));
  if (!file?.id || !file.name) return null;
  const buffer = await downloadFile(file);
  const modifiedTime = file.modifiedTime ?? null;
  cache.set("health", { timestamp: Date.now(), buffer, filename: file.name, modifiedTime });
  return { buffer, filename: file.name, modifiedTime };
}

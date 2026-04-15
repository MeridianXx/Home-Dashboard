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
 * Returnerar även filnamnet för visning/debug.
 */
export async function getLatestWorkoutsXlsx(): Promise<{ buffer: Buffer; filename: string } | null> {
  const cached = cache.get("workouts");
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { buffer: cached.buffer, filename: cached.filename };
  }
  const file = await findLatestFile("Workouts_v");
  if (!file?.id || !file.name) return null;
  const buffer = await downloadFile(file);
  cache.set("workouts", { timestamp: Date.now(), buffer, filename: file.name });
  return { buffer, filename: file.name };
}

/** Hämta senaste Health_Metrics_vN.xlsx som Buffer. */
export async function getLatestHealthMetricsXlsx(): Promise<{ buffer: Buffer; filename: string } | null> {
  const cached = cache.get("health");
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { buffer: cached.buffer, filename: cached.filename };
  }
  // HealthFit exporterar som "Health Metrics_vN" (med mellanslag),
  // men äldre versioner kan ha hetat "Health_Metrics_vN".
  const file =
    (await findLatestFile("Health Metrics_v")) ??
    (await findLatestFile("Health_Metrics_v"));
  if (!file?.id || !file.name) return null;
  const buffer = await downloadFile(file);
  cache.set("health", { timestamp: Date.now(), buffer, filename: file.name });
  return { buffer, filename: file.name };
}

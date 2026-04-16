// ─── FIT-filparsning — server-side ───────────────────────────────────────────
// Läser en FIT-fil (raw buffer från Google Drive) och returnerar ett
// kompakt, serialiserbart objekt för per-pass-detaljvyn.

import FitParser from "fit-file-parser";

export interface FitTrackPoint {
  /** Sekunder från start */
  t: number;
  /** [lat, lon] — utelämnad om GPS saknas för punkten */
  ll?: [number, number];
  /** Höjd i meter */
  alt?: number;
  /** Puls */
  hr?: number;
  /** Hastighet (m/s) */
  v?: number;
  /** Effekt (W) */
  p?: number;
  /** Kadens */
  c?: number;
  /** Kumulativ distans (m) */
  d?: number;
}

export interface FitLap {
  index: number;
  startSec: number;
  durationSec: number;
  distanceM: number;
  avgHR: number | null;
  maxHR: number | null;
  avgPace: string | null;
}

export interface FitSummary {
  startTime: string | null;
  sport: string | null;
  totalTimeSec: number;
  movingTimeSec: number;
  distanceM: number;
  /** null = ingen altitudedata alls (t.ex. styrkepass), 0 = platt pass */
  elevationGainM: number | null;
  avgHR: number | null;
  maxHR: number | null;
  avgPower: number | null;
  maxPower: number | null;
  avgSpeedMs: number | null;
  maxSpeedMs: number | null;
  /** Snittkadens (SPM för löpning — multiplicerat ×2 om FIT lagrar strides/min) */
  avgCadence: number | null;
  calories: number | null;
  /** Bounds för track — [minLat, minLon, maxLat, maxLon]. Null om GPS saknas. */
  bounds: [number, number, number, number] | null;
  /** Antal sample-punkter innan decimation. */
  sourcePoints: number;
}

export interface ParsedFit {
  summary: FitSummary;
  track: FitTrackPoint[];
  laps: FitLap[];
}

interface RawRecord {
  timestamp?: string | Date;
  position_lat?: number;
  position_long?: number;
  altitude?: number;
  enhanced_altitude?: number;
  heart_rate?: number;
  speed?: number;
  enhanced_speed?: number;
  power?: number;
  cadence?: number;
  distance?: number;
}

interface RawLap {
  start_time?: string | Date;
  timestamp?: string | Date;
  total_timer_time?: number;
  total_elapsed_time?: number;
  total_distance?: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  avg_speed?: number;
  /** I cascade-mode hänger records under varje lap, inte session. */
  records?: RawRecord[];
}

interface RawSession {
  start_time?: string | Date;
  sport?: string;
  avg_cadence?: number;
  total_timer_time?: number;
  total_elapsed_time?: number;
  total_distance?: number;
  total_ascent?: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  avg_power?: number;
  max_power?: number;
  avg_speed?: number;
  max_speed?: number;
  total_calories?: number;
  records?: RawRecord[];
  laps?: RawLap[];
}

interface RawParsedFit {
  sessions?: RawSession[];
  activity?: { sessions?: RawSession[] };
  records?: RawRecord[];
  laps?: RawLap[];
}

function toEpochSec(v: string | Date | undefined): number | null {
  if (!v) return null;
  const t = typeof v === "string" ? new Date(v).getTime() : v.getTime();
  return Number.isFinite(t) ? t / 1000 : null;
}

function paceString(distanceM: number, timeSec: number): string | null {
  if (distanceM <= 0 || timeSec <= 0) return null;
  const secPerKm = timeSec / (distanceM / 1000);
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/**
 * Decimera en array jämnt till ~maxPoints (behåller första + sista). Vi gör ren
 * nedsampling utan filtrering eftersom värdena (HR, altitude) inte är bullriga
 * nog för att behöva Ramer–Douglas–Peucker på klientsidan.
 */
function decimate<T>(arr: T[], maxPoints: number): T[] {
  if (arr.length <= maxPoints) return arr;
  const step = arr.length / maxPoints;
  const out: T[] = [];
  for (let i = 0; i < maxPoints; i++) {
    out.push(arr[Math.floor(i * step)]);
  }
  // Säkerställ sista punkten för korrekt summerad distans/altitude
  if (out[out.length - 1] !== arr[arr.length - 1]) out.push(arr[arr.length - 1]);
  return out;
}

/** Parsea FIT-fil till en kompakt JSON-struktur. */
export async function parseFit(buffer: Buffer, maxTrackPoints = 1200): Promise<ParsedFit> {
  const parser = new FitParser({
    force: true,
    speedUnit: "m/s",
    lengthUnit: "m",
    temperatureUnit: "celsius",
    elapsedRecordField: true,
    mode: "cascade",
  });

  // fit-file-parser kräver Buffer<ArrayBuffer> men Node returnerar Buffer<ArrayBufferLike>.
  // Kopiera via Uint8Array → new Buffer för att säkra typerna.
  const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  const raw = (await parser.parseAsync(Buffer.from(ab))) as unknown as RawParsedFit;
  // Cascade-mode kan ge `activity.sessions[]` eller `sessions[]` direkt beroende
  // på FIT-filens struktur. Plocka första sessionen som finns.
  const session: RawSession | undefined =
    raw.sessions?.[0] ?? raw.activity?.sessions?.[0] ?? undefined;
  const rawLaps: RawLap[] = session?.laps ?? raw.laps ?? [];
  // I cascade-mode hänger records under varje lap; i list-mode ligger de på roten.
  // Plocka i den ordning de förekommer i filen.
  const rawRecords: RawRecord[] =
    session?.records
    ?? raw.records
    ?? rawLaps.flatMap((l) => l.records ?? [])
    ?? [];

  // ── Bygg track ──
  const startSec =
    toEpochSec(session?.start_time) ?? toEpochSec(rawRecords[0]?.timestamp) ?? 0;

  const track: FitTrackPoint[] = [];
  let minLat = Infinity, minLon = Infinity, maxLat = -Infinity, maxLon = -Infinity;
  let hasGPS = false;

  for (const r of rawRecords) {
    const ts = toEpochSec(r.timestamp);
    if (ts === null) continue;
    const point: FitTrackPoint = { t: Math.round(ts - startSec) };
    if (typeof r.position_lat === "number" && typeof r.position_long === "number") {
      point.ll = [r.position_lat, r.position_long];
      hasGPS = true;
      if (r.position_lat < minLat) minLat = r.position_lat;
      if (r.position_lat > maxLat) maxLat = r.position_lat;
      if (r.position_long < minLon) minLon = r.position_long;
      if (r.position_long > maxLon) maxLon = r.position_long;
    }
    const alt = r.enhanced_altitude ?? r.altitude;
    if (typeof alt === "number") point.alt = Math.round(alt * 10) / 10;
    if (typeof r.heart_rate === "number") point.hr = r.heart_rate;
    const speed = r.enhanced_speed ?? r.speed;
    if (typeof speed === "number") point.v = Math.round(speed * 100) / 100;
    if (typeof r.power === "number") point.p = r.power;
    if (typeof r.cadence === "number") point.c = r.cadence;
    if (typeof r.distance === "number") point.d = Math.round(r.distance);
    track.push(point);
  }

  const sourcePoints = track.length;
  const decimated = decimate(track, maxTrackPoints);

  // Fall-back-beräkning av höjdökning från track-altituden om session-summaryn
  // saknar den. Apple Watch skriver ibland inte `total_ascent` trots att altitude-
  // records finns. Summera bara positiva steg (ignorera tillfälligt brus genom
  // att kräva ≥0.5 m förändring per steg). Returnerar null om helt utan
  // altitudedata så UI kan visa "–" istället för "0 m".
  const hasAltitudeData = track.some((p) => typeof p.alt === "number");
  const computedAscent = hasAltitudeData ? (() => {
    // Sampla var 5:e sekund så att 1Hz-brus inte blåser upp summan, och jämför
    // glidande medelvärde över 3 samplar för att reducera oscillation.
    const alts: number[] = [];
    for (let i = 0; i < track.length; i += 5) {
      const a = track[i]?.alt;
      if (typeof a === "number") alts.push(a);
    }
    if (alts.length < 3) return 0;
    const smoothed: number[] = alts.map((_, i) => {
      const win = alts.slice(Math.max(0, i - 1), Math.min(alts.length, i + 2));
      return win.reduce((s, v) => s + v, 0) / win.length;
    });
    let sum = 0;
    for (let i = 1; i < smoothed.length; i++) {
      const d = smoothed[i] - smoothed[i - 1];
      if (d > 0) sum += d;
    }
    return sum;
  })() : null;

  // ── Laps ──
  const laps: FitLap[] = rawLaps.map((l, i) => {
    const s = toEpochSec(l.start_time) ?? startSec;
    const dur = l.total_timer_time ?? l.total_elapsed_time ?? 0;
    const dist = l.total_distance ?? 0;
    return {
      index: i + 1,
      startSec: Math.round(s - startSec),
      durationSec: Math.round(dur),
      distanceM: Math.round(dist),
      avgHR: typeof l.avg_heart_rate === "number" ? l.avg_heart_rate : null,
      maxHR: typeof l.max_heart_rate === "number" ? l.max_heart_rate : null,
      avgPace: paceString(dist, dur),
    };
  });

  // ── Summary ──
  const summary: FitSummary = {
    startTime:
      typeof session?.start_time === "string"
        ? session.start_time
        : session?.start_time instanceof Date
          ? session.start_time.toISOString()
          : null,
    sport: session?.sport ?? null,
    totalTimeSec: Math.round(session?.total_timer_time ?? session?.total_elapsed_time ?? 0),
    movingTimeSec: Math.round(session?.total_timer_time ?? 0),
    distanceM: Math.round(session?.total_distance ?? 0),
    // Apple Watch skriver ibland 0 även när altitude-records visar tydlig
    // höjdskillnad — använd den beräknade datan i det fallet. Om altitude-
    // records saknas helt → null så UI visar "–".
    elevationGainM: computedAscent === null
      ? null
      : Math.round(
          (typeof session?.total_ascent === "number" && session.total_ascent > 0)
            ? session.total_ascent
            : computedAscent,
        ),
    avgHR: typeof session?.avg_heart_rate === "number" ? session.avg_heart_rate : null,
    maxHR: typeof session?.max_heart_rate === "number" ? session.max_heart_rate : null,
    avgPower: typeof session?.avg_power === "number" ? session.avg_power : null,
    maxPower: typeof session?.max_power === "number" ? session.max_power : null,
    avgSpeedMs: typeof session?.avg_speed === "number" ? session.avg_speed : null,
    maxSpeedMs: typeof session?.max_speed === "number" ? session.max_speed : null,
    // FIT lagrar löpar-kadens som strides/min (en fot). Apple Fitness / Workouts.xlsx
    // visar SPM (båda fötter) = ×2. Dubbla bara när det ser ut som halva det förväntade.
    avgCadence: typeof session?.avg_cadence === "number"
      ? (session.sport === "running" && session.avg_cadence < 120 ? session.avg_cadence * 2 : session.avg_cadence)
      : null,
    calories: typeof session?.total_calories === "number" ? session.total_calories : null,
    bounds: hasGPS ? [minLat, minLon, maxLat, maxLon] : null,
    sourcePoints,
  };

  return { summary, track: decimated, laps };
}

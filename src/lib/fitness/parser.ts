// ─── XLSX-parsning — Workouts_vN.xlsx & Health_Metrics_vN.xlsx ───────────────

import * as XLSX from "xlsx";
import type { Workout } from "./types";

/** Excel-serienummer → ISO-datum YYYY-MM-DD. */
export function excelSerialToDate(serial: number): string {
  // Excel epoch är 1899-12-30 (för att kompensera för 1900-bug)
  const ms = (serial - 25569) * 86400 * 1000;
  const d = new Date(ms);
  return d.toISOString().slice(0, 10);
}

/** Excel-tid (fraktion av dygn) → HH:MM. */
function excelSerialToTime(serial: number): string {
  const totalMin = Math.round((serial % 1) * 1440);
  const h = Math.floor(totalMin / 60).toString().padStart(2, "0");
  const m = (totalMin % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  return String(v);
}

/**
 * Parsea alla pass från Workouts-fliken (innehåller alla sporttyper).
 * Duplicerade rader (samma datum/tid/typ) filtreras bort. Nyast först.
 */
export function parseAllWorkouts(buffer: Buffer): Workout[] {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheet = wb.Sheets["Workouts"] ?? wb.Sheets["Running"];
  if (!sheet) return [];

  // `header: 1` → array of arrays; första raden = rubriker
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    blankrows: false,
  });
  if (rows.length < 2) return [];

  // HealthFit lägger ibland till padding ("  Date  ") och använder både "Min HR" och
  // "Min. Heart Rate". Matcha tolerant: trim + lowercase + ta bort icke-alfanumeriska.
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const headers = rows[0].map((h) => String(h ?? "").trim());
  const nHeaders = headers.map(normalize);
  const idx = (...names: string[]) => {
    for (const n of names) {
      const i = nHeaders.indexOf(normalize(n));
      if (i !== -1) return i;
    }
    return -1;
  };

  const I = {
    date: idx("Date"),
    time: idx("Time"),
    type: idx("Type"),
    totalTime: idx("Total Time"),
    movingTime: idx("Moving Time"),
    elapsedTime: idx("Elapsed Time"),
    distance: idx("Distance"),
    elevation: idx("Elevation Gain"),
    calories: idx("Active Calories"),
    totalCalories: idx("Total Calories", "Calories"),
    avgCadence: idx("Avg. Cadence", "Avg Cadence", "Average Cadence"),
    minHR: idx("Min. Heart Rate", "Min HR"),
    avgHR: idx("Avg. Heart Rate", "Avg HR"),
    maxHR: idx("Max. Heart Rate", "Max HR"),
    trimp: idx("TRIMP"),
    rpe: idx("RPE"),
    mets: idx("METs"),
    hrZoneType: idx("HR Zone Type"),
    hrz0: idx("HRZ0"),
    hrz1: idx("HRZ1"),
    hrz2: idx("HRZ2"),
    hrz3: idx("HRZ3"),
    hrz4: idx("HRZ4"),
    hrz5: idx("HRZ5"),
    source: idx("Source"),
    avgSpeed: idx("Avg. Speed", "Avg Speed"),
    maxSpeed: idx("Max. Speed", "Max Speed"),
    avgPower: idx("Avg. Power", "Avg Power"),
    maxPower: idx("Max. Power", "Max Power"),
    gct: idx("Ground Contact Time"),
    vo: idx("Vertical Oscillation"),
    stride: idx("Stride Length"),
    steps: idx("Steps"),
  };

  // HealthFit-enheter: tider lagras som Excel-dygnsfraktioner (0–1), distans i km,
  // hastighet i km/h. Konvertera till SI/sekunder/meter.
  const toSec = (v: unknown): number => {
    const n = num(v);
    return n === null ? 0 : n * 86400;
  };
  const toMeters = (v: unknown): number => {
    const n = num(v);
    return n === null ? 0 : n * 1000;
  };
  const kmhToMs = (v: unknown): number | null => {
    const n = num(v);
    return n === null ? null : n / 3.6;
  };

  const out: Workout[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const dateSerial = num(row[I.date]);
    if (dateSerial === null) continue;
    const date = excelSerialToDate(dateSerial);
    const timeSerial = num(row[I.time]);

    const totalTimeSec = toSec(row[I.totalTime]);
    // HRZn lagras som Excel-dygnsfraktion (samma enhet som Total_Time), INTE som
    // direkt fraktion 0–1. Konvertera till fraktion-av-pass: hrz × 86400 / totalSec.
    // Ex: hrz3=0.006 → 518s → 27 % av en 32:28-löpning.
    const toZoneFrac = (v: unknown): number | null => {
      const n = num(v);
      if (n === null || totalTimeSec <= 0) return n;
      return (n * 86400) / totalTimeSec;
    };

    out.push({
      date,
      time: timeSerial !== null ? excelSerialToTime(timeSerial) : undefined,
      type: (() => {
        const raw = str(row[I.type]) ?? "Running";
        if (/tennis/i.test(raw)) return "Padel";
        return raw;
      })(),
      totalTimeSec,
      movingTimeSec: toSec(row[I.movingTime]),
      elapsedTimeSec: toSec(row[I.elapsedTime]),
      distanceM: toMeters(row[I.distance]),
      elevationGainM: num(row[I.elevation]),
      activeCalories: num(row[I.calories]) ?? 0,
      totalCalories: num(row[I.totalCalories]),
      avgCadence: num(row[I.avgCadence]),
      minHR: num(row[I.minHR]),
      avgHR: num(row[I.avgHR]),
      maxHR: num(row[I.maxHR]),
      trimp: num(row[I.trimp]),
      rpe: num(row[I.rpe]),
      mets: num(row[I.mets]),
      hrZoneType: str(row[I.hrZoneType]),
      hrz0: toZoneFrac(row[I.hrz0]),
      hrz1: toZoneFrac(row[I.hrz1]),
      hrz2: toZoneFrac(row[I.hrz2]),
      hrz3: toZoneFrac(row[I.hrz3]),
      hrz4: toZoneFrac(row[I.hrz4]),
      hrz5: toZoneFrac(row[I.hrz5]),
      source: str(row[I.source]),
      avgSpeed: kmhToMs(row[I.avgSpeed]),
      maxSpeed: kmhToMs(row[I.maxSpeed]),
      avgPower: num(row[I.avgPower]),
      maxPower: num(row[I.maxPower]),
      groundContactTime: num(row[I.gct]),
      verticalOscillation: num(row[I.vo]),
      strideLength: num(row[I.stride]),
      steps: num(row[I.steps]),
    });
  }

  // Dedupera (samma datum + tid + typ = samma pass)
  const seen = new Set<string>();
  const deduped = out.filter((w) => {
    const k = `${w.date}|${w.time ?? ""}|${w.type}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // Nyast först — fallback på tid om samma dag
  deduped.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return (b.time ?? "").localeCompare(a.time ?? "");
  });
  return deduped;
}

/** Bakåtkompatibilitet: gamla namnet används från route.ts. */
export const parseRunningWorkouts = parseAllWorkouts;

/** Snittempo (min/km) som "MM:SS" från distans (m) och tid (s). */
export function paceString(distanceM: number, timeSec: number): string {
  if (distanceM <= 0 || timeSec <= 0) return "–";
  const secPerKm = timeSec / (distanceM / 1000);
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ─── Health Metrics-parsning ────────────────────────────────────────────────

export interface HealthMetrics {
  /** Senast loggade vikt (kg) */
  weightKg: number | null;
  /** 7-dagars snitt av vilopuls (bpm) — rekommenderad metrik enligt Apple/Garmin */
  restingHR: number | null;
  /** Senaste datum som ingår i snittet (ISO) */
  restingHRDate: string | null;
  /** Senast loggad VO₂ max (ml/kg/min) */
  vo2Max: number | null;
  /** Datum för senaste VO₂ max (ISO) */
  vo2MaxDate: string | null;
  /** Senast loggad HRV (ms) */
  hrvMs: number | null;
  /** 7-dagars snitt HRV (ms) */
  hrv7dAvg: number | null;
}

/**
 * Parsea Health Metrics_vN.xlsx.
 * - Weight-fliken: ` Date `, ` Weight ` (kg)
 * - Daily Metrics: ` Date `, ` Active Energy `, ` Resting Energy `, ` Resting ` (bpm) …
 * - Sleep: ` Avg. HRV ` per natt (ms)
 * Rader med senare datum står först.
 */
export function parseHealthMetrics(buffer: Buffer): HealthMetrics {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const out: HealthMetrics = {
    weightKg: null,
    restingHR: null,
    restingHRDate: null,
    vo2Max: null,
    vo2MaxDate: null,
    hrvMs: null,
    hrv7dAvg: null,
  };

  const rowsOf = (name: string): unknown[][] => {
    const s = wb.Sheets[name];
    if (!s) return [];
    return XLSX.utils.sheet_to_json(s, { header: 1, defval: null, blankrows: false });
  };

  // ── Weight ──
  const weightRows = rowsOf("Weight");
  if (weightRows.length > 1) {
    // Hitta senaste (högst datum-serial i kolumn 0) rad med värde i kolumn 1
    let bestDate = -Infinity;
    for (let i = 1; i < weightRows.length; i++) {
      const r = weightRows[i];
      const d = typeof r[0] === "number" ? r[0] : parseFloat(String(r[0]));
      const w = typeof r[1] === "number" ? r[1] : parseFloat(String(r[1]));
      if (Number.isFinite(d) && Number.isFinite(w) && d > bestDate) {
        bestDate = d;
        out.weightKg = w;
      }
    }
  }

  // ── Daily Metrics → Resting HR + VO₂ max ──
  const dailyRows = rowsOf("Daily Metrics");
  if (dailyRows.length > 1) {
    // Kolumnordning: Date, Active Energy, Resting Energy, Resting (HR), HRV, Steps, VO₂ max, …
    const headers = dailyRows[0].map((h) => String(h ?? "").trim().toLowerCase());
    const dateIdx = 0;
    const restingHrIdx = headers.findIndex((h) => h === "resting" || h === "resting hr");
    const vo2Idx = headers.findIndex((h) => h.includes("vo") && h.includes("max"));

    // Samla vilopuls-värden för 7-dagars rolling snitt, och senaste VO₂ max.
    const rhrVals: Array<{ date: number; hr: number }> = [];
    let bestVo2Date = -Infinity;

    for (let i = 1; i < dailyRows.length; i++) {
      const r = dailyRows[i];
      const d = typeof r[dateIdx] === "number" ? r[dateIdx] : NaN;
      if (!Number.isFinite(d)) continue;

      if (restingHrIdx !== -1) {
        const hr = typeof r[restingHrIdx] === "number" ? r[restingHrIdx] : NaN;
        if (Number.isFinite(hr) && hr > 0) {
          rhrVals.push({ date: d as number, hr: hr as number });
        }
      }

      if (vo2Idx !== -1) {
        const vo2 = typeof r[vo2Idx] === "number" ? r[vo2Idx] : NaN;
        if (Number.isFinite(vo2) && vo2 > 0 && (d as number) > bestVo2Date) {
          bestVo2Date = d as number;
          out.vo2Max = Math.round((vo2 as number) * 10) / 10;
          out.vo2MaxDate = excelSerialToDate(d as number);
        }
      }
    }

    // 7-dagars snitt baserat på de 7 senaste loggade dagarna (inte kalenderdagar).
    if (rhrVals.length > 0) {
      rhrVals.sort((a, b) => b.date - a.date);
      const window = rhrVals.slice(0, Math.min(7, rhrVals.length));
      const sum = window.reduce((s, v) => s + v.hr, 0);
      out.restingHR = Math.round(sum / window.length);
      out.restingHRDate = excelSerialToDate(window[0].date);
    }
  }

  // ── Sleep → HRV (senaste + 7d-snitt) ──
  const sleepRows = rowsOf("Sleep");
  if (sleepRows.length > 1) {
    const headers = sleepRows[0].map((h) => String(h ?? "").trim().toLowerCase());
    const dateIdx = headers.findIndex((h) => h === "date");
    const avgHrvIdx = headers.findIndex((h) => h === "avg. hrv" || h === "avg hrv");
    if (dateIdx !== -1 && avgHrvIdx !== -1) {
      const vals: Array<{ date: number; hrv: number }> = [];
      for (let i = 1; i < sleepRows.length; i++) {
        const r = sleepRows[i];
        const d = typeof r[dateIdx] === "number" ? r[dateIdx] : NaN;
        const hrv = typeof r[avgHrvIdx] === "number" ? r[avgHrvIdx] : NaN;
        if (Number.isFinite(d) && Number.isFinite(hrv) && hrv > 0) {
          vals.push({ date: d, hrv });
        }
      }
      vals.sort((a, b) => b.date - a.date);
      if (vals.length > 0) out.hrvMs = Math.round(vals[0].hrv);
      if (vals.length > 0) {
        const n = Math.min(7, vals.length);
        const sum = vals.slice(0, n).reduce((s, v) => s + v.hrv, 0);
        out.hrv7dAvg = Math.round(sum / n);
      }
    }
  }

  return out;
}

/**
 * Uppskatta observerad maxpuls från pass-loggen.
 * Tar högsta `maxHR` (och sekundärt `avgHR` om maxHR saknas) över senaste `days`.
 */
export function observedMaxHR(workouts: Workout[], days = 180): number | null {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  let max = 0;
  for (const w of workouts) {
    if (w.date < cutoffIso) continue;
    const candidate = w.maxHR ?? w.avgHR ?? 0;
    if (candidate > max) max = candidate;
  }
  return max > 0 ? Math.round(max) : null;
}

// ─── Health Metrics — tidsserier för trend-grafer ───────────────────────────

export interface HealthSeriesPoint {
  date: string;   // ISO YYYY-MM-DD
  value: number;
}

export interface SleepSeriesPoint {
  date: string;
  /** Sömn i timmar */
  asleepH: number | null;
  /** Genomsnittlig HRV för natten (ms) */
  hrvMs: number | null;
}

export interface HealthSeries {
  restingHR: HealthSeriesPoint[];    // Daily Metrics · Resting HR
  vo2Max: HealthSeriesPoint[];       // Daily Metrics · VO₂ max
  hrv: HealthSeriesPoint[];          // Sleep · Avg. HRV
  sleep: SleepSeriesPoint[];         // Sleep · Asleep + Avg. HRV
}

/**
 * Parsea tidsserier ur Health_Metrics för Resting HR, VO₂ max, HRV + sömn.
 * Datumsorterat kronologiskt (äldst först) — bra för linjediagram.
 */
export function parseHealthSeries(buffer: Buffer, days = 120): HealthSeries {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const cutoffMs = Date.now() - days * 86400 * 1000;

  const rowsOf = (name: string): unknown[][] => {
    const s = wb.Sheets[name];
    if (!s) return [];
    return XLSX.utils.sheet_to_json(s, { header: 1, defval: null, blankrows: false });
  };

  const restingHR: HealthSeriesPoint[] = [];
  const vo2Max: HealthSeriesPoint[] = [];
  const hrv: HealthSeriesPoint[] = [];
  const sleep: SleepSeriesPoint[] = [];

  // ── Daily Metrics: Resting HR + VO₂ max ──
  const daily = rowsOf("Daily Metrics");
  if (daily.length > 1) {
    const headers = daily[0].map((h) => String(h ?? "").trim().toLowerCase());
    const dateIdx = 0;
    const rhrIdx = headers.findIndex((h) => h === "resting" || h === "resting hr");
    const vo2Idx = headers.findIndex((h) => h.includes("vo") && h.includes("max"));
    for (let i = 1; i < daily.length; i++) {
      const r = daily[i];
      const d = typeof r[dateIdx] === "number" ? r[dateIdx] : NaN;
      if (!Number.isFinite(d)) continue;
      const iso = excelSerialToDate(d);
      if (new Date(iso).getTime() < cutoffMs) continue;
      if (rhrIdx !== -1) {
        const v = typeof r[rhrIdx] === "number" ? r[rhrIdx] : NaN;
        if (Number.isFinite(v) && v > 0) restingHR.push({ date: iso, value: v });
      }
      if (vo2Idx !== -1) {
        const v = typeof r[vo2Idx] === "number" ? r[vo2Idx] : NaN;
        if (Number.isFinite(v) && v > 0) vo2Max.push({ date: iso, value: Math.round(v * 10) / 10 });
      }
    }
  }

  // ── Sleep: HRV + Asleep-tid ──
  const sleepRows = rowsOf("Sleep");
  if (sleepRows.length > 1) {
    const headers = sleepRows[0].map((h) => String(h ?? "").trim().toLowerCase());
    const dateIdx = headers.findIndex((h) => h === "date");
    const avgHrvIdx = headers.findIndex((h) => h === "avg. hrv" || h === "avg hrv");
    const asleepIdx = headers.findIndex((h) => h === "asleep" || h === "asleep time");
    if (dateIdx !== -1) {
      for (let i = 1; i < sleepRows.length; i++) {
        const r = sleepRows[i];
        const d = typeof r[dateIdx] === "number" ? r[dateIdx] : NaN;
        if (!Number.isFinite(d)) continue;
        const iso = excelSerialToDate(d);
        if (new Date(iso).getTime() < cutoffMs) continue;

        let hrvVal: number | null = null;
        if (avgHrvIdx !== -1) {
          const v = typeof r[avgHrvIdx] === "number" ? r[avgHrvIdx] : NaN;
          if (Number.isFinite(v) && v > 0) {
            hrvVal = Math.round(v);
            hrv.push({ date: iso, value: hrvVal });
          }
        }
        // Asleep lagras som Excel-dygnsfraktion → × 24 för timmar
        let asleepH: number | null = null;
        if (asleepIdx !== -1) {
          const v = typeof r[asleepIdx] === "number" ? r[asleepIdx] : NaN;
          if (Number.isFinite(v) && v > 0) asleepH = v * 24;
        }
        sleep.push({ date: iso, asleepH, hrvMs: hrvVal });
      }
    }
  }

  // Kronologisk ordning (äldst först)
  const byDate = (a: { date: string }, b: { date: string }) => a.date.localeCompare(b.date);
  restingHR.sort(byDate);
  vo2Max.sort(byDate);
  hrv.sort(byDate);
  sleep.sort(byDate);

  return { restingHR, vo2Max, hrv, sleep };
}

/** Sekunder → HH:MM:SS eller MM:SS för korta pass. */
export function durationString(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return "–";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

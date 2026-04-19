// ─── Prompt-context för AI-coachen ───────────────────────────────────────────
// Server-side: läser xlsx direkt via drive.ts (inte via UI-endpoints), bygger
// ett komprimerat prompt-paket som innehåller profilen, träningshistoriken och
// aktuell form. Återanvänds av analyse- och (senare) coach-endpoints.

import { getLatestWorkoutsXlsx, getLatestHealthMetricsXlsx } from "./drive";
import { parseAllWorkouts, parseHealthMetrics, paceString, durationString } from "./parser";
import { getProfile as getNotionProfile, getPlannedWorkouts } from "./notion";
import { DEFAULT_PROFILE } from "./profile-defaults";
import type { FitnessProfile, Workout, PlannedWorkout } from "./types";

// PMC-konstanter — samma som /api/fitness/load
const ALPHA_ATL = 2 / (7 + 1);
const ALPHA_CTL = 2 / (42 + 1);
const WARMUP_DAYS = 90;

export interface LoadSnapshot {
  ctl: number;
  atl: number;
  tsb: number;
  tlr: number;
  /** Andel av senaste 42d:s TRIMP per intensitetsfokus */
  focus: { anaerobic: number; highAerobic: number; lowAerobic: number };
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Svensk veckodag-förkortning ("mån", "tis", ...) från ISO-datum. */
function weekdaySv(iso: string): string {
  // Undvik tidszons-drift — tolka som UTC-datum
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return "";
  const days = ["sön", "mån", "tis", "ons", "tor", "fre", "lör"];
  return days[d.getUTCDay()];
}

/** "2026-04-17 fre" — ISO + veckodag. Claude hallucinerar annars veckodagar. */
function isoWithDow(iso: string): string {
  const dow = weekdaySv(iso);
  return dow ? `${iso} ${dow}` : iso;
}

function sumTrimpByDay(workouts: Workout[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const w of workouts) {
    if (typeof w.trimp !== "number" || w.trimp <= 0) continue;
    m.set(w.date, (m.get(w.date) ?? 0) + w.trimp);
  }
  return m;
}

function computeLoad(workouts: Workout[], today: Date): LoadSnapshot {
  const byDay = sumTrimpByDay(workouts);
  let ctl = 0, atl = 0;
  const end = new Date(today);
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - WARMUP_DAYS);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const trimp = byDay.get(isoDate(d)) ?? 0;
    ctl = ctl + ALPHA_CTL * (trimp - ctl);
    atl = atl + ALPHA_ATL * (trimp - atl);
  }
  const cutoff = new Date(end);
  cutoff.setDate(cutoff.getDate() - 42);
  let an = 0, hi = 0, lo = 0;
  for (const w of workouts) {
    if (new Date(w.date) < cutoff || typeof w.trimp !== "number") continue;
    an += w.trimp * (w.hrz5 ?? 0);
    hi += w.trimp * ((w.hrz3 ?? 0) + (w.hrz4 ?? 0));
    lo += w.trimp * ((w.hrz1 ?? 0) + (w.hrz2 ?? 0));
  }
  const total = an + hi + lo;
  return {
    ctl: Math.round(ctl),
    atl: Math.round(atl),
    tsb: Math.round(ctl - atl),
    tlr: ctl > 0 ? Math.round((atl / ctl) * 100) / 100 : 0,
    focus: total > 0
      ? { anaerobic: an / total, highAerobic: hi / total, lowAerobic: lo / total }
      : { anaerobic: 0, highAerobic: 0, lowAerobic: 0 },
  };
}

// ─── Formattering ────────────────────────────────────────────────────────────

function profileText(p: FitnessProfile): string {
  const zones = (["Z1", "Z2", "Z3", "Z4", "Z5"] as const)
    .map((z) => `${z} ${p.zones[z][0]}–${p.zones[z][1]} bpm`)
    .join(", ");
  const age = p.birthYear ? new Date().getFullYear() - p.birthYear : null;
  const parts = [
    p.name ? `${p.name}` : null,
    age ? `${age} år` : null,
    p.heightCm ? `${p.heightCm} cm` : null,
    p.weightKg ? `${p.weightKg.toFixed(1)} kg` : null,
  ].filter(Boolean);
  const head = parts.length > 0 ? parts.join(", ") + ". " : "";
  const goals = p.goals.length > 0
    ? p.goals.map((g) => `${g.label}${g.deadline ? ` (${g.deadline})` : ""}`).join("; ")
    : "inga specifika mål";
  return `${head}Maxpuls ${p.maxHR} bpm, vilopuls ${p.restingHR} bpm. Pulszoner: ${zones}. Mål: ${goals}.`;
}

function workoutLine(w: Workout): string {
  const parts: string[] = [`${isoWithDow(w.date)}${w.time ? ` ${w.time}` : ""}: ${w.type}`];
  if (w.distanceM > 0) parts.push(`${(w.distanceM / 1000).toFixed(2)} km`);
  if (w.totalTimeSec > 0) parts.push(durationString(w.totalTimeSec));
  if (w.distanceM > 0 && w.totalTimeSec > 0) parts.push(`${paceString(w.distanceM, w.totalTimeSec)}/km`);
  if (w.avgHR) parts.push(`snitt ${Math.round(w.avgHR)} bpm`);
  if (w.maxHR) parts.push(`max ${Math.round(w.maxHR)} bpm`);
  if (w.trimp != null) parts.push(`TRIMP ${Math.round(w.trimp)}`);
  if (w.rpe != null) parts.push(`RPE ${w.rpe}`);
  if (w.elevationGainM != null && w.elevationGainM > 0) parts.push(`↑${Math.round(w.elevationGainM)} m`);
  if (w.avgPower != null) parts.push(`${Math.round(w.avgPower)} W`);
  // Zonfördelning som kompakt Z3 38% / Z4 42%
  const zones: string[] = [];
  for (const [k, v] of [
    ["Z1", w.hrz1], ["Z2", w.hrz2], ["Z3", w.hrz3], ["Z4", w.hrz4], ["Z5", w.hrz5],
  ] as Array<[string, number | null]>) {
    if (v != null && v > 0.1) zones.push(`${k} ${Math.round(v * 100)}%`);
  }
  if (zones.length > 0) parts.push(zones.join(" "));
  return `- ${parts.join(", ")}`;
}

interface WeeklyAgg {
  weekStart: string;
  count: number;
  runCount: number;
  distanceKm: number;
  durationSec: number;
  trimp: number;
  avgHR: number | null;
  types: Record<string, number>;
}

/** Gruppera pass per ISO-vecka (måndagsstart). */
function weeklyAggregates(workouts: Workout[], weeks: number): WeeklyAgg[] {
  // Gruppera per ISO-vecka (måndag som start för svensk standard)
  const byWeek = new Map<string, WeeklyAgg>();
  for (const w of workouts) {
    const d = new Date(w.date);
    if (Number.isNaN(d.getTime())) continue;
    const day = d.getUTCDay(); // 0=sön
    const monOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() + monOffset);
    const key = isoDate(monday);
    let agg = byWeek.get(key);
    if (!agg) {
      agg = { weekStart: key, count: 0, runCount: 0, distanceKm: 0, durationSec: 0, trimp: 0, avgHR: null, types: {} };
      byWeek.set(key, agg);
    }
    agg.count += 1;
    if (/run/i.test(w.type)) agg.runCount += 1;
    agg.distanceKm += w.distanceM / 1000;
    agg.durationSec += w.totalTimeSec;
    if (typeof w.trimp === "number") agg.trimp += w.trimp;
    agg.types[w.type] = (agg.types[w.type] ?? 0) + 1;
  }
  // Snitt-HR per vecka viktat på tid
  const byWeekHr = new Map<string, { sum: number; sec: number }>();
  for (const w of workouts) {
    if (!w.avgHR || w.totalTimeSec <= 0) continue;
    const d = new Date(w.date);
    const day = d.getUTCDay();
    const monOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() + monOffset);
    const key = isoDate(monday);
    const cur = byWeekHr.get(key) ?? { sum: 0, sec: 0 };
    cur.sum += w.avgHR * w.totalTimeSec;
    cur.sec += w.totalTimeSec;
    byWeekHr.set(key, cur);
  }
  for (const [k, v] of byWeekHr.entries()) {
    const agg = byWeek.get(k);
    if (agg && v.sec > 0) agg.avgHR = Math.round(v.sum / v.sec);
  }
  return Array.from(byWeek.values())
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart))
    .slice(0, weeks);
}

function weeklyLine(w: WeeklyAgg): string {
  const typeSummary = Object.entries(w.types)
    .sort((a, b) => b[1] - a[1])
    .map(([t, n]) => `${n}×${t.replace(/\s+/g, " ")}`)
    .join(", ");
  const parts = [
    `v. som börjar ${w.weekStart} (mån)`,
    `${w.count} pass`,
  ];
  if (w.distanceKm > 0) parts.push(`${w.distanceKm.toFixed(1)} km`);
  if (w.durationSec > 0) parts.push(durationString(w.durationSec));
  if (w.trimp > 0) parts.push(`TRIMP ${Math.round(w.trimp)}`);
  if (w.avgHR) parts.push(`snitt ${w.avgHR} bpm`);
  parts.push(`(${typeSummary})`);
  return `- ${parts.join(", ")}`;
}

function plannedLine(p: PlannedWorkout): string {
  const bits = [`${isoWithDow(p.datum)}: ${p.passnamn || p.typ || "okänt"}`];
  if (p.typ) bits.push(p.typ);
  if (p.tid) bits.push(p.tid);
  if (p.tempo) bits.push(`tempo ${p.tempo}`);
  if (p.pulsintervall) bits.push(`puls ${p.pulsintervall}`);
  if (p.syfte) bits.push(p.syfte);
  return `- ${bits.join(" · ")}`;
}

// ─── Publika helpers ─────────────────────────────────────────────────────────

export interface BuildContextOptions {
  /** Hur många senaste pass listas i detalj (default 20) */
  recentCount?: number;
  /** Hur många veckor av aggregat (default 20) */
  weeklyWeeks?: number;
  /** Skippa planerade pass (default false) */
  skipPlans?: boolean;
  /** Om satt — exkludera det här passet från "senaste pass"-listan
      (för att inte dubbel-räkna passet som analyseras). */
  excludeKey?: string;
  /**
   * ISO-datum (YYYY-MM-DD) som kontexten ska anchoras på. När vi analyserar
   * ett äldre pass ska: pass efter detta datum exkluderas, PMC räknas fram
   * till detta datum, och veckoaggregat utgå från det här datumet. Default:
   * dagens datum (coachen analyserar "senaste pass").
   */
  anchorDate?: string;
}

export interface FitnessContextBundle {
  /** Fullständig prompt-text till LLM. Svenska. */
  text: string;
  profile: FitnessProfile;
  workouts: Workout[];
  load: LoadSnapshot;
  /** Drive-filen passen lästes ur */
  sourceFile: string | null;
}

/**
 * Bygg kontext-paketet. Läser xlsx direkt — går aldrig via UI-endpoints för
 * att slippa limit-paginering.
 */
export async function buildContext(opts: BuildContextOptions = {}): Promise<FitnessContextBundle> {
  const {
    recentCount = 20,
    weeklyWeeks = 20,
    skipPlans = false,
    excludeKey,
    anchorDate,
  } = opts;

  const [workoutsFile, healthFile] = await Promise.all([
    getLatestWorkoutsXlsx(),
    getLatestHealthMetricsXlsx().catch(() => null),
  ]);

  const workouts = workoutsFile ? parseAllWorkouts(workoutsFile.buffer) : [];
  const health = healthFile ? parseHealthMetrics(healthFile.buffer) : null;

  const profile = (await getNotionProfile(DEFAULT_PROFILE).catch(() => null)) ?? DEFAULT_PROFILE;
  const plans: PlannedWorkout[] = skipPlans
    ? []
    : await getPlannedWorkouts().catch(() => []);

  // Anchora allt på passets datum när det är satt, annars idag. PMC räknas
  // fram till anchor-datumet (inte förbi — coachen ska inte "veta" om
  // framtida pass när den tolkar ett äldre pass).
  const anchor = anchorDate ? new Date(`${anchorDate}T12:00:00Z`) : new Date();
  const anchorIso = isoDate(anchor);
  const isHistorical = !!anchorDate && anchorIso < isoDate(new Date());

  const keyOf = (w: Workout) => `${w.date}|${(w.time ?? "").replace(":", "")}|${w.type}`;
  // Bara pass på eller före anchor-datumet räknas med i PMC och historik.
  // (Om det är ett pass från idag räknar vi såklart passets egna TRIMP.)
  const workoutsUpToAnchor = workouts.filter((w) => w.date <= anchorIso);

  const load = computeLoad(workoutsUpToAnchor, anchor);

  const recent = workoutsUpToAnchor
    .filter((w) => !excludeKey || keyOf(w) !== excludeKey)
    .slice(0, recentCount);

  const weekly = weeklyAggregates(workoutsUpToAnchor, weeklyWeeks);

  // Planerade pass: framåt från anchor-datumet, inte från idag.
  const upcoming = plans
    .filter((p) => p.datum >= anchorIso && p.status !== "Gjord" && p.status !== "Slutförd")
    .slice(0, 5);

  const lines: string[] = [];
  if (isHistorical) {
    lines.push(`ANALYS AV ÄLDRE PASS: passet nedan är från ${isoWithDow(anchorIso)}. All kontext (form, senaste pass, veckoaggregat, planerade pass) är tagen som den såg ut runt det datumet — inte idag. Prata om passet i dåtid, som något som redan hände.`);
    lines.push("");
  } else {
    lines.push(`DAGENS DATUM: ${isoWithDow(anchorIso)}. Alla pass nedan anges med ISO-datum + svensk veckodagsförkortning (mån/tis/ons/tor/fre/lör/sön) — använd veckodagen exakt som den står, räkna aldrig själv ut vilken dag ett datum föll på.`);
    lines.push("");
  }
  lines.push("LÖPARPROFIL:");
  lines.push(profileText(profile));
  lines.push("");

  lines.push(isHistorical ? `FORM VID PASSETS DATUM (${isoWithDow(anchorIso)}, Coggan PMC):` : "AKTUELL FORM (Coggan PMC):");
  lines.push(
    `- CTL ${load.ctl} (kondition, 42d EMA av TRIMP)` +
    `, ATL ${load.atl} (trötthet, 7d EMA)` +
    `, TSB ${load.tsb} (form = CTL − ATL)` +
    `, TLR ${load.tlr.toFixed(2)} (ATL/CTL — ${load.tlr < 0.8 ? "detränar" : load.tlr <= 1.3 ? "bra balans" : load.tlr <= 1.5 ? "tung period" : "skaderisk"}).`,
  );
  if (load.focus.anaerobic + load.focus.highAerobic + load.focus.lowAerobic > 0) {
    lines.push(
      `- Fokus (senaste 42 dagar): ${Math.round(load.focus.lowAerobic * 100)}% lågintensivt, ` +
      `${Math.round(load.focus.highAerobic * 100)}% tröskel/VO₂, ` +
      `${Math.round(load.focus.anaerobic * 100)}% anaerobt.`,
    );
  }
  lines.push("");

  if (health) {
    const bits: string[] = [];
    if (health.weightKg != null) bits.push(`vikt ${health.weightKg.toFixed(1)} kg`);
    if (health.restingHR != null) bits.push(`vilopuls 7d ${health.restingHR} bpm`);
    if (health.vo2Max != null) bits.push(`VO₂ max ${health.vo2Max.toFixed(1)} ml/kg/min`);
    if (health.hrvMs != null) bits.push(`HRV senaste natt ${health.hrvMs} ms`);
    if (health.hrv7dAvg != null) bits.push(`HRV 7d-snitt ${health.hrv7dAvg} ms`);
    if (bits.length > 0) {
      lines.push("HÄLSOVÄRDEN (Apple Watch via HealthFit):");
      lines.push(`- ${bits.join(", ")}.`);
      lines.push("");
    }
  }

  if (weekly.length > 0) {
    lines.push(`VECKOAGGREGAT (senaste ${weekly.length} veckor, nyast först):`);
    for (const w of weekly) lines.push(weeklyLine(w));
    lines.push("");
  }

  if (recent.length > 0) {
    lines.push(
      isHistorical
        ? `PASS FÖRE OCH INKL. ${isoWithDow(anchorIso)} (nyast först — ingen framtida data):`
        : `SENASTE ${recent.length} PASS (nyast först):`,
    );
    for (const w of recent) lines.push(workoutLine(w));
    lines.push("");
  }

  if (upcoming.length > 0) {
    lines.push(
      isHistorical
        ? `PLANERADE PASS SOM LÅG FRAMFÖR PASSET (från ${anchorIso} och framåt, vid analystillfället):`
        : "KOMMANDE PLANERADE PASS:",
    );
    for (const p of upcoming) lines.push(plannedLine(p));
    lines.push("");
  }

  return {
    text: lines.join("\n").trimEnd(),
    profile,
    workouts,
    load,
    sourceFile: workoutsFile?.filename ?? null,
  };
}

// ─── Fitness · Veckosammanfattning ───────────────────────────────────────────
// Varje måndag sammanfattar Claude föregående vecka utifrån genomförda pass,
// hälsovärden och formstatus. Resultatet skrivs som en undersida till
// coach-sidan i Notion (NOTION_FITNESS_COACH_PAGE). Idempotent: finns en
// sammanfattning för veckan redan arkiveras den innan en ny skapas.
//
// Trigger: POST /api/fitness/weekly-summary (se workflows/weekly-summary.yml).

import Anthropic from "@anthropic-ai/sdk";
import { Client } from "@notionhq/client";

import { getLatestHealthMetricsXlsx, getLatestWorkoutsXlsx } from "./drive";
import { parseAllWorkouts, parseHealthSeries, durationString, paceString } from "./parser";
import { getPlannedWorkouts } from "./notion";
import { matchWorkoutsToPlans, workoutKey } from "./match";
import { getCoachPersona } from "./coach-persona";
import type { Workout, PlannedWorkout } from "./types";

const MODEL = "claude-sonnet-4-6";
const COACH_PAGE = process.env.NOTION_FITNESS_COACH_PAGE ?? "";
const TOKEN = process.env.NOTION_TOKEN ?? "";

// PMC-konstanter (samma som context.ts / readiness-route)
const ALPHA_ATL = 2 / (7 + 1);
const ALPHA_CTL = 2 / (42 + 1);
const WARMUP_DAYS = 180;

// ─── Datum-hjälpare ──────────────────────────────────────────────────────────

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** ISO 8601 veckonummer för ett datum (UTC). */
function isoWeekNumber(d: Date): { week: number; year: number } {
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  // Torsdagen i samma ISO-vecka (vecka definieras av torsdagen)
  const dayNr = (target.getUTCDay() + 6) % 7; // 0 = måndag
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const diff = target.getTime() - firstThursday.getTime();
  const week = 1 + Math.round(diff / (7 * 86400000));
  return { week, year: target.getUTCFullYear() };
}

/** Måndag → söndag för föregående svenska vecka (relativt `today`). */
export function previousWeekRange(today: Date = new Date()): WeekRange {
  // Steg tillbaka 7 dagar, hitta måndagen
  const ref = new Date(today);
  ref.setUTCHours(12, 0, 0, 0); // undvik DST-strul
  ref.setUTCDate(ref.getUTCDate() - 7);
  const day = ref.getUTCDay(); // 0=sön, 1=mån
  const monOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(ref);
  monday.setUTCDate(ref.getUTCDate() + monOffset);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const { week, year } = isoWeekNumber(monday);
  return { start: isoDate(monday), end: isoDate(sunday), week, year };
}

/** Tolka "YYYY-Www" (t.ex. 2026-W17) → måndag/söndag-range. */
export function weekFromIsoWeek(isoWeek: string): WeekRange | null {
  const m = /^(\d{4})-W(\d{1,2})$/.exec(isoWeek);
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const week = parseInt(m[2], 10);
  // ISO-vecka 1 innehåller årets första torsdag. Börja med 4 jan och justera bakåt.
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = (jan4.getUTCDay() + 6) % 7; // 0 = måndag
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day);
  const monday = new Date(week1Monday);
  monday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return { start: isoDate(monday), end: isoDate(sunday), week, year };
}

// ─── Aggregat ────────────────────────────────────────────────────────────────

export interface WeekRange {
  start: string;
  end: string;
  week: number;
  year: number;
}

interface WeekAggregate {
  range: WeekRange;
  workouts: Workout[];
  totalTrimp: number;
  totalDistanceKm: number;
  totalDurationSec: number;
  count: number;
  typeCounts: Record<string, number>;
  longestRun: Workout | null;
  highestTrimp: Workout | null;
  zones: { z1: number; z2: number; z3: number; z4: number; z5: number };
}

function sumAggregate(workouts: Workout[], range: WeekRange): WeekAggregate {
  const inRange = workouts.filter((w) => w.date >= range.start && w.date <= range.end);
  const z = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 };
  let totalTrimp = 0;
  let totalDistanceKm = 0;
  let totalDurationSec = 0;
  const typeCounts: Record<string, number> = {};
  let longestRun: Workout | null = null;
  let highestTrimp: Workout | null = null;
  for (const w of inRange) {
    totalTrimp += w.trimp ?? 0;
    totalDistanceKm += w.distanceM / 1000;
    totalDurationSec += w.totalTimeSec;
    typeCounts[w.type] = (typeCounts[w.type] ?? 0) + 1;
    if (/run/i.test(w.type) && w.distanceM > 0) {
      if (!longestRun || w.distanceM > longestRun.distanceM) longestRun = w;
    }
    if ((w.trimp ?? 0) > (highestTrimp?.trimp ?? -1)) highestTrimp = w;
    // Zonfraktioner är andel av totalTid. Viktar på totalTimeSec för tid-i-zon.
    z.z1 += (w.hrz1 ?? 0) * w.totalTimeSec;
    z.z2 += (w.hrz2 ?? 0) * w.totalTimeSec;
    z.z3 += (w.hrz3 ?? 0) * w.totalTimeSec;
    z.z4 += (w.hrz4 ?? 0) * w.totalTimeSec;
    z.z5 += (w.hrz5 ?? 0) * w.totalTimeSec;
  }
  return {
    range,
    workouts: inRange,
    totalTrimp,
    totalDistanceKm,
    totalDurationSec,
    count: inRange.length,
    typeCounts,
    longestRun,
    highestTrimp,
    zones: z,
  };
}

interface PmcAtDate {
  ctl: number;
  atl: number;
  tsb: number;
}

/** PMC-värden vid slutet av `endIso` (dagens pass inräknade). */
function pmcAt(workouts: Workout[], endIso: string): PmcAtDate {
  const byDay = new Map<string, number>();
  for (const w of workouts) {
    if (typeof w.trimp !== "number" || w.trimp <= 0) continue;
    byDay.set(w.date, (byDay.get(w.date) ?? 0) + w.trimp);
  }
  const end = new Date(`${endIso}T12:00:00Z`);
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - WARMUP_DAYS);
  let ctl = 0, atl = 0;
  let ctlPrev = 0, atlPrev = 0;
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const trimp = byDay.get(isoDate(d)) ?? 0;
    ctlPrev = ctl;
    atlPrev = atl;
    ctl = ctl + ALPHA_CTL * (trimp - ctl);
    atl = atl + ALPHA_ATL * (trimp - atl);
  }
  return {
    ctl: Math.round(ctl),
    atl: Math.round(atl),
    tsb: Math.round(ctlPrev - atlPrev),
  };
}

interface WeekHealth {
  hrvAvg: number | null;
  restingHRAvg: number | null;
  sleepAvgH: number | null;
  vo2MaxEnd: number | null;
}

function weekHealth(
  series: ReturnType<typeof parseHealthSeries>,
  range: WeekRange,
): WeekHealth {
  const inRange = <T extends { date: string }>(arr: T[]) =>
    arr.filter((p) => p.date >= range.start && p.date <= range.end);
  const avg = (ns: number[]): number | null =>
    ns.length > 0 ? ns.reduce((s, n) => s + n, 0) / ns.length : null;
  const hrv = inRange(series.hrv).map((p) => p.value);
  const rhr = inRange(series.restingHR).map((p) => p.value);
  const sleep = inRange(series.sleep).map((p) => p.asleepH).filter((h): h is number => h != null);
  const vo2End = series.vo2Max.filter((p) => p.date <= range.end).slice(-1)[0]?.value ?? null;
  const hrvAvg = avg(hrv);
  const rhrAvg = avg(rhr);
  const sleepAvg = avg(sleep);
  return {
    hrvAvg: hrvAvg != null ? Math.round(hrvAvg) : null,
    restingHRAvg: rhrAvg != null ? Math.round(rhrAvg) : null,
    sleepAvgH: sleepAvg != null ? Math.round(sleepAvg * 10) / 10 : null,
    vo2MaxEnd: vo2End,
  };
}

// ─── Prompt-bygge ────────────────────────────────────────────────────────────

function formatWorkoutLine(w: Workout): string {
  const bits: string[] = [`${w.date}${w.time ? ` ${w.time}` : ""} · ${w.type}`];
  if (w.distanceM > 0) bits.push(`${(w.distanceM / 1000).toFixed(2)} km`);
  if (w.totalTimeSec > 0) bits.push(durationString(w.totalTimeSec));
  if (w.distanceM > 0 && w.totalTimeSec > 0) bits.push(`${paceString(w.distanceM, w.totalTimeSec)}/km`);
  if (w.avgHR) bits.push(`snitt ${Math.round(w.avgHR)} bpm`);
  if (w.trimp != null) bits.push(`TRIMP ${Math.round(w.trimp)}`);
  if (w.rpe != null) bits.push(`RPE ${w.rpe}`);
  return `- ${bits.join(", ")}`;
}

function formatZones(sec: { z1: number; z2: number; z3: number; z4: number; z5: number }): string {
  const total = sec.z1 + sec.z2 + sec.z3 + sec.z4 + sec.z5;
  if (total <= 0) return "–";
  const pct = (n: number) => `${Math.round((n / total) * 100)}%`;
  return `Z1 ${pct(sec.z1)} · Z2 ${pct(sec.z2)} · Z3 ${pct(sec.z3)} · Z4 ${pct(sec.z4)} · Z5 ${pct(sec.z5)}`;
}

function buildUserPrompt(args: {
  range: WeekRange;
  current: WeekAggregate;
  previous: WeekAggregate;
  pmcEnd: PmcAtDate;
  health: WeekHealth;
  plans: PlannedWorkout[];
  matched: { completed: number; total: number };
}): string {
  const { range, current, previous, pmcEnd, health, plans, matched } = args;

  const lines: string[] = [];
  lines.push(`VECKOSAMMANFATTNING för vecka ${range.week} ${range.year} (${range.start} – ${range.end}).`);
  lines.push("");

  lines.push("VECKANS STATISTIK:");
  lines.push(`- Antal pass: ${current.count} (föregående vecka: ${previous.count})`);
  if (current.totalDistanceKm > 0) {
    lines.push(`- Total distans: ${current.totalDistanceKm.toFixed(1)} km (föregående: ${previous.totalDistanceKm.toFixed(1)} km)`);
  }
  if (current.totalDurationSec > 0) {
    lines.push(`- Total träningstid: ${durationString(current.totalDurationSec)} (föregående: ${durationString(previous.totalDurationSec)})`);
  }
  lines.push(`- Total TRIMP: ${Math.round(current.totalTrimp)} (föregående: ${Math.round(previous.totalTrimp)})`);
  lines.push(`- Pulszon-fördelning: ${formatZones(current.zones)}`);
  const typeSummary = Object.entries(current.typeCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([t, n]) => `${n}×${t}`)
    .join(", ");
  if (typeSummary) lines.push(`- Pass-typer: ${typeSummary}`);
  if (current.longestRun) {
    lines.push(`- Längsta löppass: ${(current.longestRun.distanceM / 1000).toFixed(2)} km den ${current.longestRun.date}`);
  }
  if (current.highestTrimp && (current.highestTrimp.trimp ?? 0) > 0) {
    const w = current.highestTrimp;
    lines.push(`- Tuffaste pass (TRIMP): ${Math.round(w.trimp ?? 0)} — ${w.type} ${w.date}`);
  }
  lines.push("");

  lines.push("FORM VID VECKANS SLUT (Coggan PMC):");
  lines.push(`- CTL ${pmcEnd.ctl} (kondition), ATL ${pmcEnd.atl} (trötthet), TSB ${pmcEnd.tsb} (form).`);
  lines.push("");

  const hBits: string[] = [];
  if (health.hrvAvg != null) hBits.push(`HRV-snitt ${health.hrvAvg} ms`);
  if (health.restingHRAvg != null) hBits.push(`vilopuls-snitt ${health.restingHRAvg} bpm`);
  if (health.sleepAvgH != null) hBits.push(`sömn-snitt ${health.sleepAvgH.toFixed(1).replace(".", ",")} h/natt`);
  if (health.vo2MaxEnd != null) hBits.push(`VO₂ max ${health.vo2MaxEnd.toFixed(1)} ml/kg/min vid veckans slut`);
  if (hBits.length > 0) {
    lines.push("HÄLSOVÄRDEN UNDER VECKAN:");
    lines.push(`- ${hBits.join(", ")}.`);
    lines.push("");
  }

  lines.push(`PLANERADE VS. GENOMFÖRDA: ${matched.completed} av ${matched.total} planerade pass genomförda.`);
  if (plans.length > 0) {
    lines.push("Planerade pass (vecka):");
    for (const p of plans) {
      lines.push(`- ${p.datum} · ${p.passnamn || p.typ || "okänt"}${p.status ? ` (${p.status})` : ""}`);
    }
  }
  lines.push("");

  if (current.workouts.length > 0) {
    lines.push("ALLA PASS UNDER VECKAN:");
    for (const w of current.workouts) lines.push(formatWorkoutLine(w));
    lines.push("");
  }

  lines.push("FORMAT — svara på svenska med exakt följande markdown-struktur (inget annat utanför):");
  lines.push("");
  lines.push("## Sammanfattning");
  lines.push("(1 stycke, 2–4 meningar, sammanfattar veckan översiktligt och tilltalar adepten med \"du\".)");
  lines.push("");
  lines.push("## Belastning");
  lines.push("(1 stycke om hur hårt veckan var i relation till föregående vecka och PMC.)");
  lines.push("");
  lines.push("## Återhämtning");
  lines.push("(1 stycke om sömn, HRV, vilopuls och hur de hänger ihop med belastningen.)");
  lines.push("");
  lines.push("## Mönster & observationer");
  lines.push("(1 stycke med 1–3 konkreta observationer om det som sticker ut — mönster i zoner, planavvikelser, återhämtning mm.)");
  lines.push("");
  lines.push("## Framåt");
  lines.push("(1 stycke med 1–2 konkreta fokus för kommande vecka, baserat på veckans utfall.)");
  lines.push("");
  lines.push("VIKTIGT: Skriv löpande text under varje rubrik. Inga punktlistor. Inga kodstaket. Använd rubriken `## ` (exakt så) — inga andra rubriknivåer.");

  return lines.join("\n");
}

// ─── Claude ──────────────────────────────────────────────────────────────────

let anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY saknas i env");
  if (!anthropic) anthropic = new Anthropic({ apiKey: key });
  return anthropic;
}

async function generateSummaryText(userPrompt: string): Promise<{
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}> {
  const persona = await getCoachPersona().catch(() => null);
  const systemParts: string[] = [];
  if (persona) systemParts.push(persona);
  systemParts.push(
    [
      "Du är en erfaren löpcoach som skriver en veckorapport till din adept. Alla svar på svenska.",
      "Tilltala alltid adepten med \"du\" — aldrig i tredje person, aldrig med namn.",
      "Håll tonen rak, konkret och uppmuntrande utan att slå på extra.",
      "Svara med den markdown-struktur som efterfrågas. Inga inledningar, inga avslutningar, inga punktlistor.",
    ].join(" "),
  );
  const system = systemParts.join("\n\n---\n\n");

  const n = getAnthropic();
  const response = await n.messages.create({
    model: MODEL,
    max_tokens: 1400,
    system,
    messages: [{ role: "user", content: userPrompt }],
  });
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  return {
    text,
    model: response.model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

// ─── Markdown → Notion-block ─────────────────────────────────────────────────

interface NotionBlock {
  object: "block";
  type: string;
  [key: string]: unknown;
}

/** Minimal markdown→Notion-block-konverterare. Stödjer `## ` och paragraf. */
function markdownToBlocks(md: string): NotionBlock[] {
  const blocks: NotionBlock[] = [];
  const lines = md.split("\n");
  let para: string[] = [];
  const flushPara = () => {
    const text = para.join(" ").trim();
    para = [];
    if (!text) return;
    blocks.push({
      object: "block",
      type: "paragraph",
      paragraph: { rich_text: [{ type: "text", text: { content: text } }] },
    });
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (line.length === 0) {
      flushPara();
      continue;
    }
    const h2 = /^##\s+(.+)$/.exec(line);
    if (h2) {
      flushPara();
      blocks.push({
        object: "block",
        type: "heading_2",
        heading_2: { rich_text: [{ type: "text", text: { content: h2[1].trim() } }] },
      });
      continue;
    }
    const h3 = /^###\s+(.+)$/.exec(line);
    if (h3) {
      flushPara();
      blocks.push({
        object: "block",
        type: "heading_3",
        heading_3: { rich_text: [{ type: "text", text: { content: h3[1].trim() } }] },
      });
      continue;
    }
    const bullet = /^[-*]\s+(.+)$/.exec(line);
    if (bullet) {
      flushPara();
      blocks.push({
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: { rich_text: [{ type: "text", text: { content: bullet[1].trim() } }] },
      });
      continue;
    }
    para.push(line);
  }
  flushPara();
  return blocks;
}

// ─── Notion ──────────────────────────────────────────────────────────────────

let notion: Client | null = null;
function getNotion(): Client {
  if (!TOKEN) throw new Error("NOTION_TOKEN saknas i env");
  if (!notion) notion = new Client({ auth: TOKEN });
  return notion;
}

function pageTitle(range: WeekRange): string {
  return `Veckosammanfattning · v${range.week} ${range.year}`;
}

/** Leta upp en befintlig barnside med exakt samma titel under coach-sidan. */
async function findExistingSummaryPage(title: string): Promise<string | null> {
  const n = getNotion();
  let cursor: string | undefined;
  do {
    const res = (await n.blocks.children.list({
      block_id: COACH_PAGE,
      start_cursor: cursor,
      page_size: 100,
    })) as unknown as {
      results: Array<{ id: string; type: string; child_page?: { title: string } }>;
      next_cursor: string | null;
    };
    for (const block of res.results) {
      if (block.type === "child_page" && block.child_page?.title === title) {
        return block.id;
      }
    }
    cursor = res.next_cursor ?? undefined;
  } while (cursor);
  return null;
}

async function createSummaryPage(title: string, blocks: NotionBlock[]): Promise<string> {
  const n = getNotion();
  const created = (await n.pages.create({
    parent: { type: "page_id", page_id: COACH_PAGE } as never,
    properties: {
      title: { title: [{ text: { content: title } }] },
    } as never,
    children: blocks as never,
  })) as { id: string; url: string };
  return created.id;
}

async function archivePage(pageId: string): Promise<void> {
  const n = getNotion();
  await n.pages.update({ page_id: pageId, archived: true } as never);
}

// ─── Publik orkestrering ─────────────────────────────────────────────────────

export interface WeeklySummaryResult {
  week: WeekRange;
  pageId: string;
  title: string;
  replacedPageId: string | null;
  model: string;
  inputTokens: number;
  outputTokens: number;
  workoutsCount: number;
  sourceFile: string | null;
}

export interface GenerateOptions {
  /** ISO-vecka att sammanfatta (`YYYY-Www`). Default: förra veckan. */
  week?: string;
  /** Torrkör — generera text men skriv inte till Notion. */
  dryRun?: boolean;
}

/** Orkestrera allt: aggregera, generera text, skriv till Notion. */
export async function generateWeeklySummary(
  opts: GenerateOptions = {},
): Promise<WeeklySummaryResult & { text: string }> {
  if (!COACH_PAGE) {
    throw new Error("NOTION_FITNESS_COACH_PAGE saknas i env");
  }

  const range = opts.week
    ? weekFromIsoWeek(opts.week) ?? (() => { throw new Error(`Ogiltigt veckoformat: ${opts.week}`); })()
    : previousWeekRange();

  // Föregående vecka (för jämförelse)
  const prevRangeRef = new Date(`${range.start}T12:00:00Z`);
  prevRangeRef.setUTCDate(prevRangeRef.getUTCDate() - 1);
  const prevRange = previousWeekRange(new Date(`${isoDate(prevRangeRef)}T12:00:00Z`));

  const [workoutsFile, healthFile] = await Promise.all([
    getLatestWorkoutsXlsx(),
    getLatestHealthMetricsXlsx().catch(() => null),
  ]);
  const workouts = workoutsFile ? parseAllWorkouts(workoutsFile.buffer) : [];
  const series = healthFile
    ? parseHealthSeries(healthFile.buffer, 60)
    : { restingHR: [], vo2Max: [], hrv: [], sleep: [] };

  const current = sumAggregate(workouts, range);
  const previous = sumAggregate(workouts, prevRange);
  const pmcEnd = pmcAt(workouts, range.end);
  const health = weekHealth(series, range);

  const plans = await getPlannedWorkouts().catch(() => [] as PlannedWorkout[]);
  const weekPlans = plans.filter((p) => p.datum >= range.start && p.datum <= range.end);
  const match = matchWorkoutsToPlans(current.workouts, weekPlans);
  // Räkna planerade pass som har ett matchat workout
  let matchedCount = 0;
  for (const p of weekPlans) if (match.planToWorkout.has(p.id)) matchedCount++;
  void workoutKey; // håll importen meningsfull även om den inte direkt används här

  const userPrompt = buildUserPrompt({
    range,
    current,
    previous,
    pmcEnd,
    health,
    plans: weekPlans,
    matched: { completed: matchedCount, total: weekPlans.length },
  });

  const { text, model, inputTokens, outputTokens } = await generateSummaryText(userPrompt);
  const blocks = markdownToBlocks(text);

  const title = pageTitle(range);

  if (opts.dryRun) {
    return {
      week: range,
      pageId: "",
      title,
      replacedPageId: null,
      model,
      inputTokens,
      outputTokens,
      workoutsCount: current.count,
      sourceFile: workoutsFile?.filename ?? null,
      text,
    };
  }

  const existing = await findExistingSummaryPage(title);
  if (existing) await archivePage(existing);
  const pageId = await createSummaryPage(title, blocks);

  return {
    week: range,
    pageId,
    title,
    replacedPageId: existing,
    model,
    inputTokens,
    outputTokens,
    workoutsCount: current.count,
    sourceFile: workoutsFile?.filename ?? null,
    text,
  };
}

// ─── Notion — planerade pass + (valfri) träningslogg ────────────────────────

import { Client } from "@notionhq/client";
import type { PlannedWorkout, Workout, FitnessProfile } from "./types";

const TOKEN = process.env.NOTION_TOKEN ?? "";
const PLANS_DB = process.env.NOTION_FITNESS_PLANS_DB ?? "";
const LOG_DB = process.env.NOTION_FITNESS_LOG_DB ?? "";
const PROFILE_DB = process.env.NOTION_FITNESS_PROFILE_DB ?? "";

let client: Client | null = null;
function getClient(): Client {
  if (!TOKEN) throw new Error("NOTION_TOKEN saknas i env");
  if (!client) client = new Client({ auth: TOKEN });
  return client;
}

/** data_source_id är cachat per DB-ID (API v2025-09-03 kräver det). */
const dataSourceCache = new Map<string, string>();
async function resolveDataSourceId(databaseId: string): Promise<string> {
  const hit = dataSourceCache.get(databaseId);
  if (hit) return hit;
  const n = getClient();
  const db = (await n.databases.retrieve({ database_id: databaseId })) as unknown as {
    data_sources?: Array<{ id: string }>;
  };
  const dsId = db.data_sources?.[0]?.id;
  if (!dsId) throw new Error(`Ingen data_source för DB ${databaseId}`);
  dataSourceCache.set(databaseId, dsId);
  return dsId;
}

interface NotionPageLike {
  id: string;
  properties: Record<string, unknown>;
}

function mapPlan(page: NotionPageLike): PlannedWorkout {
  const p = page.properties as Record<string, {
    title?: Array<{ plain_text: string }>;
    select?: { name: string } | null;
    date?: { start: string } | null;
    status?: { name: string } | null;
    rich_text?: Array<{ plain_text: string }>;
  }>;
  return {
    id: page.id,
    passnamn: p["Passnamn"]?.title?.[0]?.plain_text ?? "",
    typ: p["Typ"]?.select?.name ?? "",
    datum: p["Datum"]?.date?.start ?? "",
    status: p["Status"]?.status?.name ?? "",
    syfte: p["Syfte"]?.rich_text?.[0]?.plain_text ?? "",
    passdetaljer: p["Passdetaljer"]?.rich_text?.[0]?.plain_text ?? "",
    pulsintervall: p["Pulsintervall"]?.rich_text?.[0]?.plain_text ?? "",
    tempo: p["Tempo"]?.rich_text?.[0]?.plain_text ?? "",
    tid: p["Tid"]?.rich_text?.[0]?.plain_text ?? "",
    underlag: p["Underlag"]?.select?.name ?? "",
  };
}

/**
 * Hämta planerade pass från Notion, sorterade datum stigande.
 * Filtrera på status om given.
 */
export async function getPlannedWorkouts(status?: string): Promise<PlannedWorkout[]> {
  if (!PLANS_DB) throw new Error("NOTION_FITNESS_PLANS_DB saknas i env");
  const n = getClient();
  const dsId = await resolveDataSourceId(PLANS_DB);

  // Notion v5: query mot data source, inte database
  const dsApi = (n as unknown as {
    dataSources: { query: (args: unknown) => Promise<{ results: NotionPageLike[] }> };
  }).dataSources;

  const params: Record<string, unknown> = {
    data_source_id: dsId,
    sorts: [{ property: "Datum", direction: "ascending" }],
    page_size: 50,
  };
  if (status) {
    params.filter = { property: "Status", status: { equals: status } };
  }
  const res = await dsApi.query(params);
  return res.results.map(mapPlan);
}

/** Retur-värdet speglar om träningslogg-DB är konfigurerad eller ej. */
export function isLogDbReady(): boolean {
  return LOG_DB.length > 0;
}

export function isProfileDbReady(): boolean {
  return PROFILE_DB.length > 0;
}

// ─── Träningslogg ────────────────────────────────────────────────────────────

interface DsApi {
  query: (args: {
    data_source_id: string;
    filter?: unknown;
    sorts?: unknown;
    page_size?: number;
  }) => Promise<{ results: NotionPageLike[] }>;
}

function dsApi(): DsApi {
  return (getClient() as unknown as { dataSources: DsApi }).dataSources;
}

/** Sök upp loggraden för ett pass (key = date + HHMM). */
async function findLogPageByKey(key: string): Promise<string | null> {
  if (!LOG_DB) return null;
  const dsId = await resolveDataSourceId(LOG_DB);
  const res = await dsApi().query({
    data_source_id: dsId,
    filter: { property: "FIT-fil", rich_text: { contains: key } },
    page_size: 1,
  });
  return res.results[0]?.id ?? null;
}

/** Key som gör pass idempotent i loggen. */
function logKey(w: Pick<Workout, "date" | "time" | "type">): string {
  return `${w.date}|${(w.time ?? "").replace(":", "")}|${w.type}`;
}

function normalizedType(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("run")) return "Löpning";
  if (t.includes("cycl") || t.includes("bike")) return "Cykling";
  if (t.includes("strength") || t.includes("core")) return "Styrka";
  return "Annat";
}

function paceString(distanceM: number, timeSec: number): string {
  if (distanceM <= 0 || timeSec <= 0) return "–";
  const secPerKm = timeSec / (distanceM / 1000);
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function durationString(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Bygg properties-objektet för ett pass. */
function workoutProps(w: Workout): Record<string, unknown> {
  const passnamn = w.distanceM > 0
    ? `${(w.distanceM / 1000).toFixed(2)} km ${normalizedType(w.type)}`
    : normalizedType(w.type);
  const props: Record<string, unknown> = {
    "Passnamn": { title: [{ text: { content: passnamn } }] },
    "Datum": { date: { start: w.date } },
    "Typ": { select: { name: normalizedType(w.type) } },
    "Total tid": { rich_text: [{ text: { content: durationString(w.totalTimeSec) } }] },
    // Nyckel + filnamn i samma rich_text — unik för idempotent sync
    "FIT-fil": { rich_text: [{ text: { content: logKey(w) } }] },
  };
  if (w.distanceM > 0) props["Distans"] = { number: Math.round((w.distanceM / 1000) * 100) / 100 };
  if (w.distanceM > 0 && w.totalTimeSec > 0) {
    props["Snittempo"] = { rich_text: [{ text: { content: `${paceString(w.distanceM, w.totalTimeSec)} /km` } }] };
  }
  if (w.avgHR != null) props["Avg HR"] = { number: Math.round(w.avgHR) };
  if (w.maxHR != null) props["Max HR"] = { number: Math.round(w.maxHR) };
  if (w.avgPower != null) props["Avg Power"] = { number: Math.round(w.avgPower) };
  if (w.trimp != null) props["TRIMP"] = { number: Math.round(w.trimp) };
  if (w.rpe != null) props["RPE"] = { number: w.rpe };
  if (w.hrz0 != null) props["HRZ0"] = { number: w.hrz0 };
  if (w.hrz1 != null) props["HRZ1"] = { number: w.hrz1 };
  if (w.hrz2 != null) props["HRZ2"] = { number: w.hrz2 };
  if (w.hrz3 != null) props["HRZ3"] = { number: w.hrz3 };
  if (w.hrz4 != null) props["HRZ4"] = { number: w.hrz4 };
  if (w.hrz5 != null) props["HRZ5"] = { number: w.hrz5 };
  return props;
}

/**
 * Synka ett pass till träningsloggen. Skapar ny rad eller uppdaterar befintlig
 * om `FIT-fil`-nyckeln redan finns.
 */
export async function syncWorkoutToLog(w: Workout): Promise<{ pageId: string; created: boolean }> {
  if (!LOG_DB) throw new Error("NOTION_FITNESS_LOG_DB saknas i env");
  const n = getClient();
  const key = logKey(w);
  const existing = await findLogPageByKey(key);
  const properties = workoutProps(w);

  if (existing) {
    await n.pages.update({ page_id: existing, properties: properties as never });
    return { pageId: existing, created: false };
  }
  const dsId = await resolveDataSourceId(LOG_DB);
  const created = (await n.pages.create({
    // Notion API v2025-09-03: parent pekar på data source, inte database
    parent: { type: "data_source_id", data_source_id: dsId } as never,
    properties: properties as never,
  })) as { id: string };
  return { pageId: created.id, created: true };
}

/** Synka alla pass i batch — returnerar antal skapade/uppdaterade. */
export async function syncWorkoutsToLog(workouts: Workout[]): Promise<{ created: number; updated: number }> {
  let created = 0, updated = 0;
  for (const w of workouts) {
    try {
      const r = await syncWorkoutToLog(w);
      if (r.created) created++; else updated++;
    } catch (err) {
      console.error("[fitness/sync]", w.date, w.time, err);
    }
  }
  return { created, updated };
}

// ─── Profil-DB (tvåvägssynk av manuella värden) ──────────────────────────────
// Radschema i Notion:
//   Nyckel (title)     ex "name", "birthYear", "maxHR", "zone.Z1.lo", "goal.<slug>"
//   Värde (rich_text)  enkel strängrepresentation (parseas till rätt typ klient-sida)
//   Kategori (select)  "profil" | "zon" | "mål"
//   Uppdaterad (last_edited_time)

interface ProfileRow {
  key: string;
  value: string;
  category: "profil" | "zon" | "mål";
  deadline?: string;
  updatedAt: string;
  pageId: string;
}

function mapProfileRow(page: NotionPageLike): ProfileRow {
  const p = page.properties as Record<string, {
    title?: Array<{ plain_text: string }>;
    rich_text?: Array<{ plain_text: string }>;
    select?: { name: string } | null;
    date?: { start: string } | null;
    last_edited_time?: string;
  }>;
  return {
    key: p["Nyckel"]?.title?.[0]?.plain_text ?? "",
    value: p["Värde"]?.rich_text?.[0]?.plain_text ?? "",
    category: (p["Kategori"]?.select?.name as "profil" | "zon" | "mål") ?? "profil",
    deadline: p["Deadline"]?.date?.start ?? undefined,
    updatedAt: p["Uppdaterad"]?.last_edited_time ?? "",
    pageId: page.id,
  };
}

/** Läs profilen från Notion och konstruera en `FitnessProfile`. */
export async function getProfile(fallback: FitnessProfile): Promise<FitnessProfile | null> {
  if (!PROFILE_DB) return null;
  const dsId = await resolveDataSourceId(PROFILE_DB);
  const rows: ProfileRow[] = [];
  let cursor: string | undefined;
  // Query saknar typ för start_cursor — iterera manuellt om nödvändigt. För ett
  // fåtal rader räcker en enda query.
  const res = await dsApi().query({ data_source_id: dsId, page_size: 100 });
  for (const r of res.results) rows.push(mapProfileRow(r));
  void cursor;

  if (rows.length === 0) return null;

  // Börja med fallback och patcha värde för värde
  const profile: FitnessProfile = JSON.parse(JSON.stringify(fallback));
  const goalMap = new Map<string, { label: string; deadline?: string }>();

  for (const r of rows) {
    const v = r.value;
    if (r.key === "name") profile.name = v || undefined;
    else if (r.key === "birthYear") profile.birthYear = parseInt(v, 10) || undefined;
    else if (r.key === "maxHR") profile.maxHR = parseInt(v, 10) || profile.maxHR;
    else if (r.key === "restingHR") profile.restingHR = parseInt(v, 10) || profile.restingHR;
    else if (r.key === "weightKg") profile.weightKg = parseFloat(v) || undefined;
    else if (r.key.startsWith("zone.")) {
      // zone.Z1.lo / zone.Z1.hi
      const [, z, side] = r.key.split(".");
      if (z in profile.zones && (side === "lo" || side === "hi")) {
        const cur = profile.zones[z as keyof FitnessProfile["zones"]];
        const n = parseInt(v, 10);
        if (Number.isFinite(n)) {
          profile.zones[z as keyof FitnessProfile["zones"]] = side === "lo" ? [n, cur[1]] : [cur[0], n];
        }
      }
    } else if (r.key.startsWith("goal.")) {
      const slug = r.key.slice(5);
      goalMap.set(slug, { label: v, deadline: r.deadline });
    }
  }

  if (goalMap.size > 0) {
    profile.goals = Array.from(goalMap.values());
  }
  return profile;
}

/** Hitta rad i profilen via `Nyckel`. */
async function findProfileRow(key: string): Promise<string | null> {
  if (!PROFILE_DB) return null;
  const dsId = await resolveDataSourceId(PROFILE_DB);
  const res = await dsApi().query({
    data_source_id: dsId,
    filter: { property: "Nyckel", title: { equals: key } },
    page_size: 1,
  });
  return res.results[0]?.id ?? null;
}

async function upsertProfileRow(
  key: string,
  value: string,
  category: "profil" | "zon" | "mål",
  deadline?: string,
): Promise<void> {
  if (!PROFILE_DB) throw new Error("NOTION_FITNESS_PROFILE_DB saknas i env");
  const n = getClient();
  const existing = await findProfileRow(key);
  const properties: Record<string, unknown> = {
    "Nyckel": { title: [{ text: { content: key } }] },
    "Värde": { rich_text: [{ text: { content: value } }] },
    "Kategori": { select: { name: category } },
  };
  if (deadline) {
    properties["Deadline"] = { date: { start: deadline } };
  } else if (existing) {
    // Töm deadline om raden uppdateras utan deadline
    properties["Deadline"] = { date: null };
  }
  if (existing) {
    await n.pages.update({ page_id: existing, properties: properties as never });
    return;
  }
  const dsId = await resolveDataSourceId(PROFILE_DB);
  await n.pages.create({
    parent: { type: "data_source_id", data_source_id: dsId } as never,
    properties: properties as never,
  });
}

/** Skriv tillbaka ändringar till Notion. Diff görs av anroparen. */
export async function updateProfile(patch: Partial<FitnessProfile>): Promise<void> {
  if (!PROFILE_DB) throw new Error("NOTION_FITNESS_PROFILE_DB saknas i env");

  if (patch.name !== undefined) await upsertProfileRow("name", patch.name ?? "", "profil");
  if (patch.birthYear !== undefined) await upsertProfileRow("birthYear", String(patch.birthYear ?? ""), "profil");
  if (patch.maxHR !== undefined) await upsertProfileRow("maxHR", String(patch.maxHR), "profil");
  if (patch.restingHR !== undefined) await upsertProfileRow("restingHR", String(patch.restingHR), "profil");
  if (patch.weightKg !== undefined) await upsertProfileRow("weightKg", String(patch.weightKg ?? ""), "profil");

  if (patch.zones) {
    for (const z of ["Z1", "Z2", "Z3", "Z4", "Z5"] as const) {
      const [lo, hi] = patch.zones[z];
      await upsertProfileRow(`zone.${z}.lo`, String(lo), "zon");
      await upsertProfileRow(`zone.${z}.hi`, String(hi), "zon");
    }
  }

  if (patch.goals) {
    // Enkel strategi: skriv nya rader, gamla rader lämnas orörda.
    // Skulle man vilja ta bort gamla mål måste man göra det explicit i UI (Session D).
    for (let i = 0; i < patch.goals.length; i++) {
      const g = patch.goals[i];
      await upsertProfileRow(`goal.${i}`, g.label, "mål", g.deadline);
    }
  }
}

// ─── Garden — Notion-klient för Växtregister / Säsongsplan / Utomhusprojekt ──
// Spegling av `src/lib/fitness/notion.ts`-mönstret: lazy singleton-klient,
// data_source_id-cache, separat mapXxx / xxxProps per DB, CRUD-funktioner som
// bara skriver definierade fält (partial PATCH).

import { Client } from "@notionhq/client";
import type {
  Plant,
  SeasonTask,
  OutdoorProject,
  PlantInput,
  SeasonTaskInput,
  OutdoorProjectInput,
} from "./types";

const TOKEN = process.env.NOTION_TOKEN ?? "";
const PLANTS_DB = process.env.NOTION_GARDEN_PLANTS_DB ?? "";
const SEASON_DB = process.env.NOTION_GARDEN_SEASON_DB ?? "";
const PROJECTS_DB = process.env.NOTION_GARDEN_PROJECTS_DB ?? "";

let client: Client | null = null;
function getClient(): Client {
  if (!TOKEN) throw new Error("NOTION_TOKEN saknas i env");
  if (!client) client = new Client({ auth: TOKEN });
  return client;
}

/** data_source_id cachat per DB-ID (Notion API v2025-09-03 kräver det). */
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
  url?: string;
}

interface DsApi {
  query: (args: {
    data_source_id: string;
    filter?: unknown;
    sorts?: unknown;
    page_size?: number;
    start_cursor?: string;
  }) => Promise<{ results: NotionPageLike[]; next_cursor: string | null; has_more?: boolean }>;
}

function dsApi(): DsApi {
  return (getClient() as unknown as { dataSources: DsApi }).dataSources;
}

/** Alla tre DB-id:n konfigurerade → garden-UI får köra på skarpa API-anrop. */
export function isGardenReady(): boolean {
  return PLANTS_DB.length > 0 && SEASON_DB.length > 0 && PROJECTS_DB.length > 0;
}

function notionUrl(pageId: string): string {
  // Notion accepterar page-id både med och utan bindestreck.
  return `https://www.notion.so/${pageId.replace(/-/g, "")}`;
}

// ─── Property-helpers (läsning) ──────────────────────────────────────────────

type Prop = {
  title?: Array<{ plain_text: string }>;
  rich_text?: Array<{ plain_text: string }>;
  select?: { name: string } | null;
  multi_select?: Array<{ name: string }>;
  status?: { name: string } | null;
  date?: { start: string } | null;
  number?: number | null;
  email?: string | null;
  relation?: Array<{ id: string }>;
};

function readTitle(p: Prop | undefined): string {
  return p?.title?.map((t) => t.plain_text).join("") ?? "";
}
function readText(p: Prop | undefined): string {
  return p?.rich_text?.map((t) => t.plain_text).join("") ?? "";
}
function readSelect(p: Prop | undefined): string {
  return p?.select?.name ?? "";
}
function readMulti(p: Prop | undefined): string[] {
  return (p?.multi_select ?? []).map((s) => s.name);
}
function readStatus(p: Prop | undefined): string {
  return p?.status?.name ?? "";
}
function readDate(p: Prop | undefined): string {
  return p?.date?.start ?? "";
}
function readNumber(p: Prop | undefined): number | null {
  return p?.number ?? null;
}
function readEmail(p: Prop | undefined): string | null {
  return p?.email ?? null;
}
function readRelation(p: Prop | undefined): string[] {
  return (p?.relation ?? []).map((r) => r.id);
}

// ─── Mappers ────────────────────────────────────────────────────────────────

function mapPlant(page: NotionPageLike): Plant {
  const p = page.properties as Record<string, Prop>;
  return {
    id: page.id,
    vaxt: readTitle(p["Växt"]),
    typ: readSelect(p["Typ"]),
    platser: readMulti(p["Plats"]),
    beskarning: readMulti(p["Beskärning"]),
    godsling: readMulti(p["Gödsling"]),
    skotselrad: readEmail(p["Skötselråd"]),
    atgardIds: readRelation(p["Åtgärder"]),
    notionUrl: page.url ?? notionUrl(page.id),
    sorttnamn: readText(p["Sorttnamn"]) || null,
    sadddatum: readDate(p["Sådddatum"]) || null,
    antalPlantor: readNumber(p["Antal plantor"]),
    fas: readSelect(p["Fas"]) || null,
    sasongslangd: readNumber(p["Säsongslängd"]),
    senastVattnad: readDate(p["Senast vattnad"]) || null,
    vattningsintervall: readSelect(p["Vattningsintervall"]) || null,
    vattningsnotering: readText(p["Vattningsnotering"]) || null,
    naring: readText(p["Näring"]) || null,
    ljusbehov: readText(p["Ljusbehov"]) || null,
    temperaturintervall: readText(p["Temperaturintervall"]) || null,
    hojd: readText(p["Höjd"]) || null,
    skordeperiod: readText(p["Skördeperiod"]) || null,
    skotselguide: readText(p["Skötselguide"]) || null,
  };
}

function mapTask(page: NotionPageLike): SeasonTask {
  const p = page.properties as Record<string, Prop>;
  return {
    id: page.id,
    uppgift: readTitle(p["Uppgift"]),
    datum: readDate(p["Datum"]),
    status: readStatus(p["Status"]),
    typ: readSelect(p["Typ"]),
    atgarder: readMulti(p["Åtgärd"]),
    kommentar: readText(p["Kommentar"]),
    plantIds: readRelation(p["🌿 Växt"]),
    notionUrl: page.url ?? notionUrl(page.id),
  };
}

function mapProject(page: NotionPageLike): OutdoorProject {
  const p = page.properties as Record<string, Prop>;
  return {
    id: page.id,
    namn: readTitle(p["Namn"]),
    status: readSelect(p["Status"]),
    prioritet: readSelect(p["Prioritet"]),
    omrade: readSelect(p["Område"]),
    tidsram: readSelect(p["Tidsram"]),
    budget: readNumber(p["Budget"]),
    faktiskKostnad: readNumber(p["Faktisk kostnad"]),
    kommentar: readText(p["Kommentar"]),
    notionUrl: page.url ?? notionUrl(page.id),
  };
}

// ─── Property-builders (skrivning) ──────────────────────────────────────────

function titleProp(v: string): unknown {
  return { title: [{ text: { content: v } }] };
}
function textProp(v: string): unknown {
  return { rich_text: [{ text: { content: v } }] };
}
function selectProp(v: string): unknown {
  return v ? { select: { name: v } } : { select: null };
}
function multiProp(v: string[]): unknown {
  return { multi_select: v.map((name) => ({ name })) };
}
function statusProp(v: string): unknown {
  return v ? { status: { name: v } } : { status: null };
}
function dateProp(v: string): unknown {
  return v ? { date: { start: v } } : { date: null };
}
function numberProp(v: number | null): unknown {
  return { number: v };
}
function emailProp(v: string | null): unknown {
  // Notion tar `null` för att tömma email-fältet.
  return { email: v && v.length > 0 ? v : null };
}
function relationProp(ids: string[]): unknown {
  return { relation: ids.map((id) => ({ id })) };
}

function plantProps(input: PlantInput): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (input.vaxt !== undefined) out["Växt"] = titleProp(input.vaxt);
  if (input.typ !== undefined) out["Typ"] = selectProp(input.typ);
  if (input.platser !== undefined) out["Plats"] = multiProp(input.platser);
  if (input.beskarning !== undefined) out["Beskärning"] = multiProp(input.beskarning);
  if (input.godsling !== undefined) out["Gödsling"] = multiProp(input.godsling);
  if (input.skotselrad !== undefined) out["Skötselråd"] = emailProp(input.skotselrad);
  if (input.atgardIds !== undefined) out["Åtgärder"] = relationProp(input.atgardIds);
  if (input.sorttnamn !== undefined) out["Sorttnamn"] = input.sorttnamn ? textProp(input.sorttnamn) : { rich_text: [] };
  if (input.sadddatum !== undefined) out["Sådddatum"] = dateProp(input.sadddatum ?? "");
  if (input.antalPlantor !== undefined) out["Antal plantor"] = numberProp(input.antalPlantor);
  if (input.fas !== undefined) out["Fas"] = input.fas ? selectProp(input.fas) : { select: null };
  if (input.sasongslangd !== undefined) out["Säsongslängd"] = numberProp(input.sasongslangd);
  if (input.senastVattnad !== undefined) out["Senast vattnad"] = dateProp(input.senastVattnad ?? "");
  if (input.vattningsintervall !== undefined) out["Vattningsintervall"] = input.vattningsintervall ? selectProp(input.vattningsintervall) : { select: null };
  if (input.vattningsnotering !== undefined) out["Vattningsnotering"] = input.vattningsnotering ? textProp(input.vattningsnotering) : { rich_text: [] };
  if (input.naring !== undefined) out["Näring"] = input.naring ? textProp(input.naring) : { rich_text: [] };
  if (input.ljusbehov !== undefined) out["Ljusbehov"] = input.ljusbehov ? textProp(input.ljusbehov) : { rich_text: [] };
  if (input.temperaturintervall !== undefined) out["Temperaturintervall"] = input.temperaturintervall ? textProp(input.temperaturintervall) : { rich_text: [] };
  if (input.hojd !== undefined) out["Höjd"] = input.hojd ? textProp(input.hojd) : { rich_text: [] };
  if (input.skordeperiod !== undefined) out["Skördeperiod"] = input.skordeperiod ? textProp(input.skordeperiod) : { rich_text: [] };
  if (input.skotselguide !== undefined) out["Skötselguide"] = input.skotselguide ? textProp(input.skotselguide) : { rich_text: [] };
  return out;
}

function taskProps(input: SeasonTaskInput): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (input.uppgift !== undefined) out["Uppgift"] = titleProp(input.uppgift);
  if (input.datum !== undefined) out["Datum"] = dateProp(input.datum);
  if (input.status !== undefined) out["Status"] = statusProp(input.status);
  if (input.typ !== undefined) out["Typ"] = selectProp(input.typ);
  if (input.atgarder !== undefined) out["Åtgärd"] = multiProp(input.atgarder);
  if (input.kommentar !== undefined) out["Kommentar"] = textProp(input.kommentar);
  if (input.plantIds !== undefined) out["🌿 Växt"] = relationProp(input.plantIds);
  return out;
}

function projectProps(input: OutdoorProjectInput): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (input.namn !== undefined) out["Namn"] = titleProp(input.namn);
  if (input.status !== undefined) out["Status"] = selectProp(input.status);
  if (input.prioritet !== undefined) out["Prioritet"] = selectProp(input.prioritet);
  if (input.omrade !== undefined) out["Område"] = selectProp(input.omrade);
  if (input.tidsram !== undefined) out["Tidsram"] = selectProp(input.tidsram);
  if (input.budget !== undefined) out["Budget"] = numberProp(input.budget);
  if (input.faktiskKostnad !== undefined) out["Faktisk kostnad"] = numberProp(input.faktiskKostnad);
  if (input.kommentar !== undefined) out["Kommentar"] = textProp(input.kommentar);
  return out;
}

// ─── Paginerings-helper ──────────────────────────────────────────────────────

async function queryAll(
  dsId: string,
  extras: { filter?: unknown; sorts?: unknown } = {},
): Promise<NotionPageLike[]> {
  const results: NotionPageLike[] = [];
  let cursor: string | undefined;
  do {
    const res = await dsApi().query({
      data_source_id: dsId,
      page_size: 100,
      start_cursor: cursor,
      ...extras,
    });
    for (const p of res.results) results.push(p);
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
  } while (cursor);
  return results;
}

// ─── Växtregister ────────────────────────────────────────────────────────────

export async function getPlants(filter?: { typ?: string; plats?: string }): Promise<Plant[]> {
  if (!PLANTS_DB) throw new Error("NOTION_GARDEN_PLANTS_DB saknas i env");
  const dsId = await resolveDataSourceId(PLANTS_DB);

  // Bygg Notion-filter enligt samma semantik som UI:t vill ha: select "Typ"
  // och multi_select "Plats" (contains).
  const clauses: unknown[] = [];
  if (filter?.typ) clauses.push({ property: "Typ", select: { equals: filter.typ } });
  if (filter?.plats) clauses.push({ property: "Plats", multi_select: { contains: filter.plats } });
  const f =
    clauses.length === 0 ? undefined : clauses.length === 1 ? clauses[0] : { and: clauses };

  const pages = await queryAll(dsId, {
    filter: f,
    sorts: [{ property: "Växt", direction: "ascending" }],
  });
  return pages.map(mapPlant);
}

export async function getPlantById(id: string): Promise<Plant | null> {
  const n = getClient();
  try {
    const page = (await n.pages.retrieve({ page_id: id })) as NotionPageLike;
    return mapPlant(page);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("Could not find") || message.includes("object_not_found")) return null;
    throw err;
  }
}

export async function createPlant(input: PlantInput): Promise<Plant> {
  if (!PLANTS_DB) throw new Error("NOTION_GARDEN_PLANTS_DB saknas i env");
  if (!input.vaxt) throw new Error("vaxt (namn) krävs vid skapande av växt");
  const n = getClient();
  const dsId = await resolveDataSourceId(PLANTS_DB);
  const page = (await n.pages.create({
    parent: { type: "data_source_id", data_source_id: dsId } as never,
    properties: plantProps(input) as never,
  })) as NotionPageLike;
  return mapPlant(page);
}

export async function updatePlant(id: string, patch: PlantInput): Promise<Plant> {
  const n = getClient();
  const page = (await n.pages.update({
    page_id: id,
    properties: plantProps(patch) as never,
  })) as NotionPageLike;
  return mapPlant(page);
}

export async function archivePlant(id: string): Promise<void> {
  const n = getClient();
  await n.pages.update({ page_id: id, archived: true } as never);
}

// ─── Säsongsplan ─────────────────────────────────────────────────────────────

export async function getTasks(filter?: {
  status?: string;
  typ?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<SeasonTask[]> {
  if (!SEASON_DB) throw new Error("NOTION_GARDEN_SEASON_DB saknas i env");
  const dsId = await resolveDataSourceId(SEASON_DB);

  const clauses: unknown[] = [];
  if (filter?.status) clauses.push({ property: "Status", status: { equals: filter.status } });
  if (filter?.typ) clauses.push({ property: "Typ", select: { equals: filter.typ } });
  if (filter?.fromDate) clauses.push({ property: "Datum", date: { on_or_after: filter.fromDate } });
  if (filter?.toDate) clauses.push({ property: "Datum", date: { on_or_before: filter.toDate } });
  const f =
    clauses.length === 0 ? undefined : clauses.length === 1 ? clauses[0] : { and: clauses };

  const pages = await queryAll(dsId, {
    filter: f,
    sorts: [{ property: "Datum", direction: "ascending" }],
  });
  return pages.map(mapTask);
}

export async function getTaskById(id: string): Promise<SeasonTask | null> {
  const n = getClient();
  try {
    const page = (await n.pages.retrieve({ page_id: id })) as NotionPageLike;
    return mapTask(page);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("Could not find") || message.includes("object_not_found")) return null;
    throw err;
  }
}

export async function createTask(input: SeasonTaskInput): Promise<SeasonTask> {
  if (!SEASON_DB) throw new Error("NOTION_GARDEN_SEASON_DB saknas i env");
  if (!input.uppgift) throw new Error("uppgift krävs vid skapande av säsongsuppgift");
  const n = getClient();
  const dsId = await resolveDataSourceId(SEASON_DB);
  const page = (await n.pages.create({
    parent: { type: "data_source_id", data_source_id: dsId } as never,
    properties: taskProps(input) as never,
  })) as NotionPageLike;
  return mapTask(page);
}

export async function updateTask(id: string, patch: SeasonTaskInput): Promise<SeasonTask> {
  const n = getClient();
  const page = (await n.pages.update({
    page_id: id,
    properties: taskProps(patch) as never,
  })) as NotionPageLike;
  return mapTask(page);
}

export async function archiveTask(id: string): Promise<void> {
  const n = getClient();
  await n.pages.update({ page_id: id, archived: true } as never);
}

// ─── Utomhusprojekt ──────────────────────────────────────────────────────────

export async function getProjects(filter?: {
  status?: string;
  omrade?: string;
}): Promise<OutdoorProject[]> {
  if (!PROJECTS_DB) throw new Error("NOTION_GARDEN_PROJECTS_DB saknas i env");
  const dsId = await resolveDataSourceId(PROJECTS_DB);

  const clauses: unknown[] = [];
  if (filter?.status) clauses.push({ property: "Status", select: { equals: filter.status } });
  if (filter?.omrade) clauses.push({ property: "Område", select: { equals: filter.omrade } });
  const f =
    clauses.length === 0 ? undefined : clauses.length === 1 ? clauses[0] : { and: clauses };

  const pages = await queryAll(dsId, {
    filter: f,
    sorts: [{ property: "Namn", direction: "ascending" }],
  });
  return pages.map(mapProject);
}

export async function getProjectById(id: string): Promise<OutdoorProject | null> {
  const n = getClient();
  try {
    const page = (await n.pages.retrieve({ page_id: id })) as NotionPageLike;
    return mapProject(page);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("Could not find") || message.includes("object_not_found")) return null;
    throw err;
  }
}

export async function createProject(input: OutdoorProjectInput): Promise<OutdoorProject> {
  if (!PROJECTS_DB) throw new Error("NOTION_GARDEN_PROJECTS_DB saknas i env");
  if (!input.namn) throw new Error("namn krävs vid skapande av projekt");
  const n = getClient();
  const dsId = await resolveDataSourceId(PROJECTS_DB);
  const page = (await n.pages.create({
    parent: { type: "data_source_id", data_source_id: dsId } as never,
    properties: projectProps(input) as never,
  })) as NotionPageLike;
  return mapProject(page);
}

export async function updateProject(
  id: string,
  patch: OutdoorProjectInput,
): Promise<OutdoorProject> {
  const n = getClient();
  const page = (await n.pages.update({
    page_id: id,
    properties: projectProps(patch) as never,
  })) as NotionPageLike;
  return mapProject(page);
}

export async function archiveProject(id: string): Promise<void> {
  const n = getClient();
  await n.pages.update({ page_id: id, archived: true } as never);
}

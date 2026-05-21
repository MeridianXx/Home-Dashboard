// ─── Mat — Notion-klient för Recept + Veckoplan ──────────────────────────────
// Spegling av `src/lib/garden/notion.ts`-mönstret: lazy singleton-klient,
// data_source_id-cache, mapXxx / xxxProps per DB, partial-PATCH-vänliga
// CRUD-funktioner. CRUD-funktioner skrivs ut i M1 (recept) / M2 (plan) —
// M0 levererar bara `isMatReady()`-gaten + helpers så API-routes kan
// implementeras stegvis.

import { Client } from "@notionhq/client";
import type {
  Ingredient,
  MealPlanInput,
  MealPlanSlot,
  Recipe,
  RecipeInput,
} from "./types";

const TOKEN = process.env.NOTION_TOKEN ?? "";
const RECIPES_DB = process.env.NOTION_MAT_RECIPES_DB ?? "";
const PLAN_DB = process.env.NOTION_MAT_PLAN_DB ?? "";
const COACH_PAGE = process.env.NOTION_MAT_COACH_PAGE ?? "";

let client: Client | null = null;
export function getMatClient(): Client {
  if (!TOKEN) throw new Error("NOTION_TOKEN saknas i env");
  if (!client) client = new Client({ auth: TOKEN });
  return client;
}

/** data_source_id cachat per DB-ID (Notion API v2025-09-03 kräver det). */
const dataSourceCache = new Map<string, string>();
export async function resolveMatDataSourceId(databaseId: string): Promise<string> {
  const hit = dataSourceCache.get(databaseId);
  if (hit) return hit;
  const n = getMatClient();
  const db = (await n.databases.retrieve({ database_id: databaseId })) as unknown as {
    data_sources?: Array<{ id: string }>;
  };
  const dsId = db.data_sources?.[0]?.id;
  if (!dsId) throw new Error(`Ingen data_source för DB ${databaseId}`);
  dataSourceCache.set(databaseId, dsId);
  return dsId;
}

/**
 * Alla tre env-vars konfigurerade → mat-UI får köra mot skarpa API-anrop.
 * Vi gate:ar både hub-rendering och API-routes på denna — saknas något
 * svarar `/api/mat/*` med 501 och hubben renderar instruktions-banner.
 *
 * `NOTION_MAT_COACH_PAGE` ingår i gaten även om M0 inte använder den —
 * det förenklar M3-implementationen (en gate, inte tre).
 */
export function isMatReady(): boolean {
  return (
    RECIPES_DB.length > 0 &&
    PLAN_DB.length > 0 &&
    COACH_PAGE.length > 0
  );
}

/** Vilka delar saknas — används av `/api/mat/ready` så hubben kan visa
 *  en preciserad instruktion om vad som behöver sättas i env. */
export function missingMatEnv(): Array<"recipes" | "plan" | "coach"> {
  const missing: Array<"recipes" | "plan" | "coach"> = [];
  if (RECIPES_DB.length === 0) missing.push("recipes");
  if (PLAN_DB.length === 0) missing.push("plan");
  if (COACH_PAGE.length === 0) missing.push("coach");
  return missing;
}

/** Exponera DB-id:n till lokal CRUD utan att läcka env-namnen vidare. */
export const MAT_DB = {
  recipes: () => RECIPES_DB,
  plan: () => PLAN_DB,
  coachPage: () => COACH_PAGE,
} as const;

// ── Ingrediens-serialisering ────────────────────────────────────────────────
// Lagras som JSON-blob i Notion `Ingredienser` (rich_text). Parser är defensiv
// — felaktig JSON eller delvis-ifyllda rader faller tillbaka till tom lista.

export function serializeIngredients(items: Ingredient[]): string {
  return JSON.stringify(items.map((i) => ({ v: i.v, u: i.u, n: i.n })));
}

export function parseIngredients(raw: string): Ingredient[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row): row is { v: unknown; u: unknown; n: unknown } =>
        typeof row === "object" && row !== null && "n" in row,
      )
      .map((row) => ({
        v: typeof row.v === "number" ? row.v : null,
        u: typeof row.u === "string" ? row.u : "",
        n: typeof row.n === "string" ? row.n : "",
      }))
      .filter((i) => i.n.length > 0);
  } catch {
    return [];
  }
}

// ── URL-helper ──────────────────────────────────────────────────────────────

export function matNotionUrl(pageId: string): string {
  return `https://www.notion.so/${pageId.replace(/-/g, "")}`;
}

/**
 * Extrahera domännamn från en källans URL — `https://www.ica.se/...` →
 * `ica.se`. Används för `Källa`-fältet på recept så detail-headern kan visa
 * "från ica.se →" utan att räkna ut det varje gång.
 */
export function domainFromUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// ── Notion API low-level wrappers (samma mönster som garden/notion.ts) ──────

interface NotionPageLike {
  id: string;
  properties: Record<string, unknown>;
  url?: string;
  created_time?: string;
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
  return (getMatClient() as unknown as { dataSources: DsApi }).dataSources;
}

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

// ── Läs-helpers ────────────────────────────────────────────────────────────

type Prop = {
  title?: Array<{ plain_text: string }>;
  rich_text?: Array<{ plain_text: string }>;
  multi_select?: Array<{ name: string }>;
  number?: number | null;
  url?: string | null;
  checkbox?: boolean;
  created_time?: string;
  select?: { name: string } | null;
  date?: { start: string } | null;
  relation?: Array<{ id: string }>;
};

function readTitle(p: Prop | undefined): string {
  return p?.title?.map((t) => t.plain_text).join("") ?? "";
}
function readText(p: Prop | undefined): string {
  return p?.rich_text?.map((t) => t.plain_text).join("") ?? "";
}
function readMulti(p: Prop | undefined): string[] {
  return (p?.multi_select ?? []).map((s) => s.name);
}
function readNumber(p: Prop | undefined): number | null {
  return p?.number ?? null;
}
function readUrl(p: Prop | undefined): string | null {
  return p?.url ?? null;
}
function readCheckbox(p: Prop | undefined): boolean {
  return p?.checkbox ?? false;
}
function readCreatedTime(p: Prop | undefined): string {
  return p?.created_time ?? "";
}

// ── Notion rich_text-chunking ──────────────────────────────────────────────
// Ett rich_text-element har 2000 teckens hård gräns. Långa ingrediens-JSON-
// blobbar eller steg-strängar måste delas i flera element. Innehållet
// concat:as transparent vid `readText`-läsning så det är fortfarande
// en logisk sträng för callern.

const NOTION_RICH_TEXT_MAX = 2000;

function chunkRichText(text: string): Array<{ text: { content: string } }> {
  if (text.length === 0) return [];
  const parts: Array<{ text: { content: string } }> = [];
  for (let i = 0; i < text.length; i += NOTION_RICH_TEXT_MAX) {
    parts.push({ text: { content: text.slice(i, i + NOTION_RICH_TEXT_MAX) } });
  }
  return parts;
}

// ── Skriv-helpers ──────────────────────────────────────────────────────────

function titleProp(v: string): unknown {
  return { title: [{ text: { content: v } }] };
}
function textProp(v: string): unknown {
  return { rich_text: chunkRichText(v) };
}
function multiProp(v: string[]): unknown {
  return { multi_select: v.map((name) => ({ name })) };
}
function numberProp(v: number | null): unknown {
  return { number: v };
}
function urlProp(v: string | null): unknown {
  return { url: v && v.length > 0 ? v : null };
}
function checkboxProp(v: boolean): unknown {
  return { checkbox: v };
}

// ── Mapper ──────────────────────────────────────────────────────────────────

function mapRecipe(page: NotionPageLike): Recipe {
  const p = page.properties as Record<string, Prop>;
  const stegRaw = readText(p["Steg"]);
  const steg = stegRaw.split(/\r?\n/).map((s) => s.trim()).filter((s) => s.length > 0);
  return {
    id: page.id,
    namn: readTitle(p["Namn"]),
    lede: readText(p["Lede"]),
    ingredienser: parseIngredients(readText(p["Ingredienser"])),
    steg,
    minTotal: readNumber(p["MinTotal"]),
    svarighet: readNumber(p["Svårighet"]),
    basPortioner: readNumber(p["BasPortioner"]) ?? 4,
    taggar: readMulti(p["Taggar"]),
    vintips: readText(p["Vintips"]),
    bildUrl: readUrl(p["BildURL"]),
    kallaUrl: readUrl(p["Länk"]),
    kallaLabel: readText(p["Källa"]),
    aiSkapad: readCheckbox(p["AISkapad"]),
    skapad: readCreatedTime(p["Skapad"]) || page.created_time || "",
    notionUrl: page.url ?? matNotionUrl(page.id),
  };
}

function recipeProps(input: RecipeInput): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (input.namn !== undefined) out["Namn"] = titleProp(input.namn);
  if (input.lede !== undefined) out["Lede"] = textProp(input.lede);
  if (input.ingredienser !== undefined) {
    out["Ingredienser"] = textProp(serializeIngredients(input.ingredienser));
  }
  if (input.steg !== undefined) {
    out["Steg"] = textProp(input.steg.map((s) => s.trim()).filter((s) => s.length > 0).join("\n"));
  }
  if (input.minTotal !== undefined) out["MinTotal"] = numberProp(input.minTotal);
  if (input.svarighet !== undefined) out["Svårighet"] = numberProp(input.svarighet);
  if (input.basPortioner !== undefined) out["BasPortioner"] = numberProp(input.basPortioner);
  if (input.taggar !== undefined) out["Taggar"] = multiProp(input.taggar);
  if (input.vintips !== undefined) out["Vintips"] = textProp(input.vintips);
  if (input.bildUrl !== undefined) out["BildURL"] = urlProp(input.bildUrl);
  if (input.kallaUrl !== undefined) out["Länk"] = urlProp(input.kallaUrl);
  if (input.kallaLabel !== undefined) out["Källa"] = textProp(input.kallaLabel);
  if (input.aiSkapad !== undefined) out["AISkapad"] = checkboxProp(input.aiSkapad);
  return out;
}

// ── Recept-CRUD ────────────────────────────────────────────────────────────

export async function listRecipes(filter?: { tag?: string }): Promise<Recipe[]> {
  if (!RECIPES_DB) throw new Error("NOTION_MAT_RECIPES_DB saknas i env");
  const dsId = await resolveMatDataSourceId(RECIPES_DB);

  const f = filter?.tag
    ? { property: "Taggar", multi_select: { contains: filter.tag } }
    : undefined;

  const pages = await queryAll(dsId, {
    filter: f,
    sorts: [{ timestamp: "created_time", direction: "descending" }],
  });
  return pages.map(mapRecipe);
}

export async function getRecipeById(id: string): Promise<Recipe | null> {
  const n = getMatClient();
  try {
    const page = (await n.pages.retrieve({ page_id: id })) as NotionPageLike;
    return mapRecipe(page);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("Could not find") || message.includes("object_not_found")) return null;
    throw err;
  }
}

export async function createRecipe(input: RecipeInput): Promise<Recipe> {
  if (!RECIPES_DB) throw new Error("NOTION_MAT_RECIPES_DB saknas i env");
  if (!input.namn) throw new Error("namn krävs vid skapande av recept");
  const n = getMatClient();
  const dsId = await resolveMatDataSourceId(RECIPES_DB);
  // BasPortioner default 4 om inte angiven (per M0-bullet).
  const seeded: RecipeInput = { basPortioner: 4, ...input };
  const page = (await n.pages.create({
    parent: { type: "data_source_id", data_source_id: dsId } as never,
    properties: recipeProps(seeded) as never,
  })) as NotionPageLike;
  return mapRecipe(page);
}

export async function updateRecipe(id: string, patch: RecipeInput): Promise<Recipe> {
  const n = getMatClient();
  const page = (await n.pages.update({
    page_id: id,
    properties: recipeProps(patch) as never,
  })) as NotionPageLike;
  return mapRecipe(page);
}

export async function archiveRecipe(id: string): Promise<void> {
  const n = getMatClient();
  await n.pages.update({ page_id: id, archived: true } as never);
}

// ── Veckoplan-CRUD ─────────────────────────────────────────────────────────
// Notion-schema enligt `scripts/create-mat-notion-dbs.mjs`:
//   Datum (date) · Slot (select Lunch/Middag) · Recept (relation → Recept-DB)
//   · EgetNamn (rich_text) · TidMin (number)

function mapPlan(page: NotionPageLike): MealPlanSlot {
  const p = page.properties as Record<string, Prop>;
  return {
    id: page.id,
    datum: p["Datum"]?.date?.start ?? "",
    slot: p["Slot"]?.select?.name ?? "",
    receptIds: (p["Recept"]?.relation ?? []).map((r) => r.id),
    egetNamn: readText(p["EgetNamn"]),
    tidMin: readNumber(p["TidMin"]),
    notionUrl: page.url ?? matNotionUrl(page.id),
  };
}

function planProps(input: MealPlanInput): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (input.datum !== undefined) {
    out["Datum"] = input.datum ? { date: { start: input.datum } } : { date: null };
  }
  if (input.slot !== undefined) {
    out["Slot"] = input.slot ? { select: { name: input.slot } } : { select: null };
  }
  if (input.receptIds !== undefined) {
    out["Recept"] = { relation: input.receptIds.map((id) => ({ id })) };
  }
  if (input.egetNamn !== undefined) {
    out["EgetNamn"] = textProp(input.egetNamn);
  }
  if (input.tidMin !== undefined) {
    out["TidMin"] = numberProp(input.tidMin);
  }
  return out;
}

/**
 * Hämta planerade slottar inom ett datum-intervall (inklusive båda ändpunkter).
 * Notion select kräver `multi_select`-stil filter inte här — vi filtrerar på
 * datum-intervall via `on_or_after` / `on_or_before`.
 */
export async function listPlanSlots(
  range: { from: string; to: string },
): Promise<MealPlanSlot[]> {
  if (!PLAN_DB) throw new Error("NOTION_MAT_PLAN_DB saknas i env");
  const dsId = await resolveMatDataSourceId(PLAN_DB);
  const pages = await queryAll(dsId, {
    filter: {
      and: [
        { property: "Datum", date: { on_or_after: range.from } },
        { property: "Datum", date: { on_or_before: range.to } },
      ],
    },
    sorts: [{ property: "Datum", direction: "ascending" }],
  });
  return pages.map(mapPlan);
}

export async function createPlanSlot(input: MealPlanInput): Promise<MealPlanSlot> {
  if (!PLAN_DB) throw new Error("NOTION_MAT_PLAN_DB saknas i env");
  if (!input.datum) throw new Error("datum (YYYY-MM-DD) krävs");
  if (!input.slot) throw new Error("slot (Lunch/Middag) krävs");
  const n = getMatClient();
  const dsId = await resolveMatDataSourceId(PLAN_DB);
  const page = (await n.pages.create({
    parent: { type: "data_source_id", data_source_id: dsId } as never,
    properties: planProps(input) as never,
  })) as NotionPageLike;
  return mapPlan(page);
}

export async function updatePlanSlot(
  id: string,
  patch: MealPlanInput,
): Promise<MealPlanSlot> {
  const n = getMatClient();
  const page = (await n.pages.update({
    page_id: id,
    properties: planProps(patch) as never,
  })) as NotionPageLike;
  return mapPlan(page);
}

export async function archivePlanSlot(id: string): Promise<void> {
  const n = getMatClient();
  await n.pages.update({ page_id: id, archived: true } as never);
}

// ─── Mat — Notion-klient för Recept + Veckoplan ──────────────────────────────
// Spegling av `src/lib/garden/notion.ts`-mönstret: lazy singleton-klient,
// data_source_id-cache, mapXxx / xxxProps per DB, partial-PATCH-vänliga
// CRUD-funktioner. CRUD-funktioner skrivs ut i M1 (recept) / M2 (plan) —
// M0 levererar bara `isMatReady()`-gaten + helpers så API-routes kan
// implementeras stegvis.

import { Client } from "@notionhq/client";
import type { Ingredient } from "./types";

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

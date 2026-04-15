// ─── Notion — planerade pass + (valfri) träningslogg ────────────────────────

import { Client } from "@notionhq/client";
import type { PlannedWorkout } from "./types";

const TOKEN = process.env.NOTION_TOKEN ?? "";
const PLANS_DB = process.env.NOTION_FITNESS_PLANS_DB ?? "";
const LOG_DB = process.env.NOTION_FITNESS_LOG_DB ?? "";

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

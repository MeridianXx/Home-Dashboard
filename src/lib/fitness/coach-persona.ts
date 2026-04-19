// ─── Coach-persona — Notion-sida som system-prompt ───────────────────────────
// Läser in sidan NOTION_FITNESS_COACH_PAGE som plain text (markdown-aktigt)
// och cachas 5 min. Innehållet skickas som `system`-prompt i Claude-anropet
// så det inte äter plats i user-prompten och får bättre cache-hit.

import { Client } from "@notionhq/client";

const PAGE_ID = process.env.NOTION_FITNESS_COACH_PAGE ?? "";
const TOKEN = process.env.NOTION_TOKEN ?? "";
const CACHE_TTL = 5 * 60 * 1000;

let cache: { text: string; timestamp: number } | null = null;
let notionClient: Client | null = null;

function getClient(): Client {
  if (!TOKEN) throw new Error("NOTION_TOKEN saknas i env");
  if (!notionClient) notionClient = new Client({ auth: TOKEN });
  return notionClient;
}

export function isCoachPersonaConfigured(): boolean {
  return PAGE_ID.length > 0;
}

// ─── Block → plain text ──────────────────────────────────────────────────────

// Rich text array (headings, paragraphs, list items, ...) → plain string.
function richTextToString(rt: unknown): string {
  if (!Array.isArray(rt)) return "";
  return (rt as Array<{ plain_text?: string }>)
    .map((r) => r.plain_text ?? "")
    .join("");
}

interface BlockLike {
  id: string;
  type: string;
  has_children?: boolean;
  [key: string]: unknown;
}

function blockToLines(block: BlockLike, depth: number): string[] {
  const indent = "  ".repeat(depth);
  const get = (key: string): unknown => (block as Record<string, unknown>)[key];

  switch (block.type) {
    case "heading_1": {
      const t = richTextToString((get("heading_1") as { rich_text?: unknown })?.rich_text);
      return [`${indent}# ${t}`];
    }
    case "heading_2": {
      const t = richTextToString((get("heading_2") as { rich_text?: unknown })?.rich_text);
      return [`${indent}## ${t}`];
    }
    case "heading_3": {
      const t = richTextToString((get("heading_3") as { rich_text?: unknown })?.rich_text);
      return [`${indent}### ${t}`];
    }
    case "paragraph": {
      const t = richTextToString((get("paragraph") as { rich_text?: unknown })?.rich_text);
      return t ? [`${indent}${t}`] : [""];
    }
    case "bulleted_list_item": {
      const t = richTextToString((get("bulleted_list_item") as { rich_text?: unknown })?.rich_text);
      return [`${indent}- ${t}`];
    }
    case "numbered_list_item": {
      const t = richTextToString((get("numbered_list_item") as { rich_text?: unknown })?.rich_text);
      return [`${indent}1. ${t}`];
    }
    case "quote": {
      const t = richTextToString((get("quote") as { rich_text?: unknown })?.rich_text);
      return [`${indent}> ${t}`];
    }
    case "code": {
      const t = richTextToString((get("code") as { rich_text?: unknown })?.rich_text);
      return [`${indent}${t}`];
    }
    case "callout": {
      const t = richTextToString((get("callout") as { rich_text?: unknown })?.rich_text);
      return [`${indent}${t}`];
    }
    case "divider":
      return [`${indent}---`];
    case "toggle": {
      const t = richTextToString((get("toggle") as { rich_text?: unknown })?.rich_text);
      return [`${indent}${t}`];
    }
    default:
      return [];
  }
}

async function fetchBlockChildren(blockId: string, depth: number): Promise<string[]> {
  const n = getClient();
  const out: string[] = [];
  let cursor: string | undefined;
  do {
    const res = (await n.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    })) as unknown as { results: BlockLike[]; next_cursor: string | null };
    for (const block of res.results) {
      const lines = blockToLines(block, depth);
      out.push(...lines);
      if (block.has_children) {
        const children = await fetchBlockChildren(block.id, depth + 1);
        out.push(...children);
      }
    }
    cursor = res.next_cursor ?? undefined;
  } while (cursor);
  return out;
}

// ─── Publikt API ─────────────────────────────────────────────────────────────

/**
 * Hämta coach-personan som markdown-aktig plain text. 5 min in-memory cache.
 * Returnerar null om ingen sida är konfigurerad.
 */
export async function getCoachPersona(opts: { skipCache?: boolean } = {}): Promise<string | null> {
  if (!PAGE_ID) return null;
  if (!opts.skipCache && cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return cache.text;
  }
  const lines = await fetchBlockChildren(PAGE_ID, 0);
  const text = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  cache = { text, timestamp: Date.now() };
  return text;
}

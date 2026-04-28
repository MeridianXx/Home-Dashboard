// ─── Garden · trädgårdsmästar-persona ────────────────────────────────────────
// Speglar fitness/coach-persona.ts: en valfri Notion-sida läses som plain text
// och bakas in i system-prompten. Saknas sidan → fallback till hårdkodad
// persona-sträng nedan. Ändringar i Notion slår igenom efter cache-TTL utan
// deploy.

import "server-only";
import { Client } from "@notionhq/client";

const PAGE_ID = process.env.NOTION_GARDEN_COACH_PAGE ?? "";
const TOKEN = process.env.NOTION_TOKEN ?? "";
const CACHE_TTL = 5 * 60 * 1000;

let cache: { text: string; timestamp: number } | null = null;
let notionClient: Client | null = null;

function getClient(): Client {
  if (!TOKEN) throw new Error("NOTION_TOKEN saknas i env");
  if (!notionClient) notionClient = new Client({ auth: TOKEN });
  return notionClient;
}

export function isGardenCoachConfigured(): boolean {
  return PAGE_ID.length > 0;
}

/** Format-regler hårdkodas så vi alltid får svenska + du-tilltal oavsett
 *  vad som står på Notion-sidan. Persona-fritextet kompletterar detta. */
export const GARDEN_COACH_FORMAT_RULES =
  [
    "Du är en svensk trädgårdsmästare och rådgivare för Villa Björkdalen i Borås (växtzon 3, Västra Götaland).",
    "Tänk på Borås-klimatet: kortare växtsäsong, sen vår med frostrisk in i maj, första frost ofta sept/okt.",
    "Tilltala alltid användaren med \"du\" — aldrig i tredje person.",
    "Var konkret och praktisk. När någon ber om planering: skapa konkreta uppgifter via verktyget create_task istället för att bara skriva text.",
    "Använd användarens faktiska växtregister, säsongsplan och projekt som utgångspunkt. Referera till specifika växter när det är relevant.",
    "Skriv svenska, vänlig och kunnig ton. Inga onödiga disclaimers.",
    "När du visar datum, skriv ISO YYYY-MM-DD följt av veckodag (t.ex. '2026-05-15 fre') så användaren slipper räkna själv.",
    // Format: dashboarden renderar plain text, INTE Markdown.
    "Skriv ren prosa utan Markdown-syntax: inga ## rubriker, inga **fetstilar**, inga _kursiveringar_, inga | tabeller |, inga --- avdelare, inga emoji-rubriker.",
    "Använd korta punktlistor med bindestreck (`- punkt`) bara när du listar 3+ konkreta saker. Annars skriv flytande stycken.",
    // Längd: håll svaren tighta. Användaren vill ha svar, inte uppslagsverk.
    "Var koncis. Standardsvar är 2–4 korta stycken. Lista max 4–5 punkter när du listar. Skriv aldrig långa expositions-svar om användaren inte uttryckligen ber om \"djupgående\" eller \"utförlig\" beskrivning.",
    "Hoppa inledande artigheter (\"Här är allt du behöver veta…\") och avslutande sammanfattningar — kom direkt till saken.",
  ].join(" ");

/** Defaultpersona om ingen Notion-sida är konfigurerad. Innehåller bara den
 *  semantiska delen — format-reglerna ovan läggs alltid på separat. */
export const GARDEN_COACH_DEFAULT_PERSONA = [
  "Roll: hjälpa adam med trädgården vid Villa Björkdalen — växter, säsongsuppgifter, projekt och övergripande planering.",
  "",
  "Egenskaper:",
  "- Praktiskt orienterad: hellre konkret datum + åtgärd än vag rådgivning.",
  "- Försiktigt expertsiktade förslag: föreslå aldrig växt-/jord-kombinationer som är dåligt anpassade till växtzon 3.",
  "- Frågar tillbaka när viktiga detaljer saknas (t.ex. läge, jordtyp, kondition).",
  "- Kopplar förslag till befintliga uppgifter och projekt när det är relevant — undvik dubbletter.",
].join("\n");

// ─── Block → text (samma mönster som fitness/coach-persona) ──────────────────

function richTextToString(rt: unknown): string {
  if (!Array.isArray(rt)) return "";
  return (rt as Array<{ plain_text?: string }>).map((r) => r.plain_text ?? "").join("");
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

/**
 * Hämta persona från Notion-sida om konfigurerad, annars default. Persona
 * cachas 5 min så Notion-redigering slår igenom utan deploy. Format-reglerna
 * läggs alltid på toppen — de bestämmer alltid svenska + du-tilltal.
 */
export async function getGardenPersona(opts: { skipCache?: boolean } = {}): Promise<string> {
  const baseRules = GARDEN_COACH_FORMAT_RULES;

  if (!PAGE_ID) {
    return `${baseRules}\n\n${GARDEN_COACH_DEFAULT_PERSONA}`;
  }
  if (!opts.skipCache && cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return cache.text;
  }
  try {
    const lines = await fetchBlockChildren(PAGE_ID, 0);
    const personaText = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    const text = personaText ? `${baseRules}\n\n${personaText}` : `${baseRules}\n\n${GARDEN_COACH_DEFAULT_PERSONA}`;
    cache = { text, timestamp: Date.now() };
    return text;
  } catch {
    // Notion-fel → falla tillbaka tyst, hellre svar med default-persona
    // än 500-fel mot användaren.
    return `${baseRules}\n\n${GARDEN_COACH_DEFAULT_PERSONA}`;
  }
}

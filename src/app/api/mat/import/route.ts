// ─── Mat — Import-pipeline ───────────────────────────────────────────────────
// POST { url } → fetcha HTML → extrahera og:image + meta server-side →
// skicka HTML-utdrag till Claude Sonnet 4.6 för strukturerad recept-extraktion
// → returnera JSON för review-modalen att visa innan användaren sparar.
//
// Spara-steget går via /api/mat/recipes (POST) — separation: import är ren
// extraction, persisten är användarens "ok, spara".

import { NextResponse } from "next/server";
import { createMessage, isClaudeReady } from "@/lib/ai/claude";
import { isMatReady, domainFromUrl } from "@/lib/mat/notion";
import { rateLimitOr429, RATE_LIMIT_AI_EXPENSIVE } from "@/lib/rate-limit";
import type { ImportedRecipe, Ingredient } from "@/lib/mat/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SYSTEM_PROMPT = [
  "Du extraherar svenska recept från recept-sidor (ICA, Köket, Coop, Mathem, Recepten.se, Tasteline, m.fl.).",
  "Du svarar ENDAST med ett JSON-objekt, ingen prosa, ingen Markdown-fence.",
  "",
  "JSON-struktur:",
  "{",
  '  "namn": string,                    // receptets titel',
  '  "lede": string,                    // 1 mening, kort ingress',
  '  "ingredienser": [{ "v": number|null, "u": string, "n": string }],',
  '  "steg": string[],                  // tillagningssteg, en post per steg',
  '  "minTotal": number|null,           // total tid i minuter',
  '  "svarighet": 1|2|3|null,           // 1=lätt, 2=medel, 3=svår',
  '  "basPortioner": number,            // portioner receptet är skrivet för, default 4',
  '  "taggar": string[],                // 0–4 lämpliga taggar från: Vegetariskt, Snabbt, Barnvänligt, Helg, Vardag, Festmat, Soppa, Sallad, Pasta, Ris, Fisk, Kött, Kyckling, Bakning',
  '  "vintips": string                  // tom sträng om saknas',
  "}",
  "",
  "Regler:",
  "- Behåll svenska originaltermer (msk, tsk, dl, st, klyfta, krm).",
  '- "v": null när receptet säger "efter smak", "en nypa", "en skvätt" — låt "u" eller "n" beskriva mängden istället.',
  "- Skriv steg som hela meningar utan ledande siffra eller bullet.",
  "- minTotal: summera prep + tillagning om båda anges.",
  '- Om receptet inte har explicit portionsantal, sätt basPortioner = 4.',
  "- Lede: skriv egen kort kursiv-värdig mening om receptet inte har en själv.",
].join("\n");

interface ImportBody {
  url?: string;
}

export async function POST(req: Request) {
  if (!isMatReady()) {
    return NextResponse.json(
      { error: "Mat-DB:erna är inte konfigurerade." },
      { status: 501 },
    );
  }
  if (!isClaudeReady()) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY saknas i env." },
      { status: 501 },
    );
  }

  const limited = await rateLimitOr429(req, "mat:import", RATE_LIMIT_AI_EXPENSIVE);
  if (limited) return limited;

  let body: ImportBody;
  try {
    body = (await req.json()) as ImportBody;
  } catch {
    return NextResponse.json({ error: "JSON-body krävs" }, { status: 400 });
  }

  const url = body.url?.trim();
  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "Giltig http(s)-URL krävs" }, { status: 400 });
  }

  // 1. Fetcha HTML.
  let html: string;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.6",
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Hämtning misslyckades (${res.status})` },
        { status: 502 },
      );
    }
    html = await res.text();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Kunde inte hämta sidan: ${message}` }, { status: 502 });
  }

  // 2. Extrahera og:image / twitter:image / schema.org image — i prioritetsordning.
  const bildUrl = extractImageUrl(html, url);

  // 3. Skala ner HTML till relevant innehåll innan Claude — full sida kan vara
  //    flera hundra KB med ads, sidebars, scripts. Vi extraherar `<main>`,
  //    `<article>` eller `<body>` och strippar tags som ändå inte hjälper
  //    extraktionen (script, style, svg, nav, footer, header).
  const slimmed = slimHtml(html);

  // 4. Skicka till Claude för strukturerad extraktion.
  let imported: ImportedRecipe;
  try {
    const message = await createMessage({
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content:
            `Extrahera receptet från denna sida. Källans URL: ${url}\n\n` +
            "HTML (relevant del):\n```\n" + slimmed + "\n```",
        },
      ],
      max_tokens: 3000,
    });
    const text = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("\n")
      .trim();
    imported = parseClaudeJson(text);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Claude-extraktion misslyckades: ${message}` }, { status: 502 });
  }

  // 5. Komplettera med källans bild + URL + domän.
  const final: ImportedRecipe = {
    ...imported,
    bildUrl: imported.bildUrl ?? bildUrl,
    kallaUrl: url,
    kallaLabel: domainFromUrl(url),
  };

  return NextResponse.json({ imported: final });
}

// ── Hjälpare ────────────────────────────────────────────────────────────────

function extractImageUrl(html: string, baseUrl: string): string | null {
  // 1. og:image
  const og = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i.exec(html);
  // 2. twitter:image
  const tw = /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i.exec(html);
  // 3. schema.org Recipe.image (första JSON-LD-block)
  const ld = extractFirstSchemaImage(html);

  const raw = og?.[1] ?? tw?.[1] ?? ld;
  if (!raw) return null;
  try {
    return new URL(raw, baseUrl).href;
  } catch {
    return null;
  }
}

function extractFirstSchemaImage(html: string): string | null {
  const blocks = html.match(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi);
  if (!blocks) return null;
  for (const block of blocks) {
    const m = /<script[^>]*>([\s\S]*?)<\/script>/i.exec(block);
    if (!m) continue;
    try {
      const data = JSON.parse(m[1].trim()) as unknown;
      const found = findRecipeImage(data);
      if (found) return found;
    } catch {
      // ignore — fortsätt till nästa block
    }
  }
  return null;
}

function findRecipeImage(node: unknown): string | null {
  if (!node || typeof node !== "object") return null;
  const obj = node as Record<string, unknown>;
  const type = obj["@type"];
  const isRecipe =
    type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"));
  if (isRecipe) {
    const img = obj["image"];
    if (typeof img === "string") return img;
    if (Array.isArray(img) && img.length > 0) {
      const first = img[0];
      if (typeof first === "string") return first;
      if (typeof first === "object" && first && "url" in first) {
        const u = (first as { url?: unknown }).url;
        if (typeof u === "string") return u;
      }
    }
    if (typeof img === "object" && img && "url" in img) {
      const u = (img as { url?: unknown }).url;
      if (typeof u === "string") return u;
    }
  }
  // Rekursiv sökning för @graph och nästlade noder
  for (const key of Object.keys(obj)) {
    const v = obj[key];
    if (Array.isArray(v)) {
      for (const item of v) {
        const found = findRecipeImage(item);
        if (found) return found;
      }
    } else if (typeof v === "object") {
      const found = findRecipeImage(v);
      if (found) return found;
    }
  }
  return null;
}

function slimHtml(html: string): string {
  // Plocka ut <main> eller <article> om det finns — annars hela <body>.
  const main = /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html);
  const article = /<article\b[^>]*>([\s\S]*?)<\/article>/i.exec(html);
  const bodyMatch = /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(html);
  let body = main?.[1] ?? article?.[1] ?? bodyMatch?.[1] ?? html;

  // Strippar bort taggar som inte bidrar till extraktionen.
  body = body
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<nav\b[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer\b[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header\b[\s\S]*?<\/header>/gi, " ")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, " ")
    // Bevara JSON-LD-script eftersom det ofta innehåller hela receptet
    // strukturerat — men det togs bort av regex ovan. Lägg tillbaka det
    // från ursprungssidan om finns.
    .replace(/\s+/g, " ")
    .trim();

  // Lägg till JSON-LD från originalsidan (Claude använder den om finns).
  const ldBlocks = html.match(
    /<script[^>]+application\/ld\+json[^>]*>[\s\S]*?<\/script>/gi,
  );
  if (ldBlocks) {
    body = ldBlocks.join("\n") + "\n\n" + body;
  }

  // Trunkera så vi inte skickar 200 KB till Claude.
  const MAX_LEN = 60_000;
  if (body.length > MAX_LEN) body = body.slice(0, MAX_LEN);
  return body;
}

function parseClaudeJson(raw: string): ImportedRecipe {
  let s = raw.trim();
  // Strippa ev. Markdown-fence ```json … ```.
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  }
  // Lokalisera första `{` och sista `}` ifall Claude bifogat prosa.
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    s = s.slice(first, last + 1);
  }

  const parsed = JSON.parse(s) as Partial<ImportedRecipe>;
  // Defensive normalisering — fyll i defaults om Claude hoppat fält.
  const namn = typeof parsed.namn === "string" ? parsed.namn.trim() : "";
  if (!namn) throw new Error("Inget recept-namn extraherat");
  return {
    namn,
    lede: typeof parsed.lede === "string" ? parsed.lede.trim() : "",
    ingredienser: normalizeIngredients(parsed.ingredienser),
    steg: Array.isArray(parsed.steg)
      ? parsed.steg.filter((s): s is string => typeof s === "string").map((s) => s.trim()).filter(Boolean)
      : [],
    minTotal:
      typeof parsed.minTotal === "number" && Number.isFinite(parsed.minTotal)
        ? parsed.minTotal
        : null,
    svarighet:
      typeof parsed.svarighet === "number" && [1, 2, 3].includes(parsed.svarighet)
        ? parsed.svarighet
        : null,
    basPortioner:
      typeof parsed.basPortioner === "number" && parsed.basPortioner > 0
        ? Math.round(parsed.basPortioner)
        : 4,
    taggar: Array.isArray(parsed.taggar)
      ? parsed.taggar.filter((t): t is string => typeof t === "string")
      : [],
    vintips: typeof parsed.vintips === "string" ? parsed.vintips.trim() : "",
    // Bildurl, kallaUrl, kallaLabel sätts av routen efter Claude-svaret.
    bildUrl: typeof parsed.bildUrl === "string" ? parsed.bildUrl : null,
    kallaUrl: "",
    kallaLabel: "",
  };
}

function normalizeIngredients(raw: unknown): Ingredient[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r): r is Record<string, unknown> => typeof r === "object" && r !== null)
    .map((r) => ({
      v: typeof r.v === "number" && Number.isFinite(r.v) ? r.v : null,
      u: typeof r.u === "string" ? r.u : "",
      n: typeof r.n === "string" ? r.n.trim() : "",
    }))
    .filter((i) => i.n.length > 0);
}

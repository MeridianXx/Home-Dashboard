// ─── Garden · daglig briefing ────────────────────────────────────────────────
// GET /api/garden/briefing — returnerar 100–150-ords text som hero-kort på
// översiktssidan kan visa. 6 timmars in-memory cache så samma briefing inte
// regenereras vid varje sidladdning.
//
// Query: ?refresh=1 → bypassar cache.

import { NextResponse } from "next/server";
import { createMessage, isClaudeReady } from "@/lib/ai/claude";
import { isGardenReady } from "@/lib/garden/notion";
import {
  buildGardenContext,
  formatContextAsSystemBlock,
  summarizeContext,
} from "@/lib/garden/ai-context";
import { getGardenPersona } from "@/lib/garden/coach-persona";
import { rateLimitOr429, RATE_LIMIT_AI_CACHED } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CACHE_TTL = 6 * 60 * 60 * 1000;
let cache: { briefing: string; generatedAt: string; timestamp: number } | null = null;

const BRIEFING_PROMPT = [
  "Generera en kort daglig briefing (max 150 ord) för dagen baserat på väder,",
  "kommande uppgifter och växternas status. Format: 2–3 stycken,",
  "vänlig ton. Du-tilltal. Lyfta:",
  "1. Vad vädret betyder för dagens trädgårdsarbete (regn? frost? värme?).",
  "2. Vad som är på gång snart eller idag — kommande uppgifter, projekt som rör sig.",
  "3. Ev. en specifik sak du tycker användaren bör tänka på just nu.",
  "",
  "Inga rubriker. Inga punktlistor. Använd siffror sparsamt — det här är en morgonkaffe-briefing, inte en rapport.",
].join("\n");

export async function GET(req: Request) {
  if (!isGardenReady()) {
    return NextResponse.json(
      { error: "Trädgårds-DB:erna är inte konfigurerade." },
      { status: 501 },
    );
  }
  if (!isClaudeReady()) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY saknas i env." },
      { status: 501 },
    );
  }

  const url = new URL(req.url);
  const refresh = url.searchParams.get("refresh") === "1";

  // Rate limit bara på refresh — cachade hits är gratis och kan släppas
  // igenom utan budget-risk.
  if (refresh) {
    const limited = await rateLimitOr429(
      req,
      "garden:briefing",
      RATE_LIMIT_AI_CACHED
    );
    if (limited) return limited;
  }

  if (!refresh && cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json({
      briefing: cache.briefing,
      generatedAt: cache.generatedAt,
      cached: true,
    });
  }

  try {
    const [ctx, persona] = await Promise.all([
      buildGardenContext(),
      getGardenPersona(),
    ]);

    const system = `${persona}\n\nKONTEXT:\n${formatContextAsSystemBlock(ctx)}`;

    const message = await createMessage({
      system,
      messages: [{ role: "user", content: BRIEFING_PROMPT }],
      max_tokens: 600,
    });

    const briefing = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("\n")
      .trim();

    const generatedAt = new Date().toISOString();
    cache = { briefing, generatedAt, timestamp: Date.now() };

    return NextResponse.json({
      briefing,
      generatedAt,
      cached: false,
      contextSummary: summarizeContext(ctx),
      usage: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── Garden · chat-endpoint ──────────────────────────────────────────────────
// POST /api/garden/chat — streamar AI-svar via SSE.
//
// Body: { messages: ChatMessage[], contextRefresh?: boolean }
// Output: text/event-stream med data-rader på formen `data: <JSON>\n\n`,
// där JSON är ett `StreamEvent` (text-deltas, tool-use-event, stop, error).

import { NextResponse } from "next/server";
import { isClaudeReady } from "@/lib/ai/claude";
import { runWithTools } from "@/lib/ai/tools";
import { isGardenReady } from "@/lib/garden/notion";
import { buildGardenContext, formatContextAsSystemBlock } from "@/lib/garden/ai-context";
import { gardenToolRegistry, describeTools } from "@/lib/garden/ai-tools";
import { getGardenPersona } from "@/lib/garden/coach-persona";
import { rateLimitOr429, RATE_LIMIT_AI_CHAT } from "@/lib/rate-limit";
import { validateChatMessages } from "@/lib/ai/validate";
import type {
  ChatMessage,
  StreamEvent,
  AnthropicMessageParam,
} from "@/lib/ai/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface ChatBody {
  messages: ChatMessage[];
  contextRefresh?: boolean;
}

/** Minimal SSE-encoder. Alla event serialiseras som JSON och en tom rad
 *  signalerar slutet av eventet. */
function sseLine(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function toSdkMessages(messages: ChatMessage[]): AnthropicMessageParam[] {
  return messages.map((m) => {
    if (typeof m.content === "string") {
      return { role: m.role, content: m.content };
    }
    return { role: m.role, content: m.content };
  });
}

export async function POST(req: Request) {
  const limited = await rateLimitOr429(req, "garden:chat", RATE_LIMIT_AI_CHAT);
  if (limited) return limited;

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

  let body: ChatBody;
  try {
    body = (await req.json()) as ChatBody;
  } catch {
    return NextResponse.json({ error: "Ogiltig JSON-body." }, { status: 400 });
  }
  const validationError = validateChatMessages(body.messages);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  // Bygg kontext + persona parallellt. Persona-cache är 5 min så detta är
  // billigt även om kontexten kostar 1-2 Notion-anrop.
  const [ctx, persona] = await Promise.all([
    buildGardenContext(),
    getGardenPersona({ skipCache: body.contextRefresh }),
  ]);

  const registry = gardenToolRegistry();
  const system = [
    persona,
    "VERKTYG DU HAR:",
    describeTools(registry),
    "",
    "KONTEXT (uppdateras inför varje samtal):",
    formatContextAsSystemBlock(ctx),
  ].join("\n\n");

  const sdkMessages = toSdkMessages(body.messages);

  // SSE-stream tillbaka till klienten. ReadableStream + TextEncoder är
  // standardvägen i App Router.
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: StreamEvent) => {
        try {
          controller.enqueue(encoder.encode(sseLine(event)));
        } catch {
          // controller stängd — klienten har avbrutit. Hoppa över.
        }
      };

      try {
        await runWithTools({
          system,
          messages: sdkMessages,
          registry,
          maxTokens: 3500,
          onEvent: send,
        });
      } catch (err) {
        send({ type: "error", message: err instanceof Error ? err.message : String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // hindrar reverse-proxy från att buffra
    },
  });
}

/** GET (debug) — returnerar bara kontext-sammanfattning. Används av UI:t för
 *  sidofältet "kontext-info" innan användaren ens skickar första meddelandet. */
export async function GET() {
  if (!isGardenReady()) {
    return NextResponse.json({ error: "Trädgårds-DB:erna är inte konfigurerade." }, { status: 501 });
  }
  try {
    const ctx = await buildGardenContext();
    return NextResponse.json({
      currentDate: ctx.currentDate,
      gardenZone: ctx.gardenZone,
      plantCount: ctx.plants.length,
      upcomingTaskCount: ctx.upcomingTasks.length,
      activeProjectCount: ctx.activeProjects.length,
      weatherToday: ctx.weather?.forecast[0] ?? null,
      claudeReady: isClaudeReady(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

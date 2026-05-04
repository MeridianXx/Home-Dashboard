// ─── Fitness · chat-endpoint ─────────────────────────────────────────────────
// POST /api/fitness/chat — streamar coach-svar via SSE.
// Speglar `garden/chat`-routen men använder fitness-context (PMC, recent
// workouts, planerade pass) + fitness-tools (plan-CRUD + AI-genereringar).

import { NextResponse } from "next/server";
import { isClaudeReady } from "@/lib/ai/claude";
import { runWithTools } from "@/lib/ai/tools";
import { isLogDbReady } from "@/lib/fitness/notion";
import { buildContext } from "@/lib/fitness/context";
import { fitnessToolRegistry, describeFitnessTools } from "@/lib/fitness/ai-tools";
import { getCoachPersona } from "@/lib/fitness/coach-persona";
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

function sseLine(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function toSdkMessages(messages: ChatMessage[]): AnthropicMessageParam[] {
  return messages.map((m) => {
    if (typeof m.content === "string") return { role: m.role, content: m.content };
    return { role: m.role, content: m.content };
  });
}

export async function POST(req: Request) {
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
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: "messages krävs (icke-tom array)." }, { status: 400 });
  }

  // Bygg kontext + persona parallellt. `buildContext` läser HealthFit + Notion
  // (PMC, recent workouts, planerade pass, hälsodata) — kan ta 1-2 s.
  const [ctx, persona] = await Promise.all([
    buildContext({ recentCount: 15, weeklyWeeks: 12 }).catch((err) => {
      console.warn("[fitness/chat] kunde inte bygga kontext:", err);
      return null;
    }),
    getCoachPersona({ skipCache: body.contextRefresh }),
  ]);

  const registry = fitnessToolRegistry();
  const sections: string[] = [];
  if (persona) sections.push(persona);
  sections.push("VERKTYG DU HAR:");
  sections.push(describeFitnessTools(registry));
  sections.push("");
  sections.push(
    "ARBETSFLÖDE: när användaren ber om planering eller pass-förslag, " +
      "använd alltid `generate_week_plan` eller `generate_single_workout` " +
      "för att producera förslagen — skriv inte pass från grunden själv. " +
      "Innan du anropar `create_planned_workout`, läs upp förslaget för " +
      "användaren och fråga om hen vill att du sparar det. Använd " +
      "`list_planned_workouts` när du behöver veta plan-id för att " +
      "uppdatera/arkivera.",
  );
  if (ctx) {
    sections.push("");
    sections.push("KONTEXT (uppdateras inför varje samtal):");
    sections.push(ctx.text);
  } else {
    sections.push("");
    sections.push("OBS: Kontextpaketet kunde inte byggas (HealthFit eller Notion otillgängligt) — fråga användaren om det du behöver veta.");
  }

  const system = sections.join("\n\n");
  const sdkMessages = toSdkMessages(body.messages);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: StreamEvent) => {
        try {
          controller.enqueue(encoder.encode(sseLine(event)));
        } catch {
          // klienten stängde — hoppa över
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
      "X-Accel-Buffering": "no",
    },
  });
}

/** GET — kort kontext-sammanfattning för UI:ts kontextpanel. */
export async function GET() {
  if (!isClaudeReady()) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY saknas." }, { status: 501 });
  }
  try {
    const ctx = await buildContext({ recentCount: 5, weeklyWeeks: 4, skipPlans: false });
    return NextResponse.json({
      currentDate: new Date().toISOString().slice(0, 10),
      recentWorkouts: ctx.workouts.length,
      load: {
        ctl: ctx.load.ctl,
        atl: ctx.load.atl,
        tsb: ctx.load.tsb,
      },
      plansConfigured: true,
      logDbReady: isLogDbReady(),
      claudeReady: isClaudeReady(),
      sourceFile: ctx.sourceFile,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

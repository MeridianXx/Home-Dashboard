// ─── AI-planerings-coach ─────────────────────────────────────────────────────
// POST /api/fitness/coach
//
// Två lägen:
//   { prompt }  → generera ny plan via Claude, returnera commentary + plan.
//                 INGET skrivs till Notion.
//   { items }   → skriv redan-genererade pass till Notion utan att anropa Claude.
//                 Används av "Spara"-knappen så det som sparas = det som visades.

import { NextResponse } from "next/server";
import { generateTrainingPlan, isClaudeReady } from "@/lib/fitness/claude";
import { createPlannedWorkouts, type PlannedWorkoutInput } from "@/lib/fitness/notion";

export const dynamic = "force-dynamic";
// Plan-generering tar 20–30 s, save-only är snabbt.
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      prompt?: string;
      items?: PlannedWorkoutInput[];
    };

    // Save-only: klienten skickar färdiga pass → skriv direkt till Notion.
    if (Array.isArray(body.items)) {
      if (body.items.length === 0) {
        return NextResponse.json({ error: "items får inte vara tom" }, { status: 400 });
      }
      const { created, errors } = await createPlannedWorkouts(body.items);
      return NextResponse.json({ created, errors });
    }

    // Generera-läget
    if (!isClaudeReady()) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY saknas — lägg till i env för att aktivera AI-planering" },
        { status: 501 },
      );
    }
    const prompt = (body.prompt ?? "").trim();
    if (!prompt) {
      return NextResponse.json({ error: "prompt krävs" }, { status: 400 });
    }

    const result = await generateTrainingPlan(prompt);
    return NextResponse.json({
      commentary: result.commentary,
      plan: result.plan,
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      sourceFile: result.sourceFile,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

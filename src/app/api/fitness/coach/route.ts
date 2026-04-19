// ─── AI-planerings-coach ─────────────────────────────────────────────────────
// POST /api/fitness/coach
//
// Fyra lägen (diskrimineras på body-fält):
//   { prompt }                              → generera ny plan (initial).
//   { items }                               → skriv färdiga pass till Notion utan Claude.
//   { revise: { prompt, plan, feedback } }  → revidera hela planen utifrån feedback.
//   { regenerate: { prompt, plan, index, hint? } } → byt ut ett enskilt pass.

import { NextResponse } from "next/server";
import {
  generateTrainingPlan,
  reviseTrainingPlan,
  regeneratePlanItem,
  isClaudeReady,
  PlanParseError,
  type GeneratedPlanItem,
} from "@/lib/fitness/claude";
import { createPlannedWorkouts, type PlannedWorkoutInput } from "@/lib/fitness/notion";

export const dynamic = "force-dynamic";
// Plan-generering tar 20–30 s, save-only är snabbt.
export const maxDuration = 60;

interface CoachBody {
  prompt?: string;
  items?: PlannedWorkoutInput[];
  revise?: { prompt: string; plan: GeneratedPlanItem[]; feedback: string };
  regenerate?: { prompt: string; plan: GeneratedPlanItem[]; index: number; hint?: string };
}

function claudeGuard(): NextResponse | null {
  if (!isClaudeReady()) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY saknas — lägg till i env för att aktivera AI-planering" },
      { status: 501 },
    );
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CoachBody;

    // ─── Save-only ────────────────────────────────────────────────────────
    if (Array.isArray(body.items)) {
      if (body.items.length === 0) {
        return NextResponse.json({ error: "items får inte vara tom" }, { status: 400 });
      }
      const { created, errors } = await createPlannedWorkouts(body.items);
      return NextResponse.json({ created, errors });
    }

    // ─── Regenerera ett enskilt pass ──────────────────────────────────────
    if (body.regenerate) {
      const guard = claudeGuard();
      if (guard) return guard;
      const { prompt, plan, index, hint } = body.regenerate;
      if (!prompt || !Array.isArray(plan) || typeof index !== "number") {
        return NextResponse.json(
          { error: "regenerate kräver { prompt, plan, index }" },
          { status: 400 },
        );
      }
      const result = await regeneratePlanItem({
        previousPlan: plan,
        index,
        originalPrompt: prompt,
        hint,
      });
      return NextResponse.json(result);
    }

    // ─── Revidera hela planen utifrån feedback ────────────────────────────
    if (body.revise) {
      const guard = claudeGuard();
      if (guard) return guard;
      const { prompt, plan, feedback } = body.revise;
      if (!prompt || !Array.isArray(plan) || !feedback?.trim()) {
        return NextResponse.json(
          { error: "revise kräver { prompt, plan, feedback }" },
          { status: 400 },
        );
      }
      const result = await reviseTrainingPlan({
        originalPrompt: prompt,
        previousPlan: plan,
        feedback,
      });
      return NextResponse.json({
        commentary: result.commentary,
        plan: result.plan,
        model: result.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        sourceFile: result.sourceFile,
      });
    }

    // ─── Generera initialt ────────────────────────────────────────────────
    const guard = claudeGuard();
    if (guard) return guard;
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
    // PlanParseError: returnera råtexten så klienten kan visa den för debug.
    if (err instanceof PlanParseError) {
      return NextResponse.json(
        { error: err.message, rawText: err.rawText.slice(0, 1500) },
        { status: 422 },
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── AI-analys av genomfört pass ─────────────────────────────────────────────
// GET  ?date=&time=&type=       → hämta tidigare sparad analys (om någon)
// POST ?date=&time=&type=       → generera ny analys via Claude + spara i Notion-loggen
//
// Båda hittar passet i senaste Workouts_vN.xlsx. GET svarar med 404 om ingen
// analys finns — UI:t visar då "Generera analys"-knappen.

import { NextResponse } from "next/server";
import { getLatestWorkoutsXlsx } from "@/lib/fitness/drive";
import { parseAllWorkouts } from "@/lib/fitness/parser";
import { analyseWorkout, isClaudeReady } from "@/lib/fitness/claude";
import { getWorkoutAnalysis, isLogDbReady, saveWorkoutAnalysis } from "@/lib/fitness/notion";
import type { Workout } from "@/lib/fitness/types";

export const dynamic = "force-dynamic";
// Claude-anrop med full kontext tar 5–15 s beroende på input-längd.
export const maxDuration = 60;

function readQuery(req: Request): { date: string; time: string; type: string } | null {
  const u = new URL(req.url);
  const date = u.searchParams.get("date");
  const time = u.searchParams.get("time");
  const type = u.searchParams.get("type");
  if (!date || !time || !type) return null;
  return { date, time, type };
}

function matchKey(w: Workout, q: { date: string; time: string; type: string }): boolean {
  if (w.date !== q.date) return false;
  const wT = (w.time ?? "").replace(":", "");
  const qT = q.time.replace(":", "");
  if (wT !== qT) return false;
  // Tolerant typ-match: Apple Watch exporterar "Outdoor Running", slug är bara "Running"
  const wType = w.type.toLowerCase();
  const qType = q.type.toLowerCase();
  return wType.includes(qType) || qType.includes(wType);
}

async function findWorkout(q: { date: string; time: string; type: string }): Promise<Workout | null> {
  const file = await getLatestWorkoutsXlsx();
  if (!file) return null;
  const workouts = parseAllWorkouts(file.buffer);
  return workouts.find((w) => matchKey(w, q)) ?? null;
}

export async function GET(req: Request) {
  try {
    const q = readQuery(req);
    if (!q) return NextResponse.json({ error: "date, time och type krävs" }, { status: 400 });
    if (!isLogDbReady()) {
      return NextResponse.json({ analysis: null, updatedAt: null, logDbReady: false });
    }
    const found = await getWorkoutAnalysis({ date: q.date, time: q.time, type: q.type });
    return NextResponse.json({
      analysis: found.analysis,
      updatedAt: found.updatedAt,
      logDbReady: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const q = readQuery(req);
    if (!q) return NextResponse.json({ error: "date, time och type krävs" }, { status: 400 });
    if (!isClaudeReady()) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY saknas — lägg till i env för att aktivera AI-analys" },
        { status: 501 },
      );
    }
    const workout = await findWorkout(q);
    if (!workout) return NextResponse.json({ error: "Passet hittades inte i Workouts-filen" }, { status: 404 });

    const result = await analyseWorkout(workout);

    // Spara analysen i Notion-loggen (om DB är konfigurerad).
    let savedPageId: string | null = null;
    if (isLogDbReady()) {
      try {
        savedPageId = await saveWorkoutAnalysis(workout, result.analysis);
      } catch (err) {
        console.error("[fitness/analyse] sparning till Notion misslyckades", err);
      }
    }

    return NextResponse.json({
      analysis: result.analysis,
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      sourceFile: result.sourceFile,
      savedPageId,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

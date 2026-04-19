// ─── Planerade pass — lista (GET) + skapa (POST) ─────────────────────────────
// Enskilda pass uppdateras/arkiveras via /api/fitness/plans/[id].

import { NextResponse } from "next/server";
import {
  getPlannedWorkouts,
  isLogDbReady,
  createPlannedWorkout,
  type PlannedWorkoutInput,
} from "@/lib/fitness/notion";
import type { PlansResponse } from "@/lib/fitness/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;

  try {
    const plans = await getPlannedWorkouts(status);
    const body: PlansResponse = { plans, logDbReady: isLogDbReady() };
    return NextResponse.json(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as PlannedWorkoutInput;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "JSON-body krävs" }, { status: 400 });
    }
    if (!body.datum) {
      return NextResponse.json({ error: "datum (YYYY-MM-DD) krävs" }, { status: 400 });
    }
    const created = await createPlannedWorkout(body);
    return NextResponse.json({ plan: created }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

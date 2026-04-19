// ─── Planerade pass — enskild rad (PATCH / DELETE) ───────────────────────────

import { NextResponse } from "next/server";
import {
  updatePlannedWorkout,
  archivePlannedWorkout,
  type PlannedWorkoutInput,
} from "@/lib/fitness/notion";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    if (!id) return NextResponse.json({ error: "id krävs" }, { status: 400 });
    const body = (await req.json()) as PlannedWorkoutInput;
    const updated = await updatePlannedWorkout(id, body);
    return NextResponse.json({ plan: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    if (!id) return NextResponse.json({ error: "id krävs" }, { status: 400 });
    await archivePlannedWorkout(id);
    return NextResponse.json({ archived: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getLatestWorkoutsXlsx } from "@/lib/fitness/drive";
import { parseRunningWorkouts } from "@/lib/fitness/parser";
import type { WorkoutsResponse } from "@/lib/fitness/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") ?? "10", 10);

  try {
    const file = await getLatestWorkoutsXlsx();
    if (!file) {
      const empty: WorkoutsResponse = {
        workouts: [],
        sourceFile: null,
        sourceModifiedAt: null,
        updatedAt: new Date().toISOString(),
      };
      return NextResponse.json(empty);
    }
    const workouts = parseRunningWorkouts(file.buffer).slice(0, limit);
    const body: WorkoutsResponse = {
      workouts,
      sourceFile: file.filename,
      sourceModifiedAt: file.modifiedTime,
      updatedAt: new Date().toISOString(),
    };
    return NextResponse.json(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

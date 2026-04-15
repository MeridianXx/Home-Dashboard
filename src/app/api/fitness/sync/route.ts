import { NextResponse } from "next/server";
import { getLatestWorkoutsXlsx } from "@/lib/fitness/drive";
import { parseAllWorkouts } from "@/lib/fitness/parser";
import { isLogDbReady, syncWorkoutsToLog } from "@/lib/fitness/notion";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/fitness/sync?limit=20
 *   Läser Workouts_vN.xlsx, pushar de N senaste passen till Notion-träningsloggen.
 *   Idempotent — existerande rader uppdateras.
 */
export async function POST(req: Request) {
  try {
    if (!isLogDbReady()) {
      return NextResponse.json(
        { error: "NOTION_FITNESS_LOG_DB saknas — kör scripts/create-fitness-notion-dbs.mjs" },
        { status: 501 },
      );
    }
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20", 10) || 20, 200);

    const file = await getLatestWorkoutsXlsx();
    if (!file) return NextResponse.json({ error: "Ingen Workouts-fil i Drive" }, { status: 404 });

    const workouts = parseAllWorkouts(file.buffer).slice(0, limit);
    const { created, updated } = await syncWorkoutsToLog(workouts);
    return NextResponse.json({
      total: workouts.length,
      created,
      updated,
      sourceFile: file.filename,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

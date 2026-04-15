import { NextResponse } from "next/server";
import { getPlannedWorkouts, isLogDbReady } from "@/lib/fitness/notion";
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

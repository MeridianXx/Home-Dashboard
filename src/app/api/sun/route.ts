import { NextResponse } from "next/server";
import { getState } from "@/lib/ha";

// Lätt endpoint för auto-tema-resolver. Vi behöver bara `state` ("above_horizon"
// / "below_horizon") från `sun.sun`. Separat route så theme-providern inte behöver
// dra hela /api/homeassistant/weather (forecasts, månfas, etc.) var 5:e minut.

export async function GET() {
  try {
    const sun = await getState("sun.sun");
    const attrs = sun.attributes ?? {};
    return NextResponse.json({
      above_horizon: sun.state === "above_horizon",
      next_rising: (attrs.next_rising as string) ?? null,
      next_setting: (attrs.next_setting as string) ?? null,
      elevation: (attrs.elevation as number) ?? null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

export const dynamic = "force-dynamic";

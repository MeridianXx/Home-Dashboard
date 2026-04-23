// ─── Växtregister — lista (GET) + skapa (POST) ───────────────────────────────

import { NextResponse } from "next/server";
import { getPlants, createPlant, isGardenReady } from "@/lib/garden/notion";
import type { PlantInput, PlantsResponse } from "@/lib/garden/types";

export const dynamic = "force-dynamic";

const NOT_READY_BODY = {
  error:
    "Trädgårds-DB:erna är inte konfigurerade. Sätt NOTION_GARDEN_PLANTS_DB, " +
    "NOTION_GARDEN_SEASON_DB och NOTION_GARDEN_PROJECTS_DB i miljön.",
};

export async function GET(req: Request) {
  if (!isGardenReady()) return NextResponse.json(NOT_READY_BODY, { status: 501 });

  const url = new URL(req.url);
  const typ = url.searchParams.get("typ") ?? undefined;
  const plats = url.searchParams.get("plats") ?? undefined;

  try {
    const plants = await getPlants({ typ, plats });
    const body: PlantsResponse = { plants, gardenReady: true };
    return NextResponse.json(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!isGardenReady()) return NextResponse.json(NOT_READY_BODY, { status: 501 });

  try {
    const body = (await req.json()) as PlantInput;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "JSON-body krävs" }, { status: 400 });
    }
    if (!body.vaxt) {
      return NextResponse.json({ error: "vaxt (namn) krävs" }, { status: 400 });
    }
    const plant = await createPlant(body);
    return NextResponse.json({ plant }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

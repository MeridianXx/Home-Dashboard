// ─── Växtregister — detalj (GET) / uppdatera (PATCH) / arkivera (DELETE) ─────

import { NextResponse } from "next/server";
import {
  getPlantById,
  updatePlant,
  archivePlant,
  isGardenReady,
} from "@/lib/garden/notion";
import type { PlantInput } from "@/lib/garden/types";

export const dynamic = "force-dynamic";

const NOT_READY_BODY = {
  error:
    "Trädgårds-DB:erna är inte konfigurerade. Sätt NOTION_GARDEN_PLANTS_DB m.fl. i miljön.",
};

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isGardenReady()) return NextResponse.json(NOT_READY_BODY, { status: 501 });
  try {
    const { id } = await ctx.params;
    const plant = await getPlantById(id);
    if (!plant) return NextResponse.json({ error: "Växt hittades inte" }, { status: 404 });
    return NextResponse.json({ plant });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isGardenReady()) return NextResponse.json(NOT_READY_BODY, { status: 501 });
  try {
    const { id } = await ctx.params;
    if (!id) return NextResponse.json({ error: "id krävs" }, { status: 400 });
    const body = (await req.json()) as PlantInput;
    const plant = await updatePlant(id, body);
    return NextResponse.json({ plant });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isGardenReady()) return NextResponse.json(NOT_READY_BODY, { status: 501 });
  try {
    const { id } = await ctx.params;
    if (!id) return NextResponse.json({ error: "id krävs" }, { status: 400 });
    await archivePlant(id);
    return NextResponse.json({ archived: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── Utomhusprojekt — detalj (GET) / uppdatera (PATCH) / arkivera (DELETE) ───

import { NextResponse } from "next/server";
import {
  getProjectById,
  updateProject,
  archiveProject,
  isGardenReady,
} from "@/lib/garden/notion";
import type { OutdoorProjectInput } from "@/lib/garden/types";

export const dynamic = "force-dynamic";

const NOT_READY_BODY = {
  error:
    "Trädgårds-DB:erna är inte konfigurerade. Sätt NOTION_GARDEN_PLANTS_DB m.fl. i miljön.",
};

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isGardenReady()) return NextResponse.json(NOT_READY_BODY, { status: 501 });
  try {
    const { id } = await ctx.params;
    const project = await getProjectById(id);
    if (!project) return NextResponse.json({ error: "Projekt hittades inte" }, { status: 404 });
    return NextResponse.json({ project });
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
    const body = (await req.json()) as OutdoorProjectInput;
    const project = await updateProject(id, body);
    return NextResponse.json({ project });
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
    await archiveProject(id);
    return NextResponse.json({ archived: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── Mat — Veckoplan-slot (PATCH / DELETE) ──────────────────────────────────

import { NextResponse } from "next/server";
import {
  archivePlanSlot,
  isMatReady,
  updatePlanSlot,
} from "@/lib/mat/notion";
import type { MealPlanInput } from "@/lib/mat/types";

export const dynamic = "force-dynamic";

const NOT_READY_BODY = {
  error:
    "Mat-DB:erna är inte konfigurerade. Sätt NOTION_MAT_RECIPES_DB, " +
    "NOTION_MAT_PLAN_DB och NOTION_MAT_COACH_PAGE i miljön.",
};

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!isMatReady()) return NextResponse.json(NOT_READY_BODY, { status: 501 });
  try {
    const { id } = await ctx.params;
    if (!id) return NextResponse.json({ error: "id krävs" }, { status: 400 });
    const body = (await req.json()) as MealPlanInput;
    const slot = await updatePlanSlot(id, body);
    return NextResponse.json({ slot });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!isMatReady()) return NextResponse.json(NOT_READY_BODY, { status: 501 });
  try {
    const { id } = await ctx.params;
    if (!id) return NextResponse.json({ error: "id krävs" }, { status: 400 });
    await archivePlanSlot(id);
    return NextResponse.json({ archived: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

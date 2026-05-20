// ─── Mat — Recept-detalj (GET) + PATCH + DELETE ─────────────────────────────

import { NextResponse } from "next/server";
import {
  isMatReady,
  getRecipeById,
  updateRecipe,
  archiveRecipe,
} from "@/lib/mat/notion";
import type { RecipeInput } from "@/lib/mat/types";

export const dynamic = "force-dynamic";

const NOT_READY_BODY = {
  error:
    "Mat-DB:erna är inte konfigurerade. Sätt NOTION_MAT_RECIPES_DB, " +
    "NOTION_MAT_PLAN_DB och NOTION_MAT_COACH_PAGE i miljön.",
};

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isMatReady()) return NextResponse.json(NOT_READY_BODY, { status: 501 });

  try {
    const { id } = await params;
    const recipe = await getRecipeById(id);
    if (!recipe) return NextResponse.json({ error: "Recept finns inte" }, { status: 404 });
    return NextResponse.json({ recipe });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isMatReady()) return NextResponse.json(NOT_READY_BODY, { status: 501 });

  try {
    const { id } = await params;
    const body = (await req.json()) as RecipeInput;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "JSON-body krävs" }, { status: 400 });
    }
    const recipe = await updateRecipe(id, body);
    return NextResponse.json({ recipe });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isMatReady()) return NextResponse.json(NOT_READY_BODY, { status: 501 });

  try {
    const { id } = await params;
    await archiveRecipe(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

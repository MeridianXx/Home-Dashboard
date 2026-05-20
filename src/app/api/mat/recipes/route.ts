// ─── Mat — Recept-lista (GET) + skapa (POST) ─────────────────────────────────

import { NextResponse } from "next/server";
import {
  isMatReady,
  listRecipes,
  createRecipe,
} from "@/lib/mat/notion";
import type { RecipeInput, RecipesResponse } from "@/lib/mat/types";

export const dynamic = "force-dynamic";

const NOT_READY_BODY = {
  error:
    "Mat-DB:erna är inte konfigurerade. Sätt NOTION_MAT_RECIPES_DB, " +
    "NOTION_MAT_PLAN_DB och NOTION_MAT_COACH_PAGE i miljön.",
};

export async function GET(req: Request) {
  if (!isMatReady()) return NextResponse.json(NOT_READY_BODY, { status: 501 });

  const url = new URL(req.url);
  const tag = url.searchParams.get("tag") ?? undefined;

  try {
    const recipes = await listRecipes({ tag });
    const body: RecipesResponse = { recipes, matReady: true };
    return NextResponse.json(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!isMatReady()) return NextResponse.json(NOT_READY_BODY, { status: 501 });

  try {
    const body = (await req.json()) as RecipeInput;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "JSON-body krävs" }, { status: 400 });
    }
    if (!body.namn || body.namn.trim().length === 0) {
      return NextResponse.json({ error: "namn krävs" }, { status: 400 });
    }
    const recipe = await createRecipe(body);
    return NextResponse.json({ recipe }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

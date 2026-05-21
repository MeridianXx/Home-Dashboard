// ─── Mat — Veckoplan (GET ?weekStart) + skapa (POST) ─────────────────────────

import { NextResponse } from "next/server";
import {
  createPlanSlot,
  isMatReady,
  listPlanSlots,
} from "@/lib/mat/notion";
import type { MealPlanInput, MealPlanResponse } from "@/lib/mat/types";

export const dynamic = "force-dynamic";

const NOT_READY_BODY = {
  error:
    "Mat-DB:erna är inte konfigurerade. Sätt NOTION_MAT_RECIPES_DB, " +
    "NOTION_MAT_PLAN_DB och NOTION_MAT_COACH_PAGE i miljön.",
};

function isoDate(s: string | null): string | null {
  if (!s) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function addDaysIso(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  if (!isMatReady()) return NextResponse.json(NOT_READY_BODY, { status: 501 });

  const url = new URL(req.url);
  const weekStart = isoDate(url.searchParams.get("weekStart"));
  if (!weekStart) {
    return NextResponse.json(
      { error: "weekStart (YYYY-MM-DD, måndag) krävs" },
      { status: 400 },
    );
  }
  const weekEnd = addDaysIso(weekStart, 6);

  try {
    const slots = await listPlanSlots({ from: weekStart, to: weekEnd });
    const body: MealPlanResponse = { slots, matReady: true };
    return NextResponse.json(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!isMatReady()) return NextResponse.json(NOT_READY_BODY, { status: 501 });

  try {
    const body = (await req.json()) as MealPlanInput;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "JSON-body krävs" }, { status: 400 });
    }
    if (!body.datum) {
      return NextResponse.json({ error: "datum (YYYY-MM-DD) krävs" }, { status: 400 });
    }
    if (!body.slot) {
      return NextResponse.json({ error: "slot (Lunch/Middag) krävs" }, { status: 400 });
    }
    const slot = await createPlanSlot(body);
    return NextResponse.json({ slot }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

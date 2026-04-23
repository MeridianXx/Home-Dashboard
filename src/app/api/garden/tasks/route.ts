// ─── Säsongsplan — lista (GET) + skapa (POST) ────────────────────────────────

import { NextResponse } from "next/server";
import { getTasks, createTask, isGardenReady } from "@/lib/garden/notion";
import type { SeasonTaskInput, TasksResponse } from "@/lib/garden/types";

export const dynamic = "force-dynamic";

const NOT_READY_BODY = {
  error:
    "Trädgårds-DB:erna är inte konfigurerade. Sätt NOTION_GARDEN_PLANTS_DB m.fl. i miljön.",
};

export async function GET(req: Request) {
  if (!isGardenReady()) return NextResponse.json(NOT_READY_BODY, { status: 501 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;
  const typ = url.searchParams.get("typ") ?? undefined;
  const fromDate = url.searchParams.get("fromDate") ?? undefined;
  const toDate = url.searchParams.get("toDate") ?? undefined;

  try {
    const tasks = await getTasks({ status, typ, fromDate, toDate });
    const body: TasksResponse = { tasks, gardenReady: true };
    return NextResponse.json(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!isGardenReady()) return NextResponse.json(NOT_READY_BODY, { status: 501 });

  try {
    const body = (await req.json()) as SeasonTaskInput;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "JSON-body krävs" }, { status: 400 });
    }
    if (!body.uppgift) {
      return NextResponse.json({ error: "uppgift krävs" }, { status: 400 });
    }
    const task = await createTask(body);
    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

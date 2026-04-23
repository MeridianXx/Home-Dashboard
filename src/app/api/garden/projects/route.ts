// ─── Utomhusprojekt — lista (GET) + skapa (POST) ─────────────────────────────

import { NextResponse } from "next/server";
import { getProjects, createProject, isGardenReady } from "@/lib/garden/notion";
import type { OutdoorProjectInput, ProjectsResponse } from "@/lib/garden/types";

export const dynamic = "force-dynamic";

const NOT_READY_BODY = {
  error:
    "Trädgårds-DB:erna är inte konfigurerade. Sätt NOTION_GARDEN_PLANTS_DB m.fl. i miljön.",
};

export async function GET(req: Request) {
  if (!isGardenReady()) return NextResponse.json(NOT_READY_BODY, { status: 501 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;
  const omrade = url.searchParams.get("omrade") ?? undefined;

  try {
    const projects = await getProjects({ status, omrade });
    const body: ProjectsResponse = { projects, gardenReady: true };
    return NextResponse.json(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!isGardenReady()) return NextResponse.json(NOT_READY_BODY, { status: 501 });

  try {
    const body = (await req.json()) as OutdoorProjectInput;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "JSON-body krävs" }, { status: 400 });
    }
    if (!body.namn) {
      return NextResponse.json({ error: "namn krävs" }, { status: 400 });
    }
    const project = await createProject(body);
    return NextResponse.json({ project }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

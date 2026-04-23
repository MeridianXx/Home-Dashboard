// ─── Garden — aggregerad översikt för dashboardens första flik ──────────────
// Returnerar räknare per DB som Översikt-sidan konsumerar via SWR. En enda
// endpoint → ett enda SWR-anrop, minskar spinners på mobil.

import { NextResponse } from "next/server";
import { getPlants, getTasks, getProjects, isGardenReady } from "@/lib/garden/notion";
import type { GardenOverviewResponse } from "@/lib/garden/types";

export const dynamic = "force-dynamic";

const NOT_READY_BODY = {
  error:
    "Trädgårds-DB:erna är inte konfigurerade. Sätt NOTION_GARDEN_PLANTS_DB, " +
    "NOTION_GARDEN_SEASON_DB och NOTION_GARDEN_PROJECTS_DB i miljön.",
};

/** Projekt-status som räknas som "pågående" / aktiva i översikten. */
const ACTIVE_PROJECT_STATUSES = new Set(["Planerad", "Pågående", "Utreds", "Väntar"]);

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  if (!isGardenReady()) return NextResponse.json(NOT_READY_BODY, { status: 501 });

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in30 = new Date(today);
    in30.setDate(in30.getDate() + 30);

    const [plants, tasks, projects] = await Promise.all([
      getPlants(),
      getTasks({ fromDate: isoDate(today), toDate: isoDate(in30) }),
      getProjects(),
    ]);

    const byType: Record<string, number> = {};
    for (const p of plants) {
      const key = p.typ || "Okänd";
      byType[key] = (byType[key] ?? 0) + 1;
    }

    const byStatus: Record<string, number> = {};
    for (const t of tasks) {
      const key = t.status || "Okänd";
      byStatus[key] = (byStatus[key] ?? 0) + 1;
    }

    let active = 0;
    let totalBudget = 0;
    let totalSpent = 0;
    for (const proj of projects) {
      if (!ACTIVE_PROJECT_STATUSES.has(proj.status)) continue;
      active++;
      if (proj.budget != null) totalBudget += proj.budget;
      if (proj.faktiskKostnad != null) totalSpent += proj.faktiskKostnad;
    }

    const body: GardenOverviewResponse = {
      gardenReady: true,
      plants: { count: plants.length, byType },
      tasks: { upcoming: tasks.length, byStatus },
      projects: { active, totalBudget, totalSpent },
    };
    return NextResponse.json(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

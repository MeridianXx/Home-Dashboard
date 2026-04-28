// Senaste händelser för en rumsuppsättning entiteter — används av Warm
// Home rum-detaljens "SENASTE"-lista. Returnerar state-changes med
// brightness-attribut så vi kan beskriva "höjdes till 84 %" osv.

import { haGet } from "@/lib/ha";

type RawEntry = {
  entity_id: string;
  state: string;
  last_changed: string;
  last_updated?: string;
  attributes?: {
    brightness?: number;
    friendly_name?: string;
  };
};

export type RawEvent = {
  entity_id: string;
  name: string;
  domain: string;
  time: string;
  state: string;
  brightness_pct: number | null;
  prev_state: string | null;
  prev_brightness_pct: number | null;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const entities = url.searchParams.get("entities");
  const hours = Math.min(
    72,
    Math.max(1, parseInt(url.searchParams.get("hours") ?? "24", 10) || 24)
  );

  if (!entities) {
    return Response.json({ error: "entities param required" }, { status: 400 });
  }

  try {
    const now = new Date();
    const start = new Date(now.getTime() - hours * 3_600_000);
    // OBS: ingen `minimal_response` — vi behöver attributes (brightness,
    // friendly_name) för att kunna beskriva händelsen. `significant_changes_only`
    // håller volymen nere.
    const path =
      `/api/history/period/${start.toISOString()}` +
      `?filter_entity_id=${entities}` +
      `&end_time=${now.toISOString()}` +
      `&significant_changes_only`;

    const raw = await haGet<RawEntry[][]>(path);
    const events: RawEvent[] = [];

    for (const series of raw) {
      if (!series.length) continue;
      for (let i = 0; i < series.length; i++) {
        const cur = series[i];
        if (cur.state === "unavailable" || cur.state === "unknown") continue;
        const prev = i > 0 ? series[i - 1] : null;
        const curBr =
          typeof cur.attributes?.brightness === "number"
            ? Math.round((cur.attributes.brightness / 255) * 100)
            : null;
        const prevBr =
          prev && typeof prev.attributes?.brightness === "number"
            ? Math.round((prev.attributes.brightness / 255) * 100)
            : null;

        // Filtrera bort no-op-events: samma state och samma brightness som
        // föregående.
        if (
          prev &&
          prev.state === cur.state &&
          curBr === prevBr
        ) {
          continue;
        }

        events.push({
          entity_id: cur.entity_id,
          name: cur.attributes?.friendly_name ?? cur.entity_id,
          domain: cur.entity_id.split(".")[0],
          time: cur.last_changed,
          state: cur.state,
          brightness_pct: curBr,
          prev_state: prev?.state ?? null,
          prev_brightness_pct: prevBr,
        });
      }
    }

    events.sort((a, b) => b.time.localeCompare(a.time));

    return Response.json({ events });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}

export const dynamic = "force-dynamic";

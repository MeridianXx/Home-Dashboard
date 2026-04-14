import { haGet } from "@/lib/ha";

type HAHistoryEntry = { entity_id: string; state: string; last_changed: string };

export async function GET(req: Request) {
  const url = new URL(req.url);
  const entities = url.searchParams.get("entities");
  const hours = Math.min(Math.max(parseInt(url.searchParams.get("hours") ?? "24", 10) || 24, 1), 72);

  if (!entities) return Response.json({ error: "entities param required" }, { status: 400 });

  try {
    const now = new Date();
    const start = new Date(now.getTime() - hours * 3_600_000);
    const path =
      `/api/history/period/${start.toISOString()}` +
      `?filter_entity_id=${entities}` +
      `&end_time=${now.toISOString()}` +
      `&minimal_response&no_attributes&significant_changes_only`;

    const raw = await haGet<HAHistoryEntry[][]>(path);

    const result: Record<string, Array<{ t: string; v: number | null }>> = {};

    for (const series of raw) {
      if (!series.length) continue;
      const id = series[0].entity_id;
      let points = series
        .filter(e => e.state !== "unavailable" && e.state !== "unknown")
        .map(e => ({ t: e.last_changed, v: parseFloat(e.state) }))
        .filter(p => !isNaN(p.v!));

      // Downsample if too many points
      if (points.length > 200) {
        const step = Math.ceil(points.length / 200);
        points = points.filter((_, i) => i % step === 0 || i === points.length - 1);
      }

      result[id] = points;
    }

    return Response.json({ entities: result, start: start.toISOString(), end: now.toISOString() });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}

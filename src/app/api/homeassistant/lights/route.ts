import { getRegistry, getStates } from "@/lib/ha";

export async function GET() {
  try {
    const [{ entityArea, areas }, states] = await Promise.all([
      getRegistry(),
      getStates("light"),
    ]);

    const byArea: Record<string, Array<{
      entity_id: string; name: string; state: string;
      brightness_pct: number | null; dimmable: boolean;
    }>> = {};

    for (const s of states) {
      if (s.state === "unavailable") continue;
      const aid = entityArea[s.entity_id];
      if (!aid) continue;

      const brightness = s.attributes.brightness as number | null | undefined;
      const modes      = s.attributes.supported_color_modes as string[] | undefined;
      const dimmable   = modes ? modes.some(m => m !== "onoff") : false;

      (byArea[aid] ??= []).push({
        entity_id:      s.entity_id,
        name:           (s.attributes.friendly_name as string) ?? s.entity_id,
        state:          s.state,
        brightness_pct: brightness != null ? Math.round((brightness / 255) * 100) : null,
        dimmable,
      });
    }

    const result = Object.entries(byArea)
      .map(([area_id, lights]) => ({
        area_id,
        name:        areas[area_id]?.name ?? area_id,
        lights,
        on_count:    lights.filter(l => l.state === "on").length,
        total_count: lights.length,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "sv"));

    return Response.json({ areas: result });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}

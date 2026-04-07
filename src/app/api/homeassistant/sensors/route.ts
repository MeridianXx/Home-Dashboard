import { getRegistry, getStates } from "@/lib/ha";

export async function GET() {
  try {
    const [{ entityArea, areas }, states] = await Promise.all([
      getRegistry(),
      getStates("sensor"),
    ]);

    // One entry per area: last-write-wins per device_class
    const byArea: Record<string, { temp?: number; humidity?: number }> = {};

    for (const s of states) {
      if (s.state === "unavailable" || s.state === "unknown") continue;
      const aid = entityArea[s.entity_id];
      if (!aid) continue;
      const dc  = s.attributes.device_class as string | undefined;
      const val = parseFloat(s.state);
      if (isNaN(val)) continue;

      byArea[aid] ??= {};
      if (dc === "temperature") byArea[aid].temp     = val;
      if (dc === "humidity")    byArea[aid].humidity = val;
    }

    // Outdoor temp from Nibe (most reliable)
    const nibeOutdoor = states.find(s => s.entity_id === "sensor.villa_bjorkdalen_current_outdoor_temperature_bt1");
    const outdoor_temp = nibeOutdoor && nibeOutdoor.state !== "unknown"
      ? parseFloat(nibeOutdoor.state) : null;

    const result = Object.entries(byArea)
      .filter(([, v]) => v.temp != null)
      .map(([area_id, v]) => ({
        area_id,
        name:        areas[area_id]?.name ?? area_id,
        temperature: v.temp!,
        humidity:    v.humidity ?? null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "sv"));

    const avg_indoor = result.length
      ? +(result.reduce((s, r) => s + r.temperature, 0) / result.length).toFixed(1)
      : null;

    return Response.json({ areas: result, outdoor_temp, avg_indoor });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}

import { getRegistry, getStates } from "@/lib/ha";

export async function GET() {
  try {
    const [{ entityArea, areas }, states] = await Promise.all([
      getRegistry(),
      getStates("sensor"),
    ]);

    // One entry per area: last-write-wins per device_class
    const byArea: Record<string, { temp?: number; humidity?: number }> = {};

    // Device-level sensors live in a room but don't represent room climate.
    // Per AGENTS.md:s namnstandard är dessa prefix "rumslösa enheter" — de
    // sätter sig på rummet där enheten råkar stå och ger false positives
    // (t.ex. hero_utetemperatur = värmepumpens utomhusprob, hamnar i
    // vardagsrum och krockar med sensor.vardagsrum_temperatur i loopen nedan).
    const SYSTEM_PREFIXES = ["hero_", "nibe_", "tibber_", "chomper_", "polestar_", "enyaq_", "router_"];
    const isSystemSensor = (id: string) => {
      const rest = id.slice("sensor.".length);
      return SYSTEM_PREFIXES.some(p => rest.startsWith(p));
    };

    for (const s of states) {
      if (isSystemSensor(s.entity_id)) continue;
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

    // Nibe outdoor (BT1) and indoor (BT50) — most reliable physical sensors
    const nibeOutdoor = states.find(s => s.entity_id === "sensor.nibe_utomhustemperatur_bt1");
    const nibeIndoor  = states.find(s => s.entity_id === "sensor.nibe_inomhustemperatur_bt50");
    const outdoor_temp  = nibeOutdoor?.state && nibeOutdoor.state !== "unknown" ? parseFloat(nibeOutdoor.state) : null;
    const nibe_indoor_temp = nibeIndoor?.state && nibeIndoor.state !== "unknown" ? parseFloat(nibeIndoor.state) : null;

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

    return Response.json({ areas: result, outdoor_temp, avg_indoor, nibe_indoor_temp });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}

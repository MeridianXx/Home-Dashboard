import { getRegistry, getStates } from "@/lib/ha";

export async function GET() {
  try {
    const [{ entityArea, areas }, states] = await Promise.all([
      getRegistry(),
      getStates("light"),
    ]);

    // Excluded: old vardagsrum entities replaced by grouped light.vardagsrum_golvlampa,
    // and lights listed as not connected/hidden in AGENTS.md
    const EXCLUDED_LIGHTS = new Set([
      "light.vardagsrum_upp", "light.vardagsrum_mitten", "light.vardagsrum_ner",
      "light.vancouver", "light.fonster", "light.hall_2",
    ]);

    const byArea: Record<string, Array<{
      entity_id: string; name: string; state: string;
      brightness_pct: number | null; dimmable: boolean;
      color_temp_kelvin: number | null;
      supports_kelvin: boolean;
      min_kelvin: number | null;
      max_kelvin: number | null;
      last_changed: string | null;
    }>> = {};

    for (const s of states) {
      if (EXCLUDED_LIGHTS.has(s.entity_id)) continue;
      if (s.state === "unavailable") continue;
      const aid = entityArea[s.entity_id];
      if (!aid) continue;

      const brightness = s.attributes.brightness as number | null | undefined;
      const modes      = s.attributes.supported_color_modes as string[] | undefined;
      const dimmable   = modes ? modes.some(m => m !== "onoff") : false;
      // `color_temp` i supported_color_modes signalerar att lampan kan ställas
      // till en specifik K-temperatur (även om lampan just nu är off, eller
      // kör i xy/hs-mode och color_temp_kelvin är null). UI:t använder denna
      // flagga för att gate:a K-pill/slider — inte aktuellt K-värde.
      const supports_kelvin = modes ? modes.includes("color_temp") : false;
      const minK = s.attributes.min_color_temp_kelvin as number | null | undefined;
      const maxK = s.attributes.max_color_temp_kelvin as number | null | undefined;

      // Färgtemperatur: HA exponerar antingen `color_temp_kelvin` direkt eller
      // `color_temp` (mireds). Mireds → K via 1_000_000 / mired.
      const kelvinAttr = s.attributes.color_temp_kelvin as number | null | undefined;
      const miredAttr = s.attributes.color_temp as number | null | undefined;
      const color_temp_kelvin: number | null =
        typeof kelvinAttr === "number" && kelvinAttr > 0
          ? Math.round(kelvinAttr / 50) * 50
          : typeof miredAttr === "number" && miredAttr > 0
          ? Math.round(1_000_000 / miredAttr / 50) * 50
          : null;

      (byArea[aid] ??= []).push({
        entity_id:      s.entity_id,
        name:           (s.attributes.friendly_name as string) ?? s.entity_id,
        state:          s.state,
        brightness_pct: brightness != null ? Math.round((brightness / 255) * 100) : null,
        dimmable,
        color_temp_kelvin,
        supports_kelvin,
        min_kelvin:     typeof minK === "number" ? minK : null,
        max_kelvin:     typeof maxK === "number" ? maxK : null,
        last_changed:   (s as { last_changed?: string }).last_changed ?? null,
      });
    }

    const result = Object.entries(byArea)
      .map(([area_id, lights]) => ({
        area_id,
        name:        areas[area_id]?.name ?? area_id,
        lights:      lights.sort((a, b) => a.name.localeCompare(b.name, "sv")),
        on_count:    lights.filter(l => l.state === "on").length,
        total_count: lights.length,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "sv"));

    return Response.json({ areas: result });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}

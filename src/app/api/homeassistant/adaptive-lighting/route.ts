// Snabb-poll av adaptive_lighting-integrationens switch-entiteter.
// Listar alla switch.adaptive_lighting_* + status. Används av Warm Home för
// att visa "Följ solen"-toggel per lampa när integrationen är konfigurerad.

import { getStates } from "@/lib/ha";

type AdaptiveLightingSwitch = {
  entity_id: string;
  name: string;
  configuration_id: string; // namn efter `switch.adaptive_lighting_`
  enabled: boolean;
  manual_control: string[]; // entity_ids där användaren kört en manuell override
  /** AL:s aktuella sol-baserade K — den verkliga "borde-vara"-temperaturen.
   *  Skiljer sig från lampans state.color_temp_kelvin när AL ramppar mellan
   *  uppdateringar eller integrationens skriv-cykel halkar efter. */
  color_temp_kelvin: number | null;
  /** AL:s aktuella sol-baserade ljusstyrka i %. */
  brightness_pct: number | null;
};

export async function GET() {
  try {
    const states = await getStates("switch");
    const al: AdaptiveLightingSwitch[] = [];
    for (const s of states) {
      if (!s.entity_id.startsWith("switch.adaptive_lighting_")) continue;
      // Skippa sub-switchar (adapt_color/adapt_brightness/sleep_mode) — de
      // är finkorniga sub-toggles, inte huvudswitchen. HA bygger entity_ids
      // som `switch.adaptive_lighting_adapt_color_<config>` (prefix) eller
      // `switch.adaptive_lighting_<config>_adapt_color_<config>` (mid)
      // beroende på namn-konflikter, så vi måste leta i hela strängen.
      const id = s.entity_id;
      if (
        id.includes("_adapt_color") ||
        id.includes("_adapt_brightness") ||
        id.includes("_sleep_mode")
      ) {
        continue;
      }
      const cfgId = id.replace("switch.adaptive_lighting_", "");
      const k = s.attributes.color_temp_kelvin;
      const b = s.attributes.brightness_pct;
      al.push({
        entity_id: s.entity_id,
        name: (s.attributes.friendly_name as string) ?? s.entity_id,
        configuration_id: cfgId,
        enabled: s.state === "on",
        manual_control: ((s.attributes.manual_control as string[] | undefined) ?? []),
        color_temp_kelvin: typeof k === "number" ? k : null,
        brightness_pct: typeof b === "number" ? b : null,
      });
    }
    return Response.json({ instances: al });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}

export const dynamic = "force-dynamic";

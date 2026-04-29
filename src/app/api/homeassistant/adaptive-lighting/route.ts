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
};

export async function GET() {
  try {
    const states = await getStates("switch");
    const al: AdaptiveLightingSwitch[] = [];
    for (const s of states) {
      if (!s.entity_id.startsWith("switch.adaptive_lighting_")) continue;
      // Skippa adapt_brightness/_color sub-switchar — de är finkorniga
      // sub-toggles, inte huvudswitchen. Huvudswitchen har bara prefix-id:t.
      const cfgId = s.entity_id.replace("switch.adaptive_lighting_", "");
      if (cfgId.startsWith("adapt_") || cfgId.startsWith("sleep_mode_")) continue;
      al.push({
        entity_id: s.entity_id,
        name: (s.attributes.friendly_name as string) ?? s.entity_id,
        configuration_id: cfgId,
        enabled: s.state === "on",
        manual_control: ((s.attributes.manual_control as string[] | undefined) ?? []),
      });
    }
    return Response.json({ instances: al });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}

export const dynamic = "force-dynamic";

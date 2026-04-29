// Listar relevanta entiteter per rum (efter HA area_id-matchning).
// Används av Warm Home rum-detaljens SENASTE-lista för att samla
// lampor + media + klimat + motion-sensorer i ett anrop.

import { getRegistry, getStates } from "@/lib/ha";

const RELEVANT_DOMAINS = new Set([
  "light",
  "media_player",
  "climate",
  "binary_sensor", // bara motion-relaterade — filtreras nedan
]);

const EXCLUDED_LIGHTS = new Set([
  "light.vardagsrum_upp",
  "light.vardagsrum_mitten",
  "light.vardagsrum_ner",
  "light.vancouver",
  "light.fonster",
  "light.hall_2",
]);

function isInterestingBinarySensor(entityId: string): boolean {
  const id = entityId.toLowerCase();
  return (
    id.includes("motion") ||
    id.includes("rorelse") ||
    id.includes("door") ||
    id.includes("dorr")
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const roomName = url.searchParams.get("room");
  if (!roomName) {
    return Response.json({ error: "room param required" }, { status: 400 });
  }

  try {
    const { entityArea, areas } = await getRegistry();
    const targetAreaId = Object.entries(areas).find(
      ([, a]) =>
        a.name.toLowerCase() === roomName.toLowerCase() ||
        a.name.toLowerCase() === roomName.toLowerCase().replace(/-/g, " ")
    )?.[0];

    if (!targetAreaId) {
      return Response.json({ entities: [], lights: [], media: [], climate: [], motion: [] });
    }

    // Filtrera entiteter som tillhör rummet och är av relevanta domains
    const allEntities = Object.entries(entityArea)
      .filter(([, areaId]) => areaId === targetAreaId)
      .map(([entityId]) => entityId);

    const lights: string[] = [];
    const media: string[] = [];
    const climate: string[] = [];
    const motion: string[] = [];

    for (const entityId of allEntities) {
      const domain = entityId.split(".")[0];
      if (!RELEVANT_DOMAINS.has(domain)) continue;
      if (domain === "light") {
        if (EXCLUDED_LIGHTS.has(entityId)) continue;
        lights.push(entityId);
      } else if (domain === "media_player") {
        media.push(entityId);
      } else if (domain === "climate") {
        climate.push(entityId);
      } else if (domain === "binary_sensor" && isInterestingBinarySensor(entityId)) {
        motion.push(entityId);
      }
    }

    // Filtrera bort entiteter som är "unavailable" just nu (de ger inga
    // events ändå och förorenar history-anropet med tomma resultat).
    const states = await getStates();
    const available = new Set(
      states
        .filter((s) => s.state !== "unavailable" && s.state !== "unknown")
        .map((s) => s.entity_id)
    );
    const filterAvailable = (xs: string[]) => xs.filter((id) => available.has(id));

    return Response.json({
      area_id: targetAreaId,
      lights: filterAvailable(lights),
      media: filterAvailable(media),
      climate: filterAvailable(climate),
      motion: filterAvailable(motion),
      entities: filterAvailable([...lights, ...media, ...climate, ...motion]),
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}

export const dynamic = "force-dynamic";

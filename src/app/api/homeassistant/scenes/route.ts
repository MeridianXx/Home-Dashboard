import { getState, getSceneConfig, type SceneConfig } from "@/lib/ha";

// Scenes shown in the UI. Order matters for match priority (later entries win on tie).
const SCENE_IDS = ["god_morgon", "hemma", "kvall", "natt"] as const;
export type SceneKey = typeof SCENE_IDS[number];

export type ScenePayload = {
  key: SceneKey;
  entity_id: string;
  name: string;
  targets: Record<string, { state: string; brightness_pct: number | null }>;
};

export async function GET() {
  try {
    const scenes = await Promise.all(SCENE_IDS.map(async (key): Promise<ScenePayload | null> => {
      const entityId = `scene.${key}`;
      try {
        const state = await getState(entityId);
        const internalId = state.attributes.id as string | undefined;
        if (!internalId) return null;

        const cfg: SceneConfig = await getSceneConfig(internalId);
        const targets: ScenePayload["targets"] = {};
        for (const [eid, target] of Object.entries(cfg.entities)) {
          if (!eid.startsWith("light.")) continue;
          const brightness = typeof target.brightness === "number" ? target.brightness : null;
          targets[eid] = {
            state: target.state,
            brightness_pct: brightness != null ? Math.round((brightness / 255) * 100) : null,
          };
        }
        return {
          key,
          entity_id: entityId,
          name: (state.attributes.friendly_name as string) ?? key,
          targets,
        };
      } catch {
        return null;
      }
    }));

    return Response.json({ scenes: scenes.filter((s): s is ScenePayload => s != null) });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}

// Scene config rarely changes; allow light caching (targets aren't time-sensitive).
export const revalidate = 300;

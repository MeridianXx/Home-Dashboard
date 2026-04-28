// Shared scene helpers for the dashboard.

export type SceneTarget = { state: string; brightness_pct: number | null };

export type ScenePayload = {
  key: string;
  entity_id: string;
  name: string;
  last_changed: string | null;
  targets: Record<string, SceneTarget>;
};

export type LightSnapshot = {
  entity_id: string;
  state: string;
  brightness_pct: number | null;
};

const BRIGHTNESS_TOLERANCE = 5; // ±%

/**
 * Apple Home-style active-scene detection.
 *
 * A scene is considered active when every target light's current state
 * matches the scene's stored target:
 *   - on/off state equal
 *   - if on AND brightness is specified, brightness within ±5 percentage points
 *
 * If multiple scenes match, the most specific wins (most target entities).
 * Returns the scene key, or null if none match.
 */
/**
 * Hämtar den scen som senast aktiverades inom `windowMs` (default 24h)
 * OCH fortfarande är "live" — dvs en majoritet av scenens "on"-targets
 * är fortfarande på.
 *
 * Två-stegs-kombination för robusthet:
 *   1. Inom `gracePeriodMs` (default 8s) efter aktivering: lita på
 *      last_changed direkt — pillen tänds blixtsnabbt vid klick även om
 *      lamporna ännu inte hunnit nå sina target-värden.
 *   2. Efter grace-period: verifiera mot live-state. Om <`matchRatio`
 *      (default 50%) av scenens "on"-targets fortfarande är på, räknas
 *      scenen INTE längre som aktiv (användaren har manuellt släckt
 *      lamporna eller annan scen verkställdes utanför HA).
 *
 * Returnerar null om ingen scen kvalificerar.
 */
export function activeSceneByLastChanged(
  scenes: ScenePayload[] | undefined,
  lights: LightSnapshot[] | undefined = undefined,
  opts: {
    windowMs?: number;
    gracePeriodMs?: number;
    matchRatio?: number;
  } = {}
): { key: string; lastChanged: string } | null {
  const windowMs = opts.windowMs ?? 24 * 3600 * 1000;
  const gracePeriodMs = opts.gracePeriodMs ?? 8000;
  const matchRatio = opts.matchRatio ?? 0.5;

  if (!scenes || scenes.length === 0) return null;
  let newest: ScenePayload | null = null;
  let newestTs = -Infinity;
  for (const s of scenes) {
    if (!s.last_changed) continue;
    const ts = new Date(s.last_changed).getTime();
    if (!isFinite(ts)) continue;
    if (ts > newestTs) {
      newest = s;
      newestTs = ts;
    }
  }
  if (!newest || !newest.last_changed) return null;
  const ageMs = Date.now() - newestTs;
  if (ageMs > windowMs) return null;

  // Inom grace-period — lita på last_changed direkt.
  if (ageMs <= gracePeriodMs) {
    return { key: newest.key, lastChanged: newest.last_changed };
  }
  // Ingen lights-data → fallback till bara last_changed.
  if (!lights) {
    return { key: newest.key, lastChanged: newest.last_changed };
  }

  // Verifiera: hur många "on"-targets är fortfarande på?
  const liveById = new Map(lights.map((l) => [l.entity_id, l]));
  const onTargets = Object.entries(newest.targets).filter(
    ([, t]) => t.state === "on"
  );
  // Om scenen bara släcker (inga on-targets) → litar på last_changed.
  if (onTargets.length === 0) {
    return { key: newest.key, lastChanged: newest.last_changed };
  }
  const stillOn = onTargets.filter(([eid]) => {
    const live = liveById.get(eid);
    return live?.state === "on";
  });
  const ratio = stillOn.length / onTargets.length;
  if (ratio < matchRatio) return null;

  return { key: newest.key, lastChanged: newest.last_changed };
}

export function detectActiveScene(
  scenes: ScenePayload[],
  lights: LightSnapshot[],
): string | null {
  const byId = new Map(lights.map(l => [l.entity_id, l]));

  const matches: Array<{ key: string; specificity: number }> = [];
  for (const scene of scenes) {
    const targetEntries = Object.entries(scene.targets);
    if (targetEntries.length === 0) continue;

    let allMatch = true;
    for (const [eid, target] of targetEntries) {
      const live = byId.get(eid);
      if (!live) {
        if (target.state === "off") continue; // missing = off, matches
        allMatch = false; break;
      }

      const liveState = live.state === "unavailable" ? "off" : live.state;
      if (liveState !== target.state) { allMatch = false; break; }

      if (target.state === "on" && target.brightness_pct != null && live.brightness_pct != null) {
        if (Math.abs(live.brightness_pct - target.brightness_pct) > BRIGHTNESS_TOLERANCE) {
          allMatch = false;
          break;
        }
      }
    }
    if (allMatch) matches.push({ key: scene.key, specificity: targetEntries.length });
  }

  if (matches.length === 0) return null;
  matches.sort((a, b) => b.specificity - a.specificity);
  return matches[0].key;
}

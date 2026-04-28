// Tolkar HA-history-events till svenska beskrivningar för Warm Home
// rum-detaljens SENASTE-lista.

import type { ScenePayload } from "@/lib/scenes";
import { sceneLabel } from "@/lib/warm/format";

export type RawEvent = {
  entity_id: string;
  name: string;
  domain: string;
  time: string;
  state: string;
  brightness_pct: number | null;
  prev_state: string | null;
  prev_brightness_pct: number | null;
  media_title?: string | null;
  media_artist?: string | null;
  source?: string | null;
  target_temp?: number | null;
  prev_target_temp?: number | null;
};

export type FormattedEvent = {
  entity_id: string;
  time: string; // ISO
  description: string;
  source: string;
};

const SCENE_DEDUP_WINDOW_MS = 3000; // ±3s runt scen-aktivering

function lampNameSv(name: string): string {
  return name;
}

function climateModeSv(mode: string): string {
  switch (mode) {
    case "cool":
      return "kyla";
    case "heat":
      return "värme";
    case "heat_cool":
      return "auto";
    case "fan_only":
      return "fläkt";
    case "dry":
      return "torrläge";
    case "off":
      return "av";
    default:
      return mode;
  }
}

function formatEvent(e: RawEvent): FormattedEvent | null {
  const name = lampNameSv(e.name);
  const domain = e.domain;

  // ── Lampor ────────────────────────────────────────────────────────────────
  if (domain === "light") {
    const turnedOn = e.prev_state !== "on" && e.state === "on";
    const turnedOff = e.prev_state === "on" && e.state === "off";
    if (turnedOn) {
      return {
        entity_id: e.entity_id,
        time: e.time,
        description:
          e.brightness_pct != null && e.brightness_pct !== 100
            ? `${name} tändes till ${e.brightness_pct} %`
            : `${name} tändes`,
        source: "auto",
      };
    }
    if (turnedOff) {
      return {
        entity_id: e.entity_id,
        time: e.time,
        description: `${name} släcktes`,
        source: "auto",
      };
    }
    if (
      e.state === "on" &&
      e.brightness_pct != null &&
      e.prev_brightness_pct != null &&
      e.brightness_pct !== e.prev_brightness_pct
    ) {
      const verb = e.brightness_pct > e.prev_brightness_pct ? "höjdes" : "sänktes";
      return {
        entity_id: e.entity_id,
        time: e.time,
        description: `${name} ${verb} till ${e.brightness_pct} %`,
        source: "auto",
      };
    }
    return null;
  }

  // ── Media (Sonos / Apple TV) ──────────────────────────────────────────────
  if (domain === "media_player") {
    const sourceLabel = name; // "Vardagsrum HiFi" / "Apple TV" / etc
    if (e.state === "playing" && e.prev_state !== "playing") {
      const what = e.media_title
        ? e.media_artist
          ? `"${e.media_title}" — ${e.media_artist}`
          : `"${e.media_title}"`
        : null;
      return {
        entity_id: e.entity_id,
        time: e.time,
        description: what ? `${name} spelar ${what}` : `${name} började spela`,
        source: sourceLabel,
      };
    }
    if (e.prev_state === "playing" && e.state === "paused") {
      return {
        entity_id: e.entity_id,
        time: e.time,
        description: `${name} pausades`,
        source: sourceLabel,
      };
    }
    if (
      (e.state === "off" || e.state === "standby") &&
      e.prev_state !== e.state &&
      e.prev_state !== null
    ) {
      return {
        entity_id: e.entity_id,
        time: e.time,
        description: `${name} stängdes av`,
        source: sourceLabel,
      };
    }
    if (
      (e.state === "on" || e.state === "idle") &&
      (e.prev_state === "off" || e.prev_state === "standby")
    ) {
      return {
        entity_id: e.entity_id,
        time: e.time,
        description: `${name} slogs på`,
        source: sourceLabel,
      };
    }
    return null;
  }

  // ── Klimat (värmepump) ────────────────────────────────────────────────────
  if (domain === "climate") {
    if (e.state !== e.prev_state && e.prev_state != null) {
      const sv = climateModeSv(e.state);
      const prevSv = climateModeSv(e.prev_state);
      return {
        entity_id: e.entity_id,
        time: e.time,
        description: `${name} bytte från ${prevSv} till ${sv}`,
        source: "auto",
      };
    }
    if (
      e.target_temp != null &&
      e.prev_target_temp != null &&
      e.target_temp !== e.prev_target_temp
    ) {
      const verb = e.target_temp > e.prev_target_temp ? "höjdes" : "sänktes";
      return {
        entity_id: e.entity_id,
        time: e.time,
        description: `${name} ${verb} till ${e.target_temp}°`,
        source: "auto",
      };
    }
    return null;
  }

  // ── Binary-sensor ─────────────────────────────────────────────────────────
  if (domain === "binary_sensor") {
    if (e.state === "on" && e.prev_state !== "on") {
      const isMotion =
        e.entity_id.includes("motion") || e.entity_id.includes("rorelse");
      const isDoor = e.entity_id.includes("door") || e.entity_id.includes("dorr");
      return {
        entity_id: e.entity_id,
        time: e.time,
        description: isMotion
          ? "Rörelse upptäckt"
          : isDoor
          ? `${name} öppnades`
          : `${name} aktiverad`,
        source: "sensor",
      };
    }
    return null;
  }

  return null;
}

/**
 * Tolkar raw events till svenska beskrivningar. Lamp-events som ligger
 * inom ±3s av en scen-aktivering (där scenen påverkar samma lampa)
 * skippas — de täcks redan av scen-eventet.
 */
export function formatEvents(
  raw: RawEvent[],
  scenes: ScenePayload[] | undefined,
  limit: number = 6
): FormattedEvent[] {
  // Bygg upp scen-fönster: vilka entiteter aktiverades inom ±3s
  type SceneWindow = { ts: number; key: string; targets: Set<string> };
  const windows: SceneWindow[] = [];
  if (scenes) {
    for (const s of scenes) {
      if (!s.last_changed) continue;
      const ts = new Date(s.last_changed).getTime();
      if (!isFinite(ts)) continue;
      windows.push({ ts, key: s.key, targets: new Set(Object.keys(s.targets)) });
    }
  }

  const isPartOfScene = (entityId: string, eventTime: string): boolean => {
    const ts = new Date(eventTime).getTime();
    if (!isFinite(ts)) return false;
    for (const w of windows) {
      if (Math.abs(ts - w.ts) <= SCENE_DEDUP_WINDOW_MS && w.targets.has(entityId)) {
        return true;
      }
    }
    return false;
  };

  const out: FormattedEvent[] = [];
  for (const e of raw) {
    // Skippa lamp-events som hör till en scen-aktivering
    if (e.domain === "light" && isPartOfScene(e.entity_id, e.time)) continue;
    const f = formatEvent(e);
    if (f) out.push(f);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Lägger till scen-aktivering som ett event i listan (om scenen är inom
 * windowMs). Returneras pre-formaterat så det kan blandas med andra events.
 */
export function sceneEventsFromScenes(
  scenes: ScenePayload[] | undefined,
  windowMs: number = 24 * 3600 * 1000
): FormattedEvent[] {
  if (!scenes) return [];
  const now = Date.now();
  return scenes
    .filter((s) => s.last_changed != null)
    .map((s) => {
      const ts = new Date(s.last_changed!).getTime();
      return { s, ts };
    })
    .filter(({ ts }) => isFinite(ts) && now - ts <= windowMs)
    .map(({ s }) => ({
      entity_id: s.entity_id,
      time: s.last_changed!,
      description: `Scen ${sceneLabel(s.key)} aktiverad`,
      source: "auto",
    }));
}

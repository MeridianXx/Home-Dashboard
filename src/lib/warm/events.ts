// Tolkar HA-history-events till svenska beskrivningar för Warm Home
// rum-detaljens SENASTE-lista.

export type RawEvent = {
  entity_id: string;
  name: string;
  domain: string;
  time: string;
  state: string;
  brightness_pct: number | null;
  prev_state: string | null;
  prev_brightness_pct: number | null;
};

export type FormattedEvent = {
  entity_id: string;
  time: string; // ISO
  description: string;
  source: string; // "auto" / "sensor" / etc — placeholder tills HA-context
};

function lampNameSv(name: string): string {
  // Strippa ev. dubbla rumsprefix (t.ex. "Vardagsrum Hörnlampa" → "Hörnlampa")
  // när rummet redan är känt av kontexten.
  return name;
}

export function formatEvent(e: RawEvent): FormattedEvent | null {
  const name = lampNameSv(e.name);
  const isLight = e.domain === "light";
  const isMedia = e.domain === "media_player";
  const isBinary = e.domain === "binary_sensor";

  // Default-källa — kan utökas senare via HA context.user_id-mappning.
  let source = "auto";
  if (isBinary) source = "sensor";

  // Lampor: state-changes + brightness-justeringar
  if (isLight) {
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
        source,
      };
    }
    if (turnedOff) {
      return {
        entity_id: e.entity_id,
        time: e.time,
        description: `${name} släcktes`,
        source,
      };
    }
    // Brightness ändrad medan lampan var på
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
        source,
      };
    }
    return null;
  }

  // Media player
  if (isMedia) {
    if (e.state === "playing" && e.prev_state !== "playing") {
      return {
        entity_id: e.entity_id,
        time: e.time,
        description: `${name} började spela`,
        source: name,
      };
    }
    if (e.prev_state === "playing" && e.state !== "playing") {
      return {
        entity_id: e.entity_id,
        time: e.time,
        description: `${name} pausades`,
        source: name,
      };
    }
    if (e.state === "off" && e.prev_state !== "off") {
      return {
        entity_id: e.entity_id,
        time: e.time,
        description: `${name} stängdes av`,
        source: name,
      };
    }
    if (e.state === "on" && e.prev_state === "off") {
      return {
        entity_id: e.entity_id,
        time: e.time,
        description: `${name} slogs på`,
        source: name,
      };
    }
    return null;
  }

  // Binary-sensor (rörelse, dörr, etc)
  if (isBinary) {
    if (e.state === "on" && e.prev_state !== "on") {
      const isMotion = e.entity_id.includes("motion") || e.entity_id.includes("rorelse");
      return {
        entity_id: e.entity_id,
        time: e.time,
        description: isMotion ? "Rörelse upptäckt" : `${name} aktiverad`,
        source: "sensor",
      };
    }
    return null;
  }

  return null;
}

export function formatEvents(raw: RawEvent[], limit: number = 4): FormattedEvent[] {
  const out: FormattedEvent[] = [];
  for (const e of raw) {
    const f = formatEvent(e);
    if (f) out.push(f);
    if (out.length >= limit) break;
  }
  return out;
}

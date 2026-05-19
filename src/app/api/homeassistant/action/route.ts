import { haPost } from "@/lib/ha";

// ─── Tillåtna HA-services ───────────────────────────────────────────────────
// Allow-list per `domain.service`. Allt som inte står här avvisas med 400.
// Djup-försvar: även om auth-guarden misslyckas (middleware-bypass, NPM-fel)
// kan ingen anropa t.ex. `lock.unlock`, `cover.open_cover` (garagedörr) eller
// godtyckliga scripts/automations via denna route.
//
// Endast services som faktiskt anropas från (warm)/v3-koden står med. Lägger
// du till ny funktionalitet — utvidga denna lista samtidigt.
const ALLOWED: Record<string, ReadonlySet<string>> = {
  light: new Set(["turn_on", "turn_off", "toggle"]),
  scene: new Set(["turn_on"]),
  switch: new Set(["turn_on", "turn_off", "toggle"]),
  media_player: new Set([
    "media_play",
    "media_pause",
    "media_play_pause",
    "media_stop",
    "media_next_track",
    "media_previous_track",
    "volume_set",
    "volume_mute",
    "volume_up",
    "volume_down",
    "turn_on",
    "turn_off",
  ]),
  remote: new Set(["turn_on", "turn_off"]),
  climate: new Set([
    "turn_on",
    "turn_off",
    "set_temperature",
    "set_hvac_mode",
    "set_fan_mode",
  ]),
  vacuum: new Set(["start", "stop", "pause", "return_to_base"]),
  button: new Set(["press"]),
  select: new Set(["select_option"]),
  input_boolean: new Set(["turn_on", "turn_off", "toggle"]),
};

function isAllowed(domain: string, service: string): boolean {
  return ALLOWED[domain]?.has(service) ?? false;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      domain: string;
      service: string;
      entity_id: string | string[];
      service_data?: Record<string, unknown>;
    };

    const { domain, service, entity_id, service_data } = body;
    if (!domain || !service || !entity_id) {
      return Response.json(
        { error: "domain, service och entity_id krävs" },
        { status: 400 }
      );
    }

    if (!isAllowed(domain, service)) {
      return Response.json(
        { error: `${domain}.${service} är inte tillåten via denna route` },
        { status: 400 }
      );
    }

    await haPost(`/api/services/${domain}/${service}`, {
      entity_id,
      ...service_data,
    });

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}

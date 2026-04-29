import { getStates } from "@/lib/ha";

// Entities tracked by the dashboard (from AGENTS.md). Others are ignored.
// `power_entity_id` overrides the entity used for turn_on/turn_off — Apple TV
// power goes through the `remote.*` entity (matches what the HA UI does);
// media_player.turn_on/off accept the call but don't actually wake the device.
const PLAYERS: Array<{
  entity_id: string;
  room: string;
  type: "sonos" | "appletv" | "tv";
  power_entity_id?: string;
}> = [
  { entity_id: "media_player.vardagsrum_hifi",    room: "Vardagsrum", type: "sonos" },
  { entity_id: "media_player.allrum_playbar",     room: "Allrum",     type: "sonos" },
  { entity_id: "media_player.allrum_sonos",       room: "Allrum",     type: "sonos" },
  { entity_id: "media_player.kok_sonos",          room: "Kök",        type: "sonos" },
  { entity_id: "media_player.kok_play",           room: "Kök",        type: "sonos" },
  { entity_id: "media_player.elvira_sonos",       room: "Elvira",     type: "sonos" },
  { entity_id: "media_player.adrian_sonos",       room: "Adrian",     type: "sonos" },
  { entity_id: "media_player.vardagsrum_appletv", room: "Vardagsrum", type: "appletv",
    power_entity_id: "remote.vardagsrum_appletv" },
  { entity_id: "media_player.allrum_appletv",     room: "Allrum",     type: "appletv",
    power_entity_id: "remote.allrum_appletv" },
  // OBS: `media_player.vardagsrum_tv` (LG TV-entiteten) togs bort med flit —
  // den är ofta unavailable och dubblerar Apple TV-styrningen i samma rum.
];

export type MediaPlayer = {
  entity_id: string;
  name: string;
  room: string;
  type: "sonos" | "appletv" | "tv";
  state: string;
  volume_level: number | null;
  is_volume_muted: boolean;
  media_title: string | null;
  media_artist: string | null;
  media_album: string | null;
  media_channel: string | null;
  media_image_url: string | null;
  source: string | null;
  // For tracks (not radio) — seconds. position_updated_at is server clock so the
  // client can interpolate live position when state is "playing".
  media_position: number | null;
  media_duration: number | null;
  media_position_updated_at: string | null;
  // Power control — uses a separate `remote.*` entity when one exists
  // (Apple TV: media_player.turn_on doesn't wake the device; remote.turn_on does).
  // `power_state` reflects that entity if present, otherwise the player's own state.
  power_entity_id: string | null;
  power_state: "on" | "off" | null;
};

// Proxy upstream HA image paths through our /api/homeassistant/image route so
// the public-facing site works without exposing HA directly.
function proxyImage(pic: string | undefined): string | null {
  if (!pic) return null;
  if (pic.startsWith("http")) return pic; // already absolute (external artwork)
  return `/api/homeassistant/image?path=${encodeURIComponent(pic)}`;
}

export async function GET() {
  try {
    const [mpStates, remoteStates] = await Promise.all([
      getStates("media_player"),
      getStates("remote"),
    ]);
    const byId = new Map(mpStates.map(s => [s.entity_id, s]));
    const remoteById = new Map(remoteStates.map(s => [s.entity_id, s]));

    const players: MediaPlayer[] = [];
    for (const p of PLAYERS) {
      const s = byId.get(p.entity_id);
      if (!s) continue;
      if (s.state === "unavailable") continue;

      const attrs = s.attributes;
      const remote = p.power_entity_id ? remoteById.get(p.power_entity_id) : undefined;
      const powerState: "on" | "off" | null = remote
        ? (remote.state === "on" ? "on" : "off")
        : null;

      players.push({
        entity_id: p.entity_id,
        name: (attrs.friendly_name as string) ?? p.entity_id,
        room: p.room,
        type: p.type,
        state: s.state,
        volume_level: typeof attrs.volume_level === "number" ? attrs.volume_level : null,
        is_volume_muted: Boolean(attrs.is_volume_muted),
        media_title: (attrs.media_title as string) ?? null,
        media_artist: (attrs.media_artist as string) ?? null,
        media_album: (attrs.media_album_name as string) ?? null,
        media_channel: (attrs.media_channel as string) ?? null,
        media_image_url: proxyImage(attrs.entity_picture as string | undefined),
        source: (attrs.source as string) ?? null,
        media_position: typeof attrs.media_position === "number" ? attrs.media_position : null,
        media_duration: typeof attrs.media_duration === "number" ? attrs.media_duration : null,
        media_position_updated_at: (attrs.media_position_updated_at as string) ?? null,
        power_entity_id: p.power_entity_id ?? null,
        power_state: powerState,
      });
    }

    return Response.json({ players });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}

export const dynamic = "force-dynamic";

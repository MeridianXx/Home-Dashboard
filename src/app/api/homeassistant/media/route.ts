import { getStates } from "@/lib/ha";

// Entities tracked by the dashboard (from AGENTS.md). Others are ignored.
const PLAYERS: Array<{ entity_id: string; room: string; type: "sonos" | "appletv" | "tv" }> = [
  { entity_id: "media_player.vardagsrum_hifi",    room: "Vardagsrum", type: "sonos" },
  { entity_id: "media_player.allrum_playbar",     room: "Allrum",     type: "sonos" },
  { entity_id: "media_player.allrum_sonos",       room: "Allrum",     type: "sonos" },
  { entity_id: "media_player.kok_sonos",          room: "Kök",        type: "sonos" },
  { entity_id: "media_player.elvira_sonos",       room: "Elvira",     type: "sonos" },
  { entity_id: "media_player.adrian_sonos",       room: "Adrian",     type: "sonos" },
  { entity_id: "media_player.vardagsrum_appletv", room: "Vardagsrum", type: "appletv" },
  { entity_id: "media_player.vardagsrum_tv",      room: "Vardagsrum", type: "tv" },
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
};

function abs(haBase: string, pic: string): string {
  if (pic.startsWith("http")) return pic;
  return `${haBase}${pic}`;
}

export async function GET() {
  try {
    const states = await getStates("media_player");
    const byId = new Map(states.map(s => [s.entity_id, s]));
    const haBase = process.env.HA_URL ?? "";

    const players: MediaPlayer[] = [];
    for (const p of PLAYERS) {
      const s = byId.get(p.entity_id);
      if (!s) continue;
      if (s.state === "unavailable") continue;

      const attrs = s.attributes;
      const pic = attrs.entity_picture as string | undefined;

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
        media_image_url: pic ? abs(haBase, pic) : null,
        source: (attrs.source as string) ?? null,
      });
    }

    return Response.json({ players });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}

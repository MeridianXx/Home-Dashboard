// Slug ↔ Notion-rumsnamn-mappning för /v3/home/rum/[slug].
// Slugar är ASCII-vänliga, lowercase. Namn matchar HA registry / sensors-API.

export type RoomSlug =
  | "vardagsrum"
  | "kok"
  | "allrum"
  | "sovrum"
  | "elvira"
  | "adrian"
  | "kontor"
  | "hall"
  | "entre"
  | "stora-badrummet"
  | "lilla-badrummet"
  | "tvattstuga"
  | "walk-in"
  | "utomhus";

export const SLUG_TO_NAME: Record<RoomSlug, string> = {
  vardagsrum: "Vardagsrum",
  kok: "Kök",
  allrum: "Allrum",
  sovrum: "Sovrum",
  elvira: "Elvira",
  adrian: "Adrian",
  kontor: "Kontor",
  hall: "Hall",
  entre: "Entré",
  "stora-badrummet": "Stora badrummet",
  "lilla-badrummet": "Lilla badrummet",
  tvattstuga: "Tvättstuga",
  "walk-in": "Walk-in",
  utomhus: "Utomhus",
};

export const NAME_TO_SLUG: Record<string, RoomSlug> = Object.fromEntries(
  Object.entries(SLUG_TO_NAME).map(([slug, name]) => [name.toLowerCase(), slug as RoomSlug])
) as Record<string, RoomSlug>;

export function nameToSlug(name: string): RoomSlug | null {
  return NAME_TO_SLUG[name.toLowerCase()] ?? null;
}

export function slugToName(slug: string): string | null {
  return SLUG_TO_NAME[slug as RoomSlug] ?? null;
}

// Rum vi visar som "favoriter" på hubben i fallande relevansordning.
// Träffar mot Sensors-API + Lights-API; saknat rum hoppas över tyst.
// Resten av rummen (Hall, Entré, badrum, etc.) ligger på /v3/home/belysning.
export const HUB_FAVORITE_ROOMS: RoomSlug[] = [
  "vardagsrum",
  "kok",
  "allrum",
  "sovrum",
  "adrian",
  "elvira",
];

// Våningsindelning (samma som v2 belysning)
export const NEDERVANING = [
  "Adrian",
  "Entré",
  "Hall",
  "Kök",
  "Sovrum",
  "Stora badrummet",
  "Tvättstuga",
  "Vardagsrum",
  "Walk-in",
];
export const OVERVANING = ["Allrum", "Elvira", "Kontor", "Lounge", "Lilla badrummet"];
export const UTOMHUS = ["Utomhus"];

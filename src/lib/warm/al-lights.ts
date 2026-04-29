// Lampor som styrs av Adaptive Lighting-integrationen.
//
// AL exponerar inte sin `lights:`-konfiguration via switch-entitetens
// attribut, så vi kan inte härleda listan automatiskt. Den måste hållas i
// synk med Home Assistant `configuration.yaml` (eller integrationsentry).
//
// När en lampa läggs till eller tas bort i AL — uppdatera även den här
// listan. Annars riskerar UI:t att antingen visa "Följ solen"-K för en
// lampa som AL inte styr (vilseledande), eller dölja K-pillen för en
// lampa som faktiskt har AL-stöd.

export const AL_LIGHTS: ReadonlySet<string> = new Set([
  "light.adrian_bokhylla",
  "light.allrum_golvlampa",
  "light.kok_under_kokso",
  "light.kontor_skrivbord",
  "light.sovrum_sanggavel",
  "light.vardagsrum_trad",
]);

export function hasAdaptiveLighting(entityId: string): boolean {
  return AL_LIGHTS.has(entityId);
}

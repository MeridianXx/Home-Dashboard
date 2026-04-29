// Delade textformatterare för Warm-komponenter.

export function formatTime(d: Date | string | number): string {
  const date = typeof d === "string" || typeof d === "number" ? new Date(d) : d;
  return date.toLocaleTimeString("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

const WEEKDAY_LONG = [
  "söndag",
  "måndag",
  "tisdag",
  "onsdag",
  "torsdag",
  "fredag",
  "lördag",
];

/** ISO-veckonummer enligt ISO 8601 (måndag = veckans första dag). */
export function isoWeek(d: Date = new Date()): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Eyebrow-format för alla 4 hub-skärmar i Warm Home:
 * `<SEKTION> · <VECKODAG> · V.<NN>` — t.ex. "HEM · ONSDAG · V.18".
 * Single source of truth så Hem/Lab/Fitness/Trädgård linjerar identiskt.
 */
export function formatHubEyebrow(section: string, now: Date = new Date()): string {
  const weekday = WEEKDAY_LONG[now.getDay()] ?? "";
  return `${section.toUpperCase()} · ${weekday.toUpperCase()} · V.${isoWeek(now)}`;
}

export function kelvinLabel(kelvin: number | null): string {
  if (kelvin == null) return "—";
  if (kelvin < 2500) return "varmvitt";
  if (kelvin < 3300) return "varmt vitt";
  if (kelvin < 4500) return "neutralt vitt";
  if (kelvin < 5500) return "dagsvitt";
  return "kallt vitt";
}

export function spotLabel(level: string | null | undefined): string {
  if (level === "low") return "låg";
  if (level === "medium") return "medel";
  if (level === "high") return "hög";
  return "—";
}

export function svGreeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 5) return "God natt";
  if (h < 11) return "God morgon";
  if (h < 14) return "God dag";
  if (h < 18) return "God eftermiddag";
  return "God kväll";
}

const PERIOD_LABEL_SV: Record<string, string> = {
  fm: "FM",
  em: "EM",
  kvall: "Kväll",
  natt: "Natt",
};
export function periodLabel(p: string): string {
  return PERIOD_LABEL_SV[p] ?? p.toUpperCase();
}

export function sceneLabel(key: string | null | undefined): string {
  if (!key) return "";
  if (key === "god_morgon") return "Morgon";
  if (key === "hemma") return "Dagsläge";
  if (key === "kvall") return "kvällsläge";
  if (key === "natt") return "nattläge";
  return key;
}

/**
 * När släcktes lampor senast — given en lista lampor, hitta den senaste
 * "off"-state-tidsstämpeln. Används för "släckt sedan HH:MM" på hubben
 * när inga lampor är på just nu.
 */
export function lastDarkenedAt(
  lights: Array<{ state: string; last_changed?: string | null }> | undefined
): string | null {
  if (!lights || lights.length === 0) return null;
  let newest: string | null = null;
  let newestTs = -Infinity;
  for (const l of lights) {
    if (l.state !== "off") continue;
    if (!l.last_changed) continue;
    const ts = new Date(l.last_changed).getTime();
    if (!isFinite(ts)) continue;
    if (ts > newestTs) {
      newest = l.last_changed;
      newestTs = ts;
    }
  }
  return newest;
}

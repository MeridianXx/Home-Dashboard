// Delade textformatterare för Warm-komponenter.

export function formatTime(d: Date | string | number): string {
  const date = typeof d === "string" || typeof d === "number" ? new Date(d) : d;
  return date.toLocaleTimeString("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
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

// ─── Lap-kategorisering ──────────────────────────────────────────────────────
// Klassificera FIT-laps som warmup / interval / rest / cooldown / steady
// utan att förlita oss på att klockan har taggat passet med en programstruktur.
//
// Tempo-baserad klassificering är mer pålitlig än puls för korta intervaller —
// HR släpar 30–60 s efter tempoändringar, så ett 60-s-intervall hinner sällan
// nå Z4. Vi jämför varje laps tempo (sek/km) mot *session-snittempo* (total
// tid / total distans). Median-approach drogs skevt på intervallpass där
// halva paren är snabba och halva långsamma (1:1 work:rest).

import type { FitLap } from "./fit-parser";

export type LapKind = "warmup" | "interval" | "rest" | "cooldown" | "steady";

export function categorizeLaps(
  laps: FitLap[]
): Array<{ lap: FitLap; kind: LapKind }> {
  if (laps.length === 0) return [];

  const totalM = laps.reduce((s, l) => s + (l.distanceM || 0), 0);
  const totalS = laps.reduce((s, l) => s + (l.durationSec || 0), 0);
  const sessionPace = totalM > 0 && totalS > 0 ? totalS / (totalM / 1000) : 0;

  const FAST = 0.9; // <= 90 % av session-snitt = intervall (snabbare)
  const SLOW = 1.2; // >= 120 % av session-snitt = vila (långsammare)
  const WARMUP_MIN_DIST = 600;

  const out: Array<{ lap: FitLap; kind: LapKind }> = laps.map((lap) => {
    if (lap.distanceM < 50 || lap.durationSec <= 0) {
      return { lap, kind: "rest" as LapKind };
    }
    const pace = lap.durationSec / (lap.distanceM / 1000);
    const ratio = sessionPace > 0 ? pace / sessionPace : 1;
    let kind: LapKind = "steady";
    if (ratio <= FAST) kind = "interval";
    else if (ratio >= SLOW) kind = "rest";
    return { lap, kind };
  });

  // Första långa lap:en — warmup om den inte redan är intervall.
  const firstIntervalIdx = out.findIndex((c) => c.kind === "interval");
  if (
    firstIntervalIdx > 0 &&
    out[0].lap.distanceM >= WARMUP_MIN_DIST &&
    out[0].kind !== "interval"
  ) {
    out[0].kind = "warmup";
  }

  // Sista lap efter sista intervall — cooldown om ≥ 400 m.
  const lastIntervalIdx = out.map((c) => c.kind === "interval").lastIndexOf(true);
  if (lastIntervalIdx !== -1 && lastIntervalIdx < out.length - 1) {
    for (let i = lastIntervalIdx + 1; i < out.length; i++) {
      if (out[i].kind !== "interval" && out[i].lap.distanceM >= 400) {
        out[i].kind = "cooldown";
      }
    }
  }

  // Pass utan intervaller → alla "steady"-laps behålls. Första långsamma = warmup.
  if (
    firstIntervalIdx === -1 &&
    out.length > 1 &&
    out[0].lap.distanceM >= WARMUP_MIN_DIST
  ) {
    const firstPace =
      out[0].lap.distanceM > 0
        ? out[0].lap.durationSec / (out[0].lap.distanceM / 1000)
        : 0;
    if (sessionPace > 0 && firstPace > sessionPace * 1.05) {
      out[0].kind = "warmup";
    }
  }

  return out;
}

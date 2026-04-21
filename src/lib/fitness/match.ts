// ─── Fitness · matchning mellan genomfört pass och planerat pass ─────────────
// Delad logik för alla ytor som kopplar en Workout (från HealthFit) till ett
// PlannedWorkout (från Notion). Tar höjd för:
//   • Svenska plan-namn vs. engelska HealthFit-typer (Återhämtningslöpning ↔ Running)
//   • Pass som gjordes en dag tidigare/senare än planerat
//   • Flera planerade pass samma dag (rätt typ ska vinna, inte bara första)

import type { PlannedWorkout, Workout } from "./types";

export type MatchCategory =
  | "run" | "walk" | "bike" | "strength" | "core"
  | "swim" | "ski" | "padel" | "yoga" | "other";

/** Normaliserar typsträng till en matchningsbar kategori. */
export function matchCategory(type: string): MatchCategory {
  const t = (type ?? "").toLowerCase();
  if (
    t.includes("löp") || t.includes("run") || t.includes("jogg") ||
    t.includes("återhämtning") || t.includes("distans") || t.includes("intervall") ||
    t.includes("tempo") || t.includes("tröskel") || t.includes("långpass")
  ) return "run";
  if (t.includes("promenad") || t.includes("walk") || t.includes("vandring")) return "walk";
  if (t.includes("cykl") || t.includes("bike") || t.includes("cycl")) return "bike";
  if (t.includes("core") || t.includes("bål")) return "core";
  if (t.includes("styr") || t.includes("strength")) return "strength";
  if (t.includes("sim") || t.includes("swim")) return "swim";
  if (t.includes("skid") || t.includes("ski")) return "ski";
  if (t.includes("padel")) return "padel";
  if (t.includes("yoga")) return "yoga";
  return "other";
}

function daysBetween(isoA: string, isoB: string): number {
  const a = new Date(`${isoA}T00:00:00`).getTime();
  const b = new Date(`${isoB}T00:00:00`).getTime();
  return Math.round((a - b) / 86400000);
}

export interface ScoreOpts {
  /** Max datum-avstånd i dagar (default 2). */
  maxDateDiffDays?: number;
}

/**
 * Poängsätter hur väl `workout` matchar `plan`.
 * Returnerar `null` om de inte ens är kandidater.
 * Högre poäng = starkare match.
 */
export function scoreMatch(workout: Workout, plan: PlannedWorkout, opts: ScoreOpts = {}): number | null {
  const maxDiff = opts.maxDateDiffDays ?? 2;
  if (!plan.datum) return null;
  const diff = daysBetween(workout.date, plan.datum);
  if (Math.abs(diff) > maxDiff) return null;

  const wCat = matchCategory(workout.type);
  // Planens kategori härleds från både typ OCH passnamn — användaren taggar
  // ofta fel (t.ex. Core-pass med typ=Styrka). Accept:era någon av de två.
  const pCatTyp = matchCategory(plan.typ || "");
  const pCatNamn = matchCategory(plan.passnamn || "");
  const pCats = new Set<MatchCategory>([pCatTyp, pCatNamn]);
  // Bägge okända → för osäkert att matcha automatiskt.
  if (wCat === "other" && pCatTyp === "other" && pCatNamn === "other") return null;
  // Kategorin måste stämma mot minst en (om workout-kategorin är känd).
  if (wCat !== "other" && !pCats.has(wCat) && !pCats.has("other")) return null;

  const pCat: MatchCategory = pCats.has(wCat) ? wCat : (pCatTyp !== "other" ? pCatTyp : pCatNamn);

  let score = 0;
  if (diff === 0) score += 100;
  else if (diff === 1) score += 45;       // gjord dagen efter plan (vanligast "slirade framåt")
  else if (diff === -1) score += 40;      // gjord dagen före plan
  else if (diff === 2) score += 15;
  else score += 10;                       // diff === -2

  if (wCat === pCat) score += 20;

  // Substring-matcher ger små bonusar.
  const wt = workout.type.toLowerCase();
  const pn = (plan.passnamn || "").toLowerCase();
  const pt = (plan.typ || "").toLowerCase();
  if (pn && (wt.includes(pn) || pn.includes(wt))) score += 5;
  if (pt && (wt.includes(pt) || pt.includes(wt))) score += 5;

  return score;
}

/** Returnerar det planerade pass som bäst matchar `workout`, eller null. */
export function findBestPlanMatch(
  workout: Workout,
  plans: PlannedWorkout[],
  opts?: ScoreOpts,
): PlannedWorkout | null {
  let best: PlannedWorkout | null = null;
  let bestScore = -Infinity;
  for (const p of plans) {
    const s = scoreMatch(workout, p, opts);
    if (s !== null && s > bestScore) {
      best = p;
      bestScore = s;
    }
  }
  return best;
}

/** Unik nyckel för ett genomfört pass (date|HHMM|type). */
export function workoutKey(w: Workout): string {
  return `${w.date}|${(w.time ?? "").replace(":", "")}|${w.type}`;
}

export interface MatchingResult {
  /** `planId → Workout` för planer som blev konsumerade av ett genomfört pass. */
  planToWorkout: Map<string, Workout>;
  /** `workoutKey → PlannedWorkout` — som ovan fast tvärtom. */
  workoutToPlan: Map<string, PlannedWorkout>;
}

/**
 * Tvåvägsmatchning. Vi bygger alla giltiga (plan, workout)-par, sorterar efter
 * score och tilldelar i fallande ordning — skippar par där endera redan är
 * upptagen. Det gör att den globalt bästa matchningen alltid hittas först,
 * inte den som råkar komma tidigt i listan.
 */
export function matchWorkoutsToPlans(
  workouts: Workout[],
  plans: PlannedWorkout[],
  opts?: ScoreOpts,
): MatchingResult {
  const planToWorkout = new Map<string, Workout>();
  const workoutToPlan = new Map<string, PlannedWorkout>();

  type Pair = { plan: PlannedWorkout; workout: Workout; key: string; score: number };
  const pairs: Pair[] = [];
  for (const p of plans) {
    for (const w of workouts) {
      const s = scoreMatch(w, p, opts);
      if (s !== null) pairs.push({ plan: p, workout: w, key: workoutKey(w), score: s });
    }
  }
  pairs.sort((a, b) => b.score - a.score);

  const takenPlans = new Set<string>();
  const takenWorkouts = new Set<string>();
  for (const pair of pairs) {
    if (takenPlans.has(pair.plan.id)) continue;
    if (takenWorkouts.has(pair.key)) continue;
    takenPlans.add(pair.plan.id);
    takenWorkouts.add(pair.key);
    planToWorkout.set(pair.plan.id, pair.workout);
    workoutToPlan.set(pair.key, pair.plan);
  }

  return { planToWorkout, workoutToPlan };
}

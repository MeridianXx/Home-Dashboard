// ─── Claude-integration — AI-analys av pass ──────────────────────────────────

import Anthropic from "@anthropic-ai/sdk";
import type { Workout } from "./types";
import { buildContext } from "./context";
import { paceString, durationString } from "./parser";
import { getCoachPersona } from "./coach-persona";

// Sonnet 4.6 är senaste modell per jan 2026. Migrera här när nyare släpps.
const MODEL = "claude-sonnet-4-6";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY saknas i env");
  if (!client) client = new Anthropic({ apiKey: key });
  return client;
}

export function isClaudeReady(): boolean {
  return (process.env.ANTHROPIC_API_KEY ?? "").length > 0;
}

/** Kompakt beskrivning av det genomförda passet (för LLM). */
function workoutSummary(w: Workout): string {
  const parts: string[] = [`${w.date}${w.time ? ` ${w.time}` : ""} · ${w.type}`];
  if (w.distanceM > 0) parts.push(`${(w.distanceM / 1000).toFixed(2)} km`);
  if (w.totalTimeSec > 0) parts.push(durationString(w.totalTimeSec));
  if (w.distanceM > 0 && w.totalTimeSec > 0) parts.push(`${paceString(w.distanceM, w.totalTimeSec)}/km`);
  if (w.avgHR) parts.push(`snittpuls ${Math.round(w.avgHR)} bpm`);
  if (w.maxHR) parts.push(`maxpuls ${Math.round(w.maxHR)} bpm`);
  if (w.trimp != null) parts.push(`TRIMP ${Math.round(w.trimp)}`);
  if (w.rpe != null) parts.push(`RPE ${w.rpe}/10`);
  if (w.elevationGainM != null && w.elevationGainM > 0) parts.push(`höjdmeter ${Math.round(w.elevationGainM)} m`);
  if (w.avgPower != null) parts.push(`snittkraft ${Math.round(w.avgPower)} W`);
  if (w.activeCalories > 0) parts.push(`${Math.round(w.activeCalories)} kcal`);
  const zones: string[] = [];
  for (const [k, v] of [
    ["Z1", w.hrz1], ["Z2", w.hrz2], ["Z3", w.hrz3], ["Z4", w.hrz4], ["Z5", w.hrz5],
  ] as Array<[string, number | null]>) {
    if (v != null && v > 0) zones.push(`${k} ${Math.round(v * 100)}%`);
  }
  return parts.join(", ") + (zones.length > 0 ? ` · Pulszoner: ${zones.join(" ")}` : "");
}

export interface AnalyseResult {
  analysis: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  sourceFile: string | null;
}

/**
 * Analysera ett genomfört pass. Bygger prompt med profil + historik + PMC
 * och returnerar fri-text på svenska (3–6 meningar).
 */
export async function analyseWorkout(workout: Workout): Promise<AnalyseResult> {
  const excludeKey = `${workout.date}|${(workout.time ?? "").replace(":", "")}|${workout.type}`;
  // Viktigt: anchora kontexten på passets datum — inte idag. När vi analyserar
  // ett äldre pass ska pass som är NYARE än det exkluderas ur "senaste pass"-
  // listan, och PMC räknas fram till passets datum. Annars tror coachen att
  // t.ex. ett senare padelpass kom före.
  const [bundle, persona] = await Promise.all([
    buildContext({ recentCount: 20, weeklyWeeks: 20, excludeKey, anchorDate: workout.date }),
    getCoachPersona().catch(() => null),
  ]);

  const hasMetrics = workout.distanceM > 0 || (workout.avgHR ?? 0) > 0 || workout.totalTimeSec > 0;

  const summary = workoutSummary(workout);

  const systemParts: string[] = [];
  if (persona) systemParts.push(persona);
  systemParts.push(
    [
      "Du är en erfaren löpcoach som pratar direkt med din adept. Alla svar på svenska.",
      "Tilltala alltid adepten med \"du\" — aldrig i tredje person, aldrig med namn.",
      "Skriv löpande text. Inga rubriker, ingen punktlista.",
      "Fokusera på tolkning snarare än att upprepa siffror som redan står i användarens prompt.",
    ].join(" "),
  );
  const system = systemParts.join("\n\n---\n\n");

  const prompt = hasMetrics
    ? `Analysera passet nedan kort och konkret. Kommentera ansträngning och pulsfördelning i relation till träningsbilden runt passets datum, samt en konkret sak att tänka på framåt.

${bundle.text}

GENOMFÖRT PASS (det du analyserar):
- ${summary}

FORMAT: Dela upp i 2–3 korta stycken separerade med en tom rad. Första stycket: hur passet gick. Andra stycket: hur det passar träningsbilden. Tredje stycket (valfritt): konkret att tänka på framåt.`
    : `Passet nedan är genomfört men saknar mätdata (troligen styrke-/core-pass). Kommentera kort hur passet passar in i träningsbilden runt passets datum. Kommentera inte avsaknaden av data.

${bundle.text}

GENOMFÖRT PASS (det du analyserar):
- ${summary}

FORMAT: 2–3 meningar i ett stycke.`;

  const n = getClient();
  const response = await n.messages.create({
    model: MODEL,
    max_tokens: 600,
    system,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  return {
    analysis: text,
    model: response.model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    sourceFile: bundle.sourceFile,
  };
}

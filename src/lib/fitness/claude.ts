// ─── Claude-integration — AI-analys av pass ──────────────────────────────────

import Anthropic from "@anthropic-ai/sdk";
import type { Workout } from "./types";
import type { PlannedWorkoutInput } from "./notion";
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

// ─── Planerings-coach — generera planerade pass från fritext ─────────────────

export interface GeneratedPlanItem extends PlannedWorkoutInput {
  datum: string; // alltid satt från AI
}

export interface PlanGenerationResult {
  /** Fri-text från coachen (bakgrund, motivering, strukturöversikt). */
  commentary: string;
  /** Strukturerade pass redo att skrivas till Notion. */
  plan: GeneratedPlanItem[];
  model: string;
  inputTokens: number;
  outputTokens: number;
  sourceFile: string | null;
}

/** Första JSON-array-hashen i en LLM-respons. Claude svarar ibland med text före
 *  och efter JSON-blocket trots instruktion — så vi letar efter "[...]"-substring
 *  och parsar den. */
function extractJsonArray(text: string): unknown[] | null {
  // Greedy match över hela texten — `[` till sista `]`
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return null;
  const slice = text.slice(start, end + 1);
  try {
    const parsed = JSON.parse(slice);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Filtrera ett råobjekt från LLM:en till bara kända fält + validera ISO-datum. */
function sanitizePlanItem(raw: unknown): GeneratedPlanItem | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const str = (v: unknown): string | undefined =>
    typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
  const datum = str(r.datum);
  if (!datum || !/^\d{4}-\d{2}-\d{2}$/.test(datum)) return null;
  return {
    datum,
    passnamn: str(r.passnamn),
    typ: str(r.typ),
    status: str(r.status) ?? "Planerat",
    syfte: str(r.syfte),
    passdetaljer: str(r.passdetaljer),
    pulsintervall: str(r.pulsintervall),
    tempo: str(r.tempo),
    tid: str(r.tid),
    underlag: str(r.underlag),
  };
}

/**
 * Generera en träningsplan från en fritextprompt (t.ex. "Ge mig en plan för de
 * kommande 2 veckorna med fokus på tröskel och långpass"). Returnerar både en
 * mänsklig kommentar och en strukturerad plan som kan skrivas till Notion.
 */
export async function generateTrainingPlan(userPrompt: string): Promise<PlanGenerationResult> {
  const [bundle, persona] = await Promise.all([
    buildContext({ recentCount: 15, weeklyWeeks: 12 }),
    getCoachPersona().catch(() => null),
  ]);

  const todayIso = new Date().toISOString().slice(0, 10);

  const systemParts: string[] = [];
  if (persona) systemParts.push(persona);
  systemParts.push(
    [
      "Du är en erfaren löpcoach som planerar pass åt din adept. Alla svar på svenska.",
      "Tilltala alltid adepten med \"du\".",
      "Du ska returnera **både** en kort introducerande kommentar (2–4 meningar) **och** en JSON-array med planerade pass.",
      "Variera mellan uthållighet (Z2), tröskel, intervaller och återhämtning. Lägg alltid minst en vilodag per vecka.",
      "Respektera adeptens nuvarande form (CTL/TSB/TLR) — undvik stor ökning i veckobelastning om hen just nu är trött eller detränar.",
    ].join(" "),
  );
  const system = systemParts.join("\n\n---\n\n");

  const prompt = `Planera pass utifrån följande förfrågan: "${userPrompt.trim()}"

Dagens datum är ${todayIso}. Alla pass ska ligga på eller efter detta datum.

${bundle.text}

FORMAT — svara exakt så här, i denna ordning:
1. En kommentar på 2–4 meningar i löpande svenska (bakgrund, motivering, hur planen hänger ihop).
2. En tom rad.
3. En JSON-array (inget annat — inga kodstaket, inga rubriker) med passobjekt. Varje objekt har följande fält (alla valfria utom "datum", "typ" och "passnamn"):
   {
     "datum": "YYYY-MM-DD",
     "passnamn": "t.ex. 'Tröskel 5×1 km'",
     "typ": "Löpning | Cykling | Styrka | Annat",
     "syfte": "1 kort mening om passets träningssyfte",
     "passdetaljer": "Fritext — upplägg/struktur, t.ex. 'Uppvärmning 15 min, 5×1 km i tröskeltempo med 2 min jogg, nedjogg 10 min'",
     "pulsintervall": "t.ex. 'Z3–Z4, 160–175 bpm'",
     "tempo": "t.ex. '4:20/km'",
     "tid": "t.ex. '55 min' eller '10 km'",
     "underlag": "Asfalt | Grus | Terräng | Inomhus | Löpband"
   }

Viktigt:
- "datum" måste vara ISO YYYY-MM-DD.
- Svara ALDRIG med JSON inuti kodstaket (\`\`\`). Returnera rå array.
- Om användaren inte specificerade tidsomfång, planera 7–14 dagar framåt.`;

  const n = getClient();
  const response = await n.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system,
    messages: [{ role: "user", content: prompt }],
  });

  const rawText = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  const jsonArr = extractJsonArray(rawText);
  const plan: GeneratedPlanItem[] = Array.isArray(jsonArr)
    ? jsonArr.map(sanitizePlanItem).filter((x): x is GeneratedPlanItem => x !== null)
    : [];

  // Kommentar = texten innan första `[`. Städa bort trailing whitespace.
  const jsonStart = rawText.indexOf("[");
  const commentary = (jsonStart >= 0 ? rawText.slice(0, jsonStart) : rawText).trim();

  return {
    commentary,
    plan,
    model: response.model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    sourceFile: bundle.sourceFile,
  };
}

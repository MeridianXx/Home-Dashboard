// ─── Claude-integration — AI-analys av pass ──────────────────────────────────

import Anthropic from "@anthropic-ai/sdk";
import type { Workout } from "./types";
import type { PlannedWorkoutInput } from "./notion";
import { buildContext, isoWithDow } from "./context";
import { paceString, durationString } from "./parser";
import { getCoachPersona } from "./coach-persona";

// ─── Kalender-hjälpare ───────────────────────────────────────────────────────
// Claude räknar inte veckogränser själv pålitligt — berika prompten med en
// explicit lista av kommande svenska veckor (mån–sön).

/** Format en Date som YYYY-MM-DD (lokal tid). */
function isoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Måndagen i den vecka `d` ligger i (svensk vecka mån–sön). */
function mondayOf(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0=sön, 1=mån…
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

/** Bygg en kalenderöversikt: idag + N kommande veckor (mån–sön) i svensk form. */
function calendarOverview(today: Date, weeks = 3): string {
  const todayIso = isoLocal(today);
  const monThisWeek = mondayOf(today);

  const lines: string[] = [];
  lines.push(`DAGENS DATUM: ${isoWithDow(todayIso)}.`);
  lines.push("KALENDER (svenska veckor börjar måndag, slutar söndag):");

  for (let w = 0; w < weeks; w++) {
    const mon = new Date(monThisWeek);
    mon.setDate(mon.getDate() + w * 7);
    const sun = new Date(mon);
    sun.setDate(sun.getDate() + 6);
    const monIso = isoLocal(mon);
    const sunIso = isoLocal(sun);
    const label = w === 0
      ? "Denna vecka"
      : w === 1
        ? "Nästa vecka"
        : `Veckan efter nästa${w > 2 ? ` (+${w - 1})` : ""}`;
    lines.push(`- ${label}: mån ${monIso} – sön ${sunIso}.`);
  }
  lines.push(
    "Använd alltid veckodagen exakt som den står bredvid ISO-datumet. " +
    "Räkna aldrig själv ut vilken veckodag ett datum föll på.",
  );
  return lines.join("\n");
}

/** Mappning datum → veckodag för ett batch av pass — hjälper Claude referera
 *  korrekt till en befintlig plan när den pratar om dagar. */
function planDatumOverview(plan: GeneratedPlanItem[]): string {
  if (plan.length === 0) return "";
  const lines = ["DATUM I FÖRRA PLANEN (datum → veckodag):"];
  for (let i = 0; i < plan.length; i++) {
    const p = plan[i];
    lines.push(`- [${i}] ${isoWithDow(p.datum)} — ${p.passnamn ?? p.typ ?? "pass"}`);
  }
  return lines.join("\n");
}

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
 *  och efter JSON-blocket trots instruktion (kodstaket, "[pass 1]" i kommentar,
 *  etc.) — så vi kan inte bara ta första `[` till sista `]`. Istället: prova
 *  alla kombinationer av start/end tills en ger en giltig JSON-array. O(n²) men
 *  texten är kort. */
function extractJsonArray(text: string): unknown[] | null {
  const starts: number[] = [];
  for (let i = 0; i < text.length; i++) if (text[i] === "[") starts.push(i);
  const ends: number[] = [];
  for (let i = text.length - 1; i >= 0; i--) if (text[i] === "]") ends.push(i);

  for (const start of starts) {
    for (const end of ends) {
      if (end <= start) break;
      try {
        const parsed = JSON.parse(text.slice(start, end + 1));
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // prova nästa kombination
      }
    }
  }
  return null;
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

  const today = new Date();
  const calendar = calendarOverview(today, 4);

  const systemParts: string[] = [];
  if (persona) systemParts.push(persona);
  systemParts.push(
    [
      "Du är en erfaren löpcoach som planerar pass åt din adept. Alla svar på svenska.",
      "Tilltala alltid adepten med \"du\".",
      "Du ska returnera **både** en kort introducerande kommentar (2–4 meningar) **och** en JSON-array med planerade pass.",
      "Variera mellan uthållighet (Z2), tröskel, intervaller och återhämtning. Lägg alltid minst en vilodag per vecka.",
      "Respektera adeptens nuvarande form (CTL/TSB/TLR) — undvik stor ökning i veckobelastning om hen just nu är trött eller detränar.",
      "En svensk vecka börjar MÅNDAG och slutar SÖNDAG. När adepten säger \"nästa vecka\" menas mån–sön enligt kalendern nedan — aldrig mer.",
      "Använd veckodagen exakt som den står bredvid ISO-datumet. Räkna aldrig själv ut vilken veckodag ett datum föll på.",
    ].join(" "),
  );
  const system = systemParts.join("\n\n---\n\n");

  const prompt = `Planera pass utifrån följande förfrågan: "${userPrompt.trim()}"

${calendar}

Alla pass ska ligga på eller efter dagens datum. Om adepten sagt "nästa vecka" (eller motsvarande) ska planen hålla sig inom den vecka som är markerad "Nästa vecka" ovan — lägg inte till dagar efter söndagen.

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

// ─── Revidera en befintlig plan (chat-fortsättning) ──────────────────────────

export class PlanParseError extends Error {
  constructor(message: string, public rawText: string) {
    super(message);
    this.name = "PlanParseError";
  }
}

/**
 * Ersätt hela planen utifrån användarens feedback på det förra förslaget.
 * Claude får se ursprungsprompt + förra planen + feedbacken och producerar
 * en ny komplett plan + kommentar.
 */
export async function reviseTrainingPlan(args: {
  originalPrompt: string;
  previousPlan: GeneratedPlanItem[];
  feedback: string;
}): Promise<PlanGenerationResult> {
  const [bundle, persona] = await Promise.all([
    buildContext({ recentCount: 15, weeklyWeeks: 12 }),
    getCoachPersona().catch(() => null),
  ]);
  const today = new Date();
  const calendar = calendarOverview(today, 4);
  const datumOverview = planDatumOverview(args.previousPlan);

  const systemParts: string[] = [];
  if (persona) systemParts.push(persona);
  systemParts.push(
    [
      "Du är en erfaren löpcoach som planerar pass åt din adept. Alla svar på svenska.",
      "Tilltala alltid adepten med \"du\".",
      "Du ska returnera **både** en kort kommentar (2–4 meningar) **och** en JSON-array med den reviderade planen.",
      "Utgå från den tidigare planen — behåll det som fungerar, ändra bara det som adepten har begärt (eller det som behövs för att respektera feedbacken).",
      "Variera mellan uthållighet (Z2), tröskel, intervaller och återhämtning. Lägg alltid minst en vilodag per vecka.",
      "En svensk vecka börjar MÅNDAG och slutar SÖNDAG. När adepten säger \"nästa vecka\" menas mån–sön enligt kalendern — aldrig mer.",
      "Använd veckodagen exakt som den står bredvid ISO-datumet i kalendern/datum-översikten. Räkna aldrig själv ut vilken veckodag ett datum föll på.",
    ].join(" "),
  );
  const system = systemParts.join("\n\n---\n\n");

  const prompt = `Ursprunglig förfrågan: "${args.originalPrompt.trim()}"

${calendar}

${datumOverview}

FÖRRA FÖRSLAGET (JSON):
${JSON.stringify(args.previousPlan, null, 2)}

ADEPTENS FEEDBACK: "${args.feedback.trim()}"

Alla pass ska ligga på eller efter dagens datum. Håll dig inom samma vecko-omfattning som ursprungsförslaget om inte feedbacken uttryckligen ber om något annat.

${bundle.text}

FORMAT — svara exakt så här, i denna ordning:
1. En kort kommentar på 2–4 meningar i löpande svenska som förklarar vad du ändrat och varför.
2. En tom rad.
3. En JSON-array med den **kompletta** reviderade planen (samma schema som tidigare — datum, passnamn, typ, syfte, passdetaljer, pulsintervall, tempo, tid, underlag).

Viktigt:
- Svara ALDRIG med JSON inuti kodstaket (\`\`\`). Returnera rå array.
- "datum" måste vara ISO YYYY-MM-DD.
- Returnera hela planen, inte bara det du ändrat.`;

  const n = getClient();
  const response = await n.messages.create({
    model: MODEL,
    // Högre än initial generering — revise-prompten har den tidigare planen
    // inbakad som JSON, plus svaret ska innehålla hela nya planen. 3500 ger
    // utrymme för ~15 pass innan trunkering.
    max_tokens: 3500,
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

  if (plan.length === 0) {
    console.error(
      "[fitness/revise] Kunde inte parsa plan ur Claude-svar.\n" +
      `stop_reason=${response.stop_reason} tokens_out=${response.usage.output_tokens}\n` +
      `Råtext (${rawText.length} tecken):\n`,
      rawText,
    );
    throw new PlanParseError(
      response.stop_reason === "max_tokens"
        ? "Svaret blev för långt och avbröts. Prova en kortare revision."
        : "Claude returnerade ingen giltig plan-JSON",
      rawText,
    );
  }

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

// ─── Regenerera ett enskilt pass ─────────────────────────────────────────────

export interface RegenerateItemResult {
  item: GeneratedPlanItem;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

/** Första JSON-objekthashen i en LLM-respons — robust mot kommentar runt JSON. */
function extractJsonObject(text: string): Record<string, unknown> | null {
  const starts: number[] = [];
  for (let i = 0; i < text.length; i++) if (text[i] === "{") starts.push(i);
  const ends: number[] = [];
  for (let i = text.length - 1; i >= 0; i--) if (text[i] === "}") ends.push(i);

  for (const start of starts) {
    for (const end of ends) {
      if (end <= start) break;
      try {
        const parsed = JSON.parse(text.slice(start, end + 1));
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        // prova nästa
      }
    }
  }
  return null;
}

/**
 * Ersätt ett enskilt pass i planen. Resten av planen förblir intakt — Claude
 * får se hela planen som kontext och ombeds returnera ett nytt pass på samma
 * datum som det ersatta.
 */
export async function regeneratePlanItem(args: {
  previousPlan: GeneratedPlanItem[];
  index: number;
  originalPrompt: string;
  /** Valfri: "gör detta lättare" / "byt till intervaller" etc. Lämnas tom för
   *  en helt ny variant utifrån samma träningsbild. */
  hint?: string;
}): Promise<RegenerateItemResult> {
  if (args.index < 0 || args.index >= args.previousPlan.length) {
    throw new Error(`Ogiltigt pass-index: ${args.index}`);
  }
  const target = args.previousPlan[args.index];

  const [bundle, persona] = await Promise.all([
    buildContext({ recentCount: 15, weeklyWeeks: 12 }),
    getCoachPersona().catch(() => null),
  ]);
  const datumOverview = planDatumOverview(args.previousPlan);

  const systemParts: string[] = [];
  if (persona) systemParts.push(persona);
  systemParts.push(
    [
      "Du är en erfaren löpcoach som planerar pass åt din adept.",
      "Du ska byta ut **ett** pass i en befintlig plan. Returnera bara det nya passet som ett JSON-objekt.",
      "Behåll samma datum som det gamla passet. Variera gärna innehållet/typen så länge det passar träningsbilden.",
      "Använd veckodagen exakt som den står bredvid ISO-datumet. Räkna aldrig själv ut vilken veckodag ett datum föll på.",
    ].join(" "),
  );
  const system = systemParts.join("\n\n---\n\n");

  const prompt = `Ursprunglig förfrågan: "${args.originalPrompt.trim()}"

${datumOverview}

NUVARANDE PLAN (hela — för kontext):
${JSON.stringify(args.previousPlan, null, 2)}

BYT UT: pass på index ${args.index} (${isoWithDow(target.datum)}, "${target.passnamn ?? target.typ ?? "pass"}").
${args.hint ? `ADEPTENS ÖNSKAN FÖR DETTA PASS: "${args.hint.trim()}"` : "Ingen specifik önskan — skapa en meningsfull variant som passar träningsbilden."}

${bundle.text}

FORMAT — svara med exakt ett JSON-objekt (inga kodstaket, ingen extra text) med samma fält som resten av planen:
{
  "datum": "${target.datum}",
  "passnamn": "...",
  "typ": "Löpning | Cykling | Styrka | Annat",
  "syfte": "...",
  "passdetaljer": "...",
  "pulsintervall": "...",
  "tempo": "...",
  "tid": "...",
  "underlag": "..."
}`;

  const n = getClient();
  const response = await n.messages.create({
    model: MODEL,
    max_tokens: 800,
    system,
    messages: [{ role: "user", content: prompt }],
  });

  const rawText = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  const rawObj = extractJsonObject(rawText);
  const parsed = rawObj ? sanitizePlanItem(rawObj) : null;
  if (!parsed) {
    throw new Error("Claude returnerade inget giltigt pass-objekt");
  }
  // Tvinga samma datum som originalet för att inte krocka mot resten av planen
  const item: GeneratedPlanItem = { ...parsed, datum: target.datum };

  return {
    item,
    model: response.model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

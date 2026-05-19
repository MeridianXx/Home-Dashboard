// ─── Fitness · AI-verktyg ────────────────────────────────────────────────────
// Tools som AI:n får anropa via runWithTools(). Speglar mönstret från
// `garden/ai-tools.ts` — varje tool har JSON-schema + handler som kör mot
// Notion-DB:n eller `claude.ts`-helpers (för regen/single-flöden).

import "server-only";
import type { ToolDefinition, ToolRegistry } from "@/lib/ai/types";
import {
  createPlannedWorkout,
  updatePlannedWorkout,
  archivePlannedWorkout,
  getPlannedWorkouts,
} from "./notion";
import {
  generateTrainingPlan,
  generateSingleWorkout,
  reviseTrainingPlan,
  PlanParseError,
  type GeneratedPlanItem,
} from "./claude";
import { getLatestWorkoutsXlsx } from "./drive";
import { parseAllWorkouts } from "./parser";
import type { Workout } from "./types";

const TYPE_OPTIONS = [
  "Löpning",
  "Cykling",
  "Styrka",
  "Core",
  "Promenad",
  "Padel",
  "Yoga",
  "Simning",
  "Skidor",
  "Annat",
];
const STATUS_OPTIONS = ["Planerat", "Genomfört", "Inställt"];
const UNDERLAG_OPTIONS = ["Asfalt", "Grus", "Terräng", "Inomhus", "Löpband"];

// Server-side enum-guards — schemat berättar för Claude vad som är giltigt
// men Notion accepterar valfri sträng på select. En prompt-injektion via
// passdetaljer kan annars skapa skräp-options i DB:n.
const TYPE_SET = new Set(TYPE_OPTIONS);
const STATUS_SET = new Set(STATUS_OPTIONS);
const UNDERLAG_SET = new Set(UNDERLAG_OPTIONS);

function ensureEnum(
  label: string,
  value: string | undefined,
  allowed: Set<string>
): void {
  if (value === undefined) return;
  if (!allowed.has(value)) {
    throw new Error(
      `${label}=${JSON.stringify(value)} är inte tillåtet. Giltiga: ${[...allowed].join(", ")}`
    );
  }
}

// ─── create_planned_workout ──────────────────────────────────────────────────

const createPlannedWorkoutTool: ToolDefinition = {
  name: "create_planned_workout",
  description:
    "Skapa ett nytt planerat pass i Notion. Använd när användaren ber dig " +
    "lägga in ett specifikt pass på ett datum. För hela veckoplaneringar — " +
    "använd `generate_week_plan` istället.",
  input_schema: {
    type: "object",
    properties: {
      datum: { type: "string", description: "ISO YYYY-MM-DD" },
      passnamn: { type: "string", description: "Kort namn, t.ex. 'Tröskelintervaller 5×6 min'" },
      typ: { type: "string", enum: TYPE_OPTIONS },
      syfte: { type: "string", description: "Varför detta pass — träningsstimulus" },
      passdetaljer: { type: "string", description: "Steg-för-steg beskrivning" },
      pulsintervall: { type: "string", description: "T.ex. 'Z3 (155-167 bpm)'" },
      tempo: { type: "string", description: "T.ex. '4:30 min/km' eller 'lätt'" },
      tid: { type: "string", description: "Total passlängd, t.ex. '60 min'" },
      underlag: { type: "string", enum: UNDERLAG_OPTIONS },
      status: { type: "string", enum: STATUS_OPTIONS, description: "Default: Planerat" },
    },
    required: ["datum"],
  },
  handler: async (input) => {
    const i = input as Record<string, string | undefined>;
    ensureEnum("typ", i.typ, TYPE_SET);
    ensureEnum("underlag", i.underlag, UNDERLAG_SET);
    ensureEnum("status", i.status, STATUS_SET);
    const plan = await createPlannedWorkout({
      datum: i.datum!,
      passnamn: i.passnamn,
      typ: i.typ,
      syfte: i.syfte,
      passdetaljer: i.passdetaljer,
      pulsintervall: i.pulsintervall,
      tempo: i.tempo,
      tid: i.tid,
      underlag: i.underlag,
      status: i.status ?? "Planerat",
    });
    return {
      ok: true,
      planId: plan.id,
      passnamn: plan.passnamn,
      datum: plan.datum,
      typ: plan.typ,
    };
  },
};

// ─── update_planned_workout ──────────────────────────────────────────────────

const updatePlannedWorkoutTool: ToolDefinition = {
  name: "update_planned_workout",
  description:
    "Uppdatera ett befintligt planerat pass. Bara fält som ska ändras ska " +
    "skickas. Använd t.ex. för att flytta ett pass till annan dag, byta typ, " +
    "markera som Genomfört eller Inställt.",
  input_schema: {
    type: "object",
    properties: {
      id: { type: "string", description: "Notion page-id för passet (från list_planned_workouts)" },
      datum: { type: "string", description: "ISO YYYY-MM-DD" },
      passnamn: { type: "string" },
      typ: { type: "string", enum: TYPE_OPTIONS },
      syfte: { type: "string" },
      passdetaljer: { type: "string" },
      pulsintervall: { type: "string" },
      tempo: { type: "string" },
      tid: { type: "string" },
      underlag: { type: "string", enum: UNDERLAG_OPTIONS },
      status: { type: "string", enum: STATUS_OPTIONS },
    },
    required: ["id"],
  },
  handler: async (input) => {
    const i = input as { id: string } & Record<string, string | undefined>;
    ensureEnum("typ", i.typ, TYPE_SET);
    ensureEnum("underlag", i.underlag, UNDERLAG_SET);
    ensureEnum("status", i.status, STATUS_SET);
    const { id, ...patch } = i;
    const plan = await updatePlannedWorkout(id, patch);
    return {
      ok: true,
      planId: plan.id,
      passnamn: plan.passnamn,
      datum: plan.datum,
      status: plan.status,
    };
  },
};

// ─── archive_planned_workout ─────────────────────────────────────────────────

const archivePlannedWorkoutTool: ToolDefinition = {
  name: "archive_planned_workout",
  description:
    "Arkivera (mjuk-radera) ett planerat pass. Notion-raden går till " +
    "papperskorgen — användaren kan återställa i Notion UI om det behövs.",
  input_schema: {
    type: "object",
    properties: {
      id: { type: "string", description: "Notion page-id" },
    },
    required: ["id"],
  },
  handler: async (input) => {
    const { id } = input as { id: string };
    await archivePlannedWorkout(id);
    return { ok: true, planId: id };
  },
};

// ─── list_planned_workouts ───────────────────────────────────────────────────

const listPlannedWorkoutsTool: ToolDefinition = {
  name: "list_planned_workouts",
  description:
    "Lista planerade pass, valfritt filtrerade på datumintervall. Returnerar " +
    "id, datum, typ, passnamn, status — använd id:t för update/archive-anrop.",
  input_schema: {
    type: "object",
    properties: {
      fromDate: { type: "string", description: "ISO YYYY-MM-DD inkl." },
      toDate: { type: "string", description: "ISO YYYY-MM-DD inkl." },
    },
  },
  handler: async (input) => {
    const i = input as { fromDate?: string; toDate?: string };
    const all = await getPlannedWorkouts();
    const filtered = all.filter((p) => {
      if (i.fromDate && p.datum && p.datum < i.fromDate) return false;
      if (i.toDate && p.datum && p.datum > i.toDate) return false;
      return true;
    });
    return filtered.slice(0, 80).map((p) => ({
      id: p.id,
      datum: p.datum,
      typ: p.typ,
      passnamn: p.passnamn,
      status: p.status,
      tid: p.tid,
    }));
  },
};

// ─── get_recent_workouts ─────────────────────────────────────────────────────

const getRecentWorkoutsTool: ToolDefinition = {
  name: "get_recent_workouts",
  description:
    "Hämta senast genomförda pass från HealthFit-data (Apple Watch). Använd " +
    "för 'hur har min senaste vecka sett ut?'-frågor eller för att se vad " +
    "användaren tränat innan du föreslår nästa pass. Default 10, max 50.",
  input_schema: {
    type: "object",
    properties: {
      limit: { type: "number", description: "Antal pass (1-50, default 10)" },
    },
  },
  handler: async (input) => {
    const i = input as { limit?: number };
    const limit = Math.max(1, Math.min(50, i.limit ?? 10));
    const file = await getLatestWorkoutsXlsx();
    if (!file) return { ok: false, error: "Ingen HealthFit-data hittades i Drive" };
    const workouts: Workout[] = parseAllWorkouts(file.buffer);
    return workouts.slice(0, limit).map((w) => ({
      date: w.date,
      time: w.time,
      type: w.type,
      distanceM: w.distanceM,
      totalTimeSec: w.totalTimeSec,
      avgHR: w.avgHR,
      trimp: w.trimp,
      rpe: w.rpe,
    }));
  },
};

// ─── generate_week_plan ──────────────────────────────────────────────────────

const generateWeekPlanTool: ToolDefinition = {
  name: "generate_week_plan",
  description:
    "Generera en hel träningsplan för en eller flera veckor utifrån en fri- " +
    "text-prompt. AI:n returnerar 5-15 förslag som RÅSKISS — du måste sedan " +
    "läsa upp dem för användaren och fråga om hen vill att du skapar dem som " +
    "planerade pass (då kallar du `create_planned_workout` per pass). Detta " +
    "är coachens primära planeringsverktyg.",
  input_schema: {
    type: "object",
    properties: {
      prompt: {
        type: "string",
        description: "Användarens önskemål, t.ex. 'planera 2 veckor med 1 långpass och 2 intervaller'",
      },
    },
    required: ["prompt"],
  },
  handler: async (input) => {
    const { prompt } = input as { prompt: string };
    try {
      const result = await generateTrainingPlan(prompt);
      return {
        ok: true,
        items: result.plan.map((it: GeneratedPlanItem) => ({
          datum: it.datum,
          passnamn: it.passnamn,
          typ: it.typ,
          syfte: it.syfte,
          passdetaljer: it.passdetaljer,
          pulsintervall: it.pulsintervall,
          tempo: it.tempo,
          tid: it.tid,
          underlag: it.underlag,
        })),
        comment: result.commentary,
      };
    } catch (err) {
      if (err instanceof PlanParseError) {
        return { ok: false, error: `Plan-parse misslyckades: ${err.message}` };
      }
      throw err;
    }
  },
};

// ─── generate_single_workout ─────────────────────────────────────────────────

const generateSingleWorkoutTool: ToolDefinition = {
  name: "generate_single_workout",
  description:
    "Generera ETT specifikt pass för ett enskilt datum (utan att skapa det). " +
    "Bra när användaren säger 'föreslå ett pass på torsdag' utan att vilja " +
    "ha en hel vecka. Du måste sedan kalla `create_planned_workout` om hen " +
    "vill spara det.",
  input_schema: {
    type: "object",
    properties: {
      date: { type: "string", description: "ISO YYYY-MM-DD" },
      hint: { type: "string", description: "Valfri styrning, t.ex. 'lätt återhämtning' eller 'styrka för knäns stabilitet'" },
    },
    required: ["date"],
  },
  handler: async (input) => {
    const { date, hint } = input as { date: string; hint?: string };
    const result = await generateSingleWorkout({ date, hint });
    return {
      ok: true,
      item: {
        datum: result.item.datum,
        passnamn: result.item.passnamn,
        typ: result.item.typ,
        syfte: result.item.syfte,
        passdetaljer: result.item.passdetaljer,
        pulsintervall: result.item.pulsintervall,
        tempo: result.item.tempo,
        tid: result.item.tid,
        underlag: result.item.underlag,
      },
    };
  },
};

// ─── Registry ────────────────────────────────────────────────────────────────
//
// För "byt ut tisdagens pass": kombinera `archive_planned_workout` +
// `generate_single_workout` + `create_planned_workout`. `regeneratePlanItem`
// från claude.ts kräver `originalPrompt` som vi inte har bevarat — den
// används enbart i kalender-UI:t där prompten finns i state.

export function fitnessToolRegistry(): ToolRegistry {
  return {
    create_planned_workout: createPlannedWorkoutTool,
    update_planned_workout: updatePlannedWorkoutTool,
    archive_planned_workout: archivePlannedWorkoutTool,
    list_planned_workouts: listPlannedWorkoutsTool,
    get_recent_workouts: getRecentWorkoutsTool,
    generate_week_plan: generateWeekPlanTool,
    generate_single_workout: generateSingleWorkoutTool,
  };
}

export function describeFitnessTools(registry: ToolRegistry): string {
  return Object.values(registry)
    .map((t) => `- ${t.name}: ${t.description.split("\n")[0]}`)
    .join("\n");
}

// `reviseTrainingPlan` används av kalender-UI:ts feedback-flow (inte av AI:n
// direkt — där sköts revisionen via samtalet i sig).
export { reviseTrainingPlan };

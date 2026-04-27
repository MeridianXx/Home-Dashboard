// ─── Garden · AI-verktyg ─────────────────────────────────────────────────────
// Tool-definitioner som AI:n får anropa. Varje tool har JSON-schema +
// server-side handler som kör mot notion.ts (Notion) eller ai-context.ts
// (väder). Definitionerna registreras i `gardenToolRegistry()`.

import "server-only";
import type { ToolDefinition, ToolRegistry } from "@/lib/ai/types";
import {
  createTask,
  updateTask,
  getPlants,
  getPlantById,
  getTasks,
  createProject,
} from "./notion";
import { getWeatherSnapshot } from "./ai-context";

// ─── create_task ─────────────────────────────────────────────────────────────

const createTaskTool: ToolDefinition = {
  name: "create_task",
  description:
    "Skapa en ny uppgift i Säsongsplan. Använd när användaren ber om planering, " +
    "eller när du vill schemalägga något som ett konkret datum istället för bara " +
    "skriva råd i text. Datum måste vara ISO YYYY-MM-DD.",
  input_schema: {
    type: "object",
    properties: {
      uppgift: { type: "string", description: "Kort beskrivning, t.ex. 'Beskär syrenhortensia'" },
      datum: { type: "string", description: "ISO YYYY-MM-DD" },
      status: {
        type: "string",
        enum: ["Planerad", "Pågår", "Klar"],
        description: "Default: Planerad",
      },
      typ: {
        type: "string",
        enum: ["Gräsmatta", "Rabatter", "Träd & buskar", "Grönsaker"],
        description: "Kategori",
      },
      atgarder: {
        type: "array",
        items: {
          type: "string",
          enum: ["Underhåll", "Delning", "Beskärning", "Gödsling", "Inspektion", "Plantering"],
        },
        description: "En eller flera åtgärdstyper",
      },
      kommentar: { type: "string", description: "Extra anteckningar (valfritt)" },
      plantIds: {
        type: "array",
        items: { type: "string" },
        description:
          "Notion page-ids på växter denna uppgift kopplas till. Använd " +
          "list_plants/get_plant för att hitta rätt id.",
      },
    },
    required: ["uppgift", "datum"],
  },
  handler: async (input) => {
    const i = input as {
      uppgift: string;
      datum: string;
      status?: string;
      typ?: string;
      atgarder?: string[];
      kommentar?: string;
      plantIds?: string[];
    };
    const task = await createTask({
      uppgift: i.uppgift,
      datum: i.datum,
      status: i.status ?? "Planerad",
      typ: i.typ,
      atgarder: i.atgarder,
      kommentar: i.kommentar,
      plantIds: i.plantIds,
    });
    return { ok: true, taskId: task.id, uppgift: task.uppgift, datum: task.datum };
  },
};

// ─── update_task ─────────────────────────────────────────────────────────────

const updateTaskTool: ToolDefinition = {
  name: "update_task",
  description:
    "Uppdatera en befintlig uppgift. Använd när användaren ber dig flytta, " +
    "markera klar eller justera detaljer. Bara fält som ska ändras ska skickas.",
  input_schema: {
    type: "object",
    properties: {
      id: { type: "string", description: "Notion page-id för uppgiften" },
      uppgift: { type: "string" },
      datum: { type: "string", description: "ISO YYYY-MM-DD" },
      status: { type: "string", enum: ["Planerad", "Pågår", "Klar"] },
      typ: { type: "string" },
      atgarder: { type: "array", items: { type: "string" } },
      kommentar: { type: "string" },
      plantIds: { type: "array", items: { type: "string" } },
    },
    required: ["id"],
  },
  handler: async (input) => {
    const i = input as { id: string } & Record<string, unknown>;
    const { id, ...patch } = i;
    const task = await updateTask(id, patch as Parameters<typeof updateTask>[1]);
    return { ok: true, taskId: task.id, uppgift: task.uppgift, datum: task.datum, status: task.status };
  },
};

// ─── list_plants ─────────────────────────────────────────────────────────────

const listPlantsTool: ToolDefinition = {
  name: "list_plants",
  description:
    "Lista växter i registret. Filtrera vid behov på typ eller plats. " +
    "Returnerar id, namn, typ och plats — använd `get_plant` för full detalj.",
  input_schema: {
    type: "object",
    properties: {
      typ: { type: "string", description: "T.ex. 'Buske', 'Perenn', 'Grönsak'" },
      plats: { type: "string", description: "T.ex. 'Framsida', 'Altan'" },
    },
  },
  handler: async (input) => {
    const i = input as { typ?: string; plats?: string };
    const plants = await getPlants({ typ: i.typ, plats: i.plats });
    return plants.map((p) => ({
      id: p.id,
      vaxt: p.vaxt,
      typ: p.typ,
      platser: p.platser,
    }));
  },
};

// ─── get_plant ───────────────────────────────────────────────────────────────

const getPlantTool: ToolDefinition = {
  name: "get_plant",
  description: "Hämta full detalj om en specifik växt — beskärning, gödsling, skötselråd.",
  input_schema: {
    type: "object",
    properties: {
      id: { type: "string", description: "Notion page-id för växten" },
    },
    required: ["id"],
  },
  handler: async (input) => {
    const i = input as { id: string };
    const plant = await getPlantById(i.id);
    if (!plant) return { ok: false, error: "Växt hittades inte" };
    return plant;
  },
};

// ─── search_tasks ────────────────────────────────────────────────────────────

const searchTasksTool: ToolDefinition = {
  name: "search_tasks",
  description:
    "Hitta uppgifter via fri-text-sökning på namn/kommentar samt valfria " +
    "datum-/typ-filter. Bra för 'alla beskärningar i mars' eller 'när är " +
    "nästa gödsling planerad?'.",
  input_schema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Fri-text — söks i uppgift + kommentar" },
      typ: { type: "string", enum: ["Gräsmatta", "Rabatter", "Träd & buskar", "Grönsaker"] },
      status: { type: "string", enum: ["Planerad", "Pågår", "Klar"] },
      fromDate: { type: "string", description: "ISO YYYY-MM-DD, inklusive" },
      toDate: { type: "string", description: "ISO YYYY-MM-DD, inklusive" },
    },
  },
  handler: async (input) => {
    const i = input as { query?: string; typ?: string; status?: string; fromDate?: string; toDate?: string };
    const tasks = await getTasks({
      typ: i.typ, status: i.status, fromDate: i.fromDate, toDate: i.toDate,
    });
    const q = i.query?.trim().toLowerCase();
    const filtered = q
      ? tasks.filter((t) =>
          t.uppgift.toLowerCase().includes(q) ||
          t.kommentar.toLowerCase().includes(q) ||
          t.atgarder.some((a) => a.toLowerCase().includes(q)),
        )
      : tasks;
    return filtered.slice(0, 50).map((t) => ({
      id: t.id,
      uppgift: t.uppgift,
      datum: t.datum,
      status: t.status,
      typ: t.typ,
      atgarder: t.atgarder,
    }));
  },
};

// ─── get_weather_forecast ────────────────────────────────────────────────────

const getWeatherForecastTool: ToolDefinition = {
  name: "get_weather_forecast",
  description:
    "Returnera kommande 7 dagars väderprognos för Borås (växtzon 3). " +
    "Behövs sällan eftersom system-prompten redan innehåller prognosen, " +
    "men användbart om du vill verifiera ett specifikt datum.",
  input_schema: {
    type: "object",
    properties: {},
  },
  handler: async () => {
    const w = await getWeatherSnapshot();
    if (!w) return { ok: false, error: "Kunde inte hämta väder" };
    return w;
  },
};

// ─── create_project ──────────────────────────────────────────────────────────

const createProjectTool: ToolDefinition = {
  name: "create_project",
  description:
    "Skapa ett nytt utomhusprojekt. Använd när användaren beskriver något som " +
    "är större än en enskild säsongsuppgift (t.ex. mur, plantering, anläggning).",
  input_schema: {
    type: "object",
    properties: {
      namn: { type: "string", description: "Kort namn, t.ex. 'Mur baksida slänten'" },
      status: {
        type: "string",
        enum: ["Ny", "Utreds", "Planerad", "Pågående", "Väntar", "Klart", "Skrotad"],
        description: "Default: Ny",
      },
      prioritet: { type: "string", enum: ["Hög", "Normal", "Låg"] },
      omrade: {
        type: "string",
        enum: ["Uppfart", "Finplanering", "Grovplanering", "Trädgård", "Bygg", "Altan"],
      },
      tidsram: { type: "string", enum: ["Oklart", "2026", "2027"] },
      budget: { type: "number", description: "I SEK" },
      kommentar: { type: "string" },
    },
    required: ["namn"],
  },
  handler: async (input) => {
    const i = input as {
      namn: string;
      status?: string;
      prioritet?: string;
      omrade?: string;
      tidsram?: string;
      budget?: number;
      kommentar?: string;
    };
    const project = await createProject({
      namn: i.namn,
      status: i.status ?? "Ny",
      prioritet: i.prioritet ?? "Normal",
      omrade: i.omrade,
      tidsram: i.tidsram,
      budget: i.budget ?? null,
      kommentar: i.kommentar,
    });
    return { ok: true, projectId: project.id, namn: project.namn };
  },
};

// ─── Registry ────────────────────────────────────────────────────────────────

export function gardenToolRegistry(): ToolRegistry {
  return {
    create_task: createTaskTool,
    update_task: updateTaskTool,
    list_plants: listPlantsTool,
    get_plant: getPlantTool,
    search_tasks: searchTasksTool,
    get_weather_forecast: getWeatherForecastTool,
    create_project: createProjectTool,
  };
}

/** Kort lista av tool-namn + vad de gör — bakas in i system-prompten så
 *  modellen vet exakt vad som finns att använda. */
export function describeTools(registry: ToolRegistry): string {
  return Object.values(registry)
    .map((t) => `- ${t.name}: ${t.description.split("\n")[0]}`)
    .join("\n");
}

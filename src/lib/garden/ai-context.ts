// ─── Garden · AI-kontext ─────────────────────────────────────────────────────
// Server-only: bygger paketet som bakas in i Claude system-prompten. Hämtar
// växter/uppgifter/projekt direkt mot notion.ts (inte via HTTP-route — vi
// kör i samma process). Väder från Open-Meteo med 30 min cache.

import "server-only";
import { getPlants, getTasks, getProjects } from "./notion";
import type { Plant, SeasonTask, OutdoorProject } from "./types";

const WEATHER_CACHE_TTL = 30 * 60 * 1000;
const BORAS_LAT = 57.7210;
const BORAS_LON = 12.9401;

export interface WeatherDay {
  date: string;
  tMaxC: number | null;
  tMinC: number | null;
  precipMm: number | null;
  windMaxKmh: number | null;
}

export interface WeatherSnapshot {
  currentTempC: number | null;
  currentHumidity: number | null;
  forecast: WeatherDay[];
  fetchedAt: string;
}

export interface GardenContext {
  currentDate: string;
  gardenZone: string;
  weather: WeatherSnapshot | null;
  plants: Plant[];
  upcomingTasks: SeasonTask[];
  recentTasks: SeasonTask[];
  activeProjects: OutdoorProject[];
}

let weatherCache: { data: WeatherSnapshot; timestamp: number } | null = null;

/** Aktuell tid + 7 dygns prognos från Open-Meteo. Inga API-nycklar krävs. */
export async function getWeatherSnapshot(opts: { skipCache?: boolean } = {}): Promise<WeatherSnapshot | null> {
  if (!opts.skipCache && weatherCache && Date.now() - weatherCache.timestamp < WEATHER_CACHE_TTL) {
    return weatherCache.data;
  }
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(BORAS_LAT));
  url.searchParams.set("longitude", String(BORAS_LON));
  url.searchParams.set("current", "temperature_2m,relative_humidity_2m");
  url.searchParams.set(
    "daily",
    "temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max",
  );
  url.searchParams.set("timezone", "Europe/Stockholm");
  url.searchParams.set("forecast_days", "7");

  try {
    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(5000),
      // Open-Meteo har generös fair-use; ingen User-Agent krävs men fail
      // gracefully om de strular.
    });
    if (!res.ok) return null;
    const body = await res.json() as {
      current?: { temperature_2m?: number; relative_humidity_2m?: number };
      daily?: {
        time?: string[];
        temperature_2m_max?: Array<number | null>;
        temperature_2m_min?: Array<number | null>;
        precipitation_sum?: Array<number | null>;
        wind_speed_10m_max?: Array<number | null>;
      };
    };

    const dates = body.daily?.time ?? [];
    const forecast: WeatherDay[] = dates.map((date, i) => ({
      date,
      tMaxC: body.daily?.temperature_2m_max?.[i] ?? null,
      tMinC: body.daily?.temperature_2m_min?.[i] ?? null,
      precipMm: body.daily?.precipitation_sum?.[i] ?? null,
      windMaxKmh: body.daily?.wind_speed_10m_max?.[i] ?? null,
    }));

    const snap: WeatherSnapshot = {
      currentTempC: body.current?.temperature_2m ?? null,
      currentHumidity: body.current?.relative_humidity_2m ?? null,
      forecast,
      fetchedAt: new Date().toISOString(),
    };
    weatherCache = { data: snap, timestamp: Date.now() };
    return snap;
  } catch {
    return null;
  }
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const ACTIVE_PROJECT_STATUSES = new Set(["Planerad", "Pågående", "Utreds", "Väntar"]);

/**
 * Bygg fullt kontext-objekt. Hämtar alla växter, uppgifter ±60 dagar,
 * aktiva projekt och väder. Anropas en gång per chat-request av route-koden
 * och bakas in i system-prompten via `formatContextAsSystemBlock()`.
 */
export async function buildGardenContext(): Promise<GardenContext> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const past60 = new Date(today);
  past60.setDate(past60.getDate() - 60);
  const future60 = new Date(today);
  future60.setDate(future60.getDate() + 60);

  const [plants, tasksWindow, projects, weather] = await Promise.all([
    getPlants(),
    getTasks({ fromDate: isoDate(past60), toDate: isoDate(future60) }),
    getProjects(),
    getWeatherSnapshot(),
  ]);

  const todayIso = isoDate(today);
  const upcomingTasks = tasksWindow.filter((t) => t.datum && t.datum >= todayIso);
  const recentTasks = tasksWindow
    .filter((t) => t.datum && t.datum < todayIso)
    .slice(-15); // sista 15 inom 60-dagars-fönstret

  const activeProjects = projects.filter((p) => ACTIVE_PROJECT_STATUSES.has(p.status));

  return {
    currentDate: todayIso,
    gardenZone: "3",
    weather,
    plants,
    upcomingTasks,
    recentTasks,
    activeProjects,
  };
}

// ─── Serialisering ───────────────────────────────────────────────────────────

function formatPlant(p: Plant): string {
  const parts: string[] = [`- ${p.vaxt} (${p.typ || "okänd typ"})`];
  if (p.platser.length > 0) parts.push(`plats: ${p.platser.join(", ")}`);
  if (p.beskarning.length > 0) parts.push(`beskärning: ${p.beskarning.join(", ")}`);
  if (p.godsling.length > 0) parts.push(`gödsling: ${p.godsling.join(", ")}`);
  if (p.skotselrad) parts.push(`råd: ${p.skotselrad}`);
  return parts.join(" · ");
}

function formatTask(t: SeasonTask, plantNameById: Map<string, string>): string {
  const parts: string[] = [`${t.datum || "???"} · ${t.uppgift || "(namnlös)"}`];
  if (t.status) parts.push(t.status);
  if (t.typ) parts.push(t.typ);
  if (t.atgarder.length > 0) parts.push(t.atgarder.join("/"));
  if (t.plantIds.length > 0) {
    const names = t.plantIds.map((id) => plantNameById.get(id) || "?").filter(Boolean);
    if (names.length > 0) parts.push(`växter: ${names.join(", ")}`);
  }
  if (t.kommentar) parts.push(`kommentar: ${t.kommentar}`);
  return `- ${parts.join(" · ")}`;
}

function formatProject(p: OutdoorProject): string {
  const parts: string[] = [`- ${p.namn || "(namnlöst)"} (${p.status})`];
  if (p.prioritet) parts.push(`prio ${p.prioritet}`);
  if (p.omrade) parts.push(p.omrade);
  if (p.tidsram) parts.push(`tidsram ${p.tidsram}`);
  if (p.budget != null && p.budget > 0) parts.push(`budget ${p.budget} kr`);
  if (p.faktiskKostnad != null && p.faktiskKostnad > 0) parts.push(`utfall ${p.faktiskKostnad} kr`);
  return parts.join(" · ");
}

function formatWeather(w: WeatherSnapshot | null): string {
  if (!w) return "VÄDER: kunde inte hämta prognos.";
  const lines: string[] = ["VÄDER (Borås, växtzon 3):"];
  if (w.currentTempC != null) {
    lines.push(`- Just nu: ${w.currentTempC.toFixed(1)}°C${w.currentHumidity != null ? `, ${Math.round(w.currentHumidity)}% RH` : ""}`);
  }
  for (const d of w.forecast) {
    const max = d.tMaxC != null ? `max ${d.tMaxC.toFixed(0)}°` : "";
    const min = d.tMinC != null ? `min ${d.tMinC.toFixed(0)}°` : "";
    const p = d.precipMm != null && d.precipMm > 0 ? `, ${d.precipMm.toFixed(1)} mm regn` : "";
    const wind = d.windMaxKmh != null ? `, vind ${d.windMaxKmh.toFixed(0)} km/h` : "";
    lines.push(`- ${d.date}: ${max} ${min}${p}${wind}`);
  }
  return lines.join("\n");
}

/** Plattar `GardenContext` till en text-sträng som bakas in i system-prompten. */
export function formatContextAsSystemBlock(ctx: GardenContext): string {
  const plantNames = new Map<string, string>();
  for (const p of ctx.plants) plantNames.set(p.id, p.vaxt);

  const sections: string[] = [];
  sections.push(`DAGENS DATUM: ${ctx.currentDate} (växtzon ${ctx.gardenZone}, Borås).`);
  sections.push(formatWeather(ctx.weather));

  sections.push(
    `VÄXTER (${ctx.plants.length} st i registret):\n${ctx.plants.map(formatPlant).join("\n")}`,
  );

  if (ctx.upcomingTasks.length > 0) {
    sections.push(
      `KOMMANDE UPPGIFTER (närmaste 60 dagar, ${ctx.upcomingTasks.length} st):\n${ctx.upcomingTasks.map((t) => formatTask(t, plantNames)).join("\n")}`,
    );
  }

  if (ctx.recentTasks.length > 0) {
    sections.push(
      `NYLIGEN GENOMFÖRDA UPPGIFTER (senaste 60 dagar):\n${ctx.recentTasks.map((t) => formatTask(t, plantNames)).join("\n")}`,
    );
  }

  if (ctx.activeProjects.length > 0) {
    sections.push(
      `AKTIVA UTOMHUSPROJEKT (${ctx.activeProjects.length} st):\n${ctx.activeProjects.map(formatProject).join("\n")}`,
    );
  }

  return sections.join("\n\n");
}

/** Kort sammanfattning för UI-sidofältet (icke-LLM-kontext). */
export interface ContextSummary {
  plantCount: number;
  upcomingTaskCount: number;
  activeProjectCount: number;
  weatherToday: { tMaxC: number | null; tMinC: number | null; precipMm: number | null } | null;
}

export function summarizeContext(ctx: GardenContext): ContextSummary {
  const today = ctx.weather?.forecast.find((d) => d.date === ctx.currentDate) ?? ctx.weather?.forecast[0];
  return {
    plantCount: ctx.plants.length,
    upcomingTaskCount: ctx.upcomingTasks.length,
    activeProjectCount: ctx.activeProjects.length,
    weatherToday: today
      ? { tMaxC: today.tMaxC, tMinC: today.tMinC, precipMm: today.precipMm }
      : null,
  };
}

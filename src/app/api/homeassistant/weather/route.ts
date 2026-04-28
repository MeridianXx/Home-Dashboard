import { NextResponse } from "next/server";
import { getState, haPost } from "@/lib/ha";

// Periods: FM 06–12, EM 12–18, Kväll 18–00, Natt 00–06 (Swedish local time)
type Period = "fm" | "em" | "kvall" | "natt";
const PERIOD_ORDER: Period[] = ["fm", "em", "kvall", "natt"];
const TZ = "Europe/Stockholm";

/** Get hour in Swedish local time from a Date or ISO string */
function swedishHour(d: Date | string): number {
  const date = typeof d === "string" ? new Date(d) : d;
  return parseInt(date.toLocaleString("sv-SE", { timeZone: TZ, hour: "2-digit", hour12: false }), 10);
}

/** Get YYYY-MM-DD in Swedish local time */
function swedishDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("sv-SE", { timeZone: TZ });
}

function hourToPeriod(hour: number): Period {
  if (hour >= 6 && hour < 12) return "fm";
  if (hour >= 12 && hour < 18) return "em";
  if (hour >= 18) return "kvall";
  return "natt"; // 0–5
}

function currentPeriod(): Period {
  return hourToPeriod(swedishHour(new Date()));
}

type HourlyEntry = {
  datetime: string;
  condition: string;
  temperature: number;
  precipitation: number;
  wind_speed: number;
};

type PeriodBlock = {
  period: Period;
  label: string;
  date: string; // YYYY-MM-DD
  temperature: number; // avg of hours in period
  condition: string; // most common condition
  precipitation: number; // sum
};

const PERIOD_LABEL: Record<Period, string> = {
  fm: "FM", em: "EM", kvall: "Kväll", natt: "Natt",
};
// Chronological sort order within a day (natt 00–06 → fm 06–12 → em 12–18 → kvall 18–24)
const PERIOD_SORT: Record<Period, number> = { natt: 0, fm: 1, em: 2, kvall: 3 };

function buildPeriodBlocks(hourly: HourlyEntry[]): PeriodBlock[] {
  // Group hourly entries by Swedish local date + period
  const groups = new Map<string, HourlyEntry[]>();
  for (const h of hourly) {
    const dateStr = swedishDate(h.datetime);
    const period = hourToPeriod(swedishHour(h.datetime));
    const key = `${dateStr}|${period}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(h);
  }

  // Build blocks in chronological order
  const blocks: PeriodBlock[] = [];
  const sortedKeys = [...groups.keys()].sort((a, b) => {
    const [dateA, periodA] = a.split("|") as [string, Period];
    const [dateB, periodB] = b.split("|") as [string, Period];
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    return PERIOD_SORT[periodA] - PERIOD_SORT[periodB];
  });
  for (const key of sortedKeys) {
    const entries = groups.get(key)!;
    const [dateStr, period] = key.split("|") as [string, Period];

    // Average temperature
    const avgTemp = entries.reduce((s, e) => s + e.temperature, 0) / entries.length;

    // Most common condition
    const condCounts = new Map<string, number>();
    for (const e of entries) condCounts.set(e.condition, (condCounts.get(e.condition) ?? 0) + 1);
    const condition = [...condCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];

    // Total precipitation
    const precip = entries.reduce((s, e) => s + e.precipitation, 0);

    blocks.push({
      period,
      label: PERIOD_LABEL[period],
      date: dateStr,
      temperature: Math.round(avgTemp),
      condition,
      precipitation: Math.round(precip * 10) / 10,
    });
  }

  return blocks;
}

export async function GET() {
  try {
    const [entity, dailyRes, hourlyRes, sun] = await Promise.all([
      getState("weather.forecast_hem"),
      haPost("/api/services/weather/get_forecasts?return_response", {
        entity_id: "weather.forecast_hem",
        type: "daily",
      }) as Promise<{
        service_response: Record<string, { forecast: Array<Record<string, unknown>> }>;
      }>,
      haPost("/api/services/weather/get_forecasts?return_response", {
        entity_id: "weather.forecast_hem",
        type: "hourly",
      }) as Promise<{
        service_response: Record<string, { forecast: Array<Record<string, unknown>> }>;
      }>,
      // sun.sun har: next_rising, next_setting, next_dawn, next_dusk,
      // elevation (deg), azimuth (deg), rising (bool). Används för
      // sol-arc + soluppg./nedg.-tider på hemskärmens väderkort.
      getState("sun.sun").catch(() => null),
    ]);

    const attrs = entity.attributes;

    // Daily forecast — skip today, take 3
    const dailyArr = dailyRes?.service_response?.["weather.forecast_hem"]?.forecast ?? [];
    const todayStr = swedishDate(new Date());
    const dailyForecast = dailyArr
      .filter((f) => swedishDate((f.datetime as string) ?? "") !== todayStr)
      .slice(0, 3)
      .map((f) => ({
        datetime: (f.datetime as string) ?? "",
        condition: (f.condition as string) ?? "",
        temperature: (f.temperature as number) ?? 0,
        templow: (f.templow as number) ?? 0,
        precipitation: (f.precipitation as number) ?? 0,
        wind_speed: (f.wind_speed as number) ?? 0,
      }));

    // Hourly → period blocks (FM/EM/Kväll/Natt)
    const hourlyArr: HourlyEntry[] = (
      hourlyRes?.service_response?.["weather.forecast_hem"]?.forecast ?? []
    ).map((f) => ({
      datetime: (f.datetime as string) ?? "",
      condition: (f.condition as string) ?? "",
      temperature: (f.temperature as number) ?? 0,
      precipitation: (f.precipitation as number) ?? 0,
      wind_speed: (f.wind_speed as number) ?? 0,
    }));

    const allBlocks = buildPeriodBlocks(hourlyArr);

    // Find current period index and take 4 blocks from there
    const nowPeriod = currentPeriod();
    const todayDate = swedishDate(new Date());
    const startIdx = allBlocks.findIndex(
      (b) => b.date === todayDate && b.period === nowPeriod,
    );
    const periods = startIdx >= 0 ? allBlocks.slice(startIdx, startIdx + 4) : allBlocks.slice(0, 4);

    const sunAttrs = sun?.attributes ?? {};
    const sunPayload = sun
      ? {
          state: sun.state, // "above_horizon" | "below_horizon"
          next_rising: (sunAttrs.next_rising as string) ?? null,
          next_setting: (sunAttrs.next_setting as string) ?? null,
          next_dawn: (sunAttrs.next_dawn as string) ?? null,
          next_dusk: (sunAttrs.next_dusk as string) ?? null,
          elevation: (sunAttrs.elevation as number) ?? null,
          azimuth: (sunAttrs.azimuth as number) ?? null,
          rising: (sunAttrs.rising as boolean) ?? null,
        }
      : null;

    return NextResponse.json({
      current: {
        state: entity.state,
        temperature: (attrs.temperature as number) ?? 0,
        humidity: (attrs.humidity as number) ?? 0,
        wind_speed: (attrs.wind_speed as number) ?? 0,
        wind_bearing: (attrs.wind_bearing as number) ?? 0,
      },
      periods,
      forecast: dailyForecast,
      sun: sunPayload,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

export const dynamic = "force-dynamic";

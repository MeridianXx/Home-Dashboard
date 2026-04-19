import { NextResponse } from "next/server";
import { getState, haPost } from "@/lib/ha";

export async function GET() {
  try {
    // Fetch current state + forecast in parallel.
    // weather.get_forecasts requires `?return_response` on the service URL
    // (HA 2024.1+: "service call requires responses but caller did not ask").
    const [entity, forecastRes] = await Promise.all([
      getState("weather.forecast_hem"),
      haPost("/api/services/weather/get_forecasts?return_response", {
        entity_id: "weather.forecast_hem",
        type: "daily",
      }) as Promise<{
        service_response: Record<string, { forecast: Array<Record<string, unknown>> }>;
      }>,
    ]);

    const attrs = entity.attributes;
    const forecastArr =
      forecastRes?.service_response?.["weather.forecast_hem"]?.forecast ?? [];

    const forecast = forecastArr.slice(0, 3).map((f) => ({
      datetime: (f.datetime as string) ?? "",
      condition: (f.condition as string) ?? "",
      temperature: (f.temperature as number) ?? 0,
      templow: (f.templow as number) ?? 0,
      precipitation: (f.precipitation as number) ?? 0,
      wind_speed: (f.wind_speed as number) ?? 0,
    }));

    return NextResponse.json({
      current: {
        state: entity.state,
        temperature: (attrs.temperature as number) ?? 0,
        humidity: (attrs.humidity as number) ?? 0,
        wind_speed: (attrs.wind_speed as number) ?? 0,
        wind_bearing: (attrs.wind_bearing as number) ?? 0,
      },
      forecast,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

export const dynamic = "force-dynamic";

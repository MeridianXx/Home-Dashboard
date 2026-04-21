import { NextResponse } from "next/server";
import { getState, haGet } from "@/lib/ha";

type HAState = { entity_id: string; state: string; attributes: Record<string, unknown>; last_changed: string };

export async function GET() {
  try {
    const [
      solarScore,
      hero,
      roomTemp,
      masterSwitch,
      bedroomTemp,
      nibeOutdoor,
      nibeIndoor,
      sun,
      weather,
      autoStart,
      autoAdjust,
      autoStop,
    ] = await Promise.all([
      getState("sensor.solar_gain_score"),
      getState("climate.vardagsrum_luftvarmepump"),
      getState("sensor.vardagsrum_temperatur"),
      getState("input_boolean.solkyla_automation"),
      getState("sensor.sovrum_temperatur"),
      getState("sensor.nibe_utomhustemperatur_bt1"),
      getState("sensor.nibe_inomhustemperatur_bt50"),
      getState("sun.sun"),
      getState("weather.forecast_hem"),
      getState("automation.solkyla_starta_luftvarmepump"),
      getState("automation.solkyla_justera_lage_dynamiskt"),
      getState("automation.solkyla_stang_av_nar_svalnat"),
    ]);

    const safe = (s: string) => { const v = parseFloat(s); return isNaN(v) ? null : v; };

    return NextResponse.json({
      solar_gain_score: safe(solarScore.state),
      master_enabled: masterSwitch.state === "on",
      ac: {
        state: hero.state,
        hvac_mode: hero.state,
        current_temp: hero.attributes.current_temperature as number | null,
        target_temp: hero.attributes.temperature as number | null,
        fan_mode: (hero.attributes.fan_mode as string) ?? null,
      },
      room_temp: safe(roomTemp.state),
      context: {
        bedroom_temp: safe(bedroomTemp.state),
        outdoor_temp: safe(nibeOutdoor.state),
        nibe_indoor_temp: safe(nibeIndoor.state),
        sun_elevation: (solarScore.attributes.sun_elevation as number) ?? (sun.attributes.elevation as number) ?? null,
        clouds_met: (solarScore.attributes.clouds_met as number) ?? null,
        clouds_smhi: (solarScore.attributes.clouds_smhi as number) ?? null,
        clouds_used: (solarScore.attributes.clouds_used as number) ?? null,
      },
      automations: [
        {
          name: "Starta",
          entity_id: "automation.solkyla_starta_luftvarmepump",
          enabled: autoStart.state === "on",
          last_triggered: (autoStart.attributes.last_triggered as string) ?? null,
        },
        {
          name: "Justera",
          entity_id: "automation.solkyla_justera_lage_dynamiskt",
          enabled: autoAdjust.state === "on",
          last_triggered: (autoAdjust.attributes.last_triggered as string) ?? null,
        },
        {
          name: "Stäng av",
          entity_id: "automation.solkyla_stang_av_nar_svalnat",
          enabled: autoStop.state === "on",
          last_triggered: (autoStop.attributes.last_triggered as string) ?? null,
        },
      ],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

export const dynamic = "force-dynamic";

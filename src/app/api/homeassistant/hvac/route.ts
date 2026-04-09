import { getState } from "@/lib/ha";

const safe = (s: string) => { const v = parseFloat(s); return isNaN(v) ? null : v; };

export async function GET() {
  try {
    const [
      hero,
      nibeOutdoor, nibeHotWater, nibeFanSpeed, nibeFranluft,
      nibeAlarm, nibeKaminlage, nibeMoreHotWater, nibeIncreasedVent,
    ] = await Promise.all([
      getState("climate.vardagsrum_luftvarmepump"),
      getState("sensor.nibe_utomhustemperatur_bt1"),
      getState("sensor.nibe_varmvatten_topp"),
      getState("sensor.nibe_flakthastighet"),
      getState("sensor.nibe_franluft"),
      getState("binary_sensor.nibe_larm"),
      getState("switch.nibe_kaminlage"),
      getState("switch.nibe_mer_varmvatten"),
      getState("switch.nibe_okad_ventilation"),
    ]);

    return Response.json({
      heat_pump: {
        entity_id:    "climate.vardagsrum_luftvarmepump",
        state:        hero.state,
        current_temp: hero.attributes.current_temperature as number | null,
        target_temp:  hero.attributes.temperature         as number | null,
        hvac_modes:   hero.attributes.hvac_modes          as string[] | null,
      },
      flv: {
        outdoor_temp:          safe(nibeOutdoor.state),
        hot_water_temp:        safe(nibeHotWater.state),
        fan_speed_pct:         safe(nibeFanSpeed.state),
        franluft_temp:         safe(nibeFranluft.state),
        alarm:                 nibeAlarm.state        === "on",
        kaminlage:             nibeKaminlage.state    === "on",
        more_hot_water:        nibeMoreHotWater.state === "on",
        increased_ventilation: nibeIncreasedVent.state === "on",
      },
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}

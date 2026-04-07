import { getState } from "@/lib/ha";

const safe = (s: string) => { const v = parseFloat(s); return isNaN(v) ? null : v; };

export async function GET() {
  try {
    const [
      hero,
      nibeOutdoor, nibeSupply, nibeReturn, nibeHotWater,
      nibeFanSpeed, nibeFranluft, nibeAlarm,
      nibeMoreHotWater, nibeIncreasedVent,
    ] = await Promise.all([
      getState("climate.hero"),
      getState("sensor.villa_bjorkdalen_current_outdoor_temperature_bt1"),
      getState("sensor.villa_bjorkdalen_supply_line_bt2"),
      getState("sensor.villa_bjorkdalen_return_line_bt3"),
      getState("sensor.villa_bjorkdalen_hot_water_top_bt7"),
      getState("sensor.villa_bjorkdalen_exhaust_air_fan_speed_gq2"),
      getState("sensor.villa_bjorkdalen_franluft_bt20"),
      getState("binary_sensor.villa_bjorkdalen_larm"),
      getState("switch.villa_bjorkdalen_more_hot_water"),
      getState("switch.villa_bjorkdalen_increased_ventilation_1"),
    ]);

    return Response.json({
      heat_pump: {
        entity_id:    "climate.hero",
        state:        hero.state,   // "off" | "heat" | "cool" | "heat_cool" | "fan_only" | "dry"
        current_temp: hero.attributes.current_temperature as number | null,
        target_temp:  hero.attributes.temperature        as number | null,
        hvac_modes:   hero.attributes.hvac_modes         as string[] | null,
      },
      flv: {
        outdoor_temp:          safe(nibeOutdoor.state),
        supply_temp:           safe(nibeSupply.state),
        return_temp:           safe(nibeReturn.state),
        hot_water_temp:        safe(nibeHotWater.state),
        fan_speed_pct:         safe(nibeFanSpeed.state),
        franluft_temp:         safe(nibeFranluft.state),
        alarm:                 nibeAlarm.state         === "on",
        more_hot_water:        nibeMoreHotWater.state  === "on",
        increased_ventilation: nibeIncreasedVent.state === "on",
      },
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}

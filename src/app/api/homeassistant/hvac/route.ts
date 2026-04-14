import { getState } from "@/lib/ha";

const safe = (s: string) => { const v = parseFloat(s); return isNaN(v) ? null : v; };

export async function GET() {
  try {
    const [
      hero,
      nibeOutdoor, nibeHotWater, nibeFanSpeed,
      nibeAlarm, nibeKaminlage, nibeNattsvalka,
      nibeSystemPower, nibeCompressor, nibeHeater,
      nibeHotWaterBoost, nibeVentilation, nibeIndoorSetpoint,
    ] = await Promise.all([
      getState("climate.vardagsrum_luftvarmepump"),
      getState("sensor.nibe_inomhusklimat"),
      getState("sensor.nibe_varmvatten_topp"),
      getState("sensor.nibe_flakthastighet"),
      getState("binary_sensor.nibe_larm"),
      getState("switch.nibe_kaminlage"),
      getState("switch.nibe_nattsvalka"),
      getState("sensor.nibe_systemeffekt"),
      getState("sensor.nibe_aktuell_kompressoreffekt"),
      getState("sensor.nibe_effekt_elpatron"),
      getState("select.villa_bjorkdalen_more_hot_water"),
      getState("select.villa_bjorkdalen_ventilation_mode"),
      getState("number.villa_bjorkdalen_rumsgivare_borvarde_inomhusklimat"),
    ]);

    return Response.json({
      heat_pump: {
        entity_id:    "climate.vardagsrum_luftvarmepump",
        state:        hero.state,
        current_temp: hero.attributes.current_temperature as number | null,
        target_temp:  hero.attributes.temperature         as number | null,
        hvac_modes:   hero.attributes.hvac_modes          as string[] | null,
      },
      nibe: {
        outdoor_temp:            safe(nibeOutdoor.state),
        hot_water_temp:          safe(nibeHotWater.state),
        fan_speed_pct:           safe(nibeFanSpeed.state),
        alarm:                   nibeAlarm.state        === "on",
        kaminlage:               nibeKaminlage.state    === "on",
        nattsvalka:              nibeNattsvalka.state   === "on",
        system_power_kw:         safe(nibeSystemPower.state),
        compressor_hz:           safe(nibeCompressor.state),
        heater_kw:               safe(nibeHeater.state),
        hot_water_boost:         nibeHotWaterBoost.state,
        hot_water_boost_options: (nibeHotWaterBoost.attributes.options as string[] | null) ?? [],
        ventilation_mode:        nibeVentilation.state,
        ventilation_options:     (nibeVentilation.attributes.options  as string[] | null) ?? [],
        indoor_setpoint:         safe(nibeIndoorSetpoint.state),
      },
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}

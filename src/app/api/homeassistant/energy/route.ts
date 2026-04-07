import { getState } from "@/lib/ha";

const safe = (s: string) => { const v = parseFloat(s); return isNaN(v) ? null : v; };

export async function GET() {
  try {
    const ids = [
      "sensor.villa_bjorkdalen_elpris",
      "sensor.tibber_pulse_villa_bjorkdalen_effekt",
      "sensor.tibber_pulse_villa_bjorkdalen_ackumulerad_forbrukning",
      "sensor.tibber_pulse_villa_bjorkdalen_ackumulerad_kostnad",
      "sensor.villa_bjorkdalen_manadskostnad",
      "sensor.villa_bjorkdalen_manatlig_nettoforbrukning",
      "sensor.villa_bjorkdalen_hot_water_top_bt7",
    ];

    const [price, power, accKwh, accCost, monthlyCost, monthlyKwh, hotWater] =
      await Promise.all(ids.map(id => getState(id)));

    const priceVal = safe(price.state);
    const spot_level: "low" | "medium" | "high" | "unknown" =
      priceVal == null ? "unknown"
      : priceVal < 50  ? "low"
      : priceVal < 100 ? "medium"
      : "high";

    return Response.json({
      spot_price_ore:       priceVal,
      spot_level,
      current_power_w:      safe(power.state)       ?? 0,
      accumulated_kwh:      safe(accKwh.state)       ?? 0,
      accumulated_cost_sek: safe(accCost.state)      ?? 0,
      monthly_cost_sek:     safe(monthlyCost.state)  ?? 0,
      monthly_kwh:          safe(monthlyKwh.state)   ?? 0,
      hot_water_temp:       safe(hotWater.state),
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}

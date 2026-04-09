import { getState } from "@/lib/ha";

const safe = (s: string) => { const v = parseFloat(s); return isNaN(v) ? null : v; };

export async function GET() {
  try {
    const [price, power, avgPower, minPower, maxPower, accKwh, accCost, monthlyCost, monthlyKwh] =
      await Promise.all([
        getState("sensor.villa_bjorkdalen_elpris"),
        getState("sensor.tibber_pulse_villa_bjorkdalen_effekt"),
        getState("sensor.tibber_pulse_villa_bjorkdalen_genomsnittlig_effekt"),
        getState("sensor.tibber_pulse_villa_bjorkdalen_min_effekt"),
        getState("sensor.tibber_pulse_villa_bjorkdalen_max_effekt"),
        getState("sensor.tibber_pulse_villa_bjorkdalen_ackumulerad_forbrukning"),
        getState("sensor.tibber_pulse_villa_bjorkdalen_ackumulerad_kostnad"),
        getState("sensor.villa_bjorkdalen_manadskostnad"),
        getState("sensor.villa_bjorkdalen_manatlig_nettoforbrukning"),
      ]);

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
      avg_power_w:          safe(avgPower.state)     ?? 0,
      min_power_w:          safe(minPower.state)     ?? 0,
      max_power_w:          safe(maxPower.state)     ?? 0,
      accumulated_kwh:      safe(accKwh.state)       ?? 0,
      accumulated_cost_sek: safe(accCost.state)      ?? 0,
      monthly_cost_sek:     safe(monthlyCost.state)  ?? 0,
      monthly_kwh:          safe(monthlyKwh.state)   ?? 0,
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}

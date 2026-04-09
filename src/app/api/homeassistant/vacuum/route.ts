import { getState } from "@/lib/ha";

const safe = (s: string) => { const v = parseFloat(s); return isNaN(v) ? null : v; };
const ok   = (s: string) => s !== "unavailable" && s !== "unknown";

export async function GET() {
  try {
    const [vacuum, battery, status, currentRoom, cleanedArea, charging, cleaning, doNotDisturb] =
      await Promise.all([
        getState("vacuum.chomper"),
        getState("sensor.chomper_batteri"),
        getState("sensor.chomper_status"),
        getState("sensor.chomper_nuvarande_rum"),
        getState("sensor.chomper_stadad_area"),
        getState("binary_sensor.chomper_laddning"),
        getState("binary_sensor.chomper_stadar"),
        getState("switch.chomper_stor_inte"),
      ]);

    return Response.json({
      state:          ok(vacuum.state) ? vacuum.state : "unknown",
      battery_pct:    ok(battery.state) ? (parseInt(battery.state) || null) : null,
      status:         ok(status.state) ? status.state : null,
      current_room:   ok(currentRoom.state) ? currentRoom.state : null,
      cleaned_area:   ok(cleanedArea.state) ? (safe(cleanedArea.state)) : null,
      charging:       charging.state === "on",
      cleaning:       cleaning.state === "on",
      do_not_disturb: doNotDisturb.state === "on",
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}

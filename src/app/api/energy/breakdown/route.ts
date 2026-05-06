import { NextResponse } from "next/server";
import { getState } from "@/lib/ha";

// Vad drar el just nu? Vi har bara en delsensor med riktig effektmätning:
// Nibe S735 (`nibe_aktuell_elforbrukning`). Mitsubishi Hero rapporterar bara
// kumulativ kWh som tickar över sällan (sista uppdatering kan vara timmar
// gammal), så vi kan inte härleda aktuell W ärligt — den hamnar istället
// korrekt i "Övrigt" som vi vet är ouppdelat. Robotdammsugaren och EV-laddboxarna
// är binära on/off, ingen W.

const safe = (s: string | undefined | null): number | null => {
  if (s == null) return null;
  const v = parseFloat(s);
  return Number.isFinite(v) ? v : null;
};

type Source = {
  id: string;
  name: string;
  /** Aktuell effekt i W. */
  watts: number | null;
  /** Aktiv just nu (körs)? `null` om okänt. */
  active: boolean | null;
  /** Kort statustext för UI ("kompressor 45 Hz", "från") när det är meningsfullt. */
  status: string | null;
};

export async function GET() {
  try {
    const [totalW, nibeW, nibeKompHz] = await Promise.all([
      getState("sensor.tibber_pulse_villa_bjorkdalen_effekt").catch(() => null),
      getState("sensor.nibe_aktuell_elforbrukning").catch(() => null),
      getState("sensor.nibe_aktuell_kompressoreffekt").catch(() => null),
    ]);

    const total = safe(totalW?.state) ?? 0;
    const nibe = safe(nibeW?.state) ?? 0;
    const compFreq = safe(nibeKompHz?.state) ?? 0;

    const sources: Source[] = [];

    // Nibe S735 — bergvärmepump
    sources.push({
      id: "nibe",
      name: "Nibe S735",
      watts: nibe,
      active: nibe > 50, // tomgång ligger ofta runt 30–40 W
      status:
        compFreq > 0
          ? `kompressor ${Math.round(compFreq)} Hz`
          : nibe > 50
          ? "körs"
          : "från",
    });

    // "Övrigt" = total minus kända Watt-mätare. Negativt clampas till 0
    // (kan hända i racet mellan totalmätare och delsensorerna).
    const knownW = sources
      .map((s) => s.watts ?? 0)
      .reduce((a, b) => a + b, 0);
    const otherW = Math.max(0, Math.round(total - knownW));

    return NextResponse.json({
      total_w: Math.round(total),
      sources,
      other_w: otherW,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

export const dynamic = "force-dynamic";

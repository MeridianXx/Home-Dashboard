"use client";

// SunArc — visar solens dagsbåge ovanför horisonten med en sol-glyph som
// markerar nuvarande position. På natten visas månen istället, med
// position interpolerad mellan senaste solnedgång och nästa soluppgång.
// Beräknas från `sun.sun`s next_rising/next_setting (HA-entiteten).

type SunPayload = {
  state: string;
  next_rising: string | null;
  next_setting: string | null;
  rising: boolean | null;
};

/** Mappa HA:s `sensor.moon_fas` enum-värde till en illuminationsgrad 0-1
 *  och en waxing-flagga. Matchar 8-fas-modellen: ny → ¼ → halv → ¾ → full
 *  → ¾ → halv → ¼ → ny. */
type MoonPhaseName =
  | "new_moon"
  | "waxing_crescent"
  | "first_quarter"
  | "waxing_gibbous"
  | "full_moon"
  | "waning_gibbous"
  | "last_quarter"
  | "waning_crescent";

const PHASE_TABLE: Record<MoonPhaseName, { illum: number; waxing: boolean }> = {
  new_moon:         { illum: 0.0,  waxing: true  },
  waxing_crescent:  { illum: 0.25, waxing: true  },
  first_quarter:    { illum: 0.5,  waxing: true  },
  waxing_gibbous:   { illum: 0.75, waxing: true  },
  full_moon:        { illum: 1.0,  waxing: true  },
  waning_gibbous:   { illum: 0.75, waxing: false },
  last_quarter:     { illum: 0.5,  waxing: false },
  waning_crescent:  { illum: 0.25, waxing: false },
};

function resolveMoonPhase(name: string | null | undefined): { illum: number; waxing: boolean } {
  if (!name) return { illum: 0.75, waxing: true }; // hyfsad default
  const key = name as MoonPhaseName;
  return PHASE_TABLE[key] ?? { illum: 0.75, waxing: true };
}

export default function SunArc({
  sun,
  moonPhase,
  width = 130,
  height = 56,
  trackColor,
  arcColor,
  dotColor,
  belowColor,
}: {
  sun: SunPayload | null;
  /** HA `sensor.moon_fas`-värde (`waxing_gibbous` etc). Saknas → default. */
  moonPhase?: string | null;
  width?: number;
  height?: number;
  trackColor: string;
  arcColor: string;
  dotColor: string;
  belowColor: string;
}) {
  // Halv-cirkel: vänster (0, h) → topp (w/2, 0) → höger (w, h).
  // Soluppgång = vänster ända, middag = topp, solnedgång = höger ända.
  const r = width / 2;
  const cx = width / 2;
  const cy = height;
  const startX = 0;
  const baseY = height;

  // Beräkna hur mycket bågen sticker upp ovanför y=0 (inkl. punkt + strålar).
  const arcTopY = cy - r; // negativ om r > height
  const topPad = Math.max(0, -arcTopY + 14); // 14 = punkt (r4) + strålar (l9) + marginal
  const hPad = 10; // horisontell marginal så sol-strålar inte clipper vid soluppg/nedg

  const arcPath = `M ${startX} ${baseY} A ${r} ${r} 0 0 1 ${width} ${baseY}`;

  // Beräkna progress för aktuell sol-/månbåge.
  // sun.sun.next_rising/next_setting är ALLTID framtida tidsstämplar.
  // - Solen uppe: senaste rising = next_rising − 24h, dagens slut = next_setting.
  // - Solen nere: senaste setting = next_setting − 24h (efter midnatt) eller
  //   next_setting (om det är samma dag före midnatt). Vi tar närmaste i tiden.
  const now = Date.now();
  const above = sun?.state === "above_horizon";
  const nextRising = sun?.next_rising ? new Date(sun.next_rising).getTime() : null;
  const nextSetting = sun?.next_setting ? new Date(sun.next_setting).getTime() : null;

  let progress: number | null = null;
  let isMoon = false;
  if (above && nextSetting != null && nextRising != null) {
    const prevRising = nextRising - 24 * 3600 * 1000;
    const dayLength = nextSetting - prevRising;
    if (dayLength > 0) {
      progress = Math.max(0, Math.min(1, (now - prevRising) / dayLength));
    }
  } else if (!above && nextRising != null && nextSetting != null) {
    // Natt: hitta senaste solnedgång (kan vara nextSetting − 24h om vi är efter
    // midnatt, eller next_setting om vi är före; nextSetting − 24h ger alltid
    // den senaste passerade solnedgången).
    const prevSetting = nextSetting < nextRising ? nextSetting - 24 * 3600 * 1000 : nextSetting - 24 * 3600 * 1000;
    const lastSetting = Math.max(prevSetting, nextSetting - 24 * 3600 * 1000);
    const nightLength = nextRising - lastSetting;
    if (nightLength > 0) {
      progress = Math.max(0, Math.min(1, (now - lastSetting) / nightLength));
      isMoon = true;
    }
  }

  // Punkt på halv-cirkeln vid `progress`:
  // theta går 0 → π, x = cx − r·cos(θ), y = cy − r·sin(θ).
  // p=0  → θ=0  → (cx−r, cy) = vänster bas (soluppg/solnedg)
  // p=0.5 → θ=π/2 → (cx, cy−r) = topp (middag/midnatt)
  // p=1  → θ=π  → (cx+r, cy) = höger bas (solnedg/soluppg)
  let dotX: number | null = null;
  let dotY: number | null = null;
  if (progress != null) {
    const theta = Math.PI * progress;
    dotX = cx - r * Math.cos(theta);
    dotY = cy - r * Math.sin(theta);
  }

  // Aktiv båg-segment från start till nuvarande position
  const activePath =
    progress != null && progress > 0 && dotX != null && dotY != null
      ? `M ${startX} ${baseY} A ${r} ${r} 0 0 1 ${dotX.toFixed(2)} ${dotY.toFixed(2)}`
      : null;

  // Mån-fas-glyph: HA:s sensor.moon_fas mappas till illum 0-1 + waxing-flagga.
  // Path-renderingen kombinerar yttre halvcirkel + ellips-arc för terminator
  // → korrekt halvmåne / kvart / gibbous beroende på illum.
  const { illum, waxing } = resolveMoonPhase(moonPhase);

  return (
    <svg
      width={width + 2 * hPad}
      height={height + 6 + topPad}
      viewBox={`${-hPad} ${-topPad} ${width + 2 * hPad} ${height + 6 + topPad}`}
      aria-hidden="true"
      style={{ display: "block", overflow: "hidden" }}
    >
      {/* Mark-linje (horisont) */}
      <line
        x1={0}
        y1={baseY + 0.5}
        x2={width}
        y2={baseY + 0.5}
        stroke={belowColor}
        strokeWidth={1}
        strokeDasharray="2 3"
        opacity={0.5}
      />
      {/* Track-bågen (hela dagsbågen) */}
      <path
        d={arcPath}
        fill="none"
        stroke={trackColor}
        strokeWidth={1.4}
        strokeDasharray="3 3"
        opacity={0.6}
      />
      {/* Aktiv båge (från soluppg till nu) */}
      {activePath && (
        <path
          d={activePath}
          fill="none"
          stroke={arcColor}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
      )}
      {/* Sol- eller mån-glyph på positionen */}
      {dotX != null && dotY != null && !isMoon && (
        <g transform={`translate(${dotX} ${dotY})`}>
          <circle r={4} fill={dotColor} />
          <g stroke={dotColor} strokeWidth={1.2} strokeLinecap="round">
            <line x1={0} y1={-7} x2={0} y2={-9} />
            <line x1={0} y1={7} x2={0} y2={9} />
            <line x1={-7} y1={0} x2={-9} y2={0} />
            <line x1={7} y1={0} x2={9} y2={0} />
            <line x1={-5} y1={-5} x2={-6.5} y2={-6.5} />
            <line x1={5} y1={-5} x2={6.5} y2={-6.5} />
            <line x1={-5} y1={5} x2={-6.5} y2={6.5} />
            <line x1={5} y1={5} x2={6.5} y2={6.5} />
          </g>
        </g>
      )}
      {dotX != null && dotY != null && isMoon && (
        <g transform={`translate(${dotX} ${dotY})`}>
          {/* Mån-glyph: outline + halvmåne via path. Större radie (8) än
              solen (4) så fas-formen blir tydligt synlig på en 130 px
              vädertile. */}
          {(() => {
            const R = 8;
            return (
              <>
                <circle r={R} fill="none" stroke={dotColor} strokeWidth={1.3} opacity={0.7} />
                {illum > 0.05 && (illum > 0.95 ? (
                  <circle r={R} fill={dotColor} />
                ) : (
                  (() => {
                    const ellipseRx = R * Math.abs(1 - 2 * illum);
                    const isGibbous = illum > 0.5;
                    const sweep = waxing ? 1 : 0;
                    const ellSweep = isGibbous ? (waxing ? 0 : 1) : (waxing ? 1 : 0);
                    return (
                      <path
                        d={
                          `M 0 -${R} A ${R} ${R} 0 0 ${sweep} 0 ${R} ` +
                          `A ${ellipseRx} ${R} 0 0 ${ellSweep} 0 -${R} Z`
                        }
                        fill={dotColor}
                      />
                    );
                  })()
                ))}
              </>
            );
          })()}
        </g>
      )}
    </svg>
  );
}

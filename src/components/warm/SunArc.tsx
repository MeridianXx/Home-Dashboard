"use client";

// SunArc — visar solens dagsbåge ovanför horisonten med en sol-glyph som
// markerar nuvarande position. Beräknas från `sun.sun`s next_rising/
// next_setting (HA-entiteten).

type SunPayload = {
  state: string;
  next_rising: string | null;
  next_setting: string | null;
  rising: boolean | null;
};

export default function SunArc({
  sun,
  width = 130,
  height = 56,
  trackColor,
  arcColor,
  dotColor,
  belowColor,
}: {
  sun: SunPayload | null;
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

  const arcPath = `M ${startX} ${baseY} A ${r} ${r} 0 0 1 ${width} ${baseY}`;

  // Beräkna progress (0 vid soluppgång, 1 vid solnedgång).
  // sun.sun.next_rising/next_setting är ALLTID framtida tidsstämplar.
  // - Om solen är uppe (above_horizon): senaste rising = next_rising − 24h,
  //   dagens slut = next_setting. progress = (now − prevRising) / dayLength.
  // - Om solen är nere: visa ingen prick (utanför dagsbågen).
  const now = Date.now();
  const above = sun?.state === "above_horizon";
  const nextRising = sun?.next_rising ? new Date(sun.next_rising).getTime() : null;
  const nextSetting = sun?.next_setting ? new Date(sun.next_setting).getTime() : null;

  let progress: number | null = null;
  if (above && nextSetting != null && nextRising != null) {
    const prevRising = nextRising - 24 * 3600 * 1000;
    const dayLength = nextSetting - prevRising;
    if (dayLength > 0) {
      progress = Math.max(0, Math.min(1, (now - prevRising) / dayLength));
    }
  }

  // Punkt på halv-cirkeln vid `progress`:
  // theta går 0 → π, x = cx − r·cos(θ), y = cy − r·sin(θ).
  // p=0  → θ=0  → (cx−r, cy) = vänster bas (soluppgång)
  // p=0.5 → θ=π/2 → (cx, cy−r) = topp (middag)
  // p=1  → θ=π  → (cx+r, cy) = höger bas (solnedgång)
  let dotX: number | null = null;
  let dotY: number | null = null;
  if (progress != null) {
    const theta = Math.PI * progress;
    dotX = cx - r * Math.cos(theta);
    dotY = cy - r * Math.sin(theta);
  }

  // Aktiv båg-segment från start till sol-positionen
  const activePath =
    progress != null && progress > 0 && dotX != null && dotY != null
      ? `M ${startX} ${baseY} A ${r} ${r} 0 0 1 ${dotX.toFixed(2)} ${dotY.toFixed(2)}`
      : null;

  return (
    <svg
      width={width}
      height={height + 6 + topPad}
      viewBox={`0 ${-topPad} ${width} ${height + 6 + topPad}`}
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
      {/* Sol-glyph på positionen — fylld cirkel + strålar för tydlighet */}
      {dotX != null && dotY != null && (
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
    </svg>
  );
}

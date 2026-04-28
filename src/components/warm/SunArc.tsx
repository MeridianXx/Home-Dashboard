"use client";

// SunArc — visar solens dagsbåge ovanför horisonten med en prick som markerar
// nuvarande sol-position. Beräknas från `sun.sun`s next_rising/next_setting +
// rising-flagga (som indikerar om solen är på väg upp eller ned).

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
  // Båge går från (0, h) → mitten-topp (w/2, 0) → (w, h). Halv-cirkel.
  // Pricken positioneras längs bågen baserat på dagens framsteg.
  const r = width / 2;
  const cx = width / 2;
  const cy = height;
  const startX = 0;
  const endX = width;
  const baseY = height;

  const arcPath = `M ${startX} ${baseY} A ${r} ${r} 0 0 1 ${endX} ${baseY}`;

  // Bestäm dagens "soltid": föregående soluppg → nästa nedg, eller
  // föregående nedg → nästa uppg om vi är efter solnedgång.
  const now = Date.now();
  const above = sun?.state === "above_horizon";
  const nextRising = sun?.next_rising ? new Date(sun.next_rising).getTime() : null;
  const nextSetting = sun?.next_setting ? new Date(sun.next_setting).getTime() : null;

  let progress: number | null = null; // 0..1 längs bågen
  if (above && nextSetting != null && nextRising != null) {
    // Solen är uppe. Föregående soluppg = nästa soluppg − 24h (approx).
    const prevRising = nextRising - 24 * 3600 * 1000;
    const dayLength = nextSetting - prevRising;
    if (dayLength > 0) {
      progress = Math.max(0, Math.min(1, (now - prevRising) / dayLength));
    }
  }

  // Punkt på halv-cirkeln vid `progress`:
  // theta går från π (vänster, x=0) till 0 (höger, x=w), via π/2 (topp).
  let dotX: number | null = null;
  let dotY: number | null = null;
  if (progress != null) {
    const theta = Math.PI * (1 - progress);
    dotX = cx - r * Math.cos(theta);
    dotY = cy - r * Math.sin(theta);
  }

  return (
    <svg
      width={width}
      height={height + 6}
      viewBox={`0 0 ${width} ${height + 6}`}
      aria-hidden="true"
      style={{ display: "block", overflow: "visible" }}
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
      {progress != null && progress > 0 && (() => {
        const theta = Math.PI * (1 - progress);
        const px = cx - r * Math.cos(theta);
        const py = cy - r * Math.sin(theta);
        const largeArc = progress > 0.5 ? 1 : 0;
        return (
          <path
            d={`M ${startX} ${baseY} A ${r} ${r} 0 ${largeArc} 1 ${px.toFixed(
              2
            )} ${py.toFixed(2)}`}
            fill="none"
            stroke={arcColor}
            strokeWidth={1.6}
            strokeLinecap="round"
          />
        );
      })()}
      {/* Sol-prick */}
      {dotX != null && dotY != null && (
        <circle cx={dotX} cy={dotY} r={5} fill={dotColor} />
      )}
    </svg>
  );
}

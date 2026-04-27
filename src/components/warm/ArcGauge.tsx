"use client";

// Öppen 270°-båge för MASTER-tilen i rum-detaljen — börjar nere till
// vänster (~225°) och slutar nere till höger (~−45°). Track + fill, ACC.

import type { ReactNode } from "react";

export default function ArcGauge({
  value,
  size = 96,
  stroke = 8,
  trackColor,
  color,
  children,
}: {
  value: number; // 0–100
  size?: number;
  stroke?: number;
  trackColor: string;
  color: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  // Bågens öppning är 90° centrerad nere — start på 135° (nedre-vänster),
  // slut på 45° (nedre-höger), 270° båglängd.
  const startAngle = 135;
  const endAngle = 45;
  const sweep = 270;

  const polar = (angle: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const start = polar(startAngle);
  const end = polar(360 + endAngle);
  const trackPath = `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 1 1 ${end.x.toFixed(
    2
  )} ${end.y.toFixed(2)}`;

  const pct = Math.max(0, Math.min(100, value));
  const fillEndAngle = startAngle + (sweep * pct) / 100;
  const fillEnd = polar(fillEndAngle);
  const largeArc = (sweep * pct) / 100 > 180 ? 1 : 0;
  const fillPath = `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${fillEnd.x.toFixed(
    2
  )} ${fillEnd.y.toFixed(2)}`;

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width={size} height={size} aria-hidden="true">
        <path
          d={trackPath}
          stroke={trackColor}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
        />
        {pct > 0 && (
          <path
            d={fillPath}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
          />
        )}
      </svg>
      {children ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

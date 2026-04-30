"use client";

// Öppen 270°-båge för MASTER-tilen i rum-detaljen — börjar nere till
// vänster (~135°) och slutar nere till höger (~405° = 45°). Track + ACC-
// fyllning. Kan göras interaktiv via `onChange`/`onCommit` (drag på
// bågen för att justera värdet).

import { useRef, useState, type ReactNode } from "react";
import { haptic } from "@/lib/warm/haptics";

export default function ArcGauge({
  value,
  size = 96,
  stroke = 8,
  trackColor,
  color,
  thumbColor,
  children,
  onChange,
  onCommit,
}: {
  value: number; // 0–100
  size?: number;
  stroke?: number;
  trackColor: string;
  color: string;
  thumbColor?: string;
  children?: ReactNode;
  onChange?: (value: number) => void;
  onCommit?: (value: number) => void;
}) {
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const startAngle = 135;
  const sweep = 270;
  const endAngle = startAngle + sweep; // 405°

  const polar = (angle: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const start = polar(startAngle);
  const end = polar(endAngle);
  const trackPath = `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 1 1 ${end.x.toFixed(
    2
  )} ${end.y.toFixed(2)}`;

  const interactive = onChange != null || onCommit != null;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [liveValue, setLiveValue] = useState<number | null>(null);
  const display = liveValue ?? value;

  const pct = Math.max(0, Math.min(100, display));
  const fillEndAngle = startAngle + (sweep * pct) / 100;
  const fillEnd = polar(fillEndAngle);
  const largeArc = (sweep * pct) / 100 > 180 ? 1 : 0;
  const fillPath =
    pct > 0
      ? `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${fillEnd.x.toFixed(
          2
        )} ${fillEnd.y.toFixed(2)}`
      : null;

  // Inverse-mapping: pointer (mx, my) → procent 0..100
  function pointerToValue(e: React.PointerEvent<SVGSVGElement>): number | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * size;
    const my = ((e.clientY - rect.top) / rect.height) * size;
    const vx = mx - cx;
    const vy = my - cy;
    if (vx === 0 && vy === 0) return null;
    // Vinkel: 0° = kl 12, växande medurs (samma som polar()).
    let angle = (Math.atan2(vx, -vy) * 180) / Math.PI;
    if (angle < 0) angle += 360;
    // Bågen sveper 135° → 405°. Värden i [0°, 135°)-zonen ligger i den
    // öppna delen — om vi kommer dit, klampa till närmaste ände.
    if (angle < startAngle) {
      const distToStart = startAngle - angle;
      const distToEnd = 360 - endAngle + angle;
      angle = distToStart < distToEnd ? startAngle : endAngle;
    }
    if (angle > endAngle) angle = endAngle;
    const progress = (angle - startAngle) / sweep;
    return Math.max(0, Math.min(100, Math.round(progress * 100)));
  }

  // Senast hapticade 10%-steg under drag.
  const lastStep = useRef<number>(-1);
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!interactive) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const v = pointerToValue(e);
    if (v != null) {
      setDragging(true);
      setLiveValue(v);
      onChange?.(v);
      lastStep.current = Math.round(v / 10) * 10;
      void haptic("select");
    }
  };
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!interactive || !dragging) return;
    const v = pointerToValue(e);
    if (v != null) {
      setLiveValue(v);
      onChange?.(v);
      const step = Math.round(v / 10) * 10;
      if (lastStep.current !== step) {
        lastStep.current = step;
        void haptic("select");
      }
    }
  };
  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!interactive || !dragging) return;
    setDragging(false);
    const v = pointerToValue(e) ?? liveValue ?? value;
    onCommit?.(v);
    // Behåll liveValue ett ögonblick — annars hoppar gauge:n till gammal
    // value-prop tills HA-revalidate kommer in.
    setTimeout(() => setLiveValue(null), 800);
  };

  // Thumb-position på bågens fyllningsslut
  const thumbAngle = startAngle + (sweep * pct) / 100;
  const thumb = polar(thumbAngle);

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
      <svg
        ref={svgRef}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
        style={{
          touchAction: interactive ? "none" : "auto",
          cursor: interactive ? (dragging ? "grabbing" : "grab") : "default",
          overflow: "visible",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <path
          d={trackPath}
          stroke={trackColor}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
        />
        {fillPath && (
          <path
            d={fillPath}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
          />
        )}
        {interactive && (
          <circle
            cx={thumb.x}
            cy={thumb.y}
            r={stroke * 0.85}
            fill={thumbColor ?? color}
            stroke={thumbColor ? color : "#FFFBF0"}
            strokeWidth={1.5}
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
            pointerEvents: "none",
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

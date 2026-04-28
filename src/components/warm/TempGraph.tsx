"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { ACC, body, lab, type WarmTheme } from "@/lib/warm/tokens";

type HistoryResp = { entities: Record<string, Array<{ t: string; v: number }>> };

type Series = {
  entity: string;
  label: string;
  color: string;
};

export default function TempGraph({
  t,
  hours = 24,
  height = 120,
}: {
  t: WarmTheme;
  hours?: number;
  height?: number;
}) {
  const series: Series[] = [
    { entity: "sensor.nibe_inomhustemperatur_bt50", label: "Inne", color: ACC },
    { entity: "sensor.nibe_utomhustemperatur_bt1", label: "Ute", color: t.mute },
  ];
  const entities = series.map((s) => s.entity).join(",");
  const { data, isLoading } = useSWR<HistoryResp>(
    `/api/homeassistant/history?entities=${entities}&hours=${hours}`,
    fetcher,
    { refreshInterval: 300_000, revalidateOnFocus: false, dedupingInterval: 60_000 }
  );

  const [width, setWidth] = useState(320);
  const [ref, setRef] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!ref) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 320;
      setWidth(Math.max(120, Math.floor(w)));
    });
    ro.observe(ref);
    return () => ro.disconnect();
  }, [ref]);

  if (isLoading || !data) {
    return (
      <div
        ref={setRef}
        style={{
          height,
          width: "100%",
          background: t.paper,
          border: `1px solid ${t.line}`,
          borderRadius: 14,
          opacity: 0.5,
        }}
      />
    );
  }

  // Konvertera ISO timestamps till tal (ms epoch) och samla y-värden för domän
  const padX = 12;
  const padY = 18;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  let tMin = Infinity;
  let tMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;

  for (const s of series) {
    for (const p of data.entities[s.entity] ?? []) {
      const t = new Date(p.t).getTime();
      if (t < tMin) tMin = t;
      if (t > tMax) tMax = t;
      if (p.v < yMin) yMin = p.v;
      if (p.v > yMax) yMax = p.v;
    }
  }

  if (!isFinite(tMin) || !isFinite(yMin) || tMax === tMin) {
    return (
      <div
        style={{
          height,
          width: "100%",
          background: t.paper,
          border: `1px solid ${t.line}`,
          borderRadius: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: t.dim,
          fontFamily: body,
          fontSize: 11,
        }}
      >
        Ingen data
      </div>
    );
  }

  // Y-domän med 1° marginal
  yMin = Math.floor(yMin - 1);
  yMax = Math.ceil(yMax + 1);
  const yRange = Math.max(1, yMax - yMin);

  const x = (ts: number) => padX + ((ts - tMin) / (tMax - tMin)) * innerW;
  const y = (v: number) => padY + (1 - (v - yMin) / yRange) * innerH;

  // 0°-linje
  const zeroY = yMin <= 0 && yMax >= 0 ? y(0) : null;

  return (
    <div
      ref={setRef}
      style={{
        position: "relative",
        background: t.paper,
        border: `1px solid ${t.line}`,
        borderRadius: 14,
        padding: "8px 4px 6px",
      }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ display: "block" }}
        aria-hidden="true"
      >
        {/* Y-axel-marker (min/max) */}
        <text
          x={padX}
          y={padY - 4}
          fill={t.dim}
          fontSize={9}
          fontFamily={body}
          fontVariantNumeric="tabular-nums"
        >
          {yMax}°
        </text>
        <text
          x={padX}
          y={height - 4}
          fill={t.dim}
          fontSize={9}
          fontFamily={body}
          fontVariantNumeric="tabular-nums"
        >
          {yMin}°
        </text>
        {/* 0°-linje */}
        {zeroY != null && (
          <line
            x1={padX}
            y1={zeroY}
            x2={width - padX}
            y2={zeroY}
            stroke={t.line}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        )}
        {/* Linjer per serie */}
        {series.map((s) => {
          const points = (data.entities[s.entity] ?? [])
            .map((p) => `${x(new Date(p.t).getTime()).toFixed(2)},${y(p.v).toFixed(2)}`)
            .join(" ");
          if (!points) return null;
          return (
            <polyline
              key={s.entity}
              points={points}
              fill="none"
              stroke={s.color}
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
      </svg>
      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginTop: 4,
          paddingLeft: padX,
          paddingRight: padX,
        }}
      >
        {series.map((s) => (
          <div
            key={s.entity}
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <span
              style={{
                width: 10,
                height: 2,
                background: s.color,
                borderRadius: 1,
                display: "inline-block",
              }}
            />
            <span style={{ ...lab(t, { fontSize: 9 }), color: t.dim }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

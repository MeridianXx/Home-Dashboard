"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { ACC, body, lab, serif, type WarmTheme } from "@/lib/warm/tokens";

type HistoryResp = { entities: Record<string, Array<{ t: string; v: number }>> };

type Series = {
  entity: string;
  label: string;
  color: string;
};

type Bucket = {
  ts: number; // mitt-tidpunkt i ms
  values: Record<string, number | null>;
};

// Slå ihop alla serier till en gemensam tids-axel via 15-min buckets med
// medelvärde per bucket. Forward-fill saknade värden så tooltip alltid har
// ett värde att visa.
function bucketize(
  entities: Record<string, Array<{ t: string; v: number }>>,
  series: Series[],
  bucketMs: number = 15 * 60_000
): Bucket[] {
  const map = new Map<number, Record<string, { sum: number; n: number }>>();
  let tMin = Infinity;
  let tMax = -Infinity;
  for (const s of series) {
    for (const p of entities[s.entity] ?? []) {
      const ts = new Date(p.t).getTime();
      if (!isFinite(ts)) continue;
      if (ts < tMin) tMin = ts;
      if (ts > tMax) tMax = ts;
      const key = Math.floor(ts / bucketMs) * bucketMs;
      let row = map.get(key);
      if (!row) {
        row = {};
        map.set(key, row);
      }
      const slot = (row[s.entity] ??= { sum: 0, n: 0 });
      slot.sum += p.v;
      slot.n += 1;
    }
  }
  if (!isFinite(tMin)) return [];
  const out: Bucket[] = [];
  const last: Record<string, number | null> = Object.fromEntries(
    series.map((s) => [s.entity, null])
  );
  for (
    let key = Math.floor(tMin / bucketMs) * bucketMs;
    key <= tMax;
    key += bucketMs
  ) {
    const row = map.get(key);
    const values: Record<string, number | null> = {};
    for (const s of series) {
      const slot = row?.[s.entity];
      if (slot && slot.n > 0) {
        const v = slot.sum / slot.n;
        last[s.entity] = v;
        values[s.entity] = v;
      } else {
        values[s.entity] = last[s.entity];
      }
    }
    out.push({ ts: key + bucketMs / 2, values });
  }
  return out;
}

export default function TempGraph({
  t,
  hours = 24,
  height = 140,
}: {
  t: WarmTheme;
  hours?: number;
  height?: number;
}) {
  const series: Series[] = useMemo(
    () => [
      { entity: "sensor.nibe_inomhustemperatur_bt50", label: "Inne", color: ACC },
      { entity: "sensor.nibe_utomhustemperatur_bt1", label: "Ute", color: t.mute },
    ],
    [t.mute]
  );
  const entities = series.map((s) => s.entity).join(",");
  const { data, isLoading } = useSWR<HistoryResp>(
    `/api/homeassistant/history?entities=${entities}&hours=${hours}`,
    fetcher,
    { refreshInterval: 300_000, revalidateOnFocus: false, dedupingInterval: 60_000 }
  );

  const [width, setWidth] = useState(320);
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!containerRef) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 320;
      setWidth(Math.max(120, Math.floor(w)));
    });
    ro.observe(containerRef);
    return () => ro.disconnect();
  }, [containerRef]);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hover, setHover] = useState<{ x: number; bucket: Bucket } | null>(null);

  const buckets = useMemo(
    () => (data ? bucketize(data.entities, series) : []),
    [data, series]
  );

  if (isLoading || !data || buckets.length === 0) {
    return (
      <div
        ref={setContainerRef}
        style={{
          height,
          width: "100%",
          background: t.paper,
          border: `1px solid ${t.line}`,
          borderRadius: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0.5,
        }}
      >
        <span style={{ fontFamily: body, fontSize: 11, color: t.dim }}>
          {isLoading ? "Hämtar…" : "Ingen data"}
        </span>
      </div>
    );
  }

  // Layout-konstanter
  const padX = 14;
  const padTopForLabel = 18;
  const padBottomForAxis = 22;
  const innerW = width - padX * 2;
  const innerH = height - padTopForLabel - padBottomForAxis;

  // Domäner
  const tMin = buckets[0].ts;
  const tMax = buckets[buckets.length - 1].ts;
  let yMinRaw = Infinity;
  let yMaxRaw = -Infinity;
  for (const b of buckets) {
    for (const s of series) {
      const v = b.values[s.entity];
      if (v == null) continue;
      if (v < yMinRaw) yMinRaw = v;
      if (v > yMaxRaw) yMaxRaw = v;
    }
  }
  const yMin = Math.floor(yMinRaw - 1);
  const yMax = Math.ceil(yMaxRaw + 1);
  const yRange = Math.max(1, yMax - yMin);

  const tToX = (ts: number) =>
    padX + ((ts - tMin) / (tMax - tMin || 1)) * innerW;
  const vToY = (v: number) =>
    padTopForLabel + (1 - (v - yMin) / yRange) * innerH;

  const zeroY = yMin <= 0 && yMax >= 0 ? vToY(0) : null;

  // Tidsmarkörer (var 6:e timme)
  const tickEvery = 6 * 3600_000;
  const ticks: number[] = [];
  const firstTick = Math.ceil(tMin / tickEvery) * tickEvery;
  for (let tt = firstTick; tt <= tMax; tt += tickEvery) ticks.push(tt);

  // Hover-handler
  function pointerToBucket(e: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg || buckets.length === 0) return null;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < padX || x > width - padX) return null;
    const tHover = tMin + ((x - padX) / innerW) * (tMax - tMin);
    let nearest = buckets[0];
    let bestDiff = Math.abs(buckets[0].ts - tHover);
    for (const b of buckets) {
      const d = Math.abs(b.ts - tHover);
      if (d < bestDiff) {
        nearest = b;
        bestDiff = d;
      }
    }
    return { x: tToX(nearest.ts), bucket: nearest };
  }

  return (
    <div
      ref={setContainerRef}
      style={{
        position: "relative",
        background: t.paper,
        border: `1px solid ${t.line}`,
        borderRadius: 14,
        padding: "8px 4px 6px",
      }}
    >
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ display: "block", touchAction: "pan-y" }}
        aria-hidden="true"
        onPointerMove={(e) => {
          const hit = pointerToBucket(e);
          if (hit) setHover(hit);
        }}
        onPointerDown={(e) => {
          const hit = pointerToBucket(e);
          if (hit) setHover(hit);
          // stopPropagation så pull-to-refresh inte triggas vid drag på grafen
          e.stopPropagation();
        }}
        onPointerLeave={() => setHover(null)}
      >
        {/* Y-axel-marker (min/max) */}
        <text
          x={padX}
          y={padTopForLabel - 4}
          fill={t.dim}
          fontSize={9}
          fontFamily={body}
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {yMax}°
        </text>
        <text
          x={padX}
          y={height - padBottomForAxis + 12}
          fill={t.dim}
          fontSize={9}
          fontFamily={body}
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {yMin}°
        </text>

        {/* Tids-tickar */}
        {ticks.map((tt) => {
          const d = new Date(tt);
          const lbl = d.toLocaleTimeString("sv-SE", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
          return (
            <text
              key={tt}
              x={tToX(tt)}
              y={height - 4}
              fill={t.dim}
              fontSize={9}
              fontFamily={body}
              style={{ fontVariantNumeric: "tabular-nums" }}
              textAnchor="middle"
            >
              {lbl}
            </text>
          );
        })}

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
          const points = buckets
            .map((b) => {
              const v = b.values[s.entity];
              if (v == null) return null;
              return `${tToX(b.ts).toFixed(2)},${vToY(v).toFixed(2)}`;
            })
            .filter((p): p is string => p != null)
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

        {/* Hover-cursor */}
        {hover && (
          <>
            <line
              x1={hover.x}
              y1={padTopForLabel}
              x2={hover.x}
              y2={height - padBottomForAxis}
              stroke={t.dim}
              strokeWidth={1}
              opacity={0.6}
            />
            {series.map((s) => {
              const v = hover.bucket.values[s.entity];
              if (v == null) return null;
              return (
                <circle
                  key={s.entity}
                  cx={hover.x}
                  cy={vToY(v)}
                  r={3}
                  fill={s.color}
                />
              );
            })}
          </>
        )}
      </svg>

      {/* Hover-tooltip */}
      {hover && (() => {
        const time = new Date(hover.bucket.ts).toLocaleTimeString("sv-SE", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
        const tipWidth = 130;
        const left = Math.max(
          padX,
          Math.min(width - padX - tipWidth, hover.x - tipWidth / 2)
        );
        return (
          <div
            style={{
              position: "absolute",
              left,
              top: 4,
              width: tipWidth,
              padding: "6px 10px",
              borderRadius: 10,
              background: t.paperHi,
              border: `1px solid ${t.line}`,
              boxShadow: "0 6px 16px rgba(0,0,0,0.06)",
              pointerEvents: "none",
              fontFamily: body,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <div
              style={{
                ...lab(t, { fontSize: 9 }),
                color: t.dim,
                marginBottom: 2,
              }}
            >
              {time}
            </div>
            {series.map((s) => {
              const v = hover.bucket.values[s.entity];
              return (
                <div
                  key={s.entity}
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      color: t.mute,
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 2,
                        background: s.color,
                        borderRadius: 1,
                      }}
                    />
                    {s.label}
                  </span>
                  <span
                    style={{
                      fontFamily: serif,
                      fontSize: 13,
                      color: t.ink,
                    }}
                  >
                    {v != null ? `${v.toFixed(1)}°` : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })()}

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

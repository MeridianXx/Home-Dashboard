"use client";

// ─── Warm Home · Fitness · Pass-detalj-grafer ────────────────────────────────
// SVG-baserade puls- och elevations-grafer + zon-fördelning + lap-lista.
// Inga Recharts/CSS-variabel-deroenden — använder Warm-tokens direkt så
// färger sitter rätt i light/dark utan global CSS-mapping.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useWarmTheme } from "@/lib/warm/theme";
import { ACC, body, ital, lab, num, type WarmTheme } from "@/lib/warm/tokens";
import { formatSec, zoneColor, zoneLabel } from "@/lib/warm/fit";
import { hrZone } from "@/lib/fitness/profile";
import type { FitTrackPoint, FitLap } from "@/lib/fitness/fit-parser";
import type { FitnessProfile } from "@/lib/fitness/types";
import { categorizeLaps } from "@/lib/fitness/laps";

/* ───── Hook: ResizeObserver-driven width/height ────────────────────── */

function useChartSize(height: number) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0]?.contentRect.width ?? 0);
      if (w > 0) setWidth(w);
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, []);
  return { ref, width, height };
}

/* ───── HR-tidsserie med zon-band ────────────────────────────────────── */

export function HRSeriesChart({
  track,
  zones,
}: {
  track: FitTrackPoint[];
  zones: FitnessProfile["zones"];
}) {
  const { t } = useWarmTheme();
  const { ref, width, height } = useChartSize(160);
  const data = track.filter((p) => typeof p.hr === "number");
  if (data.length < 2) {
    return <div ref={ref} style={{ height, width: "100%" }} />;
  }
  const tMax = data[data.length - 1].t;
  const hrs = data.map((p) => p.hr as number);
  const yMin = Math.max(60, Math.floor(Math.min(...hrs) / 10) * 10 - 5);
  const yMax = Math.ceil(Math.max(...hrs) / 10) * 10 + 5;
  const range = yMax - yMin;
  const padL = 32;
  const padR = 8;
  const padT = 4;
  const padB = 18;
  const innerW = Math.max(0, width - padL - padR);
  const innerH = Math.max(0, height - padT - padB);

  const xOf = (t: number) => padL + (t / tMax) * innerW;
  const yOf = (hr: number) => padT + (1 - (hr - yMin) / range) * innerH;

  const path = data
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xOf(p.t).toFixed(1)} ${yOf(p.hr as number).toFixed(1)}`)
    .join(" ");

  return (
    <div ref={ref} onTouchStart={(e) => e.stopPropagation()} style={{ width: "100%" }}>
      {width > 0 ? (
        <svg width={width} height={height} aria-hidden="true">
          {/* Zon-band */}
          {(["Z1", "Z2", "Z3", "Z4", "Z5"] as const).map((z) => {
            const [lo, hi] = zones[z];
            if (hi < yMin || lo > yMax) return null;
            const top = yOf(Math.min(hi, yMax));
            const bot = yOf(Math.max(lo, yMin));
            return (
              <rect
                key={z}
                x={padL}
                y={top}
                width={innerW}
                height={Math.max(0, bot - top)}
                fill={zoneColor(z)}
                opacity={0.1}
              />
            );
          })}
          {/* Y-tickar */}
          {[yMin, Math.round((yMin + yMax) / 2), yMax].map((v) => (
            <g key={v}>
              <text
                x={padL - 6}
                y={yOf(v) + 3}
                textAnchor="end"
                style={{ fontFamily: body, fontSize: 9, fill: t.dim }}
              >
                {v}
              </text>
              <line x1={padL} x2={width - padR} y1={yOf(v)} y2={yOf(v)} stroke={t.line} strokeWidth={0.5} strokeDasharray="2 3" />
            </g>
          ))}
          {/* HR-kurva (LINGON) */}
          <path d={path} fill="none" stroke="#A83E4A" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
          {/* X-tickar */}
          <text x={padL} y={height - 4} style={{ fontFamily: body, fontSize: 9, fill: t.dim }}>
            0
          </text>
          <text x={width - padR} y={height - 4} textAnchor="end" style={{ fontFamily: body, fontSize: 9, fill: t.dim }}>
            {formatSec(tMax)}
          </text>
        </svg>
      ) : null}
    </div>
  );
}

/* ───── Elevations-profil ────────────────────────────────────────────── */

export function ElevationChart({ track }: { track: FitTrackPoint[] }) {
  const { t } = useWarmTheme();
  const { ref, width, height } = useChartSize(120);
  const data = track.filter((p) => typeof p.alt === "number");
  if (data.length < 2) return <div ref={ref} style={{ height, width: "100%" }} />;

  const distanceMaxKm = Math.max(0.0001, ((data[data.length - 1].d ?? 0) / 1000) || data.length);
  const alts = data.map((p) => p.alt as number);
  const yMin = Math.floor(Math.min(...alts));
  const yMax = Math.ceil(Math.max(...alts));
  const range = Math.max(1, yMax - yMin);
  const padL = 28;
  const padR = 6;
  const padT = 4;
  const padB = 18;
  const innerW = Math.max(0, width - padL - padR);
  const innerH = Math.max(0, height - padT - padB);

  const xOf = (km: number) => padL + (km / distanceMaxKm) * innerW;
  const yOf = (m: number) => padT + (1 - (m - yMin) / range) * innerH;

  const linePath = data
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xOf((p.d ?? 0) / 1000).toFixed(1)} ${yOf(p.alt as number).toFixed(1)}`)
    .join(" ");
  const fillPath = `${linePath} L ${xOf((data[data.length - 1].d ?? 0) / 1000).toFixed(1)} ${yOf(yMin).toFixed(1)} L ${xOf(0).toFixed(1)} ${yOf(yMin).toFixed(1)} Z`;

  return (
    <div ref={ref} onTouchStart={(e) => e.stopPropagation()} style={{ width: "100%" }}>
      {width > 0 ? (
        <svg width={width} height={height} aria-hidden="true">
          <defs>
            <linearGradient id="warm-elev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACC} stopOpacity={0.35} />
              <stop offset="100%" stopColor={ACC} stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <path d={fillPath} fill="url(#warm-elev)" stroke="none" />
          <path d={linePath} fill="none" stroke={ACC} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
          <text x={padL - 4} y={yOf(yMax) + 3} textAnchor="end" style={{ fontFamily: body, fontSize: 9, fill: t.dim }}>
            {yMax} m
          </text>
          <text x={padL - 4} y={yOf(yMin) + 3} textAnchor="end" style={{ fontFamily: body, fontSize: 9, fill: t.dim }}>
            {yMin}
          </text>
          <text x={width - padR} y={height - 4} textAnchor="end" style={{ fontFamily: body, fontSize: 9, fill: t.dim }}>
            {distanceMaxKm.toFixed(1)} km
          </text>
        </svg>
      ) : null}
    </div>
  );
}

/* ───── Zon-fördelning (horisontella staplar) ────────────────────────── */

export function ZoneDistribution({
  hrz,
  totalSec,
}: {
  hrz: { hrz0: number | null; hrz1: number | null; hrz2: number | null; hrz3: number | null; hrz4: number | null; hrz5: number | null } | null;
  totalSec: number;
}) {
  const { t } = useWarmTheme();
  if (!hrz) return null;
  const rows = (
    [
      { key: "Z5", frac: hrz.hrz5 ?? 0 },
      { key: "Z4", frac: hrz.hrz4 ?? 0 },
      { key: "Z3", frac: hrz.hrz3 ?? 0 },
      { key: "Z2", frac: hrz.hrz2 ?? 0 },
      { key: "Z1", frac: hrz.hrz1 ?? 0 },
    ] as const
  ).filter((r) => r.frac > 0.001);
  if (rows.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.map((r) => (
        <div key={r.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, width: 110, flexShrink: 0 }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: zoneColor(r.key) }} />
            <span style={{ fontFamily: body, fontSize: 12, fontWeight: 600, color: t.ink }} className="warm-tab-nums">
              {r.key}
            </span>
            <span style={{ ...ital(t, 11) }}>{zoneLabel(r.key as "Z1" | "Z2" | "Z3" | "Z4" | "Z5")}</span>
          </div>
          <div style={{ flex: 1, height: 6, borderRadius: 999, background: t.line, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.max(2, r.frac * 100)}%`, background: zoneColor(r.key), borderRadius: 999 }} />
          </div>
          <div style={{ ...num(t, 11, 500), color: t.mute, minWidth: 84, textAlign: "right" }} className="warm-tab-nums">
            {formatSec(r.frac * totalSec)} · {(r.frac * 100).toFixed(0)} %
          </div>
        </div>
      ))}
    </div>
  );
}

/* ───── Puls-kort (samlar HR-stat + serie + zon-fördelning) ──────────── */

export function HeartRateCard({
  track,
  zones,
  avgHR,
  maxHR,
  hrz,
  totalSec,
}: {
  track: FitTrackPoint[];
  zones: FitnessProfile["zones"];
  avgHR: number | null;
  maxHR: number | null;
  hrz: { hrz0: number | null; hrz1: number | null; hrz2: number | null; hrz3: number | null; hrz4: number | null; hrz5: number | null } | null;
  totalSec: number;
}) {
  const { t } = useWarmTheme();
  const hasChart = track.some((p) => typeof p.hr === "number");
  return (
    <div
      style={{
        background: t.paper,
        border: `1px solid ${t.line}`,
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "14px 14px 10px" }}>
        <div style={{ ...lab(t, { color: ACC, marginBottom: 8 }) }}>Puls</div>
        {avgHR != null ? (
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ ...num(t, 30), color: "#A83E4A", lineHeight: 1 }} className="warm-tab-nums">
              {Math.round(avgHR)}
            </span>
            <span style={{ fontFamily: body, fontSize: 11, color: "#A83E4A", opacity: 0.8, fontWeight: 500 }}>bpm snitt</span>
            {maxHR != null && maxHR > 0 ? (
              <span style={{ ...ital(t, 11), marginLeft: 8 }}>
                max{" "}
                <span style={{ ...num(t, 11, 600), color: "#A83E4A" }} className="warm-tab-nums">
                  {Math.round(maxHR)}
                </span>
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      {hasChart ? (
        <div style={{ padding: "0 6px 10px" }}>
          <HRSeriesChart track={track} zones={zones} />
        </div>
      ) : null}
      {hrz ? (
        <div style={{ borderTop: `1px solid ${t.line}`, padding: "12px 14px" }}>
          <ZoneDistribution hrz={hrz} totalSec={totalSec} />
        </div>
      ) : null}
    </div>
  );
}

/* ───── Lap-lista (intervall-kategorisering) ─────────────────────────── */

const LAP_LABELS = {
  warmup: "Uppvärmning",
  interval: "Intervall",
  rest: "Vila",
  cooldown: "Nedvarvning",
  steady: "Etapp",
} as const;

function lapColor(kind: keyof typeof LAP_LABELS, t: WarmTheme): string {
  switch (kind) {
    case "warmup": return "#D9954B";  // amber
    case "interval": return "#C96F4A"; // ACC
    case "rest": return "#6E8AA6";    // sky
    case "cooldown": return "#7A9475"; // sage
    default: return t.ink;
  }
}

export function LapsList({ laps }: { laps: FitLap[] }) {
  const { t } = useWarmTheme();
  if (laps.length <= 1) return null;
  const cats = categorizeLaps(laps);
  return (
    <div style={{ background: t.paper, border: `1px solid ${t.line}`, borderRadius: 14, overflow: "hidden" }}>
      {cats.map(({ lap, kind }, i) => {
        const pace = lap.distanceM > 0 && lap.durationSec > 0 ? `${lap.avgPace ?? "–"}/km` : formatSec(lap.durationSec);
        return (
          <div
            key={lap.index}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              borderTop: i === 0 ? "none" : `1px solid ${t.line}`,
            }}
          >
            <span
              style={{
                fontFamily: body,
                fontSize: 13,
                fontWeight: 600,
                color: lapColor(kind as keyof typeof LAP_LABELS, t),
                flex: 1,
                minWidth: 0,
              }}
            >
              {LAP_LABELS[kind as keyof typeof LAP_LABELS]}
            </span>
            <span style={{ ...num(t, 13, 600), color: t.ink, minWidth: 72, textAlign: "right" }} className="warm-tab-nums">
              {lap.distanceM > 0 ? `${(lap.distanceM / 1000).toFixed(2)} km` : formatSec(lap.durationSec)}
            </span>
            <span style={{ fontFamily: body, fontSize: 11, color: t.mute, minWidth: 80, textAlign: "right" }} className="warm-tab-nums">
              {pace}
            </span>
            {lap.avgHR != null ? (
              <span style={{ fontFamily: body, fontSize: 11, color: t.mute, minWidth: 56, textAlign: "right" }} className="warm-tab-nums">
                {Math.round(lap.avgHR)} bpm
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/* ───── Hjälper för zone-pill bredvid HR-värden ──────────────────────── */

export function ZonePill({ bpm, zones }: { bpm: number; zones: FitnessProfile["zones"] }) {
  const z = hrZone(Math.round(bpm), zones);
  if (!z) return null;
  return (
    <span
      style={{
        background: zoneColor(z),
        color: "#FFFBF0",
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 600,
        fontFamily: body,
        letterSpacing: 0.4,
      }}
      className="warm-tab-nums"
    >
      {z}
    </span>
  );
}

export function ChartLegend({ children }: { children: ReactNode }) {
  const { t } = useWarmTheme();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 8, fontFamily: body, fontSize: 10, color: t.mute }}>
      {children}
    </div>
  );
}

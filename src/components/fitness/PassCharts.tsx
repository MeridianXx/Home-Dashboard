"use client";

import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceArea } from "recharts";
import {
  useChartTheme,
  useChartSize,
  useDeferredMount,
  ChartSkeleton,
} from "@/components/charts/ChartCard";
import type { FitTrackPoint, FitLap } from "@/lib/fitness/fit-parser";
import type { FitnessProfile } from "@/lib/fitness/types";
import { hrZone } from "@/lib/fitness/profile";

// ─── Hjälpare ────────────────────────────────────────────────────────────────

function formatSec(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function zoneColor(z: "Z1" | "Z2" | "Z3" | "Z4" | "Z5"): string {
  return { Z1: "#a7c4ff", Z2: "#7fb8a3", Z3: "#fab849", Z4: "#ef8a5c", Z5: "#e5484d" }[z];
}

function Tip({ label, rows }: { label: string; rows: Array<{ name: string; value: string; color?: string }> }) {
  return (
    <div
      style={{
        backgroundColor: "var(--color-surface-container-lowest)",
        border: "1px solid var(--color-outline)",
        borderRadius: 8,
        padding: "6px 10px",
        fontSize: 12,
      }}
    >
      <div style={{ color: "var(--color-on-surface-variant)", marginBottom: 2, fontWeight: 600 }}>{label}</div>
      {rows.map((r, i) => (
        <div key={i} style={{ color: r.color ?? "var(--color-on-surface)", fontWeight: 700 }}>
          {r.name}: {r.value}
        </div>
      ))}
    </div>
  );
}

// ─── HR-tidsserie ────────────────────────────────────────────────────────────

export function HRSeriesChart({ track, zones }: { track: FitTrackPoint[]; zones: FitnessProfile["zones"] }) {
  const mounted = useDeferredMount();
  const theme = useChartTheme();
  const { ref, width, height, stopSwipe } = useChartSize(180);

  const data = track.filter((p) => typeof p.hr === "number").map((p) => ({ t: p.t, hr: p.hr as number }));
  if (!mounted || !theme || !width || data.length < 2) {
    return (
      <div ref={ref} {...stopSwipe} style={{ height, width: "100%" }}>
        {data.length < 2 ? null : <ChartSkeleton />}
      </div>
    );
  }

  const hrs = data.map((d) => d.hr);
  const yMin = Math.max(60, Math.floor(Math.min(...hrs) / 10) * 10 - 5);
  const yMax = Math.ceil(Math.max(...hrs) / 10) * 10 + 5;

  return (
    <div ref={ref} {...stopSwipe} style={{ width: "100%" }}>
      <LineChart data={data} width={width} height={height} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <XAxis
          dataKey="t"
          tickFormatter={(v) => formatSec(v as number)}
          tick={{ fill: theme.onSurfaceVariant, fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={50}
        />
        <YAxis
          tick={{ fill: theme.onSurfaceVariant, fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={36}
          domain={[yMin, yMax]}
        />
        {/* Zon-band bakom kurvan */}
        {(["Z1", "Z2", "Z3", "Z4", "Z5"] as const).map((z) => {
          const [lo, hi] = zones[z];
          if (hi < yMin || lo > yMax) return null;
          return (
            <ReferenceArea
              key={z}
              y1={Math.max(lo, yMin)}
              y2={Math.min(hi, yMax)}
              fill={zoneColor(z)}
              fillOpacity={0.08}
              stroke="none"
            />
          );
        })}
        <Tooltip
          cursor={{ stroke: "var(--color-outline)", strokeWidth: 1 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const t = payload[0].payload.t as number;
            const hr = payload[0].value as number;
            return <Tip label={formatSec(t)} rows={[{ name: "Puls", value: `${hr} bpm`, color: "#e5484d" }]} />;
          }}
        />
        <Line type="monotone" dataKey="hr" stroke="#e5484d" strokeWidth={1.8} dot={false} activeDot={{ r: 3, fill: "#e5484d" }} />
      </LineChart>
    </div>
  );
}

// ─── Elevationsprofil ────────────────────────────────────────────────────────

export function ElevationChart({ track }: { track: FitTrackPoint[] }) {
  const mounted = useDeferredMount();
  const theme = useChartTheme();
  const { ref, width, height, stopSwipe } = useChartSize(140);

  const data = track
    .filter((p) => typeof p.alt === "number")
    .map((p) => ({ d: (p.d ?? 0) / 1000, alt: p.alt as number, t: p.t }));
  if (!mounted || !theme || !width || data.length < 2) {
    return <div ref={ref} {...stopSwipe} style={{ height, width: "100%" }}>{data.length < 2 ? null : <ChartSkeleton />}</div>;
  }

  return (
    <div ref={ref} {...stopSwipe} style={{ width: "100%" }}>
      <AreaChart data={data} width={width} height={height} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="elev-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={theme.primary} stopOpacity={0.35} />
            <stop offset="100%" stopColor={theme.primary} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="d"
          tickFormatter={(v) => `${(v as number).toFixed(1)}`}
          tick={{ fill: theme.onSurfaceVariant, fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={40}
          unit=" km"
        />
        <YAxis
          tick={{ fill: theme.onSurfaceVariant, fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={36}
          unit="m"
        />
        <Tooltip
          cursor={{ stroke: "var(--color-outline)", strokeWidth: 1 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as { d: number; alt: number };
            return (
              <Tip
                label={`${p.d.toFixed(2)} km`}
                rows={[{ name: "Höjd", value: `${Math.round(p.alt)} m`, color: theme.primary }]}
              />
            );
          }}
        />
        {/* type="linear" ger de spetsiga topparna som följer faktiska höjdförändringar
            i stället för den utjämnade monotone-spline-kurvan. */}
        <Area type="linear" dataKey="alt" stroke={theme.primary} strokeWidth={1.5} fill="url(#elev-fill)" />
      </AreaChart>
    </div>
  );
}

// ─── Kombinerad Puls-ruta ────────────────────────────────────────────────────
// Samlar passets puls-data i ett kort: snittpuls-header, HR-tidsserie med
// zon-band, tid-i-zon-fördelning, samt (om data finns) pulsåterhämtning.
// Design inspirerad av Apple Fitness men följer dashboardens temavariabler.

function zoneLabelShort(z: "Z1" | "Z2" | "Z3" | "Z4" | "Z5"): string {
  return {
    Z1: "Mycket lätt",
    Z2: "Lätt",
    Z3: "Måttlig",
    Z4: "Hårt",
    Z5: "Mycket hårt",
  }[z];
}

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
  hrz: {
    hrz0: number | null; hrz1: number | null; hrz2: number | null;
    hrz3: number | null; hrz4: number | null; hrz5: number | null;
  } | null;
  totalSec: number;
}) {
  const hasChart = track.some((p) => typeof p.hr === "number");
  const zoneRows = hrz
    ? ([
        { key: "Z5", frac: hrz.hrz5 ?? 0, color: zoneColor("Z5") },
        { key: "Z4", frac: hrz.hrz4 ?? 0, color: zoneColor("Z4") },
        { key: "Z3", frac: hrz.hrz3 ?? 0, color: zoneColor("Z3") },
        { key: "Z2", frac: hrz.hrz2 ?? 0, color: zoneColor("Z2") },
        { key: "Z1", frac: hrz.hrz1 ?? 0, color: zoneColor("Z1") },
      ] as const).filter((r) => r.frac > 0.001)
    : [];

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: "var(--color-surface-container-lowest)",
        border: "1px solid var(--color-card-border)",
        boxShadow: "0px 8px 24px rgba(56,56,51,0.06)",
      }}
    >
      {/* Snittpuls-header */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-on-surface-variant)" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>monitor_heart</span>
          Puls
        </div>
        {avgHR != null && (
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-[11px] font-semibold" style={{ color: "var(--color-on-surface-variant)" }}>Snittpuls</span>
          </div>
        )}
        {avgHR != null && (
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold tabular-nums leading-none" style={{ color: "#e5484d" }}>
              {Math.round(avgHR)}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#e5484d", opacity: 0.75 }}>
              puls
            </span>
            {maxHR != null && maxHR > 0 && (
              <span className="text-xs ml-3" style={{ color: "var(--color-on-surface-variant)" }}>
                max <span className="tabular-nums" style={{ color: "#e5484d" }}>{Math.round(maxHR)}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Puls över tid */}
      {hasChart && (
        <div className="px-5 pb-4">
          <HRSeriesChart track={track} zones={zones} />
        </div>
      )}

      {/* Zondistribution */}
      {zoneRows.length > 0 && (
        <div className="px-5 py-4 space-y-2" style={{ borderTop: "1px solid var(--color-outline-variant)" }}>
          {zoneRows.map((r) => (
            <div key={r.key} className="flex items-center gap-3">
              <div
                className="flex items-center gap-1.5"
                style={{ width: 120, flexShrink: 0 }}
              >
                <span style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: r.color }} aria-hidden />
                <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--color-on-surface)" }}>{r.key}</span>
                <span className="text-[11px]" style={{ color: "var(--color-on-surface-variant)" }}>
                  · {zoneLabelShort(r.key as "Z1" | "Z2" | "Z3" | "Z4" | "Z5")}
                </span>
              </div>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-surface-container)" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${Math.max(2, r.frac * 100)}%`,
                    backgroundColor: r.color,
                    borderRadius: 999,
                  }}
                />
              </div>
              <div
                className="text-xs tabular-nums"
                style={{ color: "var(--color-on-surface-variant)", minWidth: 90, textAlign: "right" }}
              >
                {formatSec(r.frac * totalSec)} · {(r.frac * 100).toFixed(0)} %
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

// ─── Lap-lista ───────────────────────────────────────────────────────────────
// Intervallpass i Apple Watch auto-lap:ar per segment. Vi kategoriserar varje
// lap som Uppvärmning / Intervall / Vila / Nedvarvning baserat på HR vs
// profilens zoner — utan att klockan måste ha satt en explicit typ.

export type LapKind = "warmup" | "interval" | "rest" | "cooldown" | "steady";

export function categorizeLaps(laps: FitLap[], _zones: FitnessProfile["zones"]): Array<{ lap: FitLap; kind: LapKind }> {
  void _zones;
  if (laps.length === 0) return [];

  // Tempo-baserad klassificering är mer pålitligt än puls för korta intervaller —
  // HR släpar 30–60 s efter tempoändringar, så ett 60-s-intervall hinner sällan nå Z4.
  // Vi jämför varje laps tempo (sek/km) mot *session-snittempo* (total tid / total dist)
  // i stället för lap-median. Median-approach drogs skevt på intervallpass där halva
  // paren är snabba och halva långsamma (1:1 work:rest).
  const totalM = laps.reduce((s, l) => s + (l.distanceM || 0), 0);
  const totalS = laps.reduce((s, l) => s + (l.durationSec || 0), 0);
  const sessionPace = totalM > 0 && totalS > 0 ? totalS / (totalM / 1000) : 0;

  const FAST = 0.90;   // <= 90 % av session-snitt = intervall (snabbare)
  const SLOW = 1.20;   // >= 120 % av session-snitt = vila (långsammare)
  const WARMUP_MIN_DIST = 600;

  const out: Array<{ lap: FitLap; kind: LapKind }> = laps.map((lap) => {
    if (lap.distanceM < 50 || lap.durationSec <= 0) {
      // Micro-lap (stopp) — märker som vila
      return { lap, kind: "rest" as LapKind };
    }
    const pace = lap.durationSec / (lap.distanceM / 1000);
    const ratio = sessionPace > 0 ? pace / sessionPace : 1;
    let kind: LapKind = "steady";
    if (ratio <= FAST) kind = "interval";
    else if (ratio >= SLOW) kind = "rest";
    return { lap, kind };
  });

  // Första långa lap:en — warmup om den inte redan är intervall
  const firstIntervalIdx = out.findIndex((c) => c.kind === "interval");
  if (firstIntervalIdx > 0 && out[0].lap.distanceM >= WARMUP_MIN_DIST && out[0].kind !== "interval") {
    out[0].kind = "warmup";
  }

  // Sista lap efter sista intervall — cooldown om ≥ 400 m
  const lastIntervalIdx = out.map((c) => c.kind === "interval").lastIndexOf(true);
  if (lastIntervalIdx !== -1 && lastIntervalIdx < out.length - 1) {
    for (let i = lastIntervalIdx + 1; i < out.length; i++) {
      if (out[i].kind !== "interval" && out[i].lap.distanceM >= 400) out[i].kind = "cooldown";
    }
  }

  // Pass utan intervaller → alla "steady"-laps behålls så. Första långsamma=warmup.
  if (firstIntervalIdx === -1 && out.length > 1 && out[0].lap.distanceM >= WARMUP_MIN_DIST) {
    const firstPace = out[0].lap.distanceM > 0 ? out[0].lap.durationSec / (out[0].lap.distanceM / 1000) : 0;
    if (sessionPace > 0 && firstPace > sessionPace * 1.05) out[0].kind = "warmup";
  }

  return out;
}

const LAP_LABELS: Record<LapKind, string> = {
  warmup: "Uppvärmning",
  interval: "Intervall",
  rest: "Vila",
  cooldown: "Nedvarvning",
  steady: "Etapp",
};

const LAP_COLORS: Record<LapKind, string> = {
  warmup: "#fab849",
  interval: "#ef8a5c",
  rest: "#a7c4ff",
  cooldown: "#7fb8a3",
  steady: "var(--color-on-surface)",
};

export function LapsList({ laps, zones }: { laps: FitLap[]; zones: FitnessProfile["zones"] }) {
  if (laps.length <= 1) return null;
  const categorized = categorizeLaps(laps, zones);

  return (
    <div style={{ backgroundColor: "var(--color-surface-container)", borderRadius: 16, overflow: "hidden" }}>
      {categorized.map(({ lap, kind }, i) => {
        const pace = lap.distanceM > 0 && lap.durationSec > 0
          ? `${lap.avgPace ?? "–"}/km`
          : `${formatSec(lap.durationSec)}`;
        return (
          <div
            key={lap.index}
            className="flex items-center gap-3 px-4 py-3"
            style={{
              borderTop: i === 0 ? "none" : "1px solid var(--color-outline-variant)",
            }}
          >
            <div
              className="text-sm font-semibold flex-1 min-w-0"
              style={{ color: LAP_COLORS[kind] }}
            >
              {LAP_LABELS[kind]}
            </div>
            <div
              className="text-sm font-semibold tabular-nums"
              style={{ color: "var(--color-on-surface)", minWidth: 72, textAlign: "right" }}
            >
              {lap.distanceM > 0 ? `${(lap.distanceM / 1000).toFixed(2)} km` : formatSec(lap.durationSec)}
            </div>
            <div
              className="text-xs tabular-nums"
              style={{ color: "var(--color-on-surface-variant)", minWidth: 84, textAlign: "right" }}
            >
              {pace}
            </div>
            {lap.avgHR != null && (
              <div
                className="text-xs tabular-nums"
                style={{ color: "var(--color-on-surface-variant)", minWidth: 56, textAlign: "right" }}
              >
                {Math.round(lap.avgHR)} bpm
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Zondistribution — horisontell stapelbar ─────────────────────────────────

export function ZoneDistribution({
  hrz,
  totalSec,
}: {
  hrz: { hrz0: number | null; hrz1: number | null; hrz2: number | null; hrz3: number | null; hrz4: number | null; hrz5: number | null } | null;
  totalSec: number;
}) {
  if (!hrz) return null;
  const rows = [
    { key: "Z5", frac: hrz.hrz5 ?? 0, color: zoneColor("Z5") },
    { key: "Z4", frac: hrz.hrz4 ?? 0, color: zoneColor("Z4") },
    { key: "Z3", frac: hrz.hrz3 ?? 0, color: zoneColor("Z3") },
    { key: "Z2", frac: hrz.hrz2 ?? 0, color: zoneColor("Z2") },
    { key: "Z1", frac: hrz.hrz1 ?? 0, color: zoneColor("Z1") },
  ].filter((r) => r.frac > 0.001);

  if (rows.length === 0) return null;

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.key} className="flex items-center gap-3">
          <div className="text-xs font-bold tabular-nums w-6" style={{ color: "var(--color-on-surface)" }}>{r.key}</div>
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-surface-container)" }}>
            <div
              style={{
                height: "100%",
                width: `${Math.max(2, r.frac * 100)}%`,
                backgroundColor: r.color,
                borderRadius: 999,
              }}
            />
          </div>
          <div className="text-xs tabular-nums" style={{ color: "var(--color-on-surface-variant)", minWidth: 80, textAlign: "right" }}>
            {formatSec(r.frac * totalSec)} · {(r.frac * 100).toFixed(0)}%
          </div>
        </div>
      ))}
    </div>
  );
}

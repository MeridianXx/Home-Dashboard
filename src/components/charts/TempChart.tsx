"use client";

import useSWR from "swr";
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";
import { useChartTheme, useChartSize, useDeferredMount, ChartTooltip, ChartSkeleton, formatHour, formatHourShort, type ChartTheme } from "./ChartCard";

const fetcher = (u: string) => fetch(u).then(r => r.json());
type HistoryResp = { entities: Record<string, Array<{ t: string; v: number }>> };

// ─── Indoor: BT50 + per-room sensors ────────────────────────────────────────

const INDOOR_ENTITIES = [
  "sensor.nibe_inomhustemperatur_bt50",
  "sensor.vardagsrum_temperatur",
  "sensor.sovrum_temperatur",
  "sensor.elvira_temperatur",
];
const INDOOR_LABELS: Record<string, string> = {
  "sensor.nibe_inomhustemperatur_bt50": "Innetemperatur",
  "sensor.vardagsrum_temperatur": "Vardagsrum",
  "sensor.sovrum_temperatur": "Sovrum",
  "sensor.elvira_temperatur": "Elvira",
};
function indoorColors(t: ChartTheme) {
  return {
    "sensor.nibe_inomhustemperatur_bt50": t.primary,
    "sensor.vardagsrum_temperatur": t.secondary,
    "sensor.sovrum_temperatur": t.tertiary,
    "sensor.elvira_temperatur": t.error,
  } as Record<string, string>;
}

export function IndoorTempChart() {
  const mounted = useDeferredMount();
  const theme = useChartTheme();
  const { ref, width, height, stopSwipe } = useChartSize(180);
  const { data, isLoading } = useSWR<HistoryResp>(
    `/api/homeassistant/history?entities=${INDOOR_ENTITIES.join(",")}&hours=24`,
    fetcher,
    { refreshInterval: 300_000, revalidateOnFocus: false, dedupingInterval: 60_000 },
  );

  if (!mounted || isLoading || !data || !theme || !width) return <div ref={ref} {...stopSwipe} style={{ height: 180, width: "100%" }}><ChartSkeleton /></div>;

  // Merge all series by minute key
  const merged = mergeByTime(data.entities, INDOOR_ENTITIES);
  if (!merged.length) return <div ref={ref} {...stopSwipe} style={{ height: 180, width: "100%" }}><ChartSkeleton /></div>;

  const colors = indoorColors(theme);
  const present = INDOOR_ENTITIES.filter(id => data.entities[id]?.length);
  const [yMin, yMax] = tightDomain(merged, present);

  return (
    <div ref={ref} {...stopSwipe} style={{ width: "100%" }}>
      <Legend items={present.map(id => ({ label: INDOOR_LABELS[id], color: colors[id] }))} />
      <div style={{ height: height - 20 }}>
        <LineChart data={merged} width={width} height={height - 20} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <XAxis dataKey="t" tickFormatter={formatHourShort}
            tick={{ fill: theme.onSurfaceVariant, fontSize: 10 }} axisLine={false} tickLine={false}
            interval="preserveStartEnd" minTickGap={40} />
          <YAxis tick={{ fill: theme.onSurfaceVariant, fontSize: 10 }}
            axisLine={false} tickLine={false} unit="°" width={44}
            domain={[yMin, yMax]} />
          <Tooltip cursor={{ stroke: "var(--color-outline)", strokeWidth: 1 }}
            content={<ChartTooltip labelFormatter={formatHour} valueFormatter={(v) => `${v.toFixed(1)}°`} />} />
          {present.map((id, i) => (
            <Line key={id} type="basis" dataKey={id} name={INDOOR_LABELS[id]}
              stroke={colors[id]} strokeWidth={i === 0 ? 2 : 1.5}
              strokeDasharray={i === 0 ? undefined : undefined}
              dot={false} activeDot={{ r: 3, fill: colors[id] }} connectNulls />
          ))}
        </LineChart>
      </div>
    </div>
  );
}

// ─── Outdoor: BT1 + Växthus ─────────────────────────────────────────────────

const OUTDOOR_ENTITIES = [
  "sensor.nibe_utomhustemperatur_bt1",
  "sensor.vaxthus_temperatur",
];
const OUTDOOR_LABELS: Record<string, string> = {
  "sensor.nibe_utomhustemperatur_bt1": "Utomhus",
  "sensor.vaxthus_temperatur": "Växthus",
};
function outdoorColors(t: ChartTheme) {
  return {
    "sensor.nibe_utomhustemperatur_bt1": t.tertiary,
    "sensor.vaxthus_temperatur": t.secondary,
  } as Record<string, string>;
}

export function OutdoorTempChart() {
  const mounted = useDeferredMount();
  const theme = useChartTheme();
  const { ref, width, height, stopSwipe } = useChartSize(180);
  const { data, isLoading } = useSWR<HistoryResp>(
    `/api/homeassistant/history?entities=${OUTDOOR_ENTITIES.join(",")}&hours=24`,
    fetcher,
    { refreshInterval: 300_000, revalidateOnFocus: false, dedupingInterval: 60_000 },
  );

  if (!mounted || isLoading || !data || !theme || !width) return <div ref={ref} {...stopSwipe} style={{ height: 180, width: "100%" }}><ChartSkeleton /></div>;

  const merged = mergeByTime(data.entities, OUTDOOR_ENTITIES);
  if (!merged.length) return <div ref={ref} {...stopSwipe} style={{ height: 180, width: "100%" }}><ChartSkeleton /></div>;

  const colors = outdoorColors(theme);
  const present = OUTDOOR_ENTITIES.filter(id => data.entities[id]?.length);
  const [yMin, yMax] = tightDomain(merged, present);
  const hasNegative = yMin < 0;

  return (
    <div ref={ref} {...stopSwipe} style={{ width: "100%" }}>
      <Legend items={present.map(id => ({ label: OUTDOOR_LABELS[id], color: colors[id] }))} />
      <div style={{ height: height - 20 }}>
        <LineChart data={merged} width={width} height={height - 20} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <XAxis dataKey="t" tickFormatter={formatHourShort}
            tick={{ fill: theme.onSurfaceVariant, fontSize: 10 }} axisLine={false} tickLine={false}
            interval="preserveStartEnd" minTickGap={40} />
          <YAxis tick={{ fill: theme.onSurfaceVariant, fontSize: 10 }}
            axisLine={false} tickLine={false} unit="°" width={44}
            domain={[yMin, yMax]} />
          <Tooltip cursor={{ stroke: "var(--color-outline)", strokeWidth: 1 }}
            content={<ChartTooltip labelFormatter={formatHour} valueFormatter={(v) => `${v.toFixed(1)}°`} />} />
          {hasNegative && (
            <ReferenceLine y={0} stroke="var(--color-outline)" strokeDasharray="4 4" strokeWidth={1} />
          )}
          {present.map((id, i) => (
            <Line key={id} type="basis" dataKey={id} name={OUTDOOR_LABELS[id]}
              stroke={colors[id]} strokeWidth={i === 0 ? 2 : 1.5}
              dot={false} activeDot={{ r: 3, fill: colors[id] }} connectNulls />
          ))}
        </LineChart>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Merge multiple entity series into 15-minute buckets (averaged).
 *  Forward-fills missing values so tooltip always shows all series. */
function mergeByTime(entities: Record<string, Array<{ t: string; v: number }>>, ids: string[]) {
  const BUCKET_MS = 15 * 60_000;
  // Bucket key: floor timestamp to nearest 15 min
  const bucketKey = (iso: string) => {
    const ms = new Date(iso).getTime();
    return Math.floor(ms / BUCKET_MS) * BUCKET_MS;
  };

  // Collect values per bucket per entity
  const buckets = new Map<number, { t: string; sums: Record<string, number>; counts: Record<string, number> }>();

  for (const id of ids) {
    const series = entities[id];
    if (!series) continue;
    for (const p of series) {
      const bk = bucketKey(p.t);
      let bucket = buckets.get(bk);
      if (!bucket) {
        bucket = { t: new Date(bk).toISOString(), sums: {}, counts: {} };
        buckets.set(bk, bucket);
      }
      bucket.sums[id] = (bucket.sums[id] ?? 0) + p.v;
      bucket.counts[id] = (bucket.counts[id] ?? 0) + 1;
    }
  }

  // Average each bucket
  const sorted = Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([, b]) => {
      const row: Record<string, unknown> = { t: b.t };
      for (const id of ids) {
        if (b.counts[id]) row[id] = Math.round((b.sums[id] / b.counts[id]) * 10) / 10;
      }
      return row;
    });

  // Forward-fill: carry last known value for each entity
  const last: Record<string, number> = {};
  for (const row of sorted) {
    for (const id of ids) {
      if (row[id] != null) {
        last[id] = row[id] as number;
      } else if (last[id] != null) {
        row[id] = last[id];
      }
    }
  }

  return sorted;
}

/** Compute tight Y domain with 1° margin, rounded to whole degrees */
function tightDomain(data: Record<string, unknown>[], keys: string[]): [number, number] {
  let min = Infinity, max = -Infinity;
  for (const row of data) {
    for (const k of keys) {
      const v = row[k] as number | undefined;
      if (v != null) { if (v < min) min = v; if (v > max) max = v; }
    }
  }
  if (!isFinite(min)) return [0, 30];
  return [Math.floor(min - 1), Math.ceil(max + 1)];
}

/** Compact inline legend */
function Legend({ items }: { items: Array<{ label: string; color: string }> }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 12px", marginBottom: 4 }}>
      {items.map(({ label, color }) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 10, height: 3, borderRadius: 1.5, backgroundColor: color, flexShrink: 0 }} />
          <span style={{ fontSize: 10, fontWeight: 600, color: "var(--color-on-surface-variant)" }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

export default IndoorTempChart;

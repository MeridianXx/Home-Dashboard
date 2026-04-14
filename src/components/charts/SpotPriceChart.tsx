"use client";

import useSWR from "swr";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";
import { useChartTheme, useChartSize, useDeferredMount, ChartTooltip, ChartSkeleton, formatHour, formatHourShort } from "./ChartCard";

const ENTITY = "sensor.tibber_pulse_villa_bjorkdalen_elpris";
const fetcher = (u: string) => fetch(u).then(r => r.json());

type HistoryResp = { entities: Record<string, Array<{ t: string; v: number }>> };

export default function SpotPriceChart() {
  const mounted = useDeferredMount();
  const theme = useChartTheme();
  const { ref, width, height } = useChartSize();
  const { data, isLoading } = useSWR<HistoryResp>(
    `/api/homeassistant/history?entities=${ENTITY}&hours=24`,
    fetcher,
    { refreshInterval: 300_000, revalidateOnFocus: false, dedupingInterval: 60_000 },
  );

  if (!mounted || isLoading || !data || !theme || !width) return <div ref={ref} style={{ height: 200, width: "100%" }}><ChartSkeleton /></div>;

  const raw = data.entities[ENTITY];
  if (!raw?.length) return <div ref={ref} style={{ height: 200, width: "100%" }}><ChartSkeleton /></div>;

  // Convert SEK/kWh → öre
  const points = raw.map(p => ({ t: p.t, v: Math.round(p.v * 100 * 10) / 10 }));

  const avg = points.reduce((s, p) => s + p.v, 0) / points.length;

  return (
    <div ref={ref} style={{ height, width: "100%" }}>
      <BarChart data={points} width={width} height={height} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <XAxis
          dataKey="t"
          tickFormatter={formatHourShort}
          tick={{ fill: theme.onSurfaceVariant, fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={40}
        />
        <YAxis
          tick={{ fill: theme.onSurfaceVariant, fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          unit=" öre"
          width={55}
        />
        <Tooltip
          cursor={{ stroke: "var(--color-outline)", strokeWidth: 1 }}
          content={
            <ChartTooltip
              labelFormatter={formatHour}
              valueFormatter={(v) => v.toFixed(1)}
              unit="öre/kWh"
            />
          }
        />
        <ReferenceLine y={avg} stroke={theme.outline} strokeDasharray="4 4" strokeWidth={1} />
        <Bar dataKey="v" name="Elpris" radius={[3, 3, 0, 0]} maxBarSize={12} fill={theme.onSurfaceVariant} />
      </BarChart>
    </div>
  );
}

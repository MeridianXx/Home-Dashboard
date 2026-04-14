"use client";

import useSWR from "swr";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";
import { useChartTheme, useChartSize, useDeferredMount, ChartTooltip, ChartSkeleton, formatHour, formatHourShort } from "./ChartCard";

const ENTITY = "sensor.tibber_pulse_villa_bjorkdalen_effekt";
const fetcher = (u: string) => fetch(u).then(r => r.json());

type HistoryResp = { entities: Record<string, Array<{ t: string; v: number }>> };

export default function PowerChart({ avgPower }: { avgPower?: number }) {
  const mounted = useDeferredMount();
  const theme = useChartTheme();
  const { ref, width, height } = useChartSize();
  const { data, isLoading } = useSWR<HistoryResp>(
    `/api/homeassistant/history?entities=${ENTITY}&hours=24`,
    fetcher,
    { refreshInterval: 300_000, revalidateOnFocus: false, dedupingInterval: 60_000 },
  );

  if (!mounted || isLoading || !data || !theme || !width) return <div ref={ref} style={{ height: 200, width: "100%" }}><ChartSkeleton /></div>;

  const points = data.entities[ENTITY];
  if (!points?.length) return <div ref={ref} style={{ height: 200, width: "100%" }}><ChartSkeleton /></div>;

  const fmtW = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)} kW` : `${Math.round(v)} W`;

  return (
    <div ref={ref} style={{ height, width: "100%" }}>
      <AreaChart data={points} width={width} height={height} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id="powerFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={theme.secondary} stopOpacity={0.3} />
            <stop offset="100%" stopColor={theme.secondary} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="t"
          tickFormatter={formatHourShort}
          tick={{ fill: theme.onSurfaceVariant, fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={30}
        />
        <YAxis
          tick={{ fill: theme.onSurfaceVariant, fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`}
          width={36}
        />
        <Tooltip
          cursor={{ stroke: "var(--color-outline)", strokeWidth: 1 }}
          content={
            <ChartTooltip
              labelFormatter={formatHour}
              valueFormatter={fmtW}
            />
          }
        />
        {avgPower != null && avgPower > 0 && (
          <ReferenceLine y={avgPower} stroke={theme.outline} strokeDasharray="4 4" strokeWidth={1} />
        )}
        <Area
          type="basis"
          dataKey="v"
          name="Effekt"
          stroke={theme.secondary}
          strokeWidth={2}
          fill="url(#powerFill)"
          dot={false}
          activeDot={{ r: 3, fill: theme.secondary }}
        />
      </AreaChart>
    </div>
  );
}

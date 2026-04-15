"use client";

import useSWR from "swr";
import { LineChart, Line, Area, ComposedChart, XAxis, YAxis, Bar, ReferenceLine } from "recharts";
import { fetcher } from "@/lib/fetcher";
import { useChartSize, useDeferredMount, ChartSkeleton } from "@/components/charts/ChartCard";
import type { LoadResponse } from "@/app/api/fitness/load/route";

// ─── Fitness & Fatigue ───────────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        backgroundColor: "var(--color-surface-container-lowest)",
        boxShadow: "0px 8px 24px rgba(56,56,51,0.06)",
        border: "1px solid var(--color-card-border)",
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-4" style={{ color: "var(--color-on-surface-variant)" }}>
      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{icon}</span>
      {children}
    </h2>
  );
}

/** Vertikal stapel med "ghost"-bar bakom och tydligt värde ovanför. */
function VBar({ label, value, ghost, color }: { label: string; value: number; ghost: number; color: string }) {
  // Skalan är relativ till max(ctl,atl) för båda kort men säkerställ minsta höjd
  const max = Math.max(value, ghost, 30);
  const h = (value / max) * 140;
  const gh = (ghost / max) * 140;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-end justify-center gap-1 relative" style={{ height: 160 }}>
        <div className="flex flex-col items-center" style={{ justifyContent: "flex-end", height: "100%" }}>
          <div className="text-sm font-semibold tabular-nums" style={{ color: "var(--color-on-surface-variant)", marginBottom: 4 }}>
            {ghost}
          </div>
          <div
            aria-hidden
            style={{
              width: 14, height: gh, borderRadius: 7,
              backgroundColor: "var(--color-outline-variant)",
            }}
          />
        </div>
        <div className="flex flex-col items-center" style={{ justifyContent: "flex-end", height: "100%" }}>
          <div className="text-lg font-bold tabular-nums" style={{ color: "var(--color-on-surface)", marginBottom: 4 }}>
            {value}
          </div>
          <div
            aria-hidden
            style={{
              width: 14, height: h, borderRadius: 7,
              backgroundColor: color,
            }}
          />
        </div>
      </div>
      <div className="text-xs" style={{ color: "var(--color-on-surface-variant)" }}>{label}</div>
    </div>
  );
}

/** Ring-indikator för dagens TRIMPexp. Fyllnadsgrad skalad mot ATL. */
function TrimpRing({ trimp, atl }: { trimp: number; atl: number }) {
  const max = Math.max(atl * 1.5, 80);
  const pct = Math.min(1, trimp / max);
  const r = 52;
  const c = 2 * Math.PI * r;
  const dash = c * 0.75; // ¾-ring
  const filled = dash * pct;

  return (
    <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
      <svg width={140} height={140} style={{ transform: "rotate(135deg)" }}>
        <circle cx={70} cy={70} r={r} fill="none" stroke="var(--color-outline-variant)" strokeWidth={10}
          strokeDasharray={`${dash} ${c - dash}`} strokeLinecap="round" />
        <circle cx={70} cy={70} r={r} fill="none" stroke="#4f6bff" strokeWidth={10}
          strokeDasharray={`${filled} ${c - filled}`} strokeLinecap="round" />
      </svg>
      <div className="absolute flex flex-col items-center">
        <div className="text-3xl font-bold tabular-nums" style={{ color: "var(--color-on-surface)" }}>{trimp}</div>
        <div className="text-[10px] font-semibold" style={{ color: "var(--color-on-surface-variant)" }}>
          TRIMP<sup>exp</sup>
        </div>
      </div>
    </div>
  );
}

// ─── Historisk Fitness-graf ──────────────────────────────────────────────────
// Dashboardens översikt — 60 dagars CTL (blå), ATL (röd) och TSB (grön nedanför).
// Matchar Apple Fitness/TrainingPeaks-stil med tre värde-chips ovanför kurvan.

export function FitnessHistoryCard() {
  const { data, isLoading } = useSWR<LoadResponse>("/api/fitness/load", fetcher, {
    refreshInterval: 30 * 60 * 1000,
    revalidateOnFocus: false,
  });
  const mounted = useDeferredMount();
  const { ref, width, height, stopSwipe } = useChartSize(200);

  if (!data || isLoading || !mounted || !width) {
    return (
      <Card>
        <SectionTitle icon="show_chart">Fitness</SectionTitle>
        <div ref={ref} {...stopSwipe} style={{ height: 200, width: "100%" }}><ChartSkeleton /></div>
      </Card>
    );
  }

  // Max för Y-axeln — runda upp till närmaste 10
  const maxVal = Math.max(
    ...data.history.map((h) => Math.max(h.ctl, h.atl, h.trimp)),
    30,
  );
  const yMax = Math.ceil(maxVal / 10) * 10;
  const minTsb = Math.min(0, ...data.history.map((h) => h.tsb));
  const yMin = Math.floor(minTsb / 10) * 10;

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-on-surface-variant)" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>show_chart</span>
          Fitness
        </h2>
        <div className="flex items-center gap-3 text-xs tabular-nums">
          <ValueChip color="#4f6bff" label="Fitness (CTL)" value={data.ctl} />
          <ValueChip color="#e5484d" label="Fatigue (ATL)" value={data.atl} />
          <ValueChip color="#7fb8a3" label="Form (TSB)" value={data.tsb} />
        </div>
      </div>
      <div ref={ref} {...stopSwipe} style={{ width: "100%" }}>
        <ComposedChart data={data.history} width={width} height={height} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
          <defs>
            <linearGradient id="ctl-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f6bff" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#4f6bff" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="tsb-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7fb8a3" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#7fb8a3" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tickFormatter={(v) => new Date(v as string).toLocaleDateString("sv-SE", { day: "numeric", month: "short" })}
            tick={{ fill: "var(--color-on-surface-variant)", fontSize: 9 }}
            axisLine={false} tickLine={false}
            interval="preserveStartEnd" minTickGap={60}
          />
          <YAxis
            tick={{ fill: "var(--color-on-surface-variant)", fontSize: 9 }}
            axisLine={false} tickLine={false}
            width={32}
            domain={[yMin, yMax]}
          />
          <ReferenceLine y={0} stroke="var(--color-outline)" strokeDasharray="2 2" />
          <Bar dataKey="trimp" fill="#9aa0a6" fillOpacity={0.25} barSize={width > 500 ? 3 : 2} />
          <Area type="monotone" dataKey="ctl" stroke="#4f6bff" strokeWidth={1.8} fill="url(#ctl-fill)" dot={false} />
          <Line type="monotone" dataKey="atl" stroke="#e5484d" strokeWidth={1.6} dot={false} />
          <Area type="monotone" dataKey="tsb" stroke="#7fb8a3" strokeWidth={1.6} fill="url(#tsb-fill)" dot={false} />
        </ComposedChart>
      </div>
    </Card>
  );
}

function ValueChip({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex flex-col items-end">
      <div className="flex items-center gap-1">
        <span style={{ width: 7, height: 7, borderRadius: 99, backgroundColor: color }} />
        <span className="font-bold text-sm" style={{ color: "var(--color-on-surface)" }}>{value}</span>
      </div>
      <span className="text-[9px]" style={{ color: "var(--color-on-surface-variant)" }}>{label}</span>
    </div>
  );
}

// ─── Training Load Ratio (ACWR) ─────────────────────────────────────────────
// Gradientbalk där 0.8–1.3 är "sweet spot". Markör visar aktuell kvot.

export function TrainingLoadRatioCard() {
  const { data, isLoading } = useSWR<LoadResponse>("/api/fitness/load", fetcher, {
    refreshInterval: 30 * 60 * 1000,
    revalidateOnFocus: false,
  });

  if (isLoading || !data) {
    return <Card><SectionTitle icon="balance">Training Load Ratio</SectionTitle><div className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>Räknar kvot…</div></Card>;
  }

  // Skala 0–2 på balken (väldig utanför sweet spot vid ytterlägen)
  const minR = 0, maxR = 2;
  const clamped = Math.min(Math.max(data.tlr, minR), maxR);
  const pct = ((clamped - minR) / (maxR - minR)) * 100;

  const label =
    data.tlr < 0.8 ? "Detränar" :
    data.tlr < 1.3 ? "Sweet Spot" :
    data.tlr < 1.5 ? "Påfrestning" :
    "Skaderisk";
  const labelColor =
    data.tlr < 0.8 ? "#7faef0" :
    data.tlr < 1.3 ? "#7fb8a3" :
    data.tlr < 1.5 ? "#fab849" :
    "#e5484d";

  return (
    <Card>
      <SectionTitle icon="balance">Training Load Ratio</SectionTitle>
      <div className="flex items-center gap-4">
        <div className="text-3xl font-bold tabular-nums" style={{ color: "var(--color-on-surface)" }}>
          {data.tlr.toFixed(2).replace(".", ",")}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold mb-2" style={{ color: labelColor }}>{label}</div>
          <div
            style={{
              height: 10, borderRadius: 99, position: "relative",
              background: "linear-gradient(90deg, #7faef0 0%, #7faef0 40%, #7fb8a3 40%, #7fb8a3 65%, #fab849 65%, #fab849 75%, #e5484d 75%, #e5484d 100%)",
            }}
          >
            <span
              style={{
                position: "absolute", top: -3, left: `${pct}%`,
                width: 6, height: 16, borderRadius: 3, backgroundColor: "var(--color-on-surface)",
                transform: "translateX(-50%)",
                boxShadow: "0 0 0 2px var(--color-surface-container-lowest)",
              }}
              aria-label={`ACWR ${data.tlr.toFixed(2)}`}
            />
          </div>
        </div>
      </div>
      <div className="text-xs mt-3" style={{ color: "var(--color-on-surface-variant)" }}>
        ATL / CTL — balansen mellan akut och kronisk belastning.
      </div>
    </Card>
  );
}

// ─── Gamla F&F-kortet (staplar+ring) ─────────────────────────────────────────

export function FitnessFatigueCard() {
  const { data, isLoading } = useSWR<LoadResponse>("/api/fitness/load", fetcher, {
    refreshInterval: 30 * 60 * 1000,
    revalidateOnFocus: false,
  });

  return (
    <Card>
      <SectionTitle icon="monitor_heart">Fitness &amp; Fatigue</SectionTitle>
      {isLoading || !data ? (
        <div className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>Räknar belastning…</div>
      ) : (
        <div className="flex items-center justify-around gap-4 flex-wrap">
          <VBar label="Fitness (CTL)" value={data.ctl} ghost={data.ctlYesterday} color="#4f6bff" />
          <TrimpRing trimp={data.trimpExp} atl={data.atl} />
          <VBar label="Fatigue (ATL)" value={data.atl} ghost={data.atlYesterday} color="#e5484d" />
        </div>
      )}
    </Card>
  );
}

// ─── Training Load Focus ─────────────────────────────────────────────────────

function FocusRow({ label, trimp, pct, color }: { label: string; trimp: number; pct: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-xs font-semibold tabular-nums" style={{ color: "var(--color-on-surface-variant)", width: 28, textAlign: "right" }}>
        {trimp}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between mb-1">
          <div className="text-sm font-semibold" style={{ color: "var(--color-on-surface)" }}>{label}</div>
          <div className="text-sm font-semibold tabular-nums" style={{ color: "var(--color-on-surface)" }}>
            {Math.round(pct * 100)} %
          </div>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-surface-container)" }}>
          <div style={{ height: "100%", width: `${Math.max(2, pct * 100)}%`, backgroundColor: color, borderRadius: 999 }} />
        </div>
      </div>
    </div>
  );
}

export function TrainingLoadFocusCard() {
  const { data, isLoading } = useSWR<LoadResponse>("/api/fitness/load", fetcher, {
    refreshInterval: 30 * 60 * 1000,
    revalidateOnFocus: false,
  });

  const periodLabel = data
    ? (() => {
        const s = new Date(data.focusPeriod.start);
        const e = new Date(data.focusPeriod.end);
        const fmt = (d: Date) => d.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
        return `${fmt(s)} – ${fmt(e)} ${e.getFullYear()}`;
      })()
    : "";

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-on-surface-variant)" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>insights</span>
          Training Load Focus
        </h2>
        {periodLabel && (
          <div className="text-[11px]" style={{ color: "var(--color-on-surface-variant)" }}>{periodLabel}</div>
        )}
      </div>
      {isLoading || !data ? (
        <div className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>Räknar zonfördelning…</div>
      ) : (
        <div className="space-y-3">
          <FocusRow label="Anaerob"      trimp={data.focusTRIMP.anaerobic}   pct={data.focus.anaerobic}   color="#c84dcc" />
          <FocusRow label="Högaerob"     trimp={data.focusTRIMP.highAerobic} pct={data.focus.highAerobic} color="#fab849" />
          <FocusRow label="Lågaerob"     trimp={data.focusTRIMP.lowAerobic}  pct={data.focus.lowAerobic}  color="#7fb8a3" />
          <div className="text-[11px] mt-3" style={{ color: "var(--color-on-surface-variant)" }}>
            Metod: % av maxpuls · senaste 42 dagarna
          </div>
        </div>
      )}
    </Card>
  );
}

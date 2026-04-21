"use client";

// ─── Fitness · Readiness ─────────────────────────────────────────────────────
// Dagens beredskapspoäng som ring + komponentuppdelning (HRV/Sömn/TSB).
// Logik ligger i /api/fitness/readiness — detta är bara UI.

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { ReadinessResponse } from "@/app/api/fitness/readiness/route";

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

function Ring({ score, color }: { score: number; color: string }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const filled = c * (Math.min(100, Math.max(0, score)) / 100);
  return (
    <div className="relative flex items-center justify-center" style={{ width: 132, height: 132, flexShrink: 0 }}>
      <svg width={132} height={132} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={66} cy={66} r={r} fill="none" stroke="var(--color-outline-variant)" strokeWidth={10} />
        <circle
          cx={66} cy={66} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={`${filled} ${c - filled}`} strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <div className="text-4xl font-bold tabular-nums" style={{ color: "var(--color-on-surface)" }}>{score}</div>
        <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-on-surface-variant)" }}>
          av 100
        </div>
      </div>
    </div>
  );
}

function Row({ label, score, detail }: { label: string; score: number; detail: string }) {
  const color = score >= 75 ? "#7fb8a3" : score >= 55 ? "#a7c4ff" : score >= 40 ? "#fab849" : "#e5484d";
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--color-on-surface)" }}>
          <span style={{ width: 7, height: 7, borderRadius: 99, backgroundColor: color }} />
          <span className="font-semibold">{label}</span>
          <span className="text-xs" style={{ color: "var(--color-on-surface-variant)" }}>· {detail}</span>
        </div>
        <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--color-on-surface)" }}>{score}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-surface-container)" }}>
        <div style={{ height: "100%", width: `${Math.max(2, score)}%`, backgroundColor: color, borderRadius: 999 }} />
      </div>
    </div>
  );
}

export function ReadinessCard() {
  const { data, isLoading } = useSWR<ReadinessResponse>("/api/fitness/readiness", fetcher, {
    refreshInterval: 30 * 60 * 1000,
    revalidateOnFocus: false,
  });

  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-on-surface-variant)" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>bolt</span>
          Dagsform
        </h2>
      </div>
      <p className="text-xs mb-4" style={{ color: "var(--color-on-surface-variant)", lineHeight: 1.5 }}>
        Vägledning för hur hårt du kan köra idag. Väger din HRV mot ditt eget 7-dagars-snitt, nattens sömn och aktuell form (TSB). 75+ betyder full gas; under 40 betyder ta det lugnare.
      </p>
      {isLoading || !data ? (
        <div className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>Räknar beredskap…</div>
      ) : (
        <div className="flex items-start gap-5 flex-wrap">
          <div className="flex flex-col items-center gap-2">
            <Ring score={data.score} color={data.color} />
            <div className="text-sm font-bold" style={{ color: data.color }}>{data.label}</div>
          </div>
          <div className="flex-1 min-w-[200px] space-y-3">
            <Row
              label="HRV"
              score={data.components.hrv.score}
              detail={
                data.components.hrv.value != null && data.components.hrv.avg7 != null
                  ? `${data.components.hrv.value}/${data.components.hrv.avg7} ms`
                  : "saknas"
              }
            />
            <Row
              label="Sömn"
              score={data.components.sleep.score}
              detail={
                data.components.sleep.hours != null
                  ? `${data.components.sleep.hours.toFixed(1).replace(".", ",")} h`
                  : "saknas"
              }
            />
            <Row
              label="Form (TSB)"
              score={data.components.tsb.score}
              detail={`${data.components.tsb.value > 0 ? "+" : ""}${data.components.tsb.value}`}
            />
          </div>
        </div>
      )}
    </Card>
  );
}

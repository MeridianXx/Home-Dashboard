"use client";

import type { Workout } from "@/lib/fitness/types";
import type { FitSummary } from "@/lib/fitness/fit-parser";

interface StatDef {
  label: string;
  value: string;
  unit?: string;
  /** CSS-färg (direkt) för värdet — använder befintliga palett-toner. */
  color: string;
}

function durationString(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return "–";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function paceString(distanceM: number, timeSec: number): string {
  if (distanceM <= 0 || timeSec <= 0) return "–";
  const secPerKm = timeSec / (distanceM / 1000);
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60).toString().padStart(2, "0");
  return `${m}'${s}"`;
}

function rpeLabel(rpe: number): string {
  const labels: Record<number, string> = {
    1: "Lätt", 2: "Ganska lätt", 3: "Måttlig", 4: "Lite jobbig",
    5: "Jobbig", 6: "Ganska svår", 7: "Svår", 8: "Mycket svår",
    9: "Extremt svår", 10: "Maximal",
  };
  return labels[Math.round(rpe)] ?? "–";
}

/**
 * Färgskala baserad på upplevd ansträngning (RPE 1–10):
 *   1–3 Lätt     → grön
 *   4–6 Måttlig  → blå
 *   7–8 Svår     → lila
 *   9–10 Extrem  → röd
 */
function rpeColor(rpe: number): string {
  const r = Math.round(rpe);
  if (r <= 3) return "#7fb8a3";                 // grön
  if (r <= 6) return "var(--color-primary)";    // blå (indigo)
  if (r <= 8) return "#c84dcc";                 // lila
  return "#e5484d";                             // röd
}

/** Signal-staplar 1–5 baserat på RPE 1–10. */
function RpeBars({ rpe, color }: { rpe: number; color: string }) {
  const level = Math.ceil(Math.min(Math.max(rpe, 1), 10) / 2);
  return (
    <div className="flex items-end gap-0.5" aria-label={`RPE ${rpe} av 10`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          style={{
            width: 4,
            height: 4 + i * 3,
            borderRadius: 1,
            backgroundColor: i <= level ? color : "var(--color-outline-variant)",
          }}
        />
      ))}
    </div>
  );
}

/**
 * Apple Fitness-inspirerad summary: stor LABEL-VÄRDE-rutor, färg på värden per metrik.
 * Färger följer dashboard-paletten:
 *   tid       → amber  (#fab849)
 *   distans   → primary
 *   kcal      → rött
 *   kraft     → grön
 *   kadens    → indigo
 *   tempo     → grön
 *   puls      → rött
 */
export function PassSummary({ workout, fitSummary }: { workout: Workout | null; fitSummary?: FitSummary }) {
  const distanceM = workout?.distanceM ?? fitSummary?.distanceM ?? 0;
  const totalSec = workout?.totalTimeSec ?? fitSummary?.totalTimeSec ?? 0;
  const rows: StatDef[] = [];

  // Radordning enligt designspec:
  //   1: Träningstid (amber)       | Distans (indigo)
  //   2: Aktiva kalorier (röd)     | Snittpuls (röd)
  //   3: Höjdökning (grön)         | Snittkraft (grön)
  //   4: Snittkadens (indigo)      | Snittakt (indigo)
  //   5: Maxpuls (röd)             | TRIMP (indigo)
  //   6: Ansträngning (egen rad längst ner)

  // Rad 1
  if (totalSec > 0) {
    rows.push({ label: "Träningstid", value: durationString(totalSec), color: "#fab849" });
  }
  if (distanceM > 0) {
    rows.push({ label: "Distans", value: (distanceM / 1000).toFixed(2), unit: "km", color: "var(--color-primary)" });
  }

  // Rad 2
  if (workout?.activeCalories != null && workout.activeCalories > 0) {
    rows.push({ label: "Aktiva kalorier", value: Math.round(workout.activeCalories).toString(), unit: "kcal", color: "#e5484d" });
  }
  if (workout?.avgHR != null && workout.avgHR > 0) {
    rows.push({ label: "Snittpuls", value: Math.round(workout.avgHR).toString(), unit: "bpm", color: "#e5484d" });
  }

  // Rad 3 — Höjdökning visas alltid; "–" om data saknas (0 m betyder plant pass)
  const elev = workout?.elevationGainM ?? fitSummary?.elevationGainM ?? null;
  rows.push({
    label: "Höjdökning",
    value: elev == null ? "–" : Math.round(elev).toString(),
    unit: elev == null ? undefined : "m",
    color: "#7fb8a3",
  });
  const power = workout?.avgPower ?? fitSummary?.avgPower;
  if (power != null && power > 0) {
    rows.push({ label: "Snittkraft", value: Math.round(power).toString(), unit: "W", color: "#7fb8a3" });
  }

  // Rad 4
  const cadence = workout?.avgCadence ?? fitSummary?.avgCadence;
  if (cadence != null && cadence > 0) {
    rows.push({ label: "Snittkadens", value: Math.round(cadence).toString(), unit: "SPM", color: "var(--color-primary)" });
  }
  if (distanceM > 0 && totalSec > 0) {
    rows.push({ label: "Snittakt", value: paceString(distanceM, totalSec), unit: "/km", color: "var(--color-primary)" });
  }

  // Rad 5
  if (workout?.maxHR != null && workout.maxHR > 0) {
    rows.push({ label: "Maxpuls", value: Math.round(workout.maxHR).toString(), unit: "bpm", color: "#e5484d" });
  }
  if (workout?.trimp != null && workout.trimp > 0) {
    rows.push({ label: "TRIMP", value: Math.round(workout.trimp).toString(), color: "var(--color-primary)" });
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: "var(--color-surface-container-lowest)",
        border: "1px solid var(--color-card-border)",
        boxShadow: "0px 8px 24px rgba(56,56,51,0.06)",
      }}
    >
      <div className="grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
        {rows.map((s, i) => {
          const col = i % 2;
          const row = Math.floor(i / 2);
          return (
            <div
              key={s.label}
              className="px-4 py-2.5"
              style={{
                borderTop: row === 0 ? "none" : "1px solid var(--color-outline-variant)",
                borderLeft: col === 1 ? "1px solid var(--color-outline-variant)" : "none",
              }}
            >
              <div className="text-[11px] font-semibold leading-tight" style={{ color: "var(--color-on-surface-variant)" }}>
                {s.label}
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-bold tabular-nums leading-none" style={{ color: s.color }}>
                  {s.value}
                </span>
                {s.unit && (
                  <span
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: s.color, opacity: 0.75 }}
                  >
                    {s.unit}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {workout?.rpe != null && workout.rpe > 0 && (() => {
        const color = rpeColor(workout.rpe);
        return (
          <div
            className="flex items-center justify-between px-4 py-2.5"
            style={{ borderTop: "1px solid var(--color-outline-variant)" }}
          >
            <div>
              <div className="text-[11px] font-semibold leading-tight" style={{ color: "var(--color-on-surface-variant)" }}>
                Ansträngning
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="text-xs font-bold tabular-nums"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 22, height: 22, borderRadius: 999,
                    border: `1.5px solid ${color}`,
                    color,
                    lineHeight: 1,
                  }}
                >
                  {Math.round(workout.rpe)}
                </span>
                <span className="text-base font-semibold leading-none" style={{ color }}>
                  {rpeLabel(workout.rpe)}
                </span>
              </div>
            </div>
            <RpeBars rpe={workout.rpe} color={color} />
          </div>
        );
      })()}
    </div>
  );
}

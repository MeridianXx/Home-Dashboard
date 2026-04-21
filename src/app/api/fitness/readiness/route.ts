// ─── Fitness · Readiness ─────────────────────────────────────────────────────
// Dagens beredskapspoäng (1–100) baserat på:
//   • HRV-avvikelse mot 7-dagars-medel (±20 % span)
//   • Senaste nattens sömn (≥ 7 h ger full poäng, under straffas linjärt)
//   • TSB (CTL − ATL) som bonus/minus — positivt TSB = utvilad
// Alla tre komponenter väger 1/3 av slutpoängen.

import { NextResponse } from "next/server";
import { getLatestHealthMetricsXlsx, getLatestWorkoutsXlsx } from "@/lib/fitness/drive";
import { parseAllWorkouts, parseHealthSeries } from "@/lib/fitness/parser";
import type { Workout } from "@/lib/fitness/types";

export const dynamic = "force-dynamic";

export interface ReadinessResponse {
  /** 1–100. 50 är "neutral". */
  score: number;
  /** Kort svensk etikett: Återhämtad / OK / Lite slö / Trött */
  label: string;
  /** Hex-färg matchande etiketten */
  color: string;
  components: {
    hrv: { score: number; value: number | null; avg7: number | null };
    sleep: { score: number; hours: number | null };
    tsb: { score: number; value: number };
  };
  updatedAt: string;
}

const ALPHA_ATL = 2 / (7 + 1);
const ALPHA_CTL = 2 / (42 + 1);

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function computeTsb(workouts: Workout[]): number {
  const byDay = new Map<string, number>();
  for (const w of workouts) {
    if (typeof w.trimp !== "number" || w.trimp <= 0) continue;
    byDay.set(w.date, (byDay.get(w.date) ?? 0) + w.trimp);
  }
  let ctl = 0, atl = 0;
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - 90);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const t = byDay.get(isoDate(d)) ?? 0;
    ctl = ctl + ALPHA_CTL * (t - ctl);
    atl = atl + ALPHA_ATL * (t - atl);
  }
  return ctl - atl;
}

function labelFor(score: number): { label: string; color: string } {
  if (score >= 75) return { label: "Återhämtad", color: "#7fb8a3" };
  if (score >= 55) return { label: "OK", color: "#a7c4ff" };
  if (score >= 40) return { label: "Lite slö", color: "#fab849" };
  return { label: "Trött", color: "#e5484d" };
}

export async function GET(req: Request) {
  const skipCache = new URL(req.url).searchParams.get("refresh") === "1";
  try {
    const [healthFile, workoutFile] = await Promise.all([
      getLatestHealthMetricsXlsx({ skipCache }),
      getLatestWorkoutsXlsx({ skipCache }),
    ]);

    const series = healthFile
      ? parseHealthSeries(healthFile.buffer, 30)
      : { restingHR: [], vo2Max: [], hrv: [], sleep: [] };

    // ── HRV-komponent ──
    const hrvSeries = series.hrv;
    const latestHrv = hrvSeries.length > 0 ? hrvSeries[hrvSeries.length - 1].value : null;
    const last7 = hrvSeries.slice(-8, -1); // föregående 7 dagar exkl senaste
    const avg7 = last7.length > 0
      ? last7.reduce((s, p) => s + p.value, 0) / last7.length
      : null;
    let hrvScore = 50;
    if (latestHrv != null && avg7 != null && avg7 > 0) {
      // ±20 % avvikelse → ±50 poäng (clampa till 0–100)
      const pct = (latestHrv - avg7) / avg7;
      hrvScore = Math.round(50 + (pct / 0.2) * 50);
      hrvScore = Math.max(0, Math.min(100, hrvScore));
    }

    // ── Sömn-komponent ──
    const sleepSeries = series.sleep;
    const latestSleep = sleepSeries.length > 0 ? sleepSeries[sleepSeries.length - 1] : null;
    const asleepH = latestSleep?.asleepH ?? null;
    let sleepScore = 50;
    if (asleepH != null) {
      // 7 h = 100, 5 h = 30, 8 h+ = 100, interpolera
      if (asleepH >= 7) sleepScore = 100;
      else if (asleepH <= 5) sleepScore = 30;
      else sleepScore = Math.round(30 + ((asleepH - 5) / 2) * 70);
    }

    // ── TSB-komponent ──
    const tsb = workoutFile ? computeTsb(parseAllWorkouts(workoutFile.buffer)) : 0;
    // TSB +10 = 100, -20 = 0, 0 = 65
    const tsbScore = Math.max(0, Math.min(100, Math.round(65 + tsb * 3.5)));

    const score = Math.round((hrvScore + sleepScore + tsbScore) / 3);
    const { label, color } = labelFor(score);

    const body: ReadinessResponse = {
      score,
      label,
      color,
      components: {
        hrv: { score: hrvScore, value: latestHrv, avg7: avg7 != null ? Math.round(avg7) : null },
        sleep: { score: sleepScore, hours: asleepH != null ? Math.round(asleepH * 10) / 10 : null },
        tsb: { score: tsbScore, value: Math.round(tsb * 10) / 10 },
      },
      updatedAt: new Date().toISOString(),
    };
    return NextResponse.json(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

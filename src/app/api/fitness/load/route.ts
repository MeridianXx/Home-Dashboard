import { NextResponse } from "next/server";
import { getLatestWorkoutsXlsx } from "@/lib/fitness/drive";
import { parseAllWorkouts } from "@/lib/fitness/parser";
import type { Workout } from "@/lib/fitness/types";

export const dynamic = "force-dynamic";

/**
 * Fitness/Fatigue/Form enligt Coggan's PMC-modell:
 *   ATL = 7-dagars EMA av TRIMP      (α = 2/(7+1)  ≈ 0.25)
 *   CTL = 42-dagars EMA av TRIMP     (α = 2/(42+1) ≈ 0.0465)
 *   TSB = CTL − ATL                  (form/beredskap)
 * Vi itererar dagligen från -90 dagar för att EMA:et ska hinna stabilisera sig.
 */
const ALPHA_ATL = 2 / (7 + 1);
const ALPHA_CTL = 2 / (42 + 1);
const WARMUP_DAYS = 90;

export interface LoadResponse {
  ctl: number;
  atl: number;
  tsb: number;
  /** Dagens summerade TRIMP (från alla pass samma dag). */
  trimpExp: number;
  /** Gårdagens värde — används som "ghost"-stapel i UI */
  ctlYesterday: number;
  atlYesterday: number;
  /** ACWR = ATL / CTL. <0.8 detränad, 0.8–1.3 sweet spot, >1.5 skaderisk */
  tlr: number;
  /** Senaste 60 dagarnas CTL/ATL/TSB + daglig TRIMP. */
  history: Array<{ date: string; ctl: number; atl: number; tsb: number; trimp: number }>;
  /** Fördelning av senaste 42 dagarnas TRIMP per intensitetsfokus */
  focus: {
    anaerobic: number;      // 0-1
    highAerobic: number;
    lowAerobic: number;
  };
  focusTRIMP: {
    anaerobic: number;      // absolut TRIMP (avrundat)
    highAerobic: number;
    lowAerobic: number;
  };
  focusPeriod: { start: string; end: string };
  updatedAt: string;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function sumTrimpByDay(workouts: Workout[]): Map<string, number> {
  const byDay = new Map<string, number>();
  for (const w of workouts) {
    if (typeof w.trimp !== "number" || w.trimp <= 0) continue;
    byDay.set(w.date, (byDay.get(w.date) ?? 0) + w.trimp);
  }
  return byDay;
}

/**
 * Kör EMA-iterationen. Returnerar { ctl, atl } för `targetDate` och
 * { ctl, atl } för dagen innan.
 */
function computePmc(byDay: Map<string, number>, today: Date): {
  ctlToday: number; atlToday: number; ctlYesterday: number; atlYesterday: number;
  history: LoadResponse["history"];
} {
  let ctl = 0, atl = 0;
  let ctlPrev = 0, atlPrev = 0;
  const end = new Date(today);
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - WARMUP_DAYS);
  const historyStart = new Date(end);
  historyStart.setDate(historyStart.getDate() - 60);
  const history: LoadResponse["history"] = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const trimp = byDay.get(isoDate(d)) ?? 0;
    ctlPrev = ctl;
    atlPrev = atl;
    ctl = ctl + ALPHA_CTL * (trimp - ctl);
    atl = atl + ALPHA_ATL * (trimp - atl);
    if (d >= historyStart) {
      history.push({
        date: isoDate(d),
        ctl: Math.round(ctl * 10) / 10,
        atl: Math.round(atl * 10) / 10,
        tsb: Math.round((ctl - atl) * 10) / 10,
        trimp: Math.round(trimp),
      });
    }
  }
  return { ctlToday: ctl, atlToday: atl, ctlYesterday: ctlPrev, atlYesterday: atlPrev, history };
}

function computeFocus(workouts: Workout[], today: Date): LoadResponse["focusTRIMP"] {
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - 42);
  let anaerobic = 0, highAerobic = 0, lowAerobic = 0;
  for (const w of workouts) {
    if (new Date(w.date) < cutoff || typeof w.trimp !== "number") continue;
    const trimp = w.trimp;
    anaerobic   += trimp * (w.hrz5 ?? 0);
    highAerobic += trimp * ((w.hrz3 ?? 0) + (w.hrz4 ?? 0));
    lowAerobic  += trimp * ((w.hrz1 ?? 0) + (w.hrz2 ?? 0));
  }
  return {
    anaerobic: Math.round(anaerobic),
    highAerobic: Math.round(highAerobic),
    lowAerobic: Math.round(lowAerobic),
  };
}

export async function GET() {
  try {
    const file = await getLatestWorkoutsXlsx();
    if (!file) return NextResponse.json({ error: "Ingen Workouts-fil i Drive" }, { status: 404 });

    const workouts = parseAllWorkouts(file.buffer);
    const today = new Date();
    const byDay = sumTrimpByDay(workouts);
    const { ctlToday, atlToday, ctlYesterday, atlYesterday, history } = computePmc(byDay, today);
    const todayIso = isoDate(today);
    const trimpExp = byDay.get(todayIso) ?? 0;

    const focusTRIMP = computeFocus(workouts, today);
    const focusTotal = focusTRIMP.anaerobic + focusTRIMP.highAerobic + focusTRIMP.lowAerobic;
    const focusStart = new Date(today); focusStart.setDate(focusStart.getDate() - 42);

    const body: LoadResponse = {
      ctl: Math.round(ctlToday),
      atl: Math.round(atlToday),
      tsb: Math.round(ctlToday - atlToday),
      trimpExp: Math.round(trimpExp),
      ctlYesterday: Math.round(ctlYesterday),
      atlYesterday: Math.round(atlYesterday),
      tlr: ctlToday > 0 ? Math.round((atlToday / ctlToday) * 100) / 100 : 0,
      history,
      focus: focusTotal > 0 ? {
        anaerobic: focusTRIMP.anaerobic / focusTotal,
        highAerobic: focusTRIMP.highAerobic / focusTotal,
        lowAerobic: focusTRIMP.lowAerobic / focusTotal,
      } : { anaerobic: 0, highAerobic: 0, lowAerobic: 0 },
      focusTRIMP,
      focusPeriod: { start: isoDate(focusStart), end: todayIso },
      updatedAt: new Date().toISOString(),
    };
    return NextResponse.json(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

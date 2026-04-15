"use client";

import { use, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import ErrorBanner from "@/components/ErrorBanner";
import { useFitnessProfile } from "@/lib/fitness/profile";
import { paceString, durationString } from "@/lib/fitness/parser";
import type { WorkoutsResponse, Workout, PlansResponse, PlannedWorkout } from "@/lib/fitness/types";
import type { FitResponse } from "@/app/api/fitness/fit/route";
import { HRSeriesChart, ElevationChart, ZoneDistribution, LapsList } from "@/components/fitness/PassCharts";
import { PassSummary } from "@/components/fitness/PassSummary";
import { parseSlug } from "@/lib/fitness/slug";

// Leaflet måste laddas client-side — SSR:ar inte
const TrackMap = dynamic(() => import("@/components/fitness/TrackMap"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 260,
        borderRadius: 16,
        backgroundColor: "var(--color-surface-container)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--color-on-surface-variant)",
        fontSize: 13,
      }}
    >
      Laddar karta…
    </div>
  ),
});

// ─── Hjälpare ────────────────────────────────────────────────────────────────

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl p-5 ${className}`}
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

function SectionTitle({ icon, children, right }: { icon: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-on-surface-variant)" }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{icon}</span>
        {children}
      </h2>
      {right}
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg px-3 py-2" style={{ backgroundColor: "var(--color-surface-container)" }}>
      <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-on-surface-variant)" }}>{label}</div>
      <div className="text-sm font-medium mt-0.5 tabular-nums" style={{ color: "var(--color-on-surface)" }}>{value}</div>
    </div>
  );
}

/**
 * Apple Watch efter-pass-skattning (Borg CR10, svenska etiketter).
 * Plockas från HealthFits `RPE`-kolumn när användaren har fyllt i känsla.
 */
function rpeLabel(rpe: number): string {
  const labels: Record<number, string> = {
    1: "Lätt", 2: "Ganska lätt", 3: "Måttlig", 4: "Lite jobbig",
    5: "Jobbig", 6: "Ganska svår", 7: "Svår", 8: "Mycket svår",
    9: "Extremt svår", 10: "Maximal",
  };
  return labels[Math.round(rpe)] ?? "–";
}

function typeLabel(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("outdoor running")) return "Löpning";
  if (t.includes("indoor running") || t.includes("treadmill")) return "Löpning (inne)";
  if (t.includes("walk")) return "Promenad";
  if (t.includes("cycl") || t.includes("bike")) return "Cykling";
  if (t.includes("functional strength") || t.includes("traditional strength")) return "Styrketräning";
  if (t.includes("core")) return "Core";
  if (t.includes("swim")) return "Simning";
  if (t.includes("ski")) return "Skidåkning";
  return type;
}

// ─── Sida ────────────────────────────────────────────────────────────────────

export default function PassDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const parsed = useMemo(() => parseSlug(slug), [slug]);

  const { profile } = useFitnessProfile();

  // Hämta passhistoriken så vi kan hitta rätt xlsx-rad för detta pass
  const { data: workoutsData } = useSWR<WorkoutsResponse>("/api/fitness/workouts?limit=200", fetcher, {
    revalidateOnFocus: false,
  });
  const { data: plansData } = useSWR<PlansResponse>("/api/fitness/plans", fetcher, {
    revalidateOnFocus: false,
  });

  const workout = useMemo<Workout | null>(() => {
    if (!parsed || !workoutsData?.workouts) return null;
    const match = workoutsData.workouts.find(
      (w) => w.date === parsed.date && (w.time ?? "").replace(":", "") === parsed.time.replace(":", ""),
    );
    return match ?? null;
  }, [parsed, workoutsData]);

  // Matcha mot planerat pass (samma datum)
  const plannedMatch = useMemo<PlannedWorkout | null>(() => {
    if (!parsed || !plansData?.plans) return null;
    return plansData.plans.find((p) => p.datum === parsed.date) ?? null;
  }, [parsed, plansData]);

  const fitUrl = parsed
    ? `/api/fitness/fit?date=${parsed.date}&time=${encodeURIComponent(parsed.time)}&type=${encodeURIComponent(parsed.type)}`
    : null;
  const { data: fitData, error: fitError, isLoading: fitLoading, mutate: mutateFit } = useSWR<FitResponse>(
    fitUrl,
    fetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );

  if (!parsed) {
    return (
      <div className="space-y-4">
        <BackLink />
        <Card>
          <div className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
            Ogiltigt pass-id: <code>{slug}</code>
          </div>
        </Card>
      </div>
    );
  }

  const distanceKm = workout && workout.distanceM > 0 ? workout.distanceM / 1000 : (fitData?.summary.distanceM ?? 0) / 1000;
  const totalSec = workout?.totalTimeSec ?? fitData?.summary.totalTimeSec ?? 0;
  const hrz = workout ? {
    hrz0: workout.hrz0, hrz1: workout.hrz1, hrz2: workout.hrz2,
    hrz3: workout.hrz3, hrz4: workout.hrz4, hrz5: workout.hrz5,
  } : null;

  return (
    <div className="space-y-4">
      <BackLink />

      <div>
        <h1 className="text-2xl font-extrabold tracking-tight font-headline" style={{ color: "var(--color-on-surface)" }}>
          {distanceKm > 0 ? `${distanceKm.toFixed(2)} km ${typeLabel(parsed.type)}` : typeLabel(parsed.type)}
        </h1>
        <p className="text-sm font-medium mt-1 tabular-nums" style={{ color: "var(--color-on-surface-variant)" }}>
          {new Date(parsed.date).toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          {" · "}
          {parsed.time}
        </p>
      </div>

      {/* Träningsdetaljer — Apple Fitness-stil */}
      <PassSummary workout={workout} fitSummary={fitData?.summary} />

      {/* Zondistribution direkt under passdetaljer */}
      {hrz && (
        <Card>
          <SectionTitle icon="speed">Zondistribution</SectionTitle>
          <ZoneDistribution hrz={hrz} totalSec={totalSec} />
        </Card>
      )}

      {/* Matchat planerat pass */}
      {plannedMatch && (
        <Card>
          <SectionTitle icon="event_available">Planerat pass</SectionTitle>
          <div className="text-base font-semibold" style={{ color: "var(--color-on-surface)" }}>
            {plannedMatch.passnamn}
          </div>
          {plannedMatch.syfte && (
            <div className="text-sm mt-1" style={{ color: "var(--color-on-surface-variant)" }}>
              {plannedMatch.syfte}
            </div>
          )}
          <div className="grid gap-2 mt-3" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
            {plannedMatch.tid && <KV label="Plan-tid" value={plannedMatch.tid} />}
            {plannedMatch.tempo && <KV label="Plan-tempo" value={plannedMatch.tempo} />}
            {plannedMatch.pulsintervall && <KV label="Plan-puls" value={plannedMatch.pulsintervall} />}
            {plannedMatch.underlag && <KV label="Underlag" value={plannedMatch.underlag} />}
          </div>
        </Card>
      )}

      {/* GPS-karta */}
      {fitData?.summary.bounds && (
        <Card>
          <SectionTitle icon="map">Spår</SectionTitle>
          <TrackMap track={fitData.track} bounds={fitData.summary.bounds} zones={profile.zones} />
        </Card>
      )}

      {/* Elevationsprofil */}
      {fitData && fitData.track.some((p) => typeof p.alt === "number") && (
        <Card>
          <SectionTitle icon="terrain">Elevationsprofil</SectionTitle>
          <ElevationChart track={fitData.track} />
        </Card>
      )}

      {/* HR-tidsserie */}
      {fitData && fitData.track.some((p) => typeof p.hr === "number") && (
        <Card>
          <SectionTitle icon="monitor_heart">Puls över tid</SectionTitle>
          <HRSeriesChart track={fitData.track} zones={profile.zones} />
        </Card>
      )}

      {/* Laps / intervaller */}
      {fitData && fitData.laps.length > 1 && (
        <Card>
          <SectionTitle icon="straighten">Intervaller</SectionTitle>
          <LapsList laps={fitData.laps} zones={profile.zones} />
        </Card>
      )}

      {/* FIT-status */}
      {fitLoading && (
        <Card>
          <div className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>Läser FIT-fil…</div>
        </Card>
      )}
      {fitError && (
        <Card>
          <ErrorBanner onRetry={() => mutateFit()} message="Hittade ingen FIT-fil för det här passet." />
        </Card>
      )}
      {fitData?.sourceFile && (
        <div className="text-xs text-center" style={{ color: "var(--color-outline)" }}>
          FIT: {fitData.sourceFile} · {fitData.summary.sourcePoints} datapunkter
        </div>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/fitness"
      className="inline-flex items-center gap-1 text-sm font-semibold"
      style={{ color: "var(--color-primary)", textDecoration: "none" }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
      Tillbaka
    </Link>
  );
}

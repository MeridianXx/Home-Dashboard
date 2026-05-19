"use client";

// ─── Warm Home · Fitness · Pass-detalj ──────────────────────────────────────
// Pass-detalj enligt design: ACC-eyebrow + display-headline med italic-tail,
// 3-up StatBox + 2-up extra-stats, karta + HR-graf + elevations-profil
// + intervaller + plan-match + AI-analys.

import { use, useMemo } from "react";
import dynamic from "next/dynamic";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useWarmTheme } from "@/lib/warm/theme";
import { ACC, body, ital, lab, num, SAGE } from "@/lib/warm/tokens";
import { DetailHero, SectionLabel, StatBox } from "@/components/warm/fit/parts";
import { sportIcon, MountainIcon, MapPinIcon } from "@/components/warm/icons/fit";
import { sportColor, sportLabel, hasCardioZone, formatSec, rpeColor, rpeLabel } from "@/lib/warm/fit";
import { paceString, durationString } from "@/lib/fitness/parser";
import { parseSlug } from "@/lib/fitness/slug";
import { findBestPlanMatch } from "@/lib/fitness/match";
import { useFitnessProfile } from "@/lib/fitness/profile";
import { useHydrateProfile } from "@/lib/fitness/useHydrateProfile";
import { Tile } from "@/components/warm/primitives";
import { HeartRateCard, ElevationChart, LapsList } from "@/components/warm/fit/PassCharts";
import { WarmAIAnalysisCard } from "@/components/warm/fit/AIAnalysisCard";
import WarmErrorBanner from "@/components/warm/WarmErrorBanner";
import type { WorkoutsResponse, Workout, PlansResponse, PlannedWorkout } from "@/lib/fitness/types";
import type { FitResponse } from "@/app/api/fitness/fit/route";

// Leaflet client-only — Warm-stilad wrapper
const TrackMap = dynamic(() => import("@/components/warm/fit/TrackMap"), {
  ssr: false,
  loading: () => <MapPlaceholder />,
});

function MapPlaceholder() {
  const { t } = useWarmTheme();
  return (
    <div
      style={{
        height: 260,
        borderRadius: 14,
        background: t.paperHi,
        border: `1px solid ${t.line}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: t.mute,
        fontFamily: body,
        fontSize: 13,
      }}
    >
      Laddar karta…
    </div>
  );
}

export default function WarmPassDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const parsed = useMemo(() => parseSlug(slug), [slug]);
  const { t } = useWarmTheme();
  useHydrateProfile();
  const profile = useFitnessProfile((s) => s.profile);

  const { data: workoutsData } = useSWR<WorkoutsResponse>("/api/fitness/workouts?limit=200", fetcher, {
    revalidateOnFocus: false,
  });
  const { data: plansData } = useSWR<PlansResponse>("/api/fitness/plans", fetcher, {
    revalidateOnFocus: false,
  });

  const workout = useMemo<Workout | null>(() => {
    if (!parsed || !workoutsData?.workouts) return null;
    return (
      workoutsData.workouts.find(
        (w) => w.date === parsed.date && (w.time ?? "").replace(":", "") === parsed.time.replace(":", ""),
      ) ?? null
    );
  }, [parsed, workoutsData]);

  const plannedMatch = useMemo<PlannedWorkout | null>(() => {
    if (!workout || !plansData?.plans) return null;
    return findBestPlanMatch(workout, plansData.plans, { maxDateDiffDays: 2 });
  }, [workout, plansData]);

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
      <div style={{ padding: "0 14px" }}>
        <DetailHero backHref="/v3/fitness" backLabel="Fitness" eyebrow="PASS" title="Ogiltigt id" italicTail={slug} />
      </div>
    );
  }

  const distanceM = workout?.distanceM ?? fitData?.summary.distanceM ?? 0;
  const totalSec = workout?.totalTimeSec ?? fitData?.summary.totalTimeSec ?? 0;
  const distanceKm = distanceM > 0 ? distanceM / 1000 : 0;
  const sportLbl = sportLabel(parsed.type);
  const sportLblLow = sportLbl.toLowerCase();
  const isRunning = ["run", "walk", "bike", "ski"].includes(
    sportColorCategory(parsed.type),
  );

  // Display title + italic tail
  let title: string;
  let italicTail: string | undefined;
  if (distanceKm > 0) {
    title = `${distanceKm.toFixed(2)} km`;
    italicTail = `${sportLblLow}.`;
  } else {
    title = sportLbl;
    italicTail = undefined;
  }

  const dateText = new Date(parsed.date).toLocaleDateString("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const subtitle = `${dateText} · ${parsed.time}`;

  const hrz = workout
    ? {
        hrz0: workout.hrz0,
        hrz1: workout.hrz1,
        hrz2: workout.hrz2,
        hrz3: workout.hrz3,
        hrz4: workout.hrz4,
        hrz5: workout.hrz5,
      }
    : null;

  return (
    <div style={{ paddingBottom: 8 }}>
      <DetailHero
        backHref="/v3/fitness"
        backLabel="Fitness"
        eyebrow={`PASS · ${sportLbl}`.toUpperCase()}
        title={title}
        italicTail={italicTail}
        subtitle={subtitle}
      />

      <div style={{ padding: "0 14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
        {/* 3-up StatBox enligt design */}
        <div style={{ display: "flex", gap: 8 }}>
          {distanceKm > 0 ? (
            <StatBox
              label="Distans"
              value={distanceKm.toFixed(2)}
              unit="km"
              tagline={isRunning && totalSec > 0 ? `${paceString(distanceM, totalSec)} /km` : undefined}
            />
          ) : (
            <StatBox
              label="Aktiva kalorier"
              value={workout?.activeCalories ? Math.round(workout.activeCalories).toString() : "–"}
              unit={workout?.activeCalories ? "kcal" : undefined}
            />
          )}
          <StatBox
            label="Tid"
            value={durationString(totalSec)}
            tagline={workout?.movingTimeSec && workout.movingTimeSec !== totalSec ? `aktiv ${formatSec(workout.movingTimeSec)}` : undefined}
          />
          {workout?.avgHR ? (
            <StatBox
              label="Snittpuls"
              value={Math.round(workout.avgHR).toString()}
              unit="bpm"
              tagline={workout?.maxHR ? `max ${Math.round(workout.maxHR)}` : undefined}
              taglineColor="#A83E4A"
            />
          ) : workout?.trimp != null ? (
            <StatBox label="TRIMP" value={Math.round(workout.trimp).toString()} />
          ) : (
            <StatBox label="–" value="–" />
          )}
        </div>

        {/* Övriga stats — 2 kolumner i tile */}
        <ExtraStats workout={workout} fitSummary={fitData?.summary} />

        {/* Karta */}
        {fitData?.summary.bounds ? (
          <div>
            <SectionLabel
              right={
                <span style={{ ...ital(t, 11) }}>
                  {fitData.summary.sourcePoints} datapunkter
                </span>
              }
            >
              Spår
            </SectionLabel>
            <TrackMap track={fitData.track} bounds={fitData.summary.bounds} zones={profile.zones} />
          </div>
        ) : null}

        {/* HR-kort */}
        {(workout?.avgHR || fitData?.track.some((p) => typeof p.hr === "number")) ? (
          <HeartRateCard
            track={fitData?.track ?? []}
            zones={profile.zones}
            avgHR={workout?.avgHR ?? fitData?.summary.avgHR ?? null}
            maxHR={workout?.maxHR ?? fitData?.summary.maxHR ?? null}
            hrz={hrz}
            totalSec={totalSec}
          />
        ) : null}

        {/* Elevations-profil */}
        {fitData && fitData.track.some((p) => typeof p.alt === "number") ? (
          <div>
            <SectionLabel right={<MountainIcon size={14} color={t.dim} />}>Elevation</SectionLabel>
            <Tile t={t}>
              <ElevationChart track={fitData.track} />
            </Tile>
          </div>
        ) : null}

        {/* Intervaller */}
        {fitData && fitData.laps.length > 1 ? (
          <div>
            <SectionLabel>Intervaller</SectionLabel>
            <LapsList laps={fitData.laps} />
          </div>
        ) : null}

        {/* AI-analys */}
        <WarmAIAnalysisCard date={parsed.date} time={parsed.time} type={parsed.type} />

        {/* Plan-match */}
        {plannedMatch ? <PlanMatchTile plan={plannedMatch} workoutDate={parsed.date} /> : null}

        {/* FIT-status */}
        {fitLoading ? (
          <Tile t={t}>
            <div style={{ fontFamily: body, fontSize: 13, color: t.mute }}>Läser FIT-fil…</div>
          </Tile>
        ) : null}
        {fitError ? (
          <WarmErrorBanner t={t} onRetry={() => mutateFit()} message="Hittade ingen FIT-fil för det här passet." />
        ) : null}
        {fitData?.sourceFile ? (
          <div style={{ ...ital(t, 11, t.dim), textAlign: "center" }}>FIT: {fitData.sourceFile}</div>
        ) : null}
      </div>
    </div>
  );
}

/* ─── Övriga stats — höjd, kraft, kadens, akt, RPE ───────────────────── */

function ExtraStats({ workout, fitSummary }: { workout: Workout | null; fitSummary?: import("@/lib/fitness/fit-parser").FitSummary }) {
  const { t } = useWarmTheme();
  const items: Array<{ label: string; value: string; unit?: string; color?: string; ext?: React.ReactNode }> = [];

  const elev = workout?.elevationGainM ?? fitSummary?.elevationGainM ?? null;
  if (elev != null) items.push({ label: "Höjdökning", value: Math.round(elev).toString(), unit: "m", color: SAGE });

  const power = workout?.avgPower ?? fitSummary?.avgPower;
  if (power != null && power > 0) items.push({ label: "Snittkraft", value: Math.round(power).toString(), unit: "W", color: SAGE });

  const cadence = workout?.avgCadence ?? fitSummary?.avgCadence;
  if (cadence != null && cadence > 0) items.push({ label: "Snittkadens", value: Math.round(cadence).toString(), unit: "SPM", color: ACC });

  if (workout?.activeCalories != null && workout.activeCalories > 0 && workout.distanceM > 0) {
    items.push({ label: "Aktiva kalorier", value: Math.round(workout.activeCalories).toString(), unit: "kcal", color: "#A83E4A" });
  }

  if (workout?.trimp != null && workout.trimp > 0 && workout.avgHR != null) {
    items.push({ label: "TRIMP", value: Math.round(workout.trimp).toString(), color: ACC });
  }

  if (workout?.rpe != null && workout.rpe > 0) {
    const c = rpeColor(workout.rpe);
    items.push({
      label: "Ansträngning",
      value: Math.round(workout.rpe).toString(),
      unit: rpeLabel(workout.rpe),
      color: c,
    });
  }

  if (items.length === 0) return null;

  return (
    <Tile t={t} style={{ padding: 0 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
        {items.map((it, i) => {
          const col = i % 2;
          const row = Math.floor(i / 2);
          return (
            <div
              key={it.label}
              style={{
                padding: "10px 14px",
                borderTop: row === 0 ? "none" : `1px solid ${t.line}`,
                borderLeft: col === 1 ? `1px solid ${t.line}` : "none",
              }}
            >
              <div style={lab(t)}>{it.label}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 4 }}>
                <span style={{ ...num(t, 20), color: it.color ?? t.ink, lineHeight: 1 }} className="warm-tab-nums">
                  {it.value}
                </span>
                {it.unit ? (
                  <span style={{ fontFamily: body, fontSize: 11, color: it.color ?? t.mute, opacity: 0.8, fontWeight: 500 }}>{it.unit}</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </Tile>
  );
}

/* ─── Plan-match ─────────────────────────────────────────────────────── */

function PlanMatchTile({ plan, workoutDate }: { plan: PlannedWorkout; workoutDate: string }) {
  const { t } = useWarmTheme();
  return (
    <div>
      <SectionLabel>Planerat pass</SectionLabel>
      <Tile t={t}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          {sportIcon(plan.typ || "", 18, sportColor(plan.typ || ""))}
          <span style={{ ...num(t, 16, 500), color: t.ink, flex: 1, minWidth: 0 }}>{plan.passnamn}</span>
        </div>
        {plan.datum !== workoutDate ? (
          <div style={{ ...ital(t, 11, ACC), marginBottom: 6 }}>
            Planerat till {new Date(plan.datum).toLocaleDateString("sv-SE", { weekday: "short", day: "numeric", month: "short" })}
          </div>
        ) : null}
        {plan.syfte ? <div style={{ fontFamily: body, fontSize: 13, color: t.ink, lineHeight: 1.45 }}>{plan.syfte}</div> : null}
        {(plan.tid || plan.tempo || plan.pulsintervall) ? (
          <div style={{ ...ital(t, 11), marginTop: 8 }}>
            {[plan.tid, plan.tempo, plan.pulsintervall ? `puls ${plan.pulsintervall}` : null].filter(Boolean).join(" · ")}
          </div>
        ) : null}
      </Tile>
    </div>
  );
}

/* ─── Helper: kategori-test för stat-layout ──────────────────────────── */
function sportColorCategory(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("run") || t.includes("löp")) return "run";
  if (t.includes("walk") || t.includes("promen")) return "walk";
  if (t.includes("cycl") || t.includes("bike") || t.includes("cykl")) return "bike";
  if (t.includes("ski")) return "ski";
  return "other";
}

void MapPinIcon; void hasCardioZone;

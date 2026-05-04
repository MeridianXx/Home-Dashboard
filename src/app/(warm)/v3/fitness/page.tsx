"use client";

// ─── Warm Home · Fitness · Hub ───────────────────────────────────────────────
// Layout enligt designspec ("Warm Home — Fitness · Hub"):
//   • ACC-eyebrow "FITNESS · {dag}"
//   • Display-tagline med italic-svans (härledd från dagsformen)
//   • Readiness-tile med ACC-tonad bakgrund
//   • IDAG-block: dagens planerade pass eller dagens genomförda pass som
//     stort kort med tag-pills
//   • 2-up: VECKAN (M T O T F L S med ACC-fyllda checks) + STREAK
//   • COACH-tile med ACC-tonad bakgrund + italic-quote

import Link from "next/link";
import { useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useDesktop, useWarmTheme } from "@/lib/warm/theme";
import { ACC, AMBER, LINGON, SAGE, SKY, body, ital, lab, num } from "@/lib/warm/tokens";
import { Tile } from "@/components/warm/primitives";
import { HubDisplay, HubThemeToggle, Section, SectionLabel } from "@/components/warm/fit/parts";
import { ChevronRight } from "@/components/warm/icons/extra";
import { sportIcon, SparkleIcon } from "@/components/warm/icons/fit";
import { formatHubEyebrow } from "@/lib/warm/format";
import {
  sportColor,
  sportLabel,
  hasCardioZone,
  zoneColor as zoneClr,
  shortDateSv,
  daysUntil,
} from "@/lib/warm/fit";
import { workoutSlug } from "@/lib/fitness/slug";
import { matchWorkoutsToPlans } from "@/lib/fitness/match";
import { paceString, durationString } from "@/lib/fitness/parser";
import { useFitnessProfile, hrZone } from "@/lib/fitness/profile";
import { useHydrateProfile } from "@/lib/fitness/useHydrateProfile";
import type { PlannedWorkout, PlansResponse, Workout, WorkoutsResponse } from "@/lib/fitness/types";
import type { ReadinessResponse } from "@/app/api/fitness/readiness/route";

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function mondayOf(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function calcStreak(workouts: Workout[]): number {
  if (workouts.length === 0) return 0;
  const dates = new Set(workouts.map((w) => w.date));
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!dates.has(isoDate(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (dates.has(isoDate(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Tagline-par {title, italicTail} härlett från dagsform. Display-rubriken
 *  ska kännas vass och konkret — alla buckets beskriver kroppstillstånd
 *  (återhämtning, grund, tröghet, batteri) så de pratar samma språk. */
function deriveTagline(r: ReadinessResponse | undefined): { title: string; tail: string } {
  if (!r) return { title: "Hämtar dagsformen", tail: "" };
  if (r.score >= 75) return { title: "Bra återhämtning,", tail: "kör tungt." };
  if (r.score >= 55) return { title: "Stabil grund,", tail: "håll riktningen." };
  if (r.score >= 40) return { title: "Lite tröghet,", tail: "släpp på gasen." };
  return { title: "Tom batteri,", tail: "vila eller kort lätt." };
}

/** Coach-quote (italic, ACC-tinted box) härledd från readiness + nästa pass.
 *  Skiljer sig medvetet från display-taglinen i ordval — display anchorar i
 *  läget (återhämtning, tröghet, batteri) medan quote anchorar i råd
 *  (kvalitet, planenligt, en zon ner, vila). */
function coachQuote(r: ReadinessResponse | undefined, nextPlan: PlannedWorkout | null): string {
  if (!r) return "Coachen läser dina senaste värden…";
  if (r.score >= 75) {
    if (nextPlan?.passnamn) return `Pulsen samarbetar — kör ${nextPlan.passnamn.toLowerCase()} med kvalitet och stanna där.`;
    return "Pulsen samarbetar — bra dag för intervaller eller långpass.";
  }
  if (r.score >= 55) {
    return nextPlan?.passnamn
      ? `Inget skäl att avvika — ${nextPlan.passnamn.toLowerCase()} planenligt.`
      : "Inget skäl att avvika — planenligt idag.";
  }
  if (r.score >= 40) return "Sänk en zon — kör Z2 där du tänkt Z3.";
  return "Vila eller en kort promenad räcker idag.";
}

export default function WarmFitnessHubPage() {
  const { t, dark, toggle } = useWarmTheme();
  // Desktop: toggle bor i sidebar-foten — göm hub-interna varianten.
  const isDesktop = useDesktop();
  useHydrateProfile();
  const profile = useFitnessProfile((s) => s.profile);

  const { data: workoutsData } = useSWR<WorkoutsResponse>("/api/fitness/workouts?limit=10", fetcher, {
    refreshInterval: 5 * 60 * 1000,
    revalidateOnFocus: false,
  });
  const { data: weekWorkoutsData } = useSWR<WorkoutsResponse>("/api/fitness/workouts?limit=60", fetcher, {
    refreshInterval: 5 * 60 * 1000,
    revalidateOnFocus: false,
  });
  const { data: plansData } = useSWR<PlansResponse>("/api/fitness/plans", fetcher, {
    refreshInterval: 10 * 60 * 1000,
    revalidateOnFocus: false,
  });
  const { data: readinessData } = useSWR<ReadinessResponse>("/api/fitness/readiness", fetcher, {
    refreshInterval: 30 * 60 * 1000,
    revalidateOnFocus: false,
  });
  const { data: analysedData } = useSWR<{ keys: string[] }>("/api/fitness/analysed", fetcher, {
    refreshInterval: 5 * 60 * 1000,
    revalidateOnFocus: false,
  });
  const analysedKeys = useMemo(() => new Set(analysedData?.keys ?? []), [analysedData]);

  const today = isoDate(new Date());
  const monday = useMemo(() => mondayOf(new Date()), []);

  const workouts = workoutsData?.workouts ?? [];
  const weekWorkouts = weekWorkoutsData?.workouts ?? [];
  const plans = plansData?.plans ?? [];

  const { planToWorkout } = useMemo(
    () => matchWorkoutsToPlans(weekWorkouts, plans, { maxDateDiffDays: 2 }),
    [weekWorkouts, plans],
  );

  const todayPlans = plans.filter((p) => p.datum === today);
  const todayWorkouts = weekWorkouts.filter((w) => w.date === today);
  const consumedKeys = useMemo(() => {
    const s = new Set<string>();
    for (const w of planToWorkout.values()) s.add(`${w.date}|${(w.time ?? "").replace(":", "")}|${w.type}`);
    return s;
  }, [planToWorkout]);
  const todayWorkoutsFree = todayWorkouts.filter((w) => !consumedKeys.has(`${w.date}|${(w.time ?? "").replace(":", "")}|${w.type}`));

  const isDone = (p: PlannedWorkout) =>
    planToWorkout.has(p.id) || p.status === "Genomfört" || p.status === "Gjord" || p.status === "Slutförd";
  const nextPlan = useMemo(() => {
    const upcoming = plans.filter((p) => p.datum >= today && !isDone(p)).sort((a, b) => a.datum.localeCompare(b.datum));
    return upcoming[0] ?? null;
  }, [plans, today, planToWorkout]);

  const weekDays = useMemo(() => {
    const days: Array<{
      iso: string;
      date: Date;
      done: boolean;
      planColor: string | null;
    }> = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(monday, i);
      const iso = isoDate(d);
      const w = weekWorkouts.find((x) => x.date === iso);
      const p = plans.find((x) => x.datum === iso);
      const planMatched = p ? planToWorkout.has(p.id) : false;
      days.push({
        iso,
        date: d,
        done: Boolean(w) || planMatched,
        planColor: p ? sportColor(p.typ || "") : null,
      });
    }
    return days;
  }, [monday, weekWorkouts, plans, planToWorkout]);

  const streak = calcStreak(weekWorkouts);
  const tagline = deriveTagline(readinessData);
  const quote = coachQuote(readinessData, nextPlan);

  // Hero-pass (idag): planerat hellre än löst genomfört, annars nästa pass
  const heroPlan = todayPlans[0] ?? null;
  const heroWorkout = !heroPlan ? todayWorkoutsFree[0] ?? null : null;

  return (
    <div style={{ paddingBottom: 8 }}>
      <HubDisplay
        eyebrow={formatHubEyebrow("FITNESS")}
        title={tagline.title}
        italicTail={tagline.tail}
        right={<HubThemeToggle dark={dark} onToggle={toggle} isDesktop={isDesktop} />}
      />

      <div style={{ padding: "0 18px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Readiness — terracotta-tinted */}
        <ReadinessTile data={readinessData} />

        {/* IDAG — Section-wrapper ger 14 över etiketten + 12 under (matchar Lab/Hem) */}
        <Section label="Idag">
          {heroPlan ? (
            <PlanHeroTile plan={heroPlan} linkedWorkout={planToWorkout.get(heroPlan.id) ?? null} />
          ) : heroWorkout ? (
            <WorkoutHeroTile workout={heroWorkout} />
          ) : nextPlan ? (
            <NextPlanHint plan={nextPlan} />
          ) : (
            <Tile t={t}>
              <div style={{ fontFamily: body, fontSize: 13, color: t.mute }}>Inga planerade pass.</div>
            </Tile>
          )}
        </Section>

        {/* Vecka + streak */}
        <div style={{ display: "flex", gap: 10 }}>
          <WeekTile days={weekDays} todayIso={today} />
          <StreakTile streak={streak} nextPlan={nextPlan} />
        </div>

        {/* Coach */}
        <CoachTile quote={quote} />

        {/* Senaste pass — diskret länk-tile till historik */}
        <RecentTile
          workouts={workouts}
          analysedKeys={analysedKeys}
          zones={profile.zones}
        />
      </div>
    </div>
  );
}

/* ───── Readiness — terracotta-tinted tile, ring + numerisk ───────────── */

function ReadinessTile({ data }: { data: ReadinessResponse | undefined }) {
  const { t } = useWarmTheme();
  return (
    <div
      style={{
        background: t.tint,
        border: `1px solid ${t.line}`,
        borderRadius: 14,
        padding: "16px 18px",
        color: t.ink,
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}
    >
      <ReadinessRing score={data?.score ?? 0} color={data?.color ?? ACC} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...lab(t, { color: ACC, marginBottom: 6 }) }}>Readiness</div>
        <div style={{ ...num(t, 36), lineHeight: 1, marginBottom: 6 }} className="warm-tab-nums">
          {data?.score ?? "–"}
        </div>
        <div style={{ ...ital(t, 12, t.mute), lineHeight: 1.4 }}>
          {data
            ? [
                data.components.hrv.value != null ? `HRV ${data.components.hrv.value} ms` : null,
                data.components.tsb ? `form ${data.components.tsb.value > 0 ? "+" : ""}${data.components.tsb.value}` : null,
                data.components.sleep.hours != null
                  ? `sömn ${Math.floor(data.components.sleep.hours)} t ${Math.round((data.components.sleep.hours % 1) * 60)} m`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")
            : "räknar dagsformen…"}
        </div>
      </div>
    </div>
  );
}

function ReadinessRing({ score, color }: { score: number; color: string }) {
  const { t } = useWarmTheme();
  const r = 38;
  const c = 2 * Math.PI * r;
  const filled = c * (Math.max(0, Math.min(100, score)) / 100);
  return (
    <div style={{ position: "relative", width: 88, height: 88, flexShrink: 0 }}>
      <svg width={88} height={88} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={44} cy={44} r={r} fill="none" stroke={t.line} strokeWidth={6} />
        <circle
          cx={44}
          cy={44}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeDasharray={`${filled} ${c - filled}`}
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

/* ───── PlanHeroTile (idag-pass — stort kort med tag-pills) ──────────── */

function PlanHeroTile({ plan, linkedWorkout }: { plan: PlannedWorkout; linkedWorkout: Workout | null }) {
  const { t } = useWarmTheme();
  const tags = parseExerciseTags(plan.passdetaljer);
  const eyebrowParts: string[] = ["pass"];
  if (plan.tid) eyebrowParts.push(plan.tid);
  if (plan.typ) eyebrowParts.push(plan.typ);
  const eyebrow = eyebrowParts.join(" · ").toUpperCase();
  const subtitleParts = [
    tags.length > 0 ? `${tags.length} övningar` : null,
    plan.tid ? plan.tid : null,
    plan.pulsintervall ? `puls ${plan.pulsintervall}` : null,
  ].filter(Boolean);

  const inner = (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...lab(t, { color: ACC, marginBottom: 8 }) }}>{eyebrow}</div>
          <h2 style={{ ...num(t, 22, 500), lineHeight: 1.15 }}>{plan.passnamn || plan.typ || "Pass"}</h2>
          {subtitleParts.length > 0 ? (
            <p style={{ ...ital(t, 12), marginTop: 6 }}>{subtitleParts.join(" · ")}</p>
          ) : plan.syfte ? (
            <p style={{ ...ital(t, 12), marginTop: 6 }}>{plan.syfte}</p>
          ) : null}
        </div>
        <ChevronRight size={18} color={t.dim} style={{ marginTop: 4 }} />
      </div>
      {tags.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
          {tags.map((name, i) => (
            <span
              key={i}
              style={{
                fontFamily: body,
                fontStyle: "italic",
                fontSize: 12,
                color: t.mute,
                background: t.paperHi,
                border: `1px solid ${t.line}`,
                borderRadius: 999,
                padding: "5px 12px",
                whiteSpace: "nowrap",
              }}
            >
              {name}
            </span>
          ))}
        </div>
      ) : null}
      {linkedWorkout ? (
        <div style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: SAGE }} />
          <span style={{ fontFamily: body, fontSize: 11, color: SAGE, fontWeight: 600 }}>Genomfört</span>
        </div>
      ) : null}
    </>
  );

  const baseStyle: React.CSSProperties = {
    background: t.paper,
    border: `1px solid ${t.line}`,
    borderRadius: 14,
    padding: 16,
    color: t.ink,
    textDecoration: "none",
    display: "block",
  };
  if (linkedWorkout) {
    return (
      <Link href={`/v3/fitness/pass/${workoutSlug(linkedWorkout)}`} style={baseStyle}>
        {inner}
      </Link>
    );
  }
  // Ej genomfört än → öppna planen i kalender-vyn via ?edit=<id>. Plan-sidan
  // läser query-paramen och autoöppnar redigeringsmodalen så användaren ser
  // hela pass-detaljerna direkt utan att leta upp dagen i kalendern.
  return (
    <Link href={`/v3/fitness/coach/plan?edit=${plan.id}`} style={baseStyle}>
      {inner}
    </Link>
  );
}

function WorkoutHeroTile({ workout }: { workout: Workout }) {
  const { t } = useWarmTheme();
  const eyebrow = `pass · ${sportLabel(workout.type)}`.toUpperCase();
  const title = workout.distanceM > 0 ? `${(workout.distanceM / 1000).toFixed(2)} km ${sportLabel(workout.type).toLowerCase()}` : sportLabel(workout.type);
  const subtitle = [
    durationString(workout.totalTimeSec),
    workout.distanceM > 0 ? `${paceString(workout.distanceM, workout.totalTimeSec)} /km` : null,
    workout.avgHR ? `${Math.round(workout.avgHR)} bpm` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <Link
      href={`/v3/fitness/pass/${workoutSlug(workout)}`}
      style={{
        background: t.paper,
        border: `1px solid ${t.line}`,
        borderRadius: 14,
        padding: 16,
        textDecoration: "none",
        color: "inherit",
        display: "block",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...lab(t, { color: ACC, marginBottom: 8 }) }}>{eyebrow}</div>
          <h2 style={{ ...num(t, 22, 500), lineHeight: 1.15 }}>{title}</h2>
          <p style={{ ...ital(t, 12), marginTop: 6 }}>{subtitle}</p>
          <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: SAGE }} />
            <span style={{ fontFamily: body, fontSize: 11, color: SAGE, fontWeight: 600 }}>Genomfört</span>
          </div>
        </div>
        <ChevronRight size={18} color={t.dim} style={{ marginTop: 4 }} />
      </div>
    </Link>
  );
}

function NextPlanHint({ plan }: { plan: PlannedWorkout }) {
  const { t } = useWarmTheme();
  const dleft = daysUntil(plan.datum);
  const when = dleft === 0 ? "idag" : dleft === 1 ? "imorgon" : dleft != null ? `om ${dleft} d` : shortDateSv(plan.datum);
  return (
    <Link
      href="/v3/fitness/coach"
      style={{
        background: t.paper,
        border: `1px solid ${t.line}`,
        borderRadius: 14,
        padding: 16,
        textDecoration: "none",
        color: "inherit",
        display: "block",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...lab(t, { color: ACC, marginBottom: 8 }) }}>NÄSTA · {when.toUpperCase()}</div>
          <h2 style={{ ...num(t, 22, 500), lineHeight: 1.15 }}>{plan.passnamn || plan.typ || "Pass"}</h2>
          {plan.syfte ? <p style={{ ...ital(t, 12), marginTop: 6 }}>{plan.syfte}</p> : null}
        </div>
        <ChevronRight size={18} color={t.dim} style={{ marginTop: 4 }} />
      </div>
    </Link>
  );
}

/** Plocka ut "övningar" ur passdetaljer-fritext: rader / komma-separerat. */
function parseExerciseTags(text: string | undefined): string[] {
  if (!text) return [];
  // Acceptera båda format: rader åtskilda av newline ELLER komma-separerade
  const parts = text
    .split(/[\n,;]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length < 32);
  // Ta max 6
  return parts.slice(0, 6);
}

/* ───── VECKAN-tile (7 rutor med M T O T F L S + ACC-fyllda checks) ──── */

function WeekTile({
  days,
  todayIso,
}: {
  days: Array<{ iso: string; date: Date; done: boolean; planColor: string | null }>;
  todayIso: string;
}) {
  const { t } = useWarmTheme();
  const dayInitials = ["M", "T", "O", "T", "F", "L", "S"];
  return (
    <Tile t={t} style={{ flex: 1, padding: 14, minWidth: 0 }}>
      <div style={{ ...lab(t, { marginBottom: 12 }) }}>Veckan</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4 }}>
        {days.map((d, i) => {
          const isToday = d.iso === todayIso;
          return (
            <div key={d.iso} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div
                aria-label={dayInitials[i]}
                style={{
                  width: "100%",
                  aspectRatio: "1 / 1.1",
                  borderRadius: 7,
                  background: d.done ? ACC : "transparent",
                  border: d.done
                    ? `1px solid ${ACC}`
                    : isToday
                      ? `1px solid ${ACC}`
                      : `1px solid ${t.line}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {d.done ? (
                  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="#FFFBF0" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12.5 9 17l11-11" />
                  </svg>
                ) : d.planColor ? (
                  <span style={{ width: 5, height: 5, borderRadius: 999, background: d.planColor }} />
                ) : null}
              </div>
              <span style={{ ...lab(t, { fontSize: 9, color: isToday ? ACC : t.dim }) }}>{dayInitials[i]}</span>
            </div>
          );
        })}
      </div>
    </Tile>
  );
}

/* ───── STREAK-tile ───────────────────────────────────────────────────── */

function StreakTile({ streak, nextPlan }: { streak: number; nextPlan: PlannedWorkout | null }) {
  const { t } = useWarmTheme();
  const tagline =
    streak === 0
      ? "starta en ny streak."
      : streak >= 30
        ? "stark vana — håll i."
        : `nytt PR i sikte: ${30 - streak} d.`;
  void nextPlan;
  return (
    <Tile t={t} style={{ flex: 1, padding: 14, minWidth: 0 }}>
      <div style={{ ...lab(t, { marginBottom: 12 }) }}>Streak</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ ...num(t, 26), lineHeight: 1 }} className="warm-tab-nums">
          {streak}
        </span>
        <span style={{ ...ital(t, 12, t.mute) }}>{streak === 1 ? "dag" : "dagar"}</span>
      </div>
      <p style={{ ...ital(t, 12, SAGE), marginTop: 8, lineHeight: 1.4 }}>{tagline}</p>
    </Tile>
  );
}

/* ───── COACH-tile (ACC-tinted, italic-quote) ─────────────────────────── */

function CoachTile({ quote }: { quote: string }) {
  const { t } = useWarmTheme();
  return (
    <Link
      href="/v3/fitness/coach"
      style={{
        background: t.tint,
        border: `1px solid ${t.line}`,
        borderRadius: 14,
        padding: "14px 16px",
        textDecoration: "none",
        color: "inherit",
        display: "block",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ ...lab(t, { color: ACC }) }}>Coach</span>
        <ChevronRight size={16} color={ACC} />
      </div>
      <p
        style={{
          fontFamily: body,
          fontStyle: "italic",
          fontSize: 14,
          color: t.ink,
          lineHeight: 1.5,
          marginBottom: 8,
        }}
      >
        “{quote}”
      </p>
      <p style={{ ...ital(t, 11, t.mute) }}>Fråga coachen om dagens pass →</p>
    </Link>
  );
}

/* ───── Senaste pass (kompakt rad-tile) ───────────────────────────────── */

function RecentTile({
  workouts,
  analysedKeys,
  zones,
}: {
  workouts: Workout[];
  analysedKeys: Set<string>;
  zones: ReturnType<typeof useFitnessProfile.getState>["profile"]["zones"];
}) {
  const { t } = useWarmTheme();
  if (workouts.length === 0) return null;
  return (
    <Section
      label="Senaste pass"
      right={
        <Link
          href="/v3/fitness/historik"
          style={{
            ...ital(t, 12, ACC),
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
          }}
        >
          se all historik
          <ChevronRight size={11} color={ACC} />
        </Link>
      }
    >
      <Tile t={t} style={{ padding: "4px 8px" }}>
        {workouts.slice(0, 5).map((w, i) => {
          const color = sportColor(w.type);
          const zone = hasCardioZone(w.type) && w.avgHR ? hrZone(Math.round(w.avgHR), zones) : null;
          const analysed = analysedKeys.has(`${w.date}|${(w.time ?? "").replace(":", "")}|${w.type}`);
          return (
            <Link
              key={`${w.date}-${i}`}
              href={`/v3/fitness/pass/${workoutSlug(w)}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 8px",
                borderRadius: 10,
                textDecoration: "none",
                color: "inherit",
                borderTop: i === 0 ? "none" : `1px solid ${t.line}`,
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  background: t.paperHi,
                  border: `1px solid ${t.line}`,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {sportIcon(w.type, 18, color)}
                {analysed ? (
                  <span style={{ position: "absolute", right: -3, bottom: -3, lineHeight: 0 }}>
                    <SparkleIcon size={11} color={ACC} fill={ACC} />
                  </span>
                ) : null}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, minWidth: 0 }}>
                  <span style={{ fontFamily: body, fontSize: 13, fontWeight: 600, color: t.ink, whiteSpace: "nowrap" }}>
                    {w.distanceM > 0 ? `${(w.distanceM / 1000).toFixed(2)} km` : sportLabel(w.type)}
                  </span>
                  <span
                    style={{ fontFamily: body, fontSize: 11, color: t.mute, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    className="warm-tab-nums"
                  >
                    {durationString(w.totalTimeSec)}
                    {w.distanceM > 0 ? ` · ${paceString(w.distanceM, w.totalTimeSec)} /km` : ""}
                  </span>
                </div>
                <div style={{ ...ital(t, 11), marginTop: 2 }}>
                  {shortDateSv(w.date)}
                  {w.distanceM > 0 ? ` · ${sportLabel(w.type)}` : ""}
                  {w.avgHR ? ` · ${Math.round(w.avgHR)} bpm` : ""}
                </div>
              </div>
              {zone ? (
                <span
                  style={{
                    ...num(t, 10, 600),
                    background: zoneClr(zone),
                    color: "#FFFBF0",
                    padding: "3px 8px",
                    borderRadius: 999,
                    letterSpacing: 0.4,
                  }}
                  className="warm-tab-nums"
                >
                  {zone}
                </span>
              ) : null}
              <ChevronRight size={14} color={t.dim} />
            </Link>
          );
        })}
      </Tile>
    </Section>
  );
}

void AMBER; void LINGON; void SKY; void SectionLabel;

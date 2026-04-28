"use client";

// ─── Warm Home · Fitness · Coach ─────────────────────────────────────────────
// Vecko/månadskalender + CRUD-modal + AI-planering. Återanvänder
// /api/fitness/{plans,coach} oförändrat — `prompt`-läget genererar en
// hel plan, `regenerate` byter ett pass, `revise` reviderar via feedback,
// `items` sparar färdiga pass utan ny Claude-körning, `single` ger ett
// pass för en specifik dag.

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useWarmTheme } from "@/lib/warm/theme";
import { ACC, AMBER, body, ital, lab, num, SAGE, LINGON } from "@/lib/warm/tokens";
import { DetailHero, SectionLabel } from "@/components/warm/fit/parts";
import { Tile } from "@/components/warm/primitives";
import { WarmModal } from "@/components/warm/Modal";
import {
  CalendarIcon,
  PlusIcon,
  RefreshIcon,
  SendIcon,
  SparkleIcon,
  TrashIcon,
  sportIcon,
} from "@/components/warm/icons/fit";
import { ChevronLeft, ChevronRight } from "@/components/warm/icons/extra";
import { sportColor, sportLabel } from "@/lib/warm/fit";
import { workoutSlug } from "@/lib/fitness/slug";
import { matchWorkoutsToPlans, workoutKey } from "@/lib/fitness/match";
import { paceString, durationString } from "@/lib/fitness/parser";
import type { PlannedWorkout, PlansResponse, Workout, WorkoutsResponse } from "@/lib/fitness/types";

const TYPE_OPTIONS = ["Löpning", "Cykling", "Styrka", "Core", "Simning", "Annat"];
const STATUS_OPTIONS = ["Planerat", "Genomfört", "Inställt"];
const UNDERLAG_OPTIONS = ["Asfalt", "Grus", "Terräng", "Inomhus", "Löpband"];

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function mondayOf(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function formatMonthYear(d: Date): string {
  const s = d.toLocaleDateString("sv-SE", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function formatWeekRange(monday: Date): string {
  const sun = addDays(monday, 6);
  const sameMonth = monday.getMonth() === sun.getMonth();
  const monStr = monday.toLocaleDateString("sv-SE", { day: "numeric", month: sameMonth ? undefined : "short" });
  const sunStr = sun.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
  return `${monStr} – ${sunStr}`;
}

async function apiCreate(input: Partial<PlannedWorkout>): Promise<void> {
  const res = await fetch("/api/fitness/plans", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
}
async function apiUpdate(id: string, patch: Partial<PlannedWorkout>): Promise<void> {
  const res = await fetch(`/api/fitness/plans/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
}
async function apiArchive(id: string): Promise<void> {
  const res = await fetch(`/api/fitness/plans/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
}

type Draft = Partial<PlannedWorkout> & { datum: string };
type View = "week" | "month";

export default function WarmFitnessCoachPage() {
  const { t } = useWarmTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editParam = searchParams?.get("edit") ?? null;
  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState<Date>(() => mondayOf(new Date()));
  const [editing, setEditing] = useState<Draft | null>(null);
  const [singleAI, setSingleAI] = useState<{ date: string; hint: string } | null>(null);

  const { data, error, isLoading, mutate } = useSWR<PlansResponse>("/api/fitness/plans", fetcher, {
    revalidateOnFocus: false,
  });

  // Auto-öppna redigeringsmodal när FitHub navigerar hit med ?edit=<planId>.
  // Kör bara när planerna är lästa och paramen matchar — annars hänger
  // den kvar tills Notion-svaret kommer.
  useEffect(() => {
    if (!editParam || !data?.plans) return;
    const target = data.plans.find((p) => p.id === editParam);
    if (!target) return;
    setEditing({ ...target });
    // Sätt även anchor till passets vecka så användaren ser kontext bakom modalen
    setAnchor(mondayOf(new Date(target.datum)));
    // Rensa query-paramen så reload inte återöppnar modalen
    router.replace("/v3/fitness/coach", { scroll: false });
  }, [editParam, data, router]);
  const { data: workoutsData } = useSWR<WorkoutsResponse>("/api/fitness/workouts?limit=500", fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 10 * 60 * 1000,
  });

  const plansByDate = useMemo(() => {
    const m = new Map<string, PlannedWorkout[]>();
    for (const p of data?.plans ?? []) {
      if (!p.datum) continue;
      const arr = m.get(p.datum) ?? [];
      arr.push(p);
      m.set(p.datum, arr);
    }
    return m;
  }, [data]);

  const workoutsByDate = useMemo(() => {
    const m = new Map<string, Workout[]>();
    for (const w of workoutsData?.workouts ?? []) {
      if (!w.date) continue;
      const arr = m.get(w.date) ?? [];
      arr.push(w);
      m.set(w.date, arr);
    }
    return m;
  }, [workoutsData]);

  const { planToWorkout, consumedWorkouts } = useMemo(() => {
    const workouts = workoutsData?.workouts ?? [];
    const plans = data?.plans ?? [];
    const result = matchWorkoutsToPlans(workouts, plans, { maxDateDiffDays: 2 });
    const consumed = new Set<string>();
    for (const w of result.planToWorkout.values()) consumed.add(workoutKey(w));
    return { planToWorkout: result.planToWorkout, consumedWorkouts: consumed };
  }, [workoutsData, data]);

  const shiftPeriod = (delta: number) => {
    if (view === "week") setAnchor((a) => addDays(a, delta * 7));
    else setAnchor((a) => new Date(a.getFullYear(), a.getMonth() + delta, 1));
  };
  const goToday = () => setAnchor(view === "week" ? mondayOf(new Date()) : new Date());

  const openNew = (iso: string) => setEditing({ datum: iso, status: "Planerat" });
  const openEdit = (plan: PlannedWorkout) => setEditing({ ...plan });

  const handleSave = async (d: Draft) => {
    if (d.id) {
      await apiUpdate(d.id, {
        passnamn: d.passnamn ?? "",
        typ: d.typ ?? "",
        datum: d.datum,
        status: d.status ?? "Planerat",
        syfte: d.syfte ?? "",
        passdetaljer: d.passdetaljer ?? "",
        pulsintervall: d.pulsintervall ?? "",
        tempo: d.tempo ?? "",
        tid: d.tid ?? "",
        underlag: d.underlag ?? "",
      });
    } else {
      await apiCreate(d);
    }
    await mutate();
    setEditing(null);
  };

  const handleDelete = async () => {
    if (!editing?.id) return;
    await apiArchive(editing.id);
    await mutate();
    setEditing(null);
  };

  const periodLabel = view === "week" ? formatWeekRange(anchor) : formatMonthYear(anchor);

  return (
    <div style={{ paddingBottom: 8 }}>
      <DetailHero
        backHref="/v3/fitness"
        backLabel="Fitness"
        eyebrow="COACH"
        title="Planera"
        italicTail="& AI-coach."
        subtitle="Vecka för vecka, mot målet."
      />

      <div style={{ padding: "0 14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Period-nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button type="button" onClick={() => shiftPeriod(-1)} aria-label="Föregående period" style={iconBtn(t)}>
            <ChevronLeft size={16} color={t.mute} />
          </button>
          <button
            type="button"
            onClick={goToday}
            title="Gå till idag"
            style={{
              flex: 1,
              minWidth: 0,
              fontFamily: body,
              fontSize: 13,
              fontWeight: 600,
              color: t.ink,
              background: t.paper,
              border: `1px solid ${t.line}`,
              borderRadius: 999,
              padding: "8px 12px",
              cursor: "pointer",
              textAlign: "center",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            className="warm-tab-nums"
          >
            {periodLabel}
          </button>
          <button type="button" onClick={() => shiftPeriod(1)} aria-label="Nästa period" style={iconBtn(t)}>
            <ChevronRight size={16} color={t.mute} />
          </button>
          <div
            style={{
              display: "inline-flex",
              gap: 2,
              padding: 3,
              background: t.paper,
              border: `1px solid ${t.line}`,
              borderRadius: 999,
              flexShrink: 0,
            }}
          >
            {(["week", "month"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                style={{
                  fontFamily: body,
                  fontSize: 11,
                  fontWeight: 600,
                  background: view === v ? ACC : "transparent",
                  color: view === v ? "#FFFBF0" : t.mute,
                  border: "none",
                  padding: "5px 12px",
                  borderRadius: 999,
                  cursor: "pointer",
                }}
              >
                {v === "week" ? "Vecka" : "Månad"}
              </button>
            ))}
          </div>
        </div>

        {/* Action-rad */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => openNew(isoDate(new Date()))}
            style={{
              flex: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              fontFamily: body,
              fontSize: 12,
              fontWeight: 600,
              background: ACC,
              color: "#FFFBF0",
              border: "none",
              padding: "10px 16px",
              borderRadius: 999,
              cursor: "pointer",
            }}
          >
            <PlusIcon size={14} color="#FFFBF0" />
            Nytt pass
          </button>
          <button
            type="button"
            onClick={() => setSingleAI({ date: isoDate(new Date()), hint: "" })}
            style={{
              flex: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              fontFamily: body,
              fontSize: 12,
              fontWeight: 600,
              background: t.tint,
              color: ACC,
              border: `1px solid ${t.line}`,
              padding: "10px 16px",
              borderRadius: 999,
              cursor: "pointer",
            }}
          >
            <SparkleIcon size={14} color={ACC} fill={ACC} />
            AI-pass
          </button>
        </div>

        {/* Kalender */}
        {error ? (
          <Tile t={t}>
            <div style={{ fontFamily: body, fontSize: 13, color: LINGON }}>Kunde inte läsa planerade pass.</div>
          </Tile>
        ) : isLoading ? (
          <Tile t={t}>
            <div style={{ fontFamily: body, fontSize: 13, color: t.mute }}>Läser…</div>
          </Tile>
        ) : view === "week" ? (
          <WeekView
            monday={anchor}
            plansByDate={plansByDate}
            workoutsByDate={workoutsByDate}
            planToWorkout={planToWorkout}
            consumedWorkouts={consumedWorkouts}
            onOpen={(x) => {
              if ("id" in x) openEdit(x as PlannedWorkout);
              else openNew((x as { datum: string }).datum);
            }}
          />
        ) : (
          <MonthView
            anchor={anchor}
            plansByDate={plansByDate}
            workoutsByDate={workoutsByDate}
            planToWorkout={planToWorkout}
            consumedWorkouts={consumedWorkouts}
            onOpen={(x) => {
              if ("id" in x) openEdit(x as PlannedWorkout);
              else openNew((x as { datum: string }).datum);
            }}
          />
        )}

        {/* AI-planering */}
        <AIPlanSection onApplied={async () => { await mutate(); }} />
      </div>

      <AnimatePresence>
        {editing ? (
          <PlanModal
            draft={editing}
            onClose={() => setEditing(null)}
            onSave={handleSave}
            onDelete={editing.id ? handleDelete : undefined}
          />
        ) : null}
        {singleAI ? (
          <SingleAIModal
            initial={singleAI}
            onClose={() => setSingleAI(null)}
            onSaved={async () => {
              setSingleAI(null);
              await mutate();
            }}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function iconBtn(t: import("@/lib/warm/tokens").WarmTheme): React.CSSProperties {
  return {
    width: 36,
    height: 36,
    borderRadius: 999,
    background: t.paper,
    color: t.mute,
    border: `1px solid ${t.line}`,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  };
}

/* ─── WeekView ───────────────────────────────────────────────────────── */

function WeekView({
  monday,
  plansByDate,
  workoutsByDate,
  planToWorkout,
  consumedWorkouts,
  onOpen,
}: {
  monday: Date;
  plansByDate: Map<string, PlannedWorkout[]>;
  workoutsByDate: Map<string, Workout[]>;
  planToWorkout: Map<string, Workout>;
  consumedWorkouts: Set<string>;
  onOpen: (x: PlannedWorkout | { datum: string }) => void;
}) {
  const { t } = useWarmTheme();
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const today = isoDate(new Date());
  const dayNames = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {days.map((d, i) => {
        const iso = isoDate(d);
        const items = plansByDate.get(iso) ?? [];
        const rawDone = workoutsByDate.get(iso) ?? [];
        const done = rawDone.filter((w) => !consumedWorkouts.has(workoutKey(w)));
        const isToday = iso === today;
        const isPast = iso < today;
        const empty = items.length === 0 && done.length === 0;
        return (
          <div
            key={iso}
            style={{
              background: t.paper,
              border: isToday ? `1px solid ${ACC}` : `1px solid ${t.line}`,
              borderRadius: 12,
              padding: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ ...lab(t, { color: isToday ? ACC : t.dim }) }}>{dayNames[i]}</span>
                <span style={{ ...num(t, 14, 500) }} className="warm-tab-nums">
                  {d.getDate()} {d.toLocaleDateString("sv-SE", { month: "short" }).replace(".", "")}
                </span>
                {isToday ? (
                  <span
                    style={{
                      fontFamily: body,
                      fontSize: 9,
                      fontWeight: 700,
                      background: ACC,
                      color: "#FFFBF0",
                      padding: "2px 8px",
                      borderRadius: 999,
                      letterSpacing: 0.4,
                    }}
                  >
                    IDAG
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => onOpen({ datum: iso })}
                aria-label="Lägg till pass"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: t.mute,
                  padding: 0,
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                <PlusIcon size={16} color={t.mute} />
              </button>
            </div>

            {empty ? (
              <div style={{ ...ital(t, 11) }}>{isPast ? "Inga pass" : "Vilodag"}</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {items.map((p) => (
                  <PlanPill key={p.id} plan={p} linkedWorkout={planToWorkout.get(p.id) ?? null} onClick={() => onOpen(p)} />
                ))}
                {done.map((w, idx) => (
                  <DonePill key={`${w.date}-${w.time}-${idx}`} workout={w} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PlanPill({
  plan,
  linkedWorkout,
  onClick,
}: {
  plan: PlannedWorkout;
  linkedWorkout: Workout | null;
  onClick: () => void;
}) {
  const { t } = useWarmTheme();
  const color = sportColor(plan.typ || "");
  const cancelled = plan.status === "Inställt";
  const movedToOtherDay = linkedWorkout && linkedWorkout.date !== plan.datum;
  const movedLabel = movedToOtherDay
    ? new Date(linkedWorkout!.date).toLocaleDateString("sv-SE", { weekday: "short", day: "numeric" }).replace(".", "")
    : null;

  const inner = (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
        {linkedWorkout ? (
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              background: SAGE,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="#FFFBF0" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12.5 9 17l11-11" />
            </svg>
          </span>
        ) : null}
        {sportIcon(plan.typ || "", 14, color)}
        <span
          style={{
            fontFamily: body,
            fontSize: 12,
            fontWeight: 600,
            color: t.ink,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {plan.passnamn || plan.typ || "Pass"}
        </span>
        {movedLabel ? (
          <span style={{ fontFamily: body, fontSize: 9, color: t.mute, marginLeft: 2, whiteSpace: "nowrap" }} className="warm-tab-nums">
            → {movedLabel}
          </span>
        ) : null}
      </div>
      {plan.tid || plan.tempo ? (
        <div style={{ ...ital(t, 11), marginTop: 2 }}>{[plan.tid, plan.tempo].filter(Boolean).join(" · ")}</div>
      ) : null}
    </>
  );

  const baseStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    textAlign: "left",
    background: t.paperHi,
    border: `1px solid ${t.line}`,
    borderLeft: `3px solid ${color}`,
    padding: "6px 10px",
    borderRadius: 8,
    cursor: "pointer",
    opacity: cancelled ? 0.55 : 1,
    color: "inherit",
    textDecoration: "none",
    fontFamily: "inherit",
  };

  if (linkedWorkout) {
    return (
      <Link href={`/v3/fitness/pass/${workoutSlug(linkedWorkout)}`} style={baseStyle}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} style={baseStyle}>
      {inner}
    </button>
  );
}

function DonePill({ workout }: { workout: Workout }) {
  const { t } = useWarmTheme();
  const color = sportColor(workout.type);
  const title = workout.distanceM > 0 ? `${(workout.distanceM / 1000).toFixed(2)} km` : sportLabel(workout.type);
  const sub =
    workout.distanceM > 0 && workout.totalTimeSec > 0
      ? `${durationString(workout.totalTimeSec)} · ${paceString(workout.distanceM, workout.totalTimeSec)}/km`
      : durationString(workout.totalTimeSec);
  return (
    <Link
      href={`/v3/fitness/pass/${workoutSlug(workout)}`}
      style={{
        display: "block",
        background: t.paperHi,
        border: `1px dashed ${t.line}`,
        borderLeft: `3px solid ${color}`,
        padding: "6px 10px",
        borderRadius: 8,
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
        <span
          style={{
            width: 14,
            height: 14,
            borderRadius: 999,
            background: SAGE,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="#FFFBF0" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12.5 9 17l11-11" />
          </svg>
        </span>
        {sportIcon(workout.type, 13, color)}
        <span style={{ fontFamily: body, fontSize: 12, fontWeight: 600, color: t.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {title}
        </span>
      </div>
      <div style={{ fontFamily: body, fontSize: 10, color: t.mute, marginTop: 2 }} className="warm-tab-nums">
        {sub}
        {workout.avgHR ? ` · ${Math.round(workout.avgHR)} bpm` : ""}
      </div>
    </Link>
  );
}

/* ─── MonthView ─────────────────────────────────────────────────────── */

function MonthView({
  anchor,
  plansByDate,
  workoutsByDate,
  planToWorkout,
  consumedWorkouts,
  onOpen,
}: {
  anchor: Date;
  plansByDate: Map<string, PlannedWorkout[]>;
  workoutsByDate: Map<string, Workout[]>;
  planToWorkout: Map<string, Workout>;
  consumedWorkouts: Set<string>;
  onOpen: (x: PlannedWorkout | { datum: string }) => void;
}) {
  const { t } = useWarmTheme();
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = mondayOf(firstOfMonth);
  const cells: Date[] = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const currentMonth = anchor.getMonth();
  const today = isoDate(new Date());
  const dayNames = ["M", "T", "O", "T", "F", "L", "S"];
  return (
    <Tile t={t}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 2, marginBottom: 4 }}>
        {dayNames.map((n, i) => (
          <div key={i} style={{ ...lab(t, { fontSize: 9 }), textAlign: "center", padding: "4px 0" }}>
            {n}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 2 }}>
        {cells.map((d, i) => {
          const iso = isoDate(d);
          const items = plansByDate.get(iso) ?? [];
          const rawDone = workoutsByDate.get(iso) ?? [];
          const done = rawDone.filter((w) => !consumedWorkouts.has(workoutKey(w)));
          const allDots = [
            ...items.map((p) => ({
              color: sportColor(p.typ || ""),
              dim: p.status === "Inställt",
              done: planToWorkout.has(p.id) || p.status === "Genomfört",
            })),
            ...done.map((w) => ({ color: sportColor(w.type), dim: false, done: true })),
          ];
          const inMonth = d.getMonth() === currentMonth;
          const isToday = iso === today;
          return (
            <button
              key={i}
              type="button"
              onClick={() => {
                if (items.length === 1 && done.length === 0) onOpen(items[0]);
                else onOpen({ datum: iso });
              }}
              style={{
                aspectRatio: "1 / 1.15",
                background: inMonth ? t.paperHi : "transparent",
                border: isToday ? `1px solid ${ACC}` : `1px solid ${t.line}`,
                padding: 3,
                cursor: "pointer",
                minHeight: 42,
                opacity: inMonth ? 1 : 0.55,
                borderRadius: 6,
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
              }}
            >
              <div
                style={{
                  ...num(t, 11, 600),
                  color: isToday ? ACC : t.ink,
                  textAlign: "right",
                }}
                className="warm-tab-nums"
              >
                {d.getDate()}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 2, marginTop: "auto", justifyContent: "center" }}>
                {allDots.slice(0, 3).map((dot, k) => (
                  <span
                    key={k}
                    aria-hidden="true"
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 999,
                      background: dot.color,
                      opacity: dot.dim ? 0.4 : 1,
                      border: dot.done ? `1px solid ${dot.color}` : undefined,
                      backgroundColor: dot.done ? "transparent" : dot.color,
                    }}
                  />
                ))}
                {allDots.length > 3 ? (
                  <span style={{ ...num(t, 8, 600), color: t.mute, lineHeight: 1 }} className="warm-tab-nums">
                    +{allDots.length - 3}
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </Tile>
  );
}

/* ─── PlanModal — CRUD ──────────────────────────────────────────────── */

function PlanModal({
  draft,
  onClose,
  onSave,
  onDelete,
}: {
  draft: Draft;
  onClose: () => void;
  onSave: (d: Draft) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const { t } = useWarmTheme();
  const [form, setForm] = useState<Draft>({ ...draft });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isEdit = Boolean(draft.id);

  const upd = (patch: Partial<Draft>) => setForm((f) => ({ ...f, ...patch }));

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setErr(null);
    try {
      await onSave(form);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };
  const del = async () => {
    if (!onDelete || saving) return;
    setSaving(true);
    setErr(null);
    try {
      await onDelete();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <WarmModal
      title={isEdit ? "Redigera pass" : "Nytt pass"}
      onClose={onClose}
      footer={
        <>
          {isEdit && onDelete ? (
            <button
              type="button"
              onClick={del}
              disabled={saving}
              style={{
                fontFamily: body,
                fontSize: 12,
                fontWeight: 600,
                color: LINGON,
                background: "transparent",
                border: `1px solid ${t.line}`,
                padding: "8px 14px",
                borderRadius: 999,
                cursor: saving ? "wait" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <TrashIcon size={12} color={LINGON} />
              Arkivera
            </button>
          ) : null}
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              fontFamily: body,
              fontSize: 12,
              fontWeight: 600,
              color: t.mute,
              background: "transparent",
              border: `1px solid ${t.line}`,
              padding: "8px 14px",
              borderRadius: 999,
              cursor: saving ? "wait" : "pointer",
            }}
          >
            Avbryt
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || !form.datum}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontFamily: body,
              fontSize: 12,
              fontWeight: 600,
              color: "#FFFBF0",
              background: ACC,
              border: "none",
              padding: "8px 16px",
              borderRadius: 999,
              cursor: saving ? "wait" : "pointer",
              opacity: saving || !form.datum ? 0.7 : 1,
            }}
          >
            {saving ? <RefreshIcon size={12} color="#FFFBF0" style={{ animation: "spin-anim 0.8s linear infinite" }} /> : null}
            {isEdit ? "Spara" : "Skapa"}
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Passnamn">
          <input
            type="text"
            value={form.passnamn ?? ""}
            onChange={(e) => upd({ passnamn: e.target.value })}
            placeholder="t.ex. Tröskel 5×1 km"
            style={inputStyle(t)}
          />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
          <Field label="Datum">
            <input type="date" value={form.datum} onChange={(e) => upd({ datum: e.target.value })} style={inputStyle(t)} />
          </Field>
          <Field label="Typ">
            <SelectBox value={form.typ ?? ""} options={TYPE_OPTIONS} placeholder="Välj…" onChange={(v) => upd({ typ: v })} />
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
          <Field label="Tid / längd">
            <input
              type="text"
              value={form.tid ?? ""}
              onChange={(e) => upd({ tid: e.target.value })}
              placeholder="t.ex. 55 min"
              style={inputStyle(t)}
            />
          </Field>
          <Field label="Tempo">
            <input
              type="text"
              value={form.tempo ?? ""}
              onChange={(e) => upd({ tempo: e.target.value })}
              placeholder="t.ex. 4:20/km"
              style={inputStyle(t)}
            />
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
          <Field label="Pulsintervall">
            <input
              type="text"
              value={form.pulsintervall ?? ""}
              onChange={(e) => upd({ pulsintervall: e.target.value })}
              placeholder="t.ex. Z3, 160–170"
              style={inputStyle(t)}
            />
          </Field>
          <Field label="Underlag">
            <SelectBox value={form.underlag ?? ""} options={UNDERLAG_OPTIONS} placeholder="Välj…" onChange={(v) => upd({ underlag: v })} />
          </Field>
        </div>
        <Field label="Syfte">
          <textarea
            value={form.syfte ?? ""}
            onChange={(e) => upd({ syfte: e.target.value })}
            rows={2}
            placeholder="Kort om passets mål"
            style={{ ...inputStyle(t), resize: "vertical", fontFamily: "inherit" }}
          />
        </Field>
        <Field label="Passdetaljer">
          <textarea
            value={form.passdetaljer ?? ""}
            onChange={(e) => upd({ passdetaljer: e.target.value })}
            rows={4}
            placeholder="Upplägg, intervaller, etc."
            style={{ ...inputStyle(t), resize: "vertical", fontFamily: "inherit" }}
          />
        </Field>
        <Field label="Status">
          <SelectBox value={form.status ?? "Planerat"} options={STATUS_OPTIONS} onChange={(v) => upd({ status: v })} />
        </Field>
        {err ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: body, fontSize: 12, color: LINGON }}>{err}</div>
        ) : null}
      </div>
    </WarmModal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const { t } = useWarmTheme();
  return (
    <label style={{ display: "block", minWidth: 0 }}>
      <div style={{ ...lab(t, { fontSize: 9, marginBottom: 6 }) }}>{label}</div>
      {children}
    </label>
  );
}

function inputStyle(t: import("@/lib/warm/tokens").WarmTheme): React.CSSProperties {
  return {
    width: "100%",
    boxSizing: "border-box",
    background: t.paperHi,
    color: t.ink,
    border: `1px solid ${t.line}`,
    borderRadius: 10,
    padding: "8px 12px",
    fontSize: 13,
    fontFamily: body,
    outline: "none",
  };
}

function SelectBox({ value, options, onChange, placeholder }: { value: string; options: string[]; onChange: (v: string) => void; placeholder?: string }) {
  const { t } = useWarmTheme();
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputStyle(t), appearance: "none", paddingRight: 32 }}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: t.mute, pointerEvents: "none" }}>
        <ChevronRight size={12} color={t.mute} style={{ transform: "rotate(90deg)" }} />
      </span>
    </div>
  );
}

/* ─── SingleAIModal ─────────────────────────────────────────────────── */

function SingleAIModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: { date: string; hint: string };
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { t } = useWarmTheme();
  const [date, setDate] = useState(initial.date);
  const [hint, setHint] = useState(initial.hint);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Partial<PlannedWorkout> & { datum: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const generate = async () => {
    if (generating || !date) return;
    setGenerating(true);
    setErr(null);
    try {
      const res = await fetch("/api/fitness/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ single: { date, hint: hint.trim() || undefined } }),
      });
      const apiBody = await res.json();
      if (!res.ok) throw new Error(apiBody.error ?? `HTTP ${res.status}`);
      if (!apiBody.item) throw new Error("Claude returnerade inget pass-objekt.");
      setDraft(apiBody.item);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  };

  const save = async () => {
    if (!draft || saving) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/fitness/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items: [draft] }),
      });
      const apiBody = await res.json();
      if (!res.ok) throw new Error(apiBody.error ?? `HTTP ${res.status}`);
      await onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <WarmModal
      title="AI-pass för en dag"
      icon={<SparkleIcon size={18} color={ACC} fill={ACC} />}
      onClose={onClose}
      footer={
        !draft ? (
          <>
            <div style={{ flex: 1 }} />
            <button
              type="button"
              onClick={onClose}
              style={{
                fontFamily: body,
                fontSize: 12,
                fontWeight: 600,
                color: t.mute,
                background: "transparent",
                border: `1px solid ${t.line}`,
                padding: "8px 14px",
                borderRadius: 999,
                cursor: "pointer",
              }}
            >
              Avbryt
            </button>
            <button
              type="button"
              onClick={generate}
              disabled={generating}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontFamily: body,
                fontSize: 12,
                fontWeight: 600,
                color: "#FFFBF0",
                background: ACC,
                border: "none",
                padding: "8px 16px",
                borderRadius: 999,
                cursor: generating ? "wait" : "pointer",
                opacity: generating ? 0.75 : 1,
              }}
            >
              <SparkleIcon size={12} color="#FFFBF0" fill="#FFFBF0" style={{ animation: generating ? "spin-anim 0.8s linear infinite" : undefined }} />
              {generating ? "Planerar…" : "Generera"}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setDraft(null)}
              disabled={saving}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontFamily: body,
                fontSize: 12,
                fontWeight: 600,
                color: t.mute,
                background: "transparent",
                border: `1px solid ${t.line}`,
                padding: "8px 14px",
                borderRadius: 999,
                cursor: saving ? "wait" : "pointer",
              }}
            >
              <RefreshIcon size={12} color={t.mute} />
              Ny variant
            </button>
            <div style={{ flex: 1 }} />
            <button
              type="button"
              onClick={save}
              disabled={saving}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontFamily: body,
                fontSize: 12,
                fontWeight: 600,
                color: "#FFFBF0",
                background: ACC,
                border: "none",
                padding: "8px 16px",
                borderRadius: 999,
                cursor: saving ? "wait" : "pointer",
                opacity: saving ? 0.75 : 1,
              }}
            >
              {saving ? "Sparar…" : "Spara"}
            </button>
          </>
        )
      }
    >
      {!draft ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontFamily: body, fontSize: 13, color: t.mute, lineHeight: 1.5 }}>
            Coachen väljer pass utifrån ditt aktuella formläge (TSB/CTL/ATL) och planerad backlog runt datumet.
          </p>
          <Field label="Datum">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle(t)} />
          </Field>
          <Field label="Riktning (valfri)">
            <input
              type="text"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="t.ex. har 45 min eller lätt återhämtning"
              style={inputStyle(t)}
            />
          </Field>
          {err ? <div style={{ fontFamily: body, fontSize: 12, color: LINGON }}>{err}</div> : null}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: t.paperHi, border: `1px solid ${t.line}`, borderRadius: 10, padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              {sportIcon(draft.typ ?? "", 16, sportColor(draft.typ ?? ""))}
              <span style={{ ...num(t, 16, 500), color: t.ink }}>{draft.passnamn ?? draft.typ ?? "Pass"}</span>
            </div>
            <div style={{ ...ital(t, 11), marginBottom: 10 }} className="warm-tab-nums">
              {draft.datum} · {draft.typ ?? "Annat"}
              {draft.tid ? ` · ${draft.tid}` : ""}
            </div>
            {draft.syfte ? (
              <p style={{ fontFamily: body, fontSize: 13, color: t.ink, lineHeight: 1.5 }}>{draft.syfte}</p>
            ) : null}
            {draft.passdetaljer ? (
              <p style={{ fontFamily: body, fontSize: 12, color: t.mute, lineHeight: 1.5, whiteSpace: "pre-wrap", marginTop: 8 }}>
                {draft.passdetaljer}
              </p>
            ) : null}
            {draft.pulsintervall || draft.tempo || draft.underlag ? (
              <div style={{ ...ital(t, 11), marginTop: 10 }}>
                {[
                  draft.pulsintervall ? `puls ${draft.pulsintervall}` : null,
                  draft.tempo ? `tempo ${draft.tempo}` : null,
                  draft.underlag ? `underlag ${draft.underlag}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            ) : null}
          </div>
          {err ? <div style={{ fontFamily: body, fontSize: 12, color: LINGON }}>{err}</div> : null}
        </div>
      )}
    </WarmModal>
  );
}

/* ─── AIPlanSection — multi-pass plan + per-pass regen + revise ─────── */

type DraftItem = Partial<PlannedWorkout> & { datum: string };

interface CoachDraft {
  originalPrompt: string;
  commentary: string;
  plan: DraftItem[];
  model: string;
  inputTokens: number;
  outputTokens: number;
}

function AIPlanSection({ onApplied }: { onApplied: () => Promise<void> }) {
  const { t } = useWarmTheme();
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [draft, setDraft] = useState<CoachDraft | null>(null);
  const [justSaved, setJustSaved] = useState<{ created: number; errors: number } | null>(null);
  const [regenIndex, setRegenIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [revising, setRevising] = useState(false);
  const [draftErr, setDraftErr] = useState<{ message: string; rawText?: string } | null>(null);

  const generate = async () => {
    if (generating || !prompt.trim()) return;
    setGenerating(true);
    setErr(null);
    setJustSaved(null);
    try {
      const res = await fetch("/api/fitness/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const apiBody = await res.json();
      if (!res.ok) throw new Error(apiBody.error ?? `HTTP ${res.status}`);
      if (!apiBody.plan || apiBody.plan.length === 0) throw new Error("Claude returnerade ingen strukturerad plan. Prova att formulera om.");
      setDraft({ ...apiBody, originalPrompt: prompt });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  };

  const regenerateOne = async (index: number) => {
    if (!draft || regenIndex !== null) return;
    setRegenIndex(index);
    setDraftErr(null);
    try {
      const res = await fetch("/api/fitness/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ regenerate: { prompt: draft.originalPrompt, plan: draft.plan, index } }),
      });
      const apiBody = await res.json();
      if (!res.ok) {
        setDraftErr({ message: apiBody.error ?? `HTTP ${res.status}`, rawText: apiBody.rawText });
        return;
      }
      if (!apiBody.item) {
        setDraftErr({ message: "Claude returnerade inget pass-objekt." });
        return;
      }
      setDraft({
        ...draft,
        plan: draft.plan.map((p, i) => (i === index ? apiBody.item : p)),
        inputTokens: draft.inputTokens + (apiBody.inputTokens ?? 0),
        outputTokens: draft.outputTokens + (apiBody.outputTokens ?? 0),
      });
    } catch (e) {
      setDraftErr({ message: e instanceof Error ? e.message : String(e) });
    } finally {
      setRegenIndex(null);
    }
  };

  const revise = async () => {
    if (!draft || revising || !feedback.trim()) return;
    setRevising(true);
    setDraftErr(null);
    try {
      const res = await fetch("/api/fitness/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ revise: { prompt: draft.originalPrompt, plan: draft.plan, feedback } }),
      });
      const apiBody = await res.json();
      if (!res.ok) {
        setDraftErr({ message: apiBody.error ?? `HTTP ${res.status}`, rawText: apiBody.rawText });
        return;
      }
      if (!apiBody.plan || apiBody.plan.length === 0) {
        setDraftErr({ message: "Claude returnerade ingen strukturerad plan.", rawText: apiBody.rawText });
        return;
      }
      setDraft({
        originalPrompt: draft.originalPrompt,
        commentary: apiBody.commentary,
        plan: apiBody.plan,
        model: apiBody.model,
        inputTokens: draft.inputTokens + (apiBody.inputTokens ?? 0),
        outputTokens: draft.outputTokens + (apiBody.outputTokens ?? 0),
      });
      setFeedback("");
    } catch (e) {
      setDraftErr({ message: e instanceof Error ? e.message : String(e) });
    } finally {
      setRevising(false);
    }
  };

  const save = async () => {
    if (!draft || saving) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/fitness/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items: draft.plan }),
      });
      const apiBody = await res.json();
      if (!res.ok) throw new Error(apiBody.error ?? `HTTP ${res.status}`);
      const created = apiBody.created?.length ?? 0;
      const errs = apiBody.errors?.length ?? 0;
      setJustSaved({ created, errors: errs });
      setDraft(null);
      setPrompt("");
      setFeedback("");
      await onApplied();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <SectionLabel>AI-planering</SectionLabel>
      <div style={{ background: t.tint, border: `1px solid ${t.line}`, borderRadius: 14, padding: 14 }}>
        {!draft ? (
          <>
            <p style={{ fontFamily: body, fontStyle: "italic", fontSize: 13, color: t.ink, lineHeight: 1.5, marginBottom: 12 }}>
              Beskriv vad du vill träna så föreslår coachen pass utifrån din profil, nuvarande form och historik. Du får granska innan något sparas.
            </p>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder="t.ex. Planera 2 veckor med ett långpass per vecka och ett intervallpass. Ingen träning på onsdagar."
              style={{ ...inputStyle(t), resize: "vertical", fontFamily: "inherit", fontSize: 13 }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
              <button
                type="button"
                onClick={generate}
                disabled={generating || !prompt.trim()}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: body,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#FFFBF0",
                  background: ACC,
                  border: "none",
                  padding: "10px 18px",
                  borderRadius: 999,
                  cursor: generating ? "wait" : prompt.trim() ? "pointer" : "not-allowed",
                  opacity: generating || !prompt.trim() ? 0.7 : 1,
                }}
              >
                <SparkleIcon
                  size={14}
                  color="#FFFBF0"
                  fill="#FFFBF0"
                  style={{ animation: generating ? "spin-anim 0.8s linear infinite" : undefined }}
                />
                {generating ? "Planerar…" : "Generera förslag"}
              </button>
            </div>
            {err ? <div style={{ marginTop: 12, fontFamily: body, fontSize: 12, color: LINGON }}>{err}</div> : null}
            {justSaved ? (
              <div style={{ marginTop: 12, fontFamily: body, fontSize: 12, color: t.ink, display: "inline-flex", gap: 6, alignItems: "center" }}>
                <span style={{ width: 14, height: 14, borderRadius: 999, background: SAGE, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="#FFFBF0" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12.5 9 17l11-11" />
                  </svg>
                </span>
                {justSaved.created} pass sparade till Notion
                {justSaved.errors > 0 ? ` (${justSaved.errors} fel)` : ""}.
              </div>
            ) : null}
          </>
        ) : (
          <DraftPanel
            draft={draft}
            regenIndex={regenIndex}
            revising={revising}
            saving={saving}
            err={err}
            draftErr={draftErr}
            feedback={feedback}
            setFeedback={setFeedback}
            regenerateOne={regenerateOne}
            revise={revise}
            save={save}
            cancel={() => setDraft(null)}
          />
        )}
      </div>
    </div>
  );
}

function DraftPanel({
  draft,
  regenIndex,
  revising,
  saving,
  err,
  draftErr,
  feedback,
  setFeedback,
  regenerateOne,
  revise,
  save,
  cancel,
}: {
  draft: CoachDraft;
  regenIndex: number | null;
  revising: boolean;
  saving: boolean;
  err: string | null;
  draftErr: { message: string; rawText?: string } | null;
  feedback: string;
  setFeedback: (v: string) => void;
  regenerateOne: (i: number) => void;
  revise: () => void;
  save: () => void;
  cancel: () => void;
}) {
  const { t } = useWarmTheme();
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 12 }}>
        <span style={{ fontFamily: body, fontSize: 16, color: t.dim, marginTop: -2 }} aria-hidden="true">
          “
        </span>
        <span style={{ ...ital(t, 12), flex: 1, lineHeight: 1.5 }}>{draft.originalPrompt}</span>
      </div>
      {draft.commentary ? (
        <p style={{ fontFamily: body, fontSize: 13, color: t.ink, lineHeight: 1.5, marginBottom: 12, whiteSpace: "pre-wrap" }}>
          {draft.commentary}
        </p>
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {draft.plan.map((p, i) => {
          const isRegenerating = regenIndex === i;
          const anyRegenerating = regenIndex !== null;
          return (
            <div
              key={`${p.datum}-${i}`}
              style={{
                background: t.paperHi,
                border: `1px solid ${t.line}`,
                borderLeft: `3px solid ${sportColor(p.typ ?? "")}`,
                borderRadius: 10,
                padding: "10px 12px",
                opacity: isRegenerating ? 0.5 : 1,
                transition: "opacity 0.2s ease-out",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {sportIcon(p.typ ?? "", 14, sportColor(p.typ ?? ""))}
                <span
                  style={{
                    fontFamily: body,
                    fontSize: 13,
                    fontWeight: 600,
                    color: t.ink,
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.passnamn || p.typ || "Pass"}
                </span>
                <span style={{ fontFamily: body, fontSize: 11, color: t.mute, flexShrink: 0 }} className="warm-tab-nums">
                  {p.datum}
                </span>
                <button
                  type="button"
                  onClick={() => regenerateOne(i)}
                  disabled={anyRegenerating || revising || saving}
                  aria-label="Regenerera detta pass"
                  title="Byt ut detta pass"
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: anyRegenerating || revising || saving ? "wait" : "pointer",
                    color: t.mute,
                    padding: 2,
                  }}
                >
                  <RefreshIcon size={14} color={t.mute} style={{ animation: isRegenerating ? "spin-anim 0.8s linear infinite" : undefined }} />
                </button>
              </div>
              {p.syfte ? <div style={{ ...ital(t, 11), marginTop: 4 }}>{p.syfte}</div> : null}
              {p.tid || p.tempo || p.pulsintervall ? (
                <div style={{ fontFamily: body, fontSize: 11, color: t.mute, marginTop: 4 }} className="warm-tab-nums">
                  {[p.tid, p.tempo, p.pulsintervall].filter(Boolean).join(" · ")}
                </div>
              ) : null}
              {p.passdetaljer ? (
                <div style={{ fontFamily: body, fontSize: 11, color: t.mute, marginTop: 4, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                  {p.passdetaljer}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Feedback */}
      <div style={{ marginTop: 14, background: t.paperHi, border: `1px solid ${t.line}`, borderRadius: 10, padding: 14 }}>
        <div style={{ ...lab(t, { marginBottom: 8 }) }}>Ändra förslaget</div>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={3}
          disabled={revising || regenIndex !== null || saving}
          placeholder="t.ex. Byt tisdagspasset till en lugn promenad istället, och gör långpasset lite kortare."
          style={{ ...inputStyle(t), resize: "vertical", fontFamily: "inherit", fontSize: 13 }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
          <button
            type="button"
            onClick={revise}
            disabled={revising || !feedback.trim() || regenIndex !== null || saving}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontFamily: body,
              fontSize: 12,
              fontWeight: 600,
              color: "#FFFBF0",
              background: ACC,
              border: "none",
              padding: "8px 16px",
              borderRadius: 999,
              cursor: revising ? "wait" : feedback.trim() ? "pointer" : "not-allowed",
              opacity: revising || !feedback.trim() ? 0.7 : 1,
            }}
          >
            <SendIcon size={12} color="#FFFBF0" style={{ animation: revising ? "spin-anim 0.8s linear infinite" : undefined }} />
            {revising ? "Uppdaterar…" : "Uppdatera plan"}
          </button>
        </div>
        {draftErr ? (
          <div style={{ marginTop: 10, border: `1px solid ${LINGON}`, padding: "8px 10px", borderRadius: 8 }}>
            <div style={{ fontFamily: body, fontSize: 12, color: LINGON, lineHeight: 1.4 }}>{draftErr.message}</div>
            {draftErr.rawText ? (
              <details style={{ marginTop: 6 }}>
                <summary style={{ fontFamily: body, fontSize: 11, color: t.mute, cursor: "pointer" }}>Visa Claudes råsvar</summary>
                <pre
                  style={{
                    background: t.paper,
                    color: t.mute,
                    padding: 8,
                    fontFamily: body,
                    fontSize: 10,
                    marginTop: 8,
                    maxHeight: 180,
                    overflow: "auto",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    borderRadius: 6,
                  }}
                >
                  {draftErr.rawText}
                </pre>
              </details>
            ) : null}
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
        <button
          type="button"
          onClick={cancel}
          disabled={saving || revising || regenIndex !== null}
          style={{
            fontFamily: body,
            fontSize: 12,
            fontWeight: 600,
            color: t.mute,
            background: "transparent",
            border: `1px solid ${t.line}`,
            padding: "8px 14px",
            borderRadius: 999,
            cursor: "pointer",
          }}
        >
          Kasta förslag
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving || revising || regenIndex !== null}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontFamily: body,
            fontSize: 12,
            fontWeight: 600,
            color: "#FFFBF0",
            background: ACC,
            border: "none",
            padding: "8px 16px",
            borderRadius: 999,
            cursor: saving ? "wait" : "pointer",
            opacity: saving || revising || regenIndex !== null ? 0.7 : 1,
          }}
        >
          {saving ? <RefreshIcon size={12} color="#FFFBF0" style={{ animation: "spin-anim 0.8s linear infinite" }} /> : null}
          Spara {draft.plan.length} pass
        </button>
      </div>
      {err ? <div style={{ marginTop: 10, fontFamily: body, fontSize: 12, color: LINGON }}>{err}</div> : null}
      <div style={{ ...ital(t, 10, t.dim), marginTop: 10 }} className="warm-tab-nums">
        {draft.model} · {draft.inputTokens + draft.outputTokens} tokens
      </div>
    </div>
  );
}

void AMBER; void CalendarIcon; void useEffect;

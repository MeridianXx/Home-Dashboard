"use client";

// ─── Fitness · Coach ─────────────────────────────────────────────────────────
// Kalender över planerade pass (vecko-/månadsvy), CRUD mot Notion samt
// AI-plan-generering som skriver nya pass direkt till Notion.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { workoutSlug } from "@/lib/fitness/slug";
import { paceString, durationString } from "@/lib/fitness/parser";
import { matchWorkoutsToPlans, workoutKey } from "@/lib/fitness/match";
import ErrorBanner from "@/components/ErrorBanner";
import type { PlannedWorkout, PlansResponse, Workout, WorkoutsResponse } from "@/lib/fitness/types";

// ─── Hjälpare ────────────────────────────────────────────────────────────────

const TYPE_OPTIONS = ["Löpning", "Cykling", "Styrka", "Core", "Simning", "Annat"];
const STATUS_OPTIONS = ["Planerat", "Genomfört", "Inställt"];
const UNDERLAG_OPTIONS = ["Asfalt", "Grus", "Terräng", "Inomhus", "Löpband"];

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

function SectionTitle({ icon, children, right }: {
  icon: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2
        className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
        style={{ color: "var(--color-on-surface-variant)" }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{icon}</span>
        {children}
      </h2>
      {right}
    </div>
  );
}

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

/** Måndag i den vecka `d` ligger i (lokal tid, svensk kalender). */
function mondayOf(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0=sön
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function typeCategory(type: string): "run" | "walk" | "bike" | "strength" | "core" | "swim" | "ski" | "padel" | "yoga" | "other" {
  const t = (type ?? "").toLowerCase();
  if (t.includes("löp") || t.includes("run")) return "run";
  if (t.includes("promenad") || t.includes("walk")) return "walk";
  if (t.includes("cykl") || t.includes("bike") || t.includes("cycl")) return "bike";
  if (t.includes("styr") || t.includes("strength")) return "strength";
  if (t.includes("core")) return "core";
  if (t.includes("sim") || t.includes("swim")) return "swim";
  if (t.includes("skid") || t.includes("ski")) return "ski";
  if (t.includes("padel")) return "padel";
  if (t.includes("yoga")) return "yoga";
  return "other";
}

function typeIcon(type: string): string {
  switch (typeCategory(type)) {
    case "run": return "directions_run";
    case "walk": return "directions_walk";
    case "bike": return "directions_bike";
    case "strength": return "exercise";
    case "core": return "exercise";
    case "swim": return "pool";
    case "ski": return "downhill_skiing";
    case "padel": return "sports_tennis";
    case "yoga": return "self_improvement";
    default: return "fitness_center";
  }
}

function typeColor(type: string): string {
  // Mjuk färg per typ (samma pulszon-palett men mappat per sport)
  switch (typeCategory(type)) {
    case "run": return "#ef8a5c";
    case "walk": return "#7fb8a3";
    case "bike": return "#a7c4ff";
    case "strength": return "#7fb8a3";
    case "core": return "#fab849";
    case "swim": return "#a7c4ff";
    case "ski": return "#a7c4ff";
    case "padel": return "#e5484d";
    case "yoga": return "#c4a5ff";
    default: return "var(--color-primary)";
  }
}

function statusBadgeColor(status: string): { bg: string; fg: string } {
  switch (status) {
    case "Genomfört":
      return { bg: "#7fb8a3", fg: "#ffffff" };
    case "Inställt":
      return { bg: "var(--color-outline-variant)", fg: "var(--color-on-surface-variant)" };
    default:
      return { bg: "var(--color-primary-container)", fg: "var(--color-on-primary-container)" };
  }
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

// ─── API-helpers ─────────────────────────────────────────────────────────────

async function apiCreate(input: Partial<PlannedWorkout>): Promise<void> {
  const res = await fetch("/api/fitness/plans", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
}

async function apiUpdate(id: string, patch: Partial<PlannedWorkout>): Promise<void> {
  const res = await fetch(`/api/fitness/plans/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
}

async function apiArchive(id: string): Promise<void> {
  const res = await fetch(`/api/fitness/plans/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
}

// ─── Genomfört pass (länk till pass-detaljvyn) ───────────────────────────────

function DonePill({ workout }: { workout: Workout }) {
  const color = typeColor(workout.type);
  const title = workout.distanceM > 0
    ? `${(workout.distanceM / 1000).toFixed(2)} km`
    : workout.type;
  const sub = workout.distanceM > 0 && workout.totalTimeSec > 0
    ? `${durationString(workout.totalTimeSec)} · ${paceString(workout.distanceM, workout.totalTimeSec)}/km`
    : durationString(workout.totalTimeSec);
  return (
    <Link
      href={`/fitness/pass/${workoutSlug(workout)}`}
      className="rounded-lg block"
      style={{
        backgroundColor: "var(--color-surface-container-lowest)",
        border: "1px dashed var(--color-outline-variant)",
        borderLeft: `3px solid ${color}`,
        padding: "6px 10px",
        width: "100%",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <span
          className="material-symbols-outlined shrink-0"
          style={{
            fontSize: 14,
            color: "#7fb8a3",
            fontVariationSettings: "'FILL' 1",
          }}
          aria-hidden="true"
        >
          check_circle
        </span>
        <span
          className="material-symbols-outlined shrink-0"
          style={{ fontSize: 13, color }}
          aria-hidden="true"
        >
          {typeIcon(workout.type)}
        </span>
        <span
          className="truncate text-[11px] font-semibold"
          style={{ color: "var(--color-on-surface)", lineHeight: 1.15 }}
        >
          {title}
        </span>
      </div>
      {sub && (
        <div
          className="text-[10px] mt-0.5 tabular-nums truncate"
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          {sub}
          {workout.avgHR ? ` · ${Math.round(workout.avgHR)} bpm` : ""}
        </div>
      )}
    </Link>
  );
}

// ─── Pass-ikon (badge) ───────────────────────────────────────────────────────

function PassPill({ plan, compact, onClick, linkedWorkout }: {
  plan: PlannedWorkout;
  compact?: boolean;
  onClick: () => void;
  /** Om det planerade passet matchats mot ett genomfört pass: rendera som klar + länka till detaljsidan. */
  linkedWorkout?: Workout | null;
}) {
  const color = typeColor(plan.typ);
  const isLinked = Boolean(linkedWorkout);
  const isDone = isLinked || plan.status === "Genomfört";
  const cancelled = plan.status === "Inställt";
  const movedToOtherDay = linkedWorkout && linkedWorkout.date !== plan.datum;
  const movedLabel = movedToOtherDay
    ? new Date(linkedWorkout!.date).toLocaleDateString("sv-SE", { weekday: "short", day: "numeric" }).replace(".", "")
    : null;

  const commonStyle: React.CSSProperties = {
    backgroundColor: "var(--color-surface-container)",
    border: "1px solid var(--color-outline-variant)",
    borderLeft: `3px solid ${color}`,
    padding: compact ? "4px 6px" : "8px 10px",
    cursor: "pointer",
    width: "100%",
    opacity: cancelled ? 0.55 : 1,
    display: "block",
    textDecoration: "none",
    color: "inherit",
  };

  const body = (
    <>
      <div className="flex items-center gap-1.5 min-w-0">
        {isLinked && (
          <span
            className="material-symbols-outlined shrink-0"
            style={{ fontSize: compact ? 13 : 14, color: "#7fb8a3", fontVariationSettings: "'FILL' 1" }}
            aria-hidden="true"
          >
            check_circle
          </span>
        )}
        <span
          className="material-symbols-outlined shrink-0"
          style={{ fontSize: compact ? 13 : 15, color }}
          aria-hidden="true"
        >
          {typeIcon(plan.typ)}
        </span>
        <span
          className="truncate text-[11px] font-semibold"
          style={{ color: "var(--color-on-surface)", lineHeight: 1.15 }}
        >
          {plan.passnamn || plan.typ || "Pass"}
        </span>
        {movedLabel && (
          <span
            className="font-medium shrink-0 tabular-nums"
            style={{
              color: "var(--color-on-surface-variant)",
              marginLeft: 4,
              fontSize: 9,
              lineHeight: 1.15,
              letterSpacing: 0.1,
            }}
          >
            → {movedLabel}
          </span>
        )}
      </div>
      {!compact && (plan.tid || plan.tempo) && (
        <div
          className="text-[10px] mt-0.5 truncate"
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          {[plan.tid, plan.tempo].filter(Boolean).join(" · ")}
        </div>
      )}
    </>
  );

  if (linkedWorkout) {
    return (
      <Link
        href={`/fitness/pass/${workoutSlug(linkedWorkout)}`}
        className="rounded-lg text-left w-full"
        style={commonStyle}
      >
        {body}
      </Link>
    );
  }

  return (
    <button
      onClick={onClick}
      className="rounded-lg text-left w-full"
      style={commonStyle}
    >
      {body}
    </button>
  );
}

// ─── Vecko-vy ────────────────────────────────────────────────────────────────

function WeekView({ monday, plansByDate, workoutsByDate, planToWorkout, consumedWorkouts, onOpen }: {
  monday: Date;
  plansByDate: Map<string, PlannedWorkout[]>;
  workoutsByDate: Map<string, Workout[]>;
  /** planId → matchat genomfört pass */
  planToWorkout: Map<string, Workout>;
  /** workoutKey för pass som redan är kopplade till en plan (ska inte dupliceras) */
  consumedWorkouts: Set<string>;
  onOpen: (plan: PlannedWorkout | { datum: string }) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const today = isoDate(new Date());
  const dayNames = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];

  return (
    <div className="space-y-2">
      {days.map((d, i) => {
        const iso = isoDate(d);
        const items = plansByDate.get(iso) ?? [];
        const rawDone = workoutsByDate.get(iso) ?? [];
        // Dölj genomförda pass som redan är kopplade till en PassPill (på denna
        // eller annan dag) — deras länk når man via pillen istället.
        const done = rawDone.filter((w) => !consumedWorkouts.has(workoutKey(w)));
        const isToday = iso === today;
        const isPast = iso < today;
        const empty = items.length === 0 && done.length === 0;
        return (
          <div
            key={iso}
            className="rounded-xl"
            style={{
              backgroundColor: "var(--color-surface-container)",
              border: isToday
                ? "1px solid var(--color-primary)"
                : "1px solid var(--color-outline-variant)",
              padding: 10,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-baseline gap-2">
                <span
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: isToday ? "var(--color-primary)" : "var(--color-on-surface-variant)" }}
                >
                  {dayNames[i]}
                </span>
                <span
                  className="text-sm font-semibold tabular-nums"
                  style={{ color: "var(--color-on-surface)" }}
                >
                  {d.getDate()} {d.toLocaleDateString("sv-SE", { month: "short" }).replace(".", "")}
                </span>
                {isToday && (
                  <span
                    className="text-[10px] font-bold rounded-full"
                    style={{
                      backgroundColor: "var(--color-primary)",
                      color: "var(--color-on-primary)",
                      padding: "2px 8px",
                      lineHeight: 1.2,
                    }}
                  >
                    IDAG
                  </span>
                )}
              </div>
              <button
                onClick={() => onOpen({ datum: iso })}
                aria-label="Lägg till pass"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-on-surface-variant)",
                  padding: 0,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add_circle</span>
              </button>
            </div>
            {empty ? (
              <div className="text-xs italic" style={{ color: "var(--color-outline)" }}>
                {isPast ? "Inga pass" : "Vilodag"}
              </div>
            ) : (
              <div className="space-y-1.5">
                {items.map((p) => (
                  <PassPill
                    key={p.id}
                    plan={p}
                    linkedWorkout={planToWorkout.get(p.id) ?? null}
                    onClick={() => onOpen(p)}
                  />
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

// ─── Månads-vy ───────────────────────────────────────────────────────────────

function MonthView({ anchor, plansByDate, workoutsByDate, planToWorkout, consumedWorkouts, onOpen }: {
  anchor: Date;
  plansByDate: Map<string, PlannedWorkout[]>;
  workoutsByDate: Map<string, Workout[]>;
  planToWorkout: Map<string, Workout>;
  consumedWorkouts: Set<string>;
  onOpen: (plan: PlannedWorkout | { datum: string }) => void;
}) {
  // Första dag i månaden + antal dagar
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = mondayOf(firstOfMonth);
  // 6 veckor täcker alltid hela månaden
  const cells: Date[] = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const currentMonth = anchor.getMonth();
  const today = isoDate(new Date());
  const dayNames = ["M", "T", "O", "T", "F", "L", "S"];

  return (
    <div>
      <div
        className="grid"
        style={{
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap: 2,
          marginBottom: 4,
        }}
      >
        {dayNames.map((n, i) => (
          <div
            key={i}
            className="text-center text-[10px] font-bold uppercase tracking-wider"
            style={{ color: "var(--color-on-surface-variant)", padding: "4px 0" }}
          >
            {n}
          </div>
        ))}
      </div>
      <div
        className="grid"
        style={{
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap: 2,
        }}
      >
        {cells.map((d, i) => {
          const iso = isoDate(d);
          const items = plansByDate.get(iso) ?? [];
          const rawDone = workoutsByDate.get(iso) ?? [];
          // Matchade workouts visas via planens prick — dubbla inte.
          const done = rawDone.filter((w) => !consumedWorkouts.has(workoutKey(w)));
          const allDots = [
            ...items.map((p) => ({
              color: typeColor(p.typ),
              dim: p.status === "Inställt",
              // Plan som matchats → rendera som "done" (ring) istället för fylld prick.
              done: planToWorkout.has(p.id) || p.status === "Genomfört",
            })),
            ...done.map((w) => ({ color: typeColor(w.type), dim: false, done: true })),
          ];
          const inMonth = d.getMonth() === currentMonth;
          const isToday = iso === today;
          return (
            <button
              key={i}
              onClick={() => {
                if (items.length === 1 && done.length === 0) onOpen(items[0]);
                else onOpen({ datum: iso });
              }}
              className="rounded-md flex flex-col items-stretch"
              style={{
                aspectRatio: "1 / 1.15",
                backgroundColor: inMonth
                  ? "var(--color-surface-container)"
                  : "var(--color-surface-container-lowest)",
                border: isToday
                  ? "1px solid var(--color-primary)"
                  : "1px solid var(--color-outline-variant)",
                padding: 3,
                cursor: "pointer",
                minHeight: 42,
                opacity: inMonth ? 1 : 0.55,
              }}
            >
              <div
                className="text-[10px] font-semibold tabular-nums text-right"
                style={{ color: isToday ? "var(--color-primary)" : "var(--color-on-surface)" }}
              >
                {d.getDate()}
              </div>
              <div className="flex flex-wrap gap-0.5 mt-auto justify-center">
                {allDots.slice(0, 3).map((dot, k) => (
                  <span
                    key={k}
                    aria-hidden="true"
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      backgroundColor: dot.color,
                      opacity: dot.dim ? 0.4 : 1,
                      // Genomförda pass får en ring, planerade är ifyllda
                      border: dot.done ? `1px solid ${dot.color}` : undefined,
                      backgroundImage: dot.done
                        ? "linear-gradient(var(--color-surface-container), var(--color-surface-container))"
                        : undefined,
                      backgroundOrigin: dot.done ? "border-box" : undefined,
                      backgroundClip: dot.done ? "padding-box" : undefined,
                    }}
                  />
                ))}
                {allDots.length > 3 && (
                  <span
                    className="text-[8px] font-semibold tabular-nums"
                    style={{ color: "var(--color-on-surface-variant)", lineHeight: 1 }}
                  >
                    +{allDots.length - 3}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Skapa/redigera-modal ────────────────────────────────────────────────────

type Draft = Partial<PlannedWorkout> & { datum: string };

function PlanModal({ draft, onClose, onSave, onDelete }: {
  draft: Draft;
  onClose: () => void;
  onSave: (d: Draft) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
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

  // Portal-rendera modalen direkt till body — annars fastnar den i
  // dashboard-layoutens motion.div stacking context och hamnar under MobileNav.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(4px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: "0 8px 8px 8px",
      }}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        className="rounded-2xl w-full"
        style={{
          backgroundColor: "var(--color-surface-container-lowest)",
          border: "1px solid var(--color-card-border)",
          maxWidth: 520,
          maxHeight: "90vh",
          overflowY: "auto",
          padding: 20,
          marginBottom: "max(16px, env(safe-area-inset-bottom))",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3
            className="text-lg font-bold"
            style={{ color: "var(--color-on-surface)" }}
          >
            {isEdit ? "Redigera pass" : "Nytt pass"}
          </h3>
          <button
            onClick={onClose}
            aria-label="Stäng"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-on-surface-variant)",
              padding: 4,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
          </button>
        </div>

        <div className="space-y-3">
          <Field label="Passnamn">
            <input
              type="text"
              value={form.passnamn ?? ""}
              onChange={(e) => upd({ passnamn: e.target.value })}
              placeholder="t.ex. Tröskel 5×1 km"
              style={inputStyle()}
            />
          </Field>

          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
            <Field label="Datum">
              <input
                type="date"
                value={form.datum}
                onChange={(e) => upd({ datum: e.target.value })}
                style={inputStyle()}
              />
            </Field>
            <Field label="Typ">
              <SelectBox
                value={form.typ ?? ""}
                options={TYPE_OPTIONS}
                placeholder="Välj…"
                onChange={(v) => upd({ typ: v })}
              />
            </Field>
          </div>

          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
            <Field label="Tid / längd">
              <input
                type="text"
                value={form.tid ?? ""}
                onChange={(e) => upd({ tid: e.target.value })}
                placeholder="t.ex. 55 min"
                style={inputStyle()}
              />
            </Field>
            <Field label="Tempo">
              <input
                type="text"
                value={form.tempo ?? ""}
                onChange={(e) => upd({ tempo: e.target.value })}
                placeholder="t.ex. 4:20/km"
                style={inputStyle()}
              />
            </Field>
          </div>

          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
            <Field label="Pulsintervall">
              <input
                type="text"
                value={form.pulsintervall ?? ""}
                onChange={(e) => upd({ pulsintervall: e.target.value })}
                placeholder="t.ex. Z3, 160–170"
                style={inputStyle()}
              />
            </Field>
            <Field label="Underlag">
              <SelectBox
                value={form.underlag ?? ""}
                options={UNDERLAG_OPTIONS}
                placeholder="Välj…"
                onChange={(v) => upd({ underlag: v })}
              />
            </Field>
          </div>

          <Field label="Syfte">
            <textarea
              value={form.syfte ?? ""}
              onChange={(e) => upd({ syfte: e.target.value })}
              rows={2}
              placeholder="Kort om passets mål"
              style={{ ...inputStyle(), resize: "vertical", fontFamily: "inherit" }}
            />
          </Field>

          <Field label="Passdetaljer">
            <textarea
              value={form.passdetaljer ?? ""}
              onChange={(e) => upd({ passdetaljer: e.target.value })}
              rows={4}
              placeholder="Upplägg, intervaller, etc."
              style={{ ...inputStyle(), resize: "vertical", fontFamily: "inherit" }}
            />
          </Field>

          <Field label="Status">
            <SelectBox
              value={form.status ?? "Planerat"}
              options={STATUS_OPTIONS}
              onChange={(v) => upd({ status: v })}
            />
          </Field>
        </div>

        {err && (
          <div
            className="text-xs mt-3 flex items-center gap-1.5"
            style={{ color: "var(--color-error, #b3261e)" }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>error</span>
            {err}
          </div>
        )}

        <div
          className="flex items-center gap-2"
          style={{
            marginTop: 20,
            paddingTop: 16,
            borderTop: "1px solid var(--color-outline-variant)",
          }}
        >
          {isEdit && onDelete && (
            <button
              onClick={del}
              disabled={saving}
              className="text-xs font-semibold rounded-full"
              style={{
                backgroundColor: "transparent",
                color: "var(--color-error, #b3261e)",
                border: "1px solid var(--color-outline-variant)",
                padding: "8px 14px",
                cursor: saving ? "wait" : "pointer",
              }}
            >
              Arkivera
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            disabled={saving}
            className="text-xs font-semibold rounded-full"
            style={{
              backgroundColor: "transparent",
              color: "var(--color-on-surface-variant)",
              border: "1px solid var(--color-outline-variant)",
              padding: "8px 14px",
              cursor: saving ? "wait" : "pointer",
            }}
          >
            Avbryt
          </button>
          <button
            onClick={save}
            disabled={saving || !form.datum}
            className="text-xs font-semibold rounded-full flex items-center gap-1.5"
            style={{
              backgroundColor: "var(--color-primary)",
              color: "var(--color-on-primary)",
              border: "none",
              padding: "8px 16px",
              cursor: saving ? "wait" : "pointer",
              opacity: saving || !form.datum ? 0.7 : 1,
            }}
          >
            {saving && (
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 12, animation: "spin-anim 0.8s linear infinite" }}
              >
                progress_activity
              </span>
            )}
            {isEdit ? "Spara" : "Skapa"}
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}

// ─── Enskilt AI-pass-modal ───────────────────────────────────────────────────

function SingleAIModal({ initial, onClose, onSaved }: {
  initial: { date: string; hint: string };
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [date, setDate] = useState(initial.date);
  const [hint, setHint] = useState(initial.hint);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Partial<PlannedWorkout> & { datum: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;

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
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      if (!body.item) throw new Error("Claude returnerade inget pass-objekt.");
      setDraft(body.item);
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
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      await onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(4px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: "0 8px 8px 8px",
      }}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        className="rounded-2xl w-full"
        style={{
          backgroundColor: "var(--color-surface-container-lowest)",
          border: "1px solid var(--color-card-border)",
          maxWidth: 520,
          maxHeight: "90vh",
          overflowY: "auto",
          padding: 20,
          marginBottom: "max(16px, env(safe-area-inset-bottom))",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3
            className="text-lg font-bold flex items-center gap-2"
            style={{ color: "var(--color-on-surface)" }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 20, color: "var(--color-primary)" }}
            >
              auto_awesome
            </span>
            AI-pass för en dag
          </h3>
          <button
            onClick={onClose}
            aria-label="Stäng"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-on-surface-variant)",
              padding: 4,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
          </button>
        </div>

        {!draft ? (
          <div className="space-y-3">
            <p className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
              Coachen väljer pass utifrån ditt aktuella formläge (TSB/CTL/ATL) och planerad backlog runt datumet.
            </p>
            <Field label="Datum">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={inputStyle()}
              />
            </Field>
            <Field label="Riktning (valfri)">
              <input
                type="text"
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                placeholder="t.ex. 'har 45 min' eller 'lätt återhämtning'"
                style={inputStyle()}
              />
            </Field>
            {err && (
              <div className="text-xs flex items-start gap-1.5" style={{ color: "var(--color-error, #b3261e)" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>error</span>
                <span>{err}</span>
              </div>
            )}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={onClose}
                className="text-xs font-semibold rounded-full"
                style={{
                  backgroundColor: "transparent",
                  color: "var(--color-on-surface-variant)",
                  border: "1px solid var(--color-outline-variant)",
                  padding: "8px 16px",
                  cursor: "pointer",
                }}
              >
                Avbryt
              </button>
              <button
                onClick={generate}
                disabled={generating}
                className="flex items-center gap-1.5 text-xs font-semibold rounded-full"
                style={{
                  backgroundColor: "var(--color-primary-container)",
                  color: "var(--color-on-primary-container)",
                  border: "1px solid var(--color-outline-variant)",
                  padding: "8px 16px",
                  cursor: generating ? "wait" : "pointer",
                  opacity: generating ? 0.7 : 1,
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: 14,
                    animation: generating ? "spin-anim 0.8s linear infinite" : undefined,
                  }}
                >
                  {generating ? "progress_activity" : "auto_awesome"}
                </span>
                {generating ? "Planerar…" : "Generera"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div
              className="rounded-xl p-4"
              style={{ backgroundColor: "var(--color-surface-container)" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 18, color: "var(--color-primary)" }}
                >
                  {typeIcon(draft.typ ?? "")}
                </span>
                <div className="font-bold text-base" style={{ color: "var(--color-on-surface)" }}>
                  {draft.passnamn ?? draft.typ ?? "Pass"}
                </div>
              </div>
              <div className="text-xs tabular-nums mb-3" style={{ color: "var(--color-on-surface-variant)" }}>
                {draft.datum} · {draft.typ ?? "Annat"}{draft.tid ? ` · ${draft.tid}` : ""}
              </div>
              {draft.syfte && (
                <p
                  className="text-sm mb-2"
                  style={{ color: "var(--color-on-surface)", lineHeight: 1.5 }}
                >
                  {draft.syfte}
                </p>
              )}
              {draft.passdetaljer && (
                <p
                  className="text-xs mt-2"
                  style={{
                    color: "var(--color-on-surface-variant)",
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.5,
                  }}
                >
                  {draft.passdetaljer}
                </p>
              )}
              {(draft.pulsintervall || draft.tempo || draft.underlag) && (
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-[11px]" style={{ color: "var(--color-on-surface-variant)" }}>
                  {draft.pulsintervall && <span>Puls: <span style={{ color: "var(--color-on-surface)" }}>{draft.pulsintervall}</span></span>}
                  {draft.tempo && <span>Tempo: <span style={{ color: "var(--color-on-surface)" }}>{draft.tempo}</span></span>}
                  {draft.underlag && <span>Underlag: <span style={{ color: "var(--color-on-surface)" }}>{draft.underlag}</span></span>}
                </div>
              )}
            </div>
            {err && (
              <div className="text-xs flex items-start gap-1.5" style={{ color: "var(--color-error, #b3261e)" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>error</span>
                <span>{err}</span>
              </div>
            )}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setDraft(null)}
                disabled={saving}
                className="flex items-center gap-1.5 text-xs font-semibold rounded-full"
                style={{
                  backgroundColor: "transparent",
                  color: "var(--color-on-surface-variant)",
                  border: "1px solid var(--color-outline-variant)",
                  padding: "8px 16px",
                  cursor: saving ? "wait" : "pointer",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>refresh</span>
                Ny variant
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-1.5 text-xs font-semibold rounded-full"
                style={{
                  backgroundColor: "var(--color-primary)",
                  color: "var(--color-on-primary)",
                  border: "none",
                  padding: "8px 16px",
                  cursor: saving ? "wait" : "pointer",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: 14,
                    animation: saving ? "spin-anim 0.8s linear infinite" : undefined,
                  }}
                >
                  {saving ? "progress_activity" : "check"}
                </span>
                {saving ? "Sparar…" : "Spara"}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>,
    document.body,
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block" style={{ minWidth: 0 }}>
      <div
        className="text-[10px] font-semibold uppercase tracking-wider mb-1"
        style={{ color: "var(--color-on-surface-variant)" }}
      >
        {label}
      </div>
      {children}
    </label>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    boxSizing: "border-box",
    backgroundColor: "var(--color-surface-container)",
    color: "var(--color-on-surface)",
    border: "1px solid var(--color-outline-variant)",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 14,
    outline: "none",
  };
}

function SelectBox({ value, options, onChange, placeholder }: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputStyle(), appearance: "none", paddingRight: 32 }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <span
        className="material-symbols-outlined"
        style={{
          position: "absolute",
          right: 8,
          top: "50%",
          transform: "translateY(-50%)",
          fontSize: 18,
          color: "var(--color-on-surface-variant)",
          pointerEvents: "none",
        }}
      >
        expand_more
      </span>
    </div>
  );
}

// ─── AI-plan-sektion ─────────────────────────────────────────────────────────

type DraftItem = Partial<PlannedWorkout> & { datum: string };

interface CoachDraft {
  /** Originalprompten som triggade förslaget — sparas så regen/revise kan anropas
   *  även efter att textrutan rensats. */
  originalPrompt: string;
  commentary: string;
  plan: DraftItem[];
  model: string;
  inputTokens: number;
  outputTokens: number;
}

function AIPlanSection({ onApplied }: { onApplied: () => Promise<void> }) {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [draft, setDraft] = useState<CoachDraft | null>(null);
  const [justSaved, setJustSaved] = useState<{ created: number; errors: number } | null>(null);
  // Regen-per-pass: index för pass som just nu uppdateras
  const [regenIndex, setRegenIndex] = useState<number | null>(null);
  // Chat-revision: feedback-text + loading
  const [feedback, setFeedback] = useState("");
  const [revising, setRevising] = useState(false);
  // Fel lokalt i draft-vyn (revise/regen) — separat från det stora err högst upp
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
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      if (!body.plan || body.plan.length === 0) {
        throw new Error("Claude returnerade ingen strukturerad plan. Prova att formulera om.");
      }
      setDraft({ ...body, originalPrompt: prompt });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  };

  /** Byt ut ett enskilt pass. `hint` är valfritt — om satt skickas det med som
   *  adeptens specifika önskan för det passet. */
  const regenerateOne = async (index: number, hint?: string) => {
    if (!draft || regenIndex !== null) return;
    setRegenIndex(index);
    setDraftErr(null);
    try {
      const res = await fetch("/api/fitness/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          regenerate: {
            prompt: draft.originalPrompt,
            plan: draft.plan,
            index,
            hint,
          },
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setDraftErr({ message: body.error ?? `HTTP ${res.status}`, rawText: body.rawText });
        return;
      }
      if (!body.item) {
        setDraftErr({ message: "Claude returnerade inget pass-objekt." });
        return;
      }
      setDraft({
        ...draft,
        plan: draft.plan.map((p, i) => (i === index ? body.item : p)),
        inputTokens: draft.inputTokens + (body.inputTokens ?? 0),
        outputTokens: draft.outputTokens + (body.outputTokens ?? 0),
      });
    } catch (e) {
      setDraftErr({ message: e instanceof Error ? e.message : String(e) });
    } finally {
      setRegenIndex(null);
    }
  };

  /** Revidera hela planen utifrån fri-text-feedback. */
  const revise = async () => {
    if (!draft || revising || !feedback.trim()) return;
    setRevising(true);
    setDraftErr(null);
    try {
      const res = await fetch("/api/fitness/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          revise: {
            prompt: draft.originalPrompt,
            plan: draft.plan,
            feedback,
          },
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setDraftErr({ message: body.error ?? `HTTP ${res.status}`, rawText: body.rawText });
        return;
      }
      if (!body.plan || body.plan.length === 0) {
        setDraftErr({
          message: "Claude returnerade ingen strukturerad plan.",
          rawText: body.rawText,
        });
        return;
      }
      setDraft({
        originalPrompt: draft.originalPrompt,
        commentary: body.commentary,
        plan: body.plan,
        model: body.model,
        inputTokens: draft.inputTokens + (body.inputTokens ?? 0),
        outputTokens: draft.outputTokens + (body.outputTokens ?? 0),
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
      // Skicka de redan-genererade passen direkt — ingen ny Claude-körning.
      // Det som visas är det som sparas.
      const res = await fetch("/api/fitness/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items: draft.plan }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      const created = body.created?.length ?? 0;
      const errs = body.errors?.length ?? 0;
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
    <Card>
      <SectionTitle icon="auto_awesome">AI-planering</SectionTitle>

      {/* Prompt-input visas bara när inget förslag är genererat. När draft finns
          är originalprompten redan bakad in i förslaget — att ha inputen kvar
          är bara redundant. */}
      {!draft && (
        <>
          <p className="text-sm mb-3" style={{ color: "var(--color-on-surface-variant)" }}>
            Beskriv vad du vill träna så föreslår coachen pass utifrån din profil, nuvarande form och historik. Du får granska innan något sparas.
          </p>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="t.ex. Planera 2 veckor med en långpass per vecka och ett intervallpass. Ingen träning på onsdagar."
            style={{ ...inputStyle(), resize: "vertical", fontFamily: "inherit" }}
          />

          <div className="flex items-center justify-end mt-3">
            <button
              onClick={generate}
              disabled={generating || !prompt.trim()}
              className="flex items-center gap-1.5 text-xs font-semibold rounded-full"
              style={{
                backgroundColor: "var(--color-primary-container)",
                color: "var(--color-on-primary-container)",
                border: "1px solid var(--color-outline-variant)",
                padding: "8px 16px",
                cursor: generating ? "wait" : prompt.trim() ? "pointer" : "not-allowed",
                opacity: generating || !prompt.trim() ? 0.7 : 1,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: 14,
                  animation: generating ? "spin-anim 0.8s linear infinite" : undefined,
                }}
              >
                {generating ? "progress_activity" : "auto_awesome"}
              </span>
              {generating ? "Planerar…" : "Generera förslag"}
            </button>
          </div>
        </>
      )}

      {err && (
        <div
          className="text-xs mt-3 flex items-start gap-1.5"
          style={{ color: "var(--color-error, #b3261e)" }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>error</span>
          <span>{err}</span>
        </div>
      )}

      {justSaved && (
        <div
          className="text-xs mt-3 flex items-center gap-1.5"
          style={{ color: "var(--color-on-surface)" }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 14, color: "#7fb8a3" }}
          >
            check_circle
          </span>
          {justSaved.created} pass sparade till Notion
          {justSaved.errors > 0 ? ` (${justSaved.errors} fel)` : ""}.
        </div>
      )}

      {draft && (
        <div
          className="rounded-xl mt-3"
          style={{
            backgroundColor: "var(--color-surface-container)",
            padding: 14,
          }}
        >
          {/* Originalprompten som en quote högst upp — ger kontext utan att ta
              samma plats som full input-ruta. */}
          <div
            className="flex items-start gap-2 mb-3"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            <span
              className="material-symbols-outlined shrink-0"
              style={{ fontSize: 14, marginTop: 2 }}
              aria-hidden="true"
            >
              format_quote
            </span>
            <span
              className="text-xs italic flex-1 min-w-0"
              style={{ lineHeight: 1.4 }}
            >
              {draft.originalPrompt}
            </span>
          </div>

          {draft.commentary && (
            <p
              className="text-sm mb-3"
              style={{
                color: "var(--color-on-surface)",
                whiteSpace: "pre-wrap",
                lineHeight: 1.5,
              }}
            >
              {draft.commentary}
            </p>
          )}
          <div className="space-y-2">
            {draft.plan.map((p, i) => {
              const isRegenerating = regenIndex === i;
              const anyRegenerating = regenIndex !== null;
              return (
                <div
                  key={`${p.datum}-${i}`}
                  className="rounded-lg"
                  style={{
                    backgroundColor: "var(--color-surface-container-lowest)",
                    border: "1px solid var(--color-outline-variant)",
                    borderLeft: `3px solid ${typeColor(p.typ ?? "")}`,
                    padding: "10px 12px",
                    opacity: isRegenerating ? 0.5 : 1,
                    transition: "opacity 0.2s ease-out",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="material-symbols-outlined shrink-0"
                      style={{ fontSize: 16, color: typeColor(p.typ ?? "") }}
                    >
                      {typeIcon(p.typ ?? "")}
                    </span>
                    <span
                      className="text-sm font-semibold flex-1 min-w-0 truncate"
                      style={{ color: "var(--color-on-surface)" }}
                    >
                      {p.passnamn || p.typ || "Pass"}
                    </span>
                    <span
                      className="text-[11px] tabular-nums shrink-0"
                      style={{ color: "var(--color-on-surface-variant)" }}
                    >
                      {p.datum}
                    </span>
                    <button
                      onClick={() => regenerateOne(i)}
                      disabled={anyRegenerating || revising || saving}
                      aria-label="Regenerera detta pass"
                      title="Byt ut detta pass"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: anyRegenerating || revising || saving ? "wait" : "pointer",
                        color: "var(--color-on-surface-variant)",
                        padding: 2,
                        display: "inline-flex",
                        alignItems: "center",
                      }}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{
                          fontSize: 16,
                          animation: isRegenerating
                            ? "spin-anim 0.8s linear infinite"
                            : undefined,
                        }}
                      >
                        {isRegenerating ? "progress_activity" : "refresh"}
                      </span>
                    </button>
                  </div>
                  {p.syfte && (
                    <div
                      className="text-xs mt-1"
                      style={{ color: "var(--color-on-surface-variant)" }}
                    >
                      {p.syfte}
                    </div>
                  )}
                  {(p.tid || p.tempo || p.pulsintervall) && (
                    <div
                      className="text-[11px] mt-1 tabular-nums"
                      style={{ color: "var(--color-on-surface-variant)" }}
                    >
                      {[p.tid, p.tempo, p.pulsintervall].filter(Boolean).join(" · ")}
                    </div>
                  )}
                  {p.passdetaljer && (
                    <div
                      className="text-[11px] mt-1"
                      style={{
                        color: "var(--color-on-surface-variant)",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {p.passdetaljer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Feedback-ruta för chat-revision — "fortsätt chatten" */}
          <div
            className="mt-4 rounded-lg"
            style={{
              backgroundColor: "var(--color-surface-container-lowest)",
              border: "1px solid var(--color-outline-variant)",
              padding: 14,
            }}
          >
            <div
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--color-on-surface-variant)", marginBottom: 10 }}
            >
              Ändra förslaget
            </div>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={3}
              disabled={revising || regenIndex !== null || saving}
              placeholder="t.ex. Byt tisdagspasset till en lugn promenad istället, och gör långpasset lite kortare."
              style={{
                ...inputStyle(),
                resize: "vertical",
                fontFamily: "inherit",
                fontSize: 13,
                lineHeight: 1.45,
                minHeight: 72,
              }}
            />
            <div className="flex items-center justify-end mt-3">
              <button
                onClick={revise}
                disabled={revising || !feedback.trim() || regenIndex !== null || saving}
                className="flex items-center gap-1.5 text-xs font-semibold rounded-full"
                style={{
                  backgroundColor: "var(--color-primary-container)",
                  color: "var(--color-on-primary-container)",
                  border: "1px solid var(--color-outline-variant)",
                  padding: "6px 14px",
                  cursor: revising ? "wait" : feedback.trim() ? "pointer" : "not-allowed",
                  opacity: revising || !feedback.trim() ? 0.7 : 1,
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: 14,
                    animation: revising ? "spin-anim 0.8s linear infinite" : undefined,
                  }}
                >
                  {revising ? "progress_activity" : "send"}
                </span>
                {revising ? "Uppdaterar…" : "Uppdatera plan"}
              </button>
            </div>

            {draftErr && (
              <div
                className="mt-3 rounded-lg"
                style={{
                  border: "1px solid var(--color-error, #b3261e)",
                  padding: "8px 10px",
                }}
              >
                <div
                  className="text-xs flex items-start gap-1.5"
                  style={{ color: "var(--color-error, #b3261e)" }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14, marginTop: 1 }}>
                    error
                  </span>
                  <span style={{ lineHeight: 1.4 }}>{draftErr.message}</span>
                </div>
                {draftErr.rawText && (
                  <details className="mt-2">
                    <summary
                      className="text-[11px] cursor-pointer"
                      style={{ color: "var(--color-on-surface-variant)" }}
                    >
                      Visa Claudes råsvar
                    </summary>
                    <pre
                      className="text-[10px] mt-2 rounded overflow-x-auto"
                      style={{
                        backgroundColor: "var(--color-surface-container)",
                        color: "var(--color-on-surface-variant)",
                        padding: 8,
                        maxHeight: 180,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {draftErr.rawText}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 mt-4">
            <button
              onClick={() => setDraft(null)}
              disabled={saving || revising || regenIndex !== null}
              className="text-xs font-semibold rounded-full"
              style={{
                backgroundColor: "transparent",
                color: "var(--color-on-surface-variant)",
                border: "1px solid var(--color-outline-variant)",
                padding: "8px 14px",
                cursor: "pointer",
              }}
            >
              Kasta förslag
            </button>
            <button
              onClick={save}
              disabled={saving || revising || regenIndex !== null}
              className="flex items-center gap-1.5 text-xs font-semibold rounded-full"
              style={{
                backgroundColor: "var(--color-primary)",
                color: "var(--color-on-primary)",
                border: "none",
                padding: "8px 16px",
                cursor: saving ? "wait" : "pointer",
                opacity: saving || revising || regenIndex !== null ? 0.7 : 1,
              }}
            >
              {saving && (
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 14, animation: "spin-anim 0.8s linear infinite" }}
                >
                  progress_activity
                </span>
              )}
              Spara {draft.plan.length} pass
            </button>
          </div>

          <div
            className="text-[11px] mt-3"
            style={{ color: "var(--color-outline)" }}
          >
            {draft.model} · {draft.inputTokens + draft.outputTokens} tokens
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Sida ────────────────────────────────────────────────────────────────────

type View = "week" | "month";

export default function FitnessCoachPage() {
  const [view, setView] = useState<View>("week");
  // Anchor = en valfri dag inne i perioden vi visar (måndagen för veckovy).
  const [anchor, setAnchor] = useState<Date>(() => mondayOf(new Date()));
  const [editing, setEditing] = useState<Draft | null>(null);
  const [singleAI, setSingleAI] = useState<{ date: string; hint: string } | null>(null);

  const { data, error, isLoading, mutate } = useSWR<PlansResponse>(
    "/api/fitness/plans",
    fetcher,
    { revalidateOnFocus: false },
  );
  // Genomförda pass från HealthFit — visas jämsides planerade så kalendern
  // speglar verkligheten, inte bara det som ligger i Notion. Egna pass bor
  // i Drive-exporten och synkas aldrig hit.
  const { data: workoutsData } = useSWR<WorkoutsResponse>(
    "/api/fitness/workouts?limit=500",
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 10 * 60 * 1000 },
  );

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

  // Koppla ihop genomförda pass med planerade (samma typ + inom ±2 dagar).
  // `planToWorkout` används för att rendera PassPill som klar + länkad; `consumedWorkouts`
  // filtrerar bort fristående DonePill/prickar som redan är representerade via planen.
  const { planToWorkout, consumedWorkouts } = useMemo(() => {
    const workouts = workoutsData?.workouts ?? [];
    const plans = data?.plans ?? [];
    const result = matchWorkoutsToPlans(workouts, plans, { maxDateDiffDays: 2 });
    const consumed = new Set<string>();
    for (const w of result.planToWorkout.values()) consumed.add(workoutKey(w));
    return { planToWorkout: result.planToWorkout, consumedWorkouts: consumed };
  }, [workoutsData, data]);

  const shiftPeriod = (delta: number) => {
    if (view === "week") {
      setAnchor((a) => addDays(a, delta * 7));
    } else {
      setAnchor((a) => new Date(a.getFullYear(), a.getMonth() + delta, 1));
    }
  };

  const goToday = () => {
    setAnchor(view === "week" ? mondayOf(new Date()) : new Date());
  };

  const openNew = (iso: string) => setEditing({ datum: iso, status: "Planerat" });
  const openEdit = (plan: PlannedWorkout) => setEditing({ ...plan });

  const handleSave = async (d: Draft) => {
    if (d.id) {
      // Uppdatera endast förändrade fält jämfört med originalet är overkill —
      // skicka allt som användaren redigerat. Notion accepterar repeated values.
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

  const periodLabel = view === "week"
    ? formatWeekRange(anchor)
    : formatMonthYear(anchor);

  return (
    <div className="space-y-5">
      <BackLink />

      <div>
        <h1
          className="text-3xl font-extrabold tracking-tight font-headline"
          style={{ color: "var(--color-on-surface)" }}
        >
          Coach
        </h1>
        <p className="text-sm font-medium mt-1" style={{ color: "var(--color-on-surface-variant)" }}>
          Planera pass · AI-coach · översikt
        </p>
      </div>

      {/* Rad 1: period-pilar + titel (klickbar → idag) + vy-växlare */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => shiftPeriod(-1)}
          aria-label="Föregående period"
          style={iconBtnStyle()}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_left</span>
        </button>
        <button
          onClick={goToday}
          title="Gå till idag"
          className="flex-1 min-w-0 text-center text-sm font-bold tabular-nums truncate rounded-full"
          style={{
            backgroundColor: "transparent",
            color: "var(--color-on-surface)",
            border: "1px solid var(--color-outline-variant)",
            padding: "6px 10px",
            cursor: "pointer",
          }}
        >
          {periodLabel}
        </button>
        <button
          onClick={() => shiftPeriod(1)}
          aria-label="Nästa period"
          style={iconBtnStyle()}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_right</span>
        </button>
        <div
          className="flex rounded-full shrink-0"
          style={{
            backgroundColor: "var(--color-surface-container)",
            border: "1px solid var(--color-outline-variant)",
            padding: 2,
          }}
        >
          {(["week", "month"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="text-[11px] font-semibold rounded-full"
              style={{
                backgroundColor: view === v ? "var(--color-primary-container)" : "transparent",
                color: view === v ? "var(--color-on-primary-container)" : "var(--color-on-surface-variant)",
                border: "none",
                padding: "5px 10px",
                cursor: "pointer",
              }}
            >
              {v === "week" ? "Vecka" : "Månad"}
            </button>
          ))}
        </div>
      </div>

      {/* Rad 2: Nytt pass + AI-pass */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => openNew(isoDate(new Date()))}
          className="flex items-center justify-center gap-1 text-xs font-semibold rounded-full"
          style={{
            backgroundColor: "var(--color-primary)",
            color: "var(--color-on-primary)",
            border: "none",
            padding: "8px 18px",
            cursor: "pointer",
            flex: 1,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
          Nytt pass
        </button>
        <button
          onClick={() => setSingleAI({ date: isoDate(new Date()), hint: "" })}
          className="flex items-center justify-center gap-1 text-xs font-semibold rounded-full"
          style={{
            backgroundColor: "var(--color-primary-container)",
            color: "var(--color-on-primary-container)",
            border: "1px solid var(--color-outline-variant)",
            padding: "8px 18px",
            cursor: "pointer",
            flex: 1,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>auto_awesome</span>
          AI-pass
        </button>
      </div>

      {/* Kalender-kort */}
      <Card>
        {error ? (
          <ErrorBanner onRetry={() => mutate()} />
        ) : isLoading ? (
          <div className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>Laddar…</div>
        ) : view === "week" ? (
          <WeekView
            monday={anchor}
            plansByDate={plansByDate}
            workoutsByDate={workoutsByDate}
            planToWorkout={planToWorkout}
            consumedWorkouts={consumedWorkouts}
            onOpen={(x) => {
              if ("id" in x) openEdit(x as PlannedWorkout);
              else openNew(x.datum);
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
              else openNew(x.datum);
            }}
          />
        )}
      </Card>

      {/* AI-planering */}
      <AIPlanSection onApplied={async () => { await mutate(); }} />

      <AnimatePresence>
        {editing && (
          <PlanModal
            draft={editing}
            onClose={() => setEditing(null)}
            onSave={handleSave}
            onDelete={editing.id ? handleDelete : undefined}
          />
        )}
        {singleAI && (
          <SingleAIModal
            initial={singleAI}
            onClose={() => setSingleAI(null)}
            onSaved={async () => {
              setSingleAI(null);
              await mutate();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function iconBtnStyle(): React.CSSProperties {
  return {
    width: 34,
    height: 34,
    borderRadius: "50%",
    backgroundColor: "var(--color-surface-container)",
    color: "var(--color-on-surface)",
    border: "1px solid var(--color-outline-variant)",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };
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

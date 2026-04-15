"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { workoutSlug } from "@/lib/fitness/slug";
import ErrorBanner from "@/components/ErrorBanner";
import { useFitnessProfile, hrZone } from "@/lib/fitness/profile";
import { useHydrateProfile } from "@/lib/fitness/useHydrateProfile";
import { paceString, durationString } from "@/lib/fitness/parser";
import type { WorkoutsResponse, PlansResponse, Workout, PlannedWorkout, FitnessProfile } from "@/lib/fitness/types";
import type { MetricsResponse } from "@/app/api/fitness/metrics/route";

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

function SectionTitle({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--color-on-surface-variant)" }}>
      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{icon}</span>
      {children}
    </h2>
  );
}

function formatShortDate(iso: string): string {
  if (!iso) return "–";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("sv-SE", { weekday: "short", day: "numeric", month: "short" });
  } catch {
    return iso;
  }
}

function daysUntil(iso: string): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

function zoneColor(z: "Z1" | "Z2" | "Z3" | "Z4" | "Z5"): string {
  return { Z1: "#a7c4ff", Z2: "#7fb8a3", Z3: "#fab849", Z4: "#ef8a5c", Z5: "#e5484d" }[z];
}

function zoneLabel(z: "Z1" | "Z2" | "Z3" | "Z4" | "Z5"): string {
  return {
    Z1: "Mycket lätt",
    Z2: "Lätt",
    Z3: "Måttlig",
    Z4: "Hårt",
    Z5: "Mycket hårt",
  }[z];
}

/** Kategorisera en HealthFit-passtyp. */
function typeCategory(type: string): "run" | "walk" | "bike" | "swim" | "ski" | "yoga" | "core" | "strength" | "other" {
  const t = type.toLowerCase();
  if (t.includes("run")) return "run";
  if (t.includes("walk")) return "walk";
  if (t.includes("cycl") || t.includes("bike")) return "bike";
  if (t.includes("swim")) return "swim";
  if (t.includes("ski")) return "ski";
  if (t.includes("yoga")) return "yoga";
  if (t.includes("core")) return "core";
  if (t.includes("strength")) return "strength";
  return "other";
}

/** Välj lämplig ikon för en passtyp. */
function typeIcon(type: string): string {
  switch (typeCategory(type)) {
    case "run": return "directions_run";
    case "walk": return "directions_walk";
    case "bike": return "directions_bike";
    case "swim": return "pool";
    case "ski": return "downhill_skiing";
    case "yoga": return "self_improvement";
    // Material Symbols har ingen dedikerad "abs/magrutor"-ikon — Core och Styrke
    // delar därför hantel-ikonen.
    case "core": return "exercise";
    case "strength": return "exercise";
    default: return "fitness_center";
  }
}

/** Typer där HR-zon-pill är meningsfullt (uthållighet). */
function hasCardioZone(type: string): boolean {
  const c = typeCategory(type);
  return c === "run" || c === "walk" || c === "bike" || c === "swim" || c === "ski";
}

/** Kort svensk etikett för vanliga HealthFit-typer. */
function typeLabel(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("outdoor running")) return "Löpning";
  if (t.includes("indoor running") || t.includes("treadmill")) return "Löpning (inne)";
  if (t.includes("walk")) return "Promenad";
  if (t.includes("cycl") || t.includes("bike")) return "Cykling";
  if (t.includes("functional strength")) return "Styrketräning";
  if (t.includes("traditional strength")) return "Styrketräning";
  if (t.includes("core")) return "Core";
  if (t.includes("swim")) return "Simning";
  if (t.includes("ski")) return "Skidåkning";
  return type;
}

// ─── Profil-redigering ───────────────────────────────────────────────────────

function ProfileEditor() {
  const profile = useFitnessProfile((s) => s.profile);
  const setProfile = useFitnessProfile((s) => s.setProfile);
  const reset = useFitnessProfile((s) => s.reset);

  const upd = (patch: Partial<FitnessProfile>) => setProfile(patch);
  const updZone = (z: keyof FitnessProfile["zones"], i: 0 | 1, v: number) => {
    const cur = profile.zones[z];
    const next: [number, number] = i === 0 ? [v, cur[1]] : [cur[0], v];
    setProfile({ zones: { ...profile.zones, [z]: next } });
  };
  const updGoal = (i: number, patch: { label?: string; deadline?: string }) => {
    const goals = profile.goals.map((g, k) => (k === i ? { ...g, ...patch } : g));
    setProfile({ goals });
  };
  const addGoal = () => setProfile({ goals: [...profile.goals, { label: "Nytt mål" }] });
  const removeGoal = (i: number) => setProfile({ goals: profile.goals.filter((_, k) => k !== i) });

  return (
    <div
      className="rounded-xl p-4 mb-5 space-y-5"
      style={{ backgroundColor: "var(--color-surface-container)" }}
    >
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
        <EditField label="Namn" value={profile.name ?? ""} onChange={(v) => upd({ name: v })} />
        <EditField
          label="Födelseår"
          type="number"
          value={profile.birthYear?.toString() ?? ""}
          onChange={(v) => upd({ birthYear: v ? parseInt(v, 10) : undefined })}
        />
        <EditField
          label="Maxpuls (bpm)"
          type="number"
          value={profile.maxHR.toString()}
          onChange={(v) => upd({ maxHR: parseInt(v, 10) || profile.maxHR })}
        />
      </div>

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-on-surface-variant)" }}>
          Pulszoner (bpm)
        </div>
        <div className="space-y-2">
          {(["Z1", "Z2", "Z3", "Z4", "Z5"] as const).map((z) => {
            const [lo, hi] = profile.zones[z];
            return (
              <div key={z} className="flex items-center gap-2">
                <div className="text-xs font-bold w-6" style={{ color: "var(--color-on-surface)" }}>{z}</div>
                <EditField
                  label=""
                  type="number"
                  value={lo.toString()}
                  onChange={(v) => updZone(z, 0, parseInt(v, 10) || lo)}
                  compact
                />
                <span style={{ color: "var(--color-on-surface-variant)" }}>–</span>
                <EditField
                  label=""
                  type="number"
                  value={hi.toString()}
                  onChange={(v) => updZone(z, 1, parseInt(v, 10) || hi)}
                  compact
                />
              </div>
            );
          })}
        </div>
        <div className="text-[11px] mt-2" style={{ color: "var(--color-on-surface-variant)" }}>
          Vikt och vilopuls hämtas automatiskt från HealthFit-exporten.
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-on-surface-variant)" }}>
            Mål
          </div>
          <button
            onClick={addGoal}
            className="text-xs font-semibold flex items-center gap-1"
            style={{ color: "var(--color-primary)", background: "none", border: "none", cursor: "pointer" }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>
            Nytt mål
          </button>
        </div>
        <div className="space-y-3">
          {profile.goals.map((g, i) => (
            <div
              key={i}
              className="rounded-lg"
              style={{
                backgroundColor: "var(--color-surface-container-lowest)",
                border: "1px solid var(--color-outline-variant)",
                padding: 8,
              }}
            >
              <div className="flex items-center gap-2">
                <input
                  value={g.label}
                  onChange={(e) => updGoal(i, { label: e.target.value })}
                  placeholder="Mål"
                  className="flex-1 min-w-0 text-sm"
                  style={{
                    backgroundColor: "transparent",
                    color: "var(--color-on-surface)",
                    border: "none",
                    outline: "none",
                    padding: "4px 6px",
                  }}
                />
                <button
                  onClick={() => removeGoal(i)}
                  aria-label="Ta bort mål"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-on-surface-variant)", flexShrink: 0 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
                </button>
              </div>
              <div className="flex items-center gap-2 mt-1 px-1.5">
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: "var(--color-on-surface-variant)" }}>event</span>
                <input
                  type="date"
                  value={g.deadline ?? ""}
                  onChange={(e) => updGoal(i, { deadline: e.target.value || undefined })}
                  className="text-xs tabular-nums"
                  style={{
                    backgroundColor: "transparent",
                    color: "var(--color-on-surface-variant)",
                    border: "none",
                    outline: "none",
                    padding: 0,
                    minWidth: 0,
                    flex: 1,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end">
        <button
          onClick={() => reset()}
          className="text-xs font-semibold flex items-center gap-1"
          style={{ color: "var(--color-on-surface-variant)", background: "none", border: "none", cursor: "pointer" }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>restart_alt</span>
          Återställ standard
        </button>
      </div>
    </div>
  );
}

function EditField({
  label, value, onChange, type = "text", compact = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "number";
  compact?: boolean;
}) {
  return (
    <label className="block">
      {label && (
        <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-on-surface-variant)" }}>
          {label}
        </div>
      )}
      <input
        type={type}
        inputMode={type === "number" ? "numeric" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg px-3 py-1.5 text-sm tabular-nums"
        style={{
          backgroundColor: "var(--color-surface-container-lowest)",
          color: "var(--color-on-surface)",
          border: "1px solid var(--color-outline-variant)",
          width: compact ? 80 : "100%",
        }}
      />
    </label>
  );
}

// ─── Profil-kort ─────────────────────────────────────────────────────────────

function ProfileCard({ metrics }: { metrics: MetricsResponse | undefined }) {
  const profile = useFitnessProfile((s) => s.profile);
  const lastSyncedAt = useFitnessProfile((s) => s.lastSyncedAt);
  const lastError = useFitnessProfile((s) => s.lastError);
  const [editing, setEditing] = useState(false);
  // Vikt, vilopuls och VO₂ max hämtas från HealthFit. Maxpuls sätts manuellt.
  const weightKg = metrics?.weightKg ?? profile.weightKg ?? null;
  const maxHR = profile.maxHR;
  const restingHR = metrics?.restingHR ?? profile.restingHR;
  const vo2Max = metrics?.vo2Max ?? null;

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-on-surface-variant)" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person</span>
          Min profil
        </h2>
        <button
          onClick={() => setEditing((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-semibold rounded-full"
          style={{
            backgroundColor: editing ? "var(--color-primary-container)" : "transparent",
            color: editing ? "var(--color-on-primary-container)" : "var(--color-on-surface-variant)",
            border: "1px solid var(--color-outline-variant)",
            cursor: "pointer",
            padding: "6px 14px",
            lineHeight: 1,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
            {editing ? "close" : "edit"}
          </span>
          {editing ? "Klar" : "Ändra"}
        </button>
      </div>

      {editing ? (
        <ProfileEditor />
      ) : (
        <>
          <div
            className="grid"
            style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginBottom: 24 }}
          >
            <Stat label="Maxpuls" value={`${maxHR}`} unit="bpm" />
            <Stat label="Vilopuls 7d" value={`${restingHR}`} unit="bpm" source={metrics?.restingHR != null} />
            <Stat
              label="VO₂ max"
              value={vo2Max != null ? vo2Max.toFixed(1) : "–"}
              unit="ml/kg/min"
              source={vo2Max != null}
            />
            <Stat
              label="Vikt"
              value={weightKg != null ? weightKg.toFixed(1) : "–"}
              unit="kg"
              source={metrics?.weightKg != null}
            />
          </div>

          <div>
            <div className="text-xs font-semibold mb-3" style={{ color: "var(--color-on-surface-variant)" }}>
              Pulszoner
            </div>
            <div>
              {(["Z5", "Z4", "Z3", "Z2", "Z1"] as const).map((z, idx) => {
                const [lo, hi] = profile.zones[z];
                const loPct = Math.round((lo / maxHR) * 100);
                const hiPct = Math.round((hi / maxHR) * 100);
                return (
                  <div
                    key={z}
                    className="flex items-start gap-3"
                    style={{
                      paddingTop: idx === 0 ? 0 : 12,
                      paddingBottom: 12,
                      borderBottom: "1px solid var(--color-outline-variant)",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: 10, height: 10, borderRadius: "50%",
                        backgroundColor: zoneColor(z),
                        flexShrink: 0,
                        marginTop: 5,
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold" style={{ color: "var(--color-on-surface)" }}>
                        Zon {z.slice(1)} · <span style={{ fontWeight: 500, color: "var(--color-on-surface-variant)" }}>{zoneLabel(z)}</span>
                      </div>
                      <div className="text-xs tabular-nums mt-0.5" style={{ color: "var(--color-on-surface-variant)" }}>
                        {z === "Z5" ? `≥ ${loPct} %` : `${loPct}–${hiPct} %`}
                        <span style={{ margin: "0 6px" }}>·</span>
                        {z === "Z5" ? `≥ ${lo} bpm` : `${lo}–${hi} bpm`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {(lastSyncedAt || lastError) && (
            <div
              className="text-[11px] mt-3 flex items-center gap-1.5"
              style={{ color: lastError ? "var(--color-error, #b3261e)" : "var(--color-on-surface-variant)" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                {lastError ? "error" : "cloud_done"}
              </span>
              {lastError
                ? `Sync-fel: ${lastError}`
                : `Synkad ${new Date(lastSyncedAt!).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}`}
            </div>
          )}

          {profile.goals.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div className="text-xs font-semibold mb-2" style={{ color: "var(--color-on-surface-variant)" }}>Mål</div>
              <div className="space-y-1.5">
                {profile.goals.map((g, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm" style={{ color: "var(--color-on-surface)" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: "var(--color-primary)" }}>
                      flag
                    </span>
                    <span>{g.label}</span>
                    {g.deadline && (
                      <span className="ml-auto text-xs" style={{ color: "var(--color-on-surface-variant)" }}>
                        {formatShortDate(g.deadline)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function Stat({ label, value, unit, source }: { label: string; value: string; unit?: string; source?: boolean }) {
  return (
    <div
      className="rounded-xl"
      style={{
        backgroundColor: "var(--color-surface-container)",
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: 86,
      }}
    >
      <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-on-surface-variant)" }}>
        <span>{label}</span>
        {source && (
          <span
            className="material-symbols-outlined"
            title="Från HealthFit-exporten"
            style={{ fontSize: 12, color: "var(--color-primary)" }}
            aria-label="Live-värde från HealthFit"
          >
            sync
          </span>
        )}
      </div>
      <div>
        <div className="text-xl font-bold tabular-nums leading-none" style={{ color: "var(--color-on-surface)" }}>
          {value}
        </div>
        {unit && (
          <div className="text-[11px] mt-1 leading-none" style={{ color: "var(--color-on-surface-variant)" }}>
            {unit}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Nästa planerade pass ────────────────────────────────────────────────────

function NextPlannedCard({ plans, error, isLoading }: {
  plans: PlannedWorkout[]; error: unknown; isLoading: boolean;
}) {
  const next = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    // Endast framtida/idag, och ej redan avklarade.
    return plans.find(
      (p) => p.datum >= today && p.status !== "Gjord" && p.status !== "Slutförd",
    );
  }, [plans]);

  return (
    <Card>
      <SectionTitle icon="event">Nästa pass</SectionTitle>
      {isLoading && (
        <div className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>Laddar…</div>
      )}
      {!isLoading && Boolean(error) && (
        <div className="text-sm" style={{ color: "var(--color-error, #b3261e)" }}>
          Kunde inte hämta planerade pass.
        </div>
      )}
      {!isLoading && !error && !next && (
        <div className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
          Inga kommande pass planerade.
        </div>
      )}
      {next && (
        <div>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="text-lg font-bold leading-tight" style={{ color: "var(--color-on-surface)" }}>
                {next.passnamn || "Namnlöst pass"}
              </div>
              <div className="text-sm mt-0.5" style={{ color: "var(--color-on-surface-variant)" }}>
                {formatShortDate(next.datum)}
                {(() => {
                  const d = daysUntil(next.datum);
                  if (d === null) return "";
                  if (d === 0) return " · idag";
                  if (d === 1) return " · imorgon";
                  if (d > 0) return ` · om ${d} dagar`;
                  return ` · ${Math.abs(d)} dagar sen`;
                })()}
              </div>
            </div>
            {next.typ && (
              <span
                className="text-xs font-semibold rounded-full shrink-0"
                style={{
                  backgroundColor: "var(--color-primary-container)",
                  color: "var(--color-on-primary-container)",
                  padding: "4px 12px",
                  lineHeight: 1.2,
                }}
              >
                {next.typ}
              </span>
            )}
          </div>

          {next.syfte && (
            <div className="text-sm mb-2" style={{ color: "var(--color-on-surface)" }}>
              {next.syfte}
            </div>
          )}

          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
            {next.tid && <KV label="Tid" value={next.tid} />}
            {next.tempo && <KV label="Tempo" value={next.tempo} />}
            {next.pulsintervall && <KV label="Puls" value={next.pulsintervall} />}
            {next.underlag && <KV label="Underlag" value={next.underlag} />}
          </div>

          {next.passdetaljer && (
            <div className="mt-3 text-sm whitespace-pre-wrap" style={{ color: "var(--color-on-surface-variant)" }}>
              {next.passdetaljer}
            </div>
          )}
        </div>
      )}

    </Card>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg px-3 py-2" style={{ backgroundColor: "var(--color-surface-container)" }}>
      <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-on-surface-variant)" }}>{label}</div>
      <div className="text-sm font-medium mt-0.5" style={{ color: "var(--color-on-surface)" }}>{value}</div>
    </div>
  );
}

// ─── Passhistorik ────────────────────────────────────────────────────────────

function WorkoutHistoryCard({ workouts, error, isLoading, onRetry, metrics }: {
  workouts: Workout[]; error: unknown; isLoading: boolean; onRetry: () => void;
  metrics: MetricsResponse | undefined;
}) {
  const profile = useFitnessProfile((s) => s.profile);
  // Zon-tilldelning baseras på profilens zonintervall (bpm).
  // `metrics` är med i signaturen för att senare kunna räkna dynamiskt — inte använt just nu.
  void metrics;

  return (
    <Card>
      <SectionTitle icon="history">Senaste pass</SectionTitle>
      {error ? (
        <ErrorBanner onRetry={onRetry} />
      ) : isLoading ? (
        <div className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>Laddar…</div>
      ) : workouts.length === 0 ? (
        <div className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
          Inga pass hittades i HealthFit-exporten.
        </div>
      ) : (
        <div className="space-y-2">
          {workouts.map((w, i) => {
            const zone =
              hasCardioZone(w.type) && w.avgHR
                ? hrZone(Math.round(w.avgHR), profile.zones)
                : null;
            return (
              <Link
                key={`${w.date}-${i}`}
                href={`/fitness/pass/${workoutSlug(w)}`}
                className="rounded-xl p-3 flex items-center gap-3 transition-colors"
                style={{
                  backgroundColor: "var(--color-surface-container)",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div
                  className="flex items-center justify-center rounded-full shrink-0"
                  style={{
                    width: 40, height: 40,
                    backgroundColor: "var(--color-surface-container-lowest)",
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 20, color: "var(--color-primary)" }}
                  >
                    {typeIcon(w.type)}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <div className="text-sm font-semibold" style={{ color: "var(--color-on-surface)" }}>
                      {w.distanceM > 0
                        ? `${(w.distanceM / 1000).toFixed(2)} km`
                        : typeLabel(w.type)}
                    </div>
                    <div className="text-xs" style={{ color: "var(--color-on-surface-variant)" }}>
                      {durationString(w.totalTimeSec)}
                      {w.distanceM > 0 ? ` · ${paceString(w.distanceM, w.totalTimeSec)} /km` : ""}
                    </div>
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--color-on-surface-variant)" }}>
                    {formatShortDate(w.date)}
                    {w.distanceM > 0 ? ` · ${typeLabel(w.type)}` : ""}
                    {w.avgHR ? ` · ${Math.round(w.avgHR)} bpm` : ""}
                    {w.trimp != null ? ` · TRIMP ${Math.round(w.trimp)}` : ""}
                  </div>
                </div>

                {zone && (
                  <span
                    className="text-[10px] font-bold rounded-full shrink-0 tabular-nums"
                    style={{
                      backgroundColor: zoneColor(zone),
                      color: "#ffffff",
                      padding: "4px 10px",
                      lineHeight: 1,
                      letterSpacing: "0.02em",
                    }}
                  >
                    {zone}
                  </span>
                )}
                <span
                  className="material-symbols-outlined shrink-0"
                  style={{ fontSize: 18, color: "var(--color-on-surface-variant)" }}
                  aria-hidden="true"
                >
                  chevron_right
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ─── Sida ────────────────────────────────────────────────────────────────────

export default function FitnessPage() {
  useHydrateProfile();
  const {
    data: workoutsData, error: workoutsError, isLoading: workoutsLoading, mutate: mutateWorkouts,
  } = useSWR<WorkoutsResponse>("/api/fitness/workouts?limit=10", fetcher, {
    refreshInterval: 5 * 60 * 1000,
    revalidateOnFocus: false,
  });
  const {
    data: plansData, error: plansError, isLoading: plansLoading,
  } = useSWR<PlansResponse>("/api/fitness/plans", fetcher, {
    refreshInterval: 10 * 60 * 1000,
    revalidateOnFocus: false,
  });
  const { data: metricsData } = useSWR<MetricsResponse>("/api/fitness/metrics", fetcher, {
    refreshInterval: 15 * 60 * 1000,
    revalidateOnFocus: false,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight font-headline" style={{ color: "var(--color-on-surface)" }}>
          Fitness
        </h1>
        <p className="text-sm font-medium mt-1" style={{ color: "var(--color-on-surface-variant)" }}>
          Löpning · styrka · återhämtning
        </p>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(1, minmax(0, 1fr))" }}>
        <NextPlannedCard
          plans={plansData?.plans ?? []}
          error={plansError}
          isLoading={plansLoading}
        />
        <WorkoutHistoryCard
          workouts={workoutsData?.workouts ?? []}
          error={workoutsError}
          isLoading={workoutsLoading}
          onRetry={() => mutateWorkouts()}
          metrics={metricsData}
        />
        <ProfileCard metrics={metricsData} />
      </div>

      {workoutsData?.sourceFile && (
        <div className="text-xs text-center" style={{ color: "var(--color-outline)" }}>
          Källa: {workoutsData.sourceFile}
        </div>
      )}
    </div>
  );
}

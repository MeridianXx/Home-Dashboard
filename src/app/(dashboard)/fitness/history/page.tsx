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
import type { WorkoutsResponse, Workout } from "@/lib/fitness/types";

// ─── Hjälpare (i linje med fitness/page.tsx) ─────────────────────────────────

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

function zoneColor(z: "Z1" | "Z2" | "Z3" | "Z4" | "Z5"): string {
  return { Z1: "#a7c4ff", Z2: "#7fb8a3", Z3: "#fab849", Z4: "#ef8a5c", Z5: "#e5484d" }[z];
}

function typeCategory(type: string): "run" | "walk" | "bike" | "swim" | "ski" | "yoga" | "core" | "strength" | "padel" | "other" {
  const t = type.toLowerCase();
  if (t.includes("run")) return "run";
  if (t.includes("walk")) return "walk";
  if (t.includes("cycl") || t.includes("bike")) return "bike";
  if (t.includes("swim")) return "swim";
  if (t.includes("ski")) return "ski";
  if (t.includes("yoga")) return "yoga";
  if (t.includes("core")) return "core";
  if (t.includes("strength")) return "strength";
  if (t.includes("padel")) return "padel";
  return "other";
}

function typeIcon(type: string): string {
  switch (typeCategory(type)) {
    case "run": return "directions_run";
    case "walk": return "directions_walk";
    case "bike": return "directions_bike";
    case "swim": return "pool";
    case "ski": return "downhill_skiing";
    case "yoga": return "self_improvement";
    case "core": return "exercise";
    case "strength": return "exercise";
    case "padel": return "sports_tennis";
    default: return "fitness_center";
  }
}

function hasCardioZone(type: string): boolean {
  const c = typeCategory(type);
  return c === "run" || c === "walk" || c === "bike" || c === "swim" || c === "ski";
}

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

function formatShortDate(iso: string): string {
  if (!iso) return "–";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("sv-SE", { weekday: "short", day: "numeric", month: "short" });
  } catch { return iso; }
}

/** "2026 april" för månadsrubrikerna */
function monthLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const s = d.toLocaleDateString("sv-SE", { year: "numeric", month: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

// ─── Sida ────────────────────────────────────────────────────────────────────

type TypeFilter = "all" | "run" | "walk" | "bike" | "strength" | "core" | "swim" | "ski" | "padel" | "other";

const TYPE_FILTERS: Array<{ value: TypeFilter; label: string }> = [
  { value: "all", label: "Alla" },
  { value: "run", label: "Löpning" },
  { value: "walk", label: "Promenad" },
  { value: "bike", label: "Cykling" },
  { value: "strength", label: "Styrka" },
  { value: "core", label: "Core" },
  { value: "swim", label: "Simning" },
  { value: "ski", label: "Skidor" },
  { value: "padel", label: "Padel" },
];

const PAGE_SIZE = 30;

export default function FitnessHistoryPage() {
  useHydrateProfile();
  const profile = useFitnessProfile((s) => s.profile);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [page, setPage] = useState(1);

  // Hämta brett — 500 räcker långt bakåt i tiden för en vanlig löpare.
  const {
    data, error, isLoading, mutate,
  } = useSWR<WorkoutsResponse>("/api/fitness/workouts?limit=500", fetcher, {
    revalidateOnFocus: false,
  });

  const filtered = useMemo(() => {
    const all = data?.workouts ?? [];
    if (typeFilter === "all") return all;
    return all.filter((w) => typeCategory(w.type) === typeFilter);
  }, [data, typeFilter]);

  const visible = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = filtered.length > visible.length;

  // Gruppera på år-månad
  const groups = useMemo(() => {
    const byMonth = new Map<string, Workout[]>();
    for (const w of visible) {
      const k = monthKey(w.date);
      const bucket = byMonth.get(k) ?? [];
      bucket.push(w);
      byMonth.set(k, bucket);
    }
    return Array.from(byMonth.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [visible]);

  return (
    <div className="space-y-5">
      <BackLink />

      <div>
        <h1 className="text-3xl font-extrabold tracking-tight font-headline" style={{ color: "var(--color-on-surface)" }}>
          Passhistorik
        </h1>
        <p className="text-sm font-medium mt-1" style={{ color: "var(--color-on-surface-variant)" }}>
          {data?.workouts ? `${data.workouts.length} pass totalt` : "–"}
          {typeFilter !== "all" ? ` · ${filtered.length} efter filter` : ""}
        </p>
      </div>

      {/* Typ-filter som horisontell chip-rad */}
      <div
        className="flex items-center gap-2 overflow-x-auto"
        style={{ paddingBottom: 4, scrollbarWidth: "none" }}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {TYPE_FILTERS.map((t) => {
          const active = typeFilter === t.value;
          return (
            <button
              key={t.value}
              onClick={() => { setTypeFilter(t.value); setPage(1); }}
              className="text-xs font-semibold rounded-full shrink-0"
              style={{
                backgroundColor: active ? "var(--color-primary-container)" : "var(--color-surface-container)",
                color: active ? "var(--color-on-primary-container)" : "var(--color-on-surface-variant)",
                border: "1px solid var(--color-outline-variant)",
                padding: "6px 14px",
                cursor: "pointer",
                lineHeight: 1.2,
                whiteSpace: "nowrap",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {error ? (
        <Card><ErrorBanner onRetry={() => mutate()} /></Card>
      ) : isLoading ? (
        <Card>
          <div className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>Laddar…</div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <div className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
            Inga pass matchar filtret.
          </div>
        </Card>
      ) : (
        <div className="space-y-5">
          {groups.map(([k, items]) => (
            <div key={k}>
              <h2
                className="text-xs font-bold uppercase tracking-wider mb-2 px-1"
                style={{ color: "var(--color-on-surface-variant)" }}
              >
                {monthLabel(k + "-01")}
                <span style={{ marginLeft: 8, color: "var(--color-outline)" }}>
                  {items.length} pass
                </span>
              </h2>
              <Card>
                <div className="space-y-2">
                  {items.map((w, i) => {
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
                              {w.distanceM > 0 ? `${(w.distanceM / 1000).toFixed(2)} km` : typeLabel(w.type)}
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
              </Card>
            </div>
          ))}

          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => setPage((p) => p + 1)}
                className="text-xs font-semibold rounded-full"
                style={{
                  backgroundColor: "var(--color-surface-container)",
                  color: "var(--color-on-surface)",
                  border: "1px solid var(--color-outline-variant)",
                  padding: "8px 18px",
                  cursor: "pointer",
                }}
              >
                Visa fler ({filtered.length - visible.length} kvar)
              </button>
            </div>
          )}
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

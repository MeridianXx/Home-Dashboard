"use client";

// ─── Warm Home · Fitness · Historik ──────────────────────────────────────────
// Paginerad lista över alla pass. Typ-filter som chip-rad, månadsgrupper med
// Fraunces-rubriker, tile-rader med sport-ikon + AI-sparkle + zon-pill.

import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useWarmTheme } from "@/lib/warm/theme";
import { ACC, body, ital, lab, num } from "@/lib/warm/tokens";
import { DetailHero, ChevronRight } from "@/components/warm/fit/parts";
import { sportIcon, SparkleIcon } from "@/components/warm/icons/fit";
import { haptic } from "@/lib/warm/haptics";
import {
  hasCardioZone,
  monthKey,
  monthLabelSv,
  shortDateSv,
  sportCategory,
  sportColor,
  sportLabel,
  zoneColor as zoneClr,
  type SportCategory,
} from "@/lib/warm/fit";
import { workoutSlug } from "@/lib/fitness/slug";
import { useFitnessProfile, hrZone } from "@/lib/fitness/profile";
import { useHydrateProfile } from "@/lib/fitness/useHydrateProfile";
import { paceString, durationString } from "@/lib/fitness/parser";
import { Tile } from "@/components/warm/primitives";
import type { Workout, WorkoutsResponse } from "@/lib/fitness/types";
import WarmErrorBanner from "@/components/warm/WarmErrorBanner";

type Filter = SportCategory | "all";

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "Alla" },
  { value: "run", label: "Löpning" },
  { value: "strength", label: "Styrka" },
  { value: "core", label: "Core" },
  { value: "walk", label: "Promenad" },
  { value: "padel", label: "Padel" },
  { value: "bike", label: "Cykling" },
];

const PAGE_SIZE = 30;

export default function WarmFitnessHistorikPage() {
  useHydrateProfile();
  const { t } = useWarmTheme();
  const profile = useFitnessProfile((s) => s.profile);
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);

  const { data, error, isLoading, mutate } = useSWR<WorkoutsResponse>(
    "/api/fitness/workouts?limit=500",
    fetcher,
    { revalidateOnFocus: false },
  );
  const { data: analysedData } = useSWR<{ keys: string[] }>("/api/fitness/analysed", fetcher, {
    revalidateOnFocus: false,
  });
  const analysedKeys = useMemo(() => new Set(analysedData?.keys ?? []), [analysedData]);

  const filtered = useMemo(() => {
    const all = data?.workouts ?? [];
    if (filter === "all") return all;
    return all.filter((w) => sportCategory(w.type) === filter);
  }, [data, filter]);

  const visible = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = filtered.length > visible.length;

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

  const total = data?.workouts?.length ?? 0;
  const subtitle = total > 0 ? `${total} pass · ${filter === "all" ? "alla typer" : FILTERS.find((f) => f.value === filter)?.label.toLowerCase()}` : "läser passhistoriken…";

  return (
    <div style={{ paddingBottom: 8 }}>
      <DetailHero
        backHref="/v3/fitness"
        backLabel="Fitness"
        eyebrow="HISTORIK"
        title="Alla pass"
        italicTail="genom åren."
        subtitle={subtitle}
      />

      <div style={{ padding: "0 14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Filter-chips — wrappar på två rader om de inte får plats */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {FILTERS.map((f) => {
            const active = filter === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => {
                  void haptic("tap");
                  setFilter(f.value);
                  setPage(1);
                }}
                style={{
                  fontFamily: body,
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: "0.01em",
                  background: active ? ACC : t.paper,
                  color: active ? "#FFFBF0" : t.mute,
                  border: `1px solid ${active ? ACC : t.line}`,
                  padding: "6px 12px",
                  borderRadius: 999,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {error ? (
          <WarmErrorBanner t={t} onRetry={() => mutate()} message="Kunde inte läsa passhistoriken." />
        ) : isLoading ? (
          <Tile t={t}>
            <div style={{ fontFamily: body, fontSize: 13, color: t.mute }}>Läser…</div>
          </Tile>
        ) : filtered.length === 0 ? (
          <Tile t={t}>
            <div style={{ fontFamily: body, fontSize: 13, color: t.mute }}>Inga pass matchar filtret.</div>
          </Tile>
        ) : (
          <>
            {groups.map(([k, items]) => (
              <div key={k}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 10,
                    padding: "0 4px",
                    marginBottom: 8,
                  }}
                >
                  <h2 style={{ ...num(t, 18, 500), letterSpacing: "-0.01em" }}>{monthLabelSv(k + "-01")}</h2>
                  <span style={{ ...ital(t, 12) }}>{items.length} pass</span>
                </div>
                <Tile t={t} style={{ padding: "4px 8px" }}>
                  {items.map((w, i) => {
                    const color = sportColor(w.type);
                    const zone = hasCardioZone(w.type) && w.avgHR ? hrZone(Math.round(w.avgHR), profile.zones) : null;
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
                            width: 36,
                            height: 36,
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
                              className="warm-tab-nums"
                              style={{
                                fontFamily: body,
                                fontSize: 11,
                                color: t.mute,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {durationString(w.totalTimeSec)}
                              {w.distanceM > 0 ? ` · ${paceString(w.distanceM, w.totalTimeSec)} /km` : ""}
                            </span>
                          </div>
                          <div style={{ ...ital(t, 11), marginTop: 2 }}>
                            {shortDateSv(w.date)}
                            {w.distanceM > 0 ? ` · ${sportLabel(w.type)}` : ""}
                            {w.avgHR ? ` · ${Math.round(w.avgHR)} bpm` : ""}
                            {w.trimp != null ? ` · TRIMP ${Math.round(w.trimp)}` : ""}
                          </div>
                        </div>
                        {zone ? (
                          <span
                            className="warm-tab-nums"
                            style={{
                              ...num(t, 10, 600),
                              background: zoneClr(zone),
                              color: "#FFFBF0",
                              padding: "3px 8px",
                              borderRadius: 999,
                              letterSpacing: 0.4,
                            }}
                          >
                            {zone}
                          </span>
                        ) : null}
                        <ChevronRight size={14} color={t.dim} />
                      </Link>
                    );
                  })}
                </Tile>
              </div>
            ))}

            {hasMore && (
              <div style={{ display: "flex", justifyContent: "center", paddingTop: 4 }}>
                <button
                  type="button"
                  onClick={() => { void haptic("tap"); setPage((p) => p + 1); }}
                  style={{
                    fontFamily: body,
                    fontSize: 12,
                    fontWeight: 600,
                    background: t.paper,
                    color: t.ink,
                    border: `1px solid ${t.line}`,
                    padding: "10px 22px",
                    borderRadius: 999,
                    cursor: "pointer",
                  }}
                >
                  Visa fler ({filtered.length - visible.length} kvar)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// keep used
void lab;

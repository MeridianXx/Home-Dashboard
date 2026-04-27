"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import ErrorBanner from "@/components/ErrorBanner";
import type { GardenOverviewResponse } from "@/lib/garden/types";

interface BriefingResponse {
  briefing: string;
  generatedAt: string;
  cached: boolean;
  error?: string;
}

function formatRelative(iso: string): string {
  try {
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const mins = Math.round(diffMs / 60000);
    if (mins < 1) return "just nu";
    if (mins < 60) return `${mins} min sedan`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours} h sedan`;
    return d.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

function BriefingHero() {
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { data, error, mutate, isLoading } = useSWR<BriefingResponse>(
    `/api/garden/briefing${refreshKey ? `?refresh=1&t=${refreshKey}` : ""}`,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 0 },
  );

  const errMsg = error instanceof Error ? error.message : "";
  const notReady = errMsg.includes(": 501");

  const onRefresh = async () => {
    setRefreshing(true);
    setRefreshKey(Date.now());
    await mutate();
    setRefreshing(false);
  };

  return (
    <div
      className="rounded-2xl"
      style={{
        backgroundColor: "var(--color-surface-container-lowest)",
        border: "1px solid var(--color-card-border)",
        boxShadow: "0px 8px 24px rgba(56,56,51,0.06)",
        padding: 18,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 16, color: "var(--color-primary)" }}
        >
          auto_awesome
        </span>
        <span
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          Daglig briefing
        </span>
        <div className="flex-1" />
        {data?.generatedAt && !error && (
          <span className="text-[10px]" style={{ color: "var(--color-outline)" }}>
            {formatRelative(data.generatedAt)}
          </span>
        )}
      </div>

      {notReady ? (
        <p className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
          AI-briefing kräver att <code>ANTHROPIC_API_KEY</code> är satt i miljön.
        </p>
      ) : error ? (
        <p className="text-sm" style={{ color: "var(--color-error, #b3261e)" }}>
          Kunde inte hämta briefing. {errMsg}
        </p>
      ) : isLoading || !data ? (
        <div className="space-y-2">
          <div style={skeletonStyle()} />
          <div style={{ ...skeletonStyle(), width: "85%" }} />
          <div style={{ ...skeletonStyle(), width: "70%" }} />
        </div>
      ) : (
        <p
          className="text-sm"
          style={{ color: "var(--color-on-surface)", whiteSpace: "pre-wrap", lineHeight: 1.55 }}
        >
          {data.briefing}
        </p>
      )}

      <div className="flex items-center gap-2" style={{ marginTop: 14 }}>
        <button
          onClick={onRefresh}
          disabled={refreshing || isLoading || notReady}
          className="text-xs font-semibold rounded-full"
          style={{
            backgroundColor: "var(--color-surface-container)",
            color: "var(--color-on-surface)",
            border: "1px solid var(--color-outline-variant)",
            padding: "6px 12px",
            cursor: refreshing ? "wait" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            opacity: notReady ? 0.5 : 1,
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 14,
              animation: refreshing ? "spin-anim 0.8s linear infinite" : undefined,
            }}
          >
            refresh
          </span>
          Generera ny
        </button>
        <Link
          href="/garden/ai"
          className="text-xs font-semibold rounded-full"
          style={{
            backgroundColor: "var(--color-primary)",
            color: "var(--color-on-primary)",
            border: "none",
            padding: "6px 12px",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chat</span>
          Öppna chat
        </Link>
      </div>
    </div>
  );
}

function skeletonStyle(): React.CSSProperties {
  return {
    height: 14,
    borderRadius: 4,
    backgroundColor: "var(--color-surface-container)",
    width: "100%",
  };
}

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

function SectionTitle({ icon, children, href }: { icon: string; children: React.ReactNode; href?: string }) {
  const inner = (
    <>
      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{icon}</span>
      {children}
      {href && (
        <span className="material-symbols-outlined" style={{ fontSize: 14, opacity: 0.4 }}>chevron_right</span>
      )}
    </>
  );
  const cls = "flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-3";
  const style = { color: "var(--color-on-surface-variant)" } as const;
  if (href) {
    return (
      <Link href={href} className={cls} style={{ ...style, textDecoration: "none" }}>
        {inner}
      </Link>
    );
  }
  return <h2 className={cls} style={style}>{inner}</h2>;
}

function StatTile({ label, value, unit, accent }: { label: string; value: string | number; unit?: string; accent?: string }) {
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
      <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-on-surface-variant)" }}>
        {label}
      </div>
      <div>
        <div
          className="text-xl font-bold tabular-nums leading-none"
          style={{ color: accent ?? "var(--color-on-surface)" }}
        >
          {value}
        </div>
        {unit && (
          <div className="mt-1 text-[11px] leading-none" style={{ color: "var(--color-on-surface-variant)" }}>
            {unit}
          </div>
        )}
      </div>
    </div>
  );
}

function BreakdownList({ entries }: { entries: Array<[string, number]> }) {
  if (entries.length === 0) {
    return (
      <div className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
        Inga rader.
      </div>
    );
  }
  const max = Math.max(...entries.map(([, n]) => n));
  return (
    <div className="space-y-2">
      {entries.map(([key, n]) => (
        <div key={key} className="flex items-center gap-3">
          <div className="text-sm flex-1 min-w-0 truncate" style={{ color: "var(--color-on-surface)" }}>{key}</div>
          <div
            aria-hidden
            style={{
              height: 6, borderRadius: 3,
              backgroundColor: "var(--color-primary)",
              width: `${Math.max(8, Math.round((n / max) * 100))}%`,
              maxWidth: 120,
              opacity: 0.75,
            }}
          />
          <div
            className="text-xs font-semibold tabular-nums shrink-0"
            style={{ color: "var(--color-on-surface-variant)", minWidth: 28, textAlign: "right" }}
          >
            {n}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatSek(value: number): string {
  return value.toLocaleString("sv-SE", { maximumFractionDigits: 0 });
}

export default function GardenOverviewPage() {
  const { data, error, isLoading, mutate } = useSWR<GardenOverviewResponse>(
    "/api/garden/overview",
    fetcher,
    { refreshInterval: 10 * 60 * 1000, revalidateOnFocus: false },
  );

  // `fetcher` kastar Error vid icke-ok HTTP — 501 (env saknas) hamnar därför i
  // `error`. Känn igen det och visa instruktionskortet i stället för ErrorBanner.
  const errMsg = error instanceof Error ? error.message : "";
  const notReady = (data && !data.gardenReady) || errMsg.includes(": 501");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight font-headline" style={{ color: "var(--color-on-surface)" }}>
          Trädgård
        </h1>
        <p className="text-sm font-medium mt-1" style={{ color: "var(--color-on-surface-variant)" }}>
          Växter · säsongsplan · utomhusprojekt
        </p>
      </div>

      {notReady ? (
        <Card>
          <p className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
            Trädgårds-DB:erna är inte konfigurerade. Sätt <code>NOTION_GARDEN_PLANTS_DB</code>, {" "}
            <code>NOTION_GARDEN_SEASON_DB</code> och <code>NOTION_GARDEN_PROJECTS_DB</code> i miljön.
          </p>
        </Card>
      ) : error ? (
        <ErrorBanner onRetry={() => mutate()} />
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(1, minmax(0, 1fr))" }}>
          {/* AI-briefing överst — egen render-cykel via SWR, inget att vänta på */}
          <BriefingHero />
          {/* Växter */}
          <Card>
            <SectionTitle icon="local_florist" href="/garden/vaxter">Växter</SectionTitle>
            <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
              <StatTile
                label="Totalt"
                value={isLoading ? "…" : (data?.plants.count ?? 0)}
                unit="växter"
              />
              <StatTile
                label="Typer"
                value={isLoading ? "…" : Object.keys(data?.plants.byType ?? {}).length}
                unit="kategorier"
              />
            </div>
            <BreakdownList
              entries={Object.entries(data?.plants.byType ?? {}).sort((a, b) => b[1] - a[1])}
            />
          </Card>

          {/* Säsongsplan */}
          <Card>
            <SectionTitle icon="calendar_today" href="/garden/sasongsplan">Säsongsplan</SectionTitle>
            <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
              <StatTile
                label="Kommande 30 d"
                value={isLoading ? "…" : (data?.tasks.upcoming ?? 0)}
                unit="uppgifter"
              />
              <StatTile
                label="Pågår nu"
                value={isLoading ? "…" : (data?.tasks.byStatus["Pågår"] ?? 0)}
                unit="uppgifter"
              />
            </div>
            <BreakdownList
              entries={Object.entries(data?.tasks.byStatus ?? {}).sort((a, b) => b[1] - a[1])}
            />
          </Card>

          {/* Projekt */}
          <Card>
            <SectionTitle icon="construction" href="/garden/projekt">Projekt</SectionTitle>
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
              <StatTile
                label="Aktiva"
                value={isLoading ? "…" : (data?.projects.active ?? 0)}
                unit="projekt"
              />
              <StatTile
                label="Budget"
                value={isLoading ? "…" : formatSek(data?.projects.totalBudget ?? 0)}
                unit="kr"
              />
              <StatTile
                label="Utfall"
                value={isLoading ? "…" : formatSek(data?.projects.totalSpent ?? 0)}
                unit="kr"
              />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

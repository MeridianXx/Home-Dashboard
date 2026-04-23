"use client";

import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import ErrorBanner from "@/components/ErrorBanner";
import type { GardenOverviewResponse } from "@/lib/garden/types";

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

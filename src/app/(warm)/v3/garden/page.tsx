"use client";

// ─── Warm Home · Trädgård · Hub ──────────────────────────────────────────────
// Layout: ACC-eyebrow "TRÄDGÅRD · {dag}" + display-rubrik baserad på säsong,
// AI-briefing-hero (terracotta-tinted), säsongs-klocka (12-månader-bar med
// aktuell månad markerad), aktiva växter denna säsong (lista), kommande
// uppgifter, AI quick-prompt + dörrar till växtregister/säsong/projekt/AI.

import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useWarmTheme } from "@/lib/warm/theme";
import { ACC, AMBER, SAGE, body, ital, lab, num } from "@/lib/warm/tokens";
import { Tile } from "@/components/warm/primitives";
import { HubDisplay, Section } from "@/components/warm/fit/parts";
import { ChevronRight, ChevronLeft } from "@/components/warm/icons/extra";
import { ThemeIcon } from "@/components/warm/icons";
import {
  CalendarIcon,
  ListIcon,
  SparkleIcon,
  RefreshIcon,
  ChatIcon,
  plantGlyph,
  CheckCircleIcon,
} from "@/components/warm/icons/garden";
import {
  isoToday,
  monthShort,
  seasonPhase,
  shortDateSv,
  formatRelativeSv,
  plantsActiveThisSeason,
  TASK_STATUS_COLOR,
  plantTypeColor,
} from "@/lib/warm/garden";
import type {
  GardenOverviewResponse,
  PlantsResponse,
  TasksResponse,
  Plant,
  SeasonTask,
} from "@/lib/garden/types";

// ── Hjälpare ────────────────────────────────────────────────────────────────

interface BriefingResponse {
  briefing: string;
  generatedAt: string;
  cached: boolean;
  error?: string;
}

const WEEKDAYS = ["söndag", "måndag", "tisdag", "onsdag", "torsdag", "fredag", "lördag"];

function formatTodayHeader(): string {
  const d = new Date();
  return WEEKDAYS[d.getDay()] ?? "";
}

// ── BriefingHero ────────────────────────────────────────────────────────────

function BriefingHero() {
  const { t } = useWarmTheme();
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
    <Tile
      t={t}
      hi
      style={{
        background: t.tint,
        border: `1px solid ${ACC}33`,
        padding: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <SparkleIcon size={14} color={ACC} />
        <span style={lab(t, { color: ACC })}>Daglig briefing</span>
        <div style={{ flex: 1 }} />
        {data?.generatedAt && !error && (
          <span style={{ fontFamily: body, fontSize: 10, color: t.dim }}>
            {formatRelativeSv(data.generatedAt)}
          </span>
        )}
      </div>

      {notReady ? (
        <p style={{ fontFamily: body, fontSize: 13, color: t.mute, lineHeight: 1.55 }}>
          AI-briefing kräver att <code>ANTHROPIC_API_KEY</code> är satt i miljön.
        </p>
      ) : error ? (
        <p style={{ fontFamily: body, fontSize: 13, color: t.bad, lineHeight: 1.55 }}>
          Kunde inte hämta briefing. {errMsg}
        </p>
      ) : isLoading || !data ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={skel(t, "100%")} />
          <div style={skel(t, "85%")} />
          <div style={skel(t, "60%")} />
        </div>
      ) : (
        <p
          style={{
            fontFamily: body,
            fontSize: 13.5,
            color: t.ink,
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
          }}
        >
          {data.briefing}
        </p>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing || isLoading || notReady}
          style={pillBtn(t, false, refreshing || isLoading || notReady)}
        >
          <RefreshIcon
            size={12}
            color={t.mute}
            style={{
              animation: refreshing ? "spin-anim 0.8s linear infinite" : undefined,
            }}
          />
          Generera ny
        </button>
        <Link href="/v3/garden/ai" style={{ ...pillBtn(t, true, false), textDecoration: "none" }}>
          <ChatIcon size={12} color="#FFFBF0" />
          Öppna chat
        </Link>
      </div>
    </Tile>
  );
}

function skel(t: { line: string }, width: string): React.CSSProperties {
  return {
    height: 12,
    borderRadius: 4,
    background: t.line,
    width,
  };
}

function pillBtn(
  t: { paper: string; line: string; ink: string; mute: string },
  primary: boolean,
  disabled: boolean,
): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    fontFamily: body,
    fontSize: 11,
    fontWeight: 600,
    background: primary ? ACC : t.paper,
    color: primary ? "#FFFBF0" : t.ink,
    border: primary ? "none" : `1px solid ${t.line}`,
    borderRadius: 999,
    padding: "6px 12px",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1,
  };
}

// ── Säsongs-klocka ──────────────────────────────────────────────────────────

function SeasonClock({ now }: { now: Date }) {
  const { t } = useWarmTheme();
  const m = now.getMonth();
  const phase = seasonPhase(m);
  return (
    <Tile t={t} style={{ padding: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={lab(t)}>Säsong</span>
        <span style={{ ...ital(t, 12, phase.color), fontWeight: 500 }}>
          {phase.label} <span style={{ fontStyle: "italic" }}>{phase.italicTail}</span>
        </span>
      </div>
      <div style={{ display: "flex", gap: 3 }}>
        {Array.from({ length: 12 }, (_, i) => {
          const isCurrent = i === m;
          const isPast = i < m;
          return (
            <div
              key={i}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: isCurrent ? 22 : 14,
                  borderRadius: 4,
                  background: isCurrent ? phase.color : isPast ? t.line : t.paper,
                  border: isCurrent ? "none" : `1px solid ${t.line}`,
                  transition: "height 200ms ease",
                }}
              />
              <span
                style={{
                  fontFamily: body,
                  fontSize: 9,
                  fontWeight: isCurrent ? 600 : 400,
                  color: isCurrent ? phase.color : t.dim,
                  letterSpacing: "0.04em",
                }}
              >
                {monthShort(i)}
              </span>
            </div>
          );
        })}
      </div>
    </Tile>
  );
}

// ── Kommande uppgifter ──────────────────────────────────────────────────────

function UpcomingTasks({ tasks }: { tasks: SeasonTask[] }) {
  const { t } = useWarmTheme();
  const today = isoToday();
  const upcoming = tasks
    .filter((tk) => tk.status !== "Klar" && tk.datum && tk.datum >= today)
    .sort((a, b) => a.datum.localeCompare(b.datum))
    .slice(0, 4);
  const overdue = tasks
    .filter((tk) => tk.status !== "Klar" && tk.datum && tk.datum < today)
    .sort((a, b) => a.datum.localeCompare(b.datum));

  if (upcoming.length === 0 && overdue.length === 0) {
    return (
      <Tile t={t}>
        <div style={{ ...ital(t, 13), textAlign: "center", padding: "8px 0" }}>
          Inga kommande uppgifter.
        </div>
      </Tile>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {overdue.length > 0 && (
        <Tile t={t} style={{ padding: "10px 14px", background: "rgba(176,69,46,0.08)", borderColor: t.bad }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: body, fontSize: 12, fontWeight: 600, color: t.bad }}>
              {overdue.length} försenade
            </span>
            <span style={{ fontFamily: body, fontSize: 11, color: t.mute }}>·</span>
            <span style={{ fontFamily: body, fontSize: 11, color: t.mute }}>
              äldsta {shortDateSv(overdue[0]!.datum)}
            </span>
          </div>
        </Tile>
      )}
      {upcoming.map((tk) => {
        const dotColor = TASK_STATUS_COLOR[tk.status] ?? ACC;
        return (
          <Link
            key={tk.id}
            href="/v3/garden/sasong"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 14px",
              background: t.paper,
              border: `1px solid ${t.line}`,
              borderRadius: 14,
              textDecoration: "none",
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                background: dotColor,
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: body,
                  fontSize: 13,
                  fontWeight: 600,
                  color: t.ink,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {tk.uppgift || "Namnlös uppgift"}
              </div>
              <div style={{ fontFamily: body, fontSize: 11, color: t.mute, marginTop: 2 }}>
                {shortDateSv(tk.datum)}
                {tk.typ ? ` · ${tk.typ}` : ""}
              </div>
            </div>
            <ChevronRight size={14} color={t.dim} />
          </Link>
        );
      })}
    </div>
  );
}

// ── Aktiva växter denna säsong ──────────────────────────────────────────────

function ActivePlants({ plants, monthIdx }: { plants: Plant[]; monthIdx: number }) {
  const { t } = useWarmTheme();
  const active = useMemo(() => plantsActiveThisSeason(plants, monthIdx).slice(0, 5), [plants, monthIdx]);

  if (active.length === 0) {
    return (
      <Tile t={t}>
        <div style={{ ...ital(t, 13), textAlign: "center", padding: "8px 0" }}>
          Inga växter passar säsongen just nu.
        </div>
      </Tile>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {active.map((p) => {
        const color = plantTypeColor(p.typ);
        return (
          <Link
            key={p.id}
            href={`/v3/garden/vaxt/${p.id}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 14px",
              background: t.paper,
              border: `1px solid ${t.line}`,
              borderRadius: 14,
              textDecoration: "none",
            }}
          >
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                background: t.paperHi,
                border: `1px solid ${t.line}`,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {plantGlyph(p.typ, 16, color)}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: body,
                  fontSize: 13,
                  fontWeight: 600,
                  color: t.ink,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {p.vaxt || "Namnlös växt"}
              </div>
              <div style={{ fontFamily: body, fontSize: 11, color: t.mute, marginTop: 2 }}>
                {p.typ}
                {p.platser.length > 0 ? ` · ${p.platser.slice(0, 2).join(", ")}` : ""}
              </div>
            </div>
            <ChevronRight size={14} color={t.dim} />
          </Link>
        );
      })}
    </div>
  );
}

// ── Door-tiles (Växter / Säsong / Projekt) ─────────────────────────────────

function DoorTile({
  href,
  eyebrow,
  title,
  tail,
  count,
  unit,
}: {
  href: string;
  eyebrow: string;
  title: string;
  tail: string;
  count: number | string;
  unit: string;
}) {
  const { t } = useWarmTheme();
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: 14,
        background: t.paper,
        border: `1px solid ${t.line}`,
        borderRadius: 14,
        textDecoration: "none",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...lab(t), color: ACC, marginBottom: 4 }}>{eyebrow}</div>
        <div style={{ ...num(t, 18, 500), lineHeight: 1.05 }}>
          {title}
          <span style={{ fontStyle: "italic", color: t.dim }}> {tail}</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
        <span style={{ ...num(t, 22, 500), lineHeight: 1 }} className="warm-tab-nums">
          {count}
        </span>
        <span style={{ fontFamily: body, fontSize: 10, color: t.mute, letterSpacing: "0.04em" }}>{unit}</span>
      </div>
      <ChevronRight size={16} color={t.dim} />
    </Link>
  );
}

// ── Sidkomponent ────────────────────────────────────────────────────────────

export default function GardenHubPage() {
  const { t, dark, setDark } = useWarmTheme();
  const now = new Date();
  const monthIdx = now.getMonth();
  const phase = seasonPhase(monthIdx);
  const dayLabel = formatTodayHeader();

  const overviewSwr = useSWR<GardenOverviewResponse>("/api/garden/overview", fetcher, {
    refreshInterval: 10 * 60 * 1000,
    revalidateOnFocus: false,
  });
  const plantsSwr = useSWR<PlantsResponse>("/api/garden/plants", fetcher, {
    refreshInterval: 30 * 60 * 1000,
    revalidateOnFocus: false,
  });
  const tasksSwr = useSWR<TasksResponse>("/api/garden/tasks", fetcher, {
    refreshInterval: 10 * 60 * 1000,
    revalidateOnFocus: false,
  });

  const overview = overviewSwr.data;
  const plants = plantsSwr.data?.plants ?? [];
  const tasks = tasksSwr.data?.tasks ?? [];

  const errMsg = overviewSwr.error instanceof Error ? overviewSwr.error.message : "";
  const notReady =
    (overview && !overview.gardenReady) ||
    errMsg.includes(": 501");

  return (
    <div style={{ paddingBottom: 24 }}>
      <HubDisplay
        eyebrow={`TRÄDGÅRD · ${dayLabel.toUpperCase()}`}
        title={phase.label}
        italicTail={phase.italicTail}
        right={
          <button
            type="button"
            onClick={() => setDark(!dark)}
            aria-label="Växla tema"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              background: t.paper,
              border: `1px solid ${t.line}`,
              borderRadius: 999,
              color: t.mute,
              cursor: "pointer",
            }}
          >
            <ThemeIcon dark={dark} size={16} color={t.mute} />
          </button>
        }
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "0 18px" }}>
        {notReady ? (
          <Tile t={t}>
            <p style={{ fontFamily: body, fontSize: 13, color: t.mute, lineHeight: 1.55 }}>
              Trädgårds-DB:erna är inte konfigurerade. Sätt <code>NOTION_GARDEN_PLANTS_DB</code>,
              <code> NOTION_GARDEN_SEASON_DB</code> och <code>NOTION_GARDEN_PROJECTS_DB</code> i miljön.
            </p>
          </Tile>
        ) : (
          <>
            <BriefingHero />

            <SeasonClock now={now} />

            <Section label="Aktiva växter denna säsong">
              <ActivePlants plants={plants} monthIdx={monthIdx} />
            </Section>

            <Section label="Kommande uppgifter">
              <UpcomingTasks tasks={tasks} />
            </Section>

            <Section label="Hela trädgården">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <DoorTile
                  href="/v3/garden/vaxter"
                  eyebrow="VÄXTER"
                  title="Registret,"
                  tail="alla växter."
                  count={plantsSwr.isLoading ? "…" : plants.length}
                  unit="växter"
                />
                <DoorTile
                  href="/v3/garden/sasong"
                  eyebrow="SÄSONG"
                  title="Planen,"
                  tail="månad för månad."
                  count={overviewSwr.isLoading ? "…" : overview?.tasks.upcoming ?? 0}
                  unit="kommande"
                />
                <DoorTile
                  href="/v3/garden/projekt"
                  eyebrow="PROJEKT"
                  title="Bygget,"
                  tail="planer i pipen."
                  count={overviewSwr.isLoading ? "…" : overview?.projects.active ?? 0}
                  unit="aktiva"
                />
              </div>
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

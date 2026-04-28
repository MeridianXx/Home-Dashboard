"use client";

// ─── Warm Home · Trädgård · Hub ──────────────────────────────────────────────
// Layout: ACC-eyebrow "TRÄDGÅRD · {dag}" + display-rubrik baserad på säsong,
// kompakt briefing-citat, "Att göra nu" (kommande uppgifter som primärt content),
// "Att sköta nu" (växter med kopplade kommande uppgifter), dörr-tiles.

import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useWarmTheme } from "@/lib/warm/theme";
import { ACC, SAGE, body, ital, lab, num } from "@/lib/warm/tokens";
import { Tile } from "@/components/warm/primitives";
import { HubDisplay, Section } from "@/components/warm/fit/parts";
import { ChevronRight } from "@/components/warm/icons/extra";
import { ThemeIcon } from "@/components/warm/icons";
import {
  SparkleIcon,
  RefreshIcon,
  ChatIcon,
  plantGlyph,
  CheckIcon,
} from "@/components/warm/icons/garden";
import {
  isoToday,
  seasonPhase,
  shortDateSv,
  formatRelativeSv,
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

// Hämta första meningens text ur briefingen (max 140 tecken).
function firstSentence(text: string, maxLen = 140): string {
  const dot = text.search(/[.!?]/);
  const candidate = dot > 0 ? text.slice(0, dot + 1) : text;
  return candidate.length <= maxLen ? candidate : `${candidate.slice(0, maxLen - 1)}…`;
}

// ── BriefingQuote — kompakt citat-band ──────────────────────────────────────

function BriefingQuote() {
  const { t } = useWarmTheme();
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

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

  const quoteText = data?.briefing ? firstSentence(data.briefing) : null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        background: t.tint,
        border: `1px solid ${ACC}33`,
        borderRadius: 14,
      }}
    >
      <SparkleIcon size={13} color={ACC} style={{ flexShrink: 0 }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        {notReady ? (
          <span style={{ fontFamily: body, fontSize: 12, color: t.mute }}>
            AI-briefing kräver <code>ANTHROPIC_API_KEY</code>.
          </span>
        ) : error ? (
          <span style={{ fontFamily: body, fontSize: 12, color: t.bad }}>
            Kunde inte hämta briefing.
          </span>
        ) : isLoading || !quoteText ? (
          <div
            style={{
              height: 12,
              borderRadius: 4,
              background: t.line,
              width: "70%",
            }}
          />
        ) : (
          <span
            style={{
              ...ital(t, 12.5, t.ink),
              lineHeight: 1.45,
              fontWeight: 400,
              display: "block",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {quoteText}
          </span>
        )}
      </div>

      {/* Knappar */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        {data?.generatedAt && !error && !isLoading && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Generera ny briefing"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 26,
              height: 26,
              background: t.paper,
              border: `1px solid ${t.line}`,
              borderRadius: 999,
              cursor: refreshing ? "not-allowed" : "pointer",
              opacity: refreshing ? 0.5 : 1,
            }}
          >
            <RefreshIcon
              size={12}
              color={t.mute}
              style={{ animation: refreshing ? "spin-anim 0.8s linear infinite" : undefined }}
            />
          </button>
        )}
        <Link
          href="/v3/garden/ai"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontFamily: body,
            fontSize: 11,
            fontWeight: 600,
            color: ACC,
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          <ChatIcon size={11} color={ACC} />
          AI-chat
        </Link>
      </div>
    </div>
  );
}

// ── Att göra nu — primärt content ──────────────────────────────────────────

function AttGoraNu({ tasks }: { tasks: SeasonTask[] }) {
  const { t } = useWarmTheme();
  const today = isoToday();

  const overdue = tasks
    .filter((tk) => tk.status !== "Klar" && tk.datum && tk.datum < today)
    .sort((a, b) => a.datum.localeCompare(b.datum));

  const upcoming = tasks
    .filter((tk) => tk.status !== "Klar" && tk.datum && tk.datum >= today)
    .sort((a, b) => a.datum.localeCompare(b.datum))
    .slice(0, 5);

  if (overdue.length === 0 && upcoming.length === 0) {
    return (
      <Tile t={t}>
        <div style={{ ...ital(t, 13), textAlign: "center", padding: "8px 0" }}>
          Inga uppgifter planerade.
        </div>
      </Tile>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Försenade — varnings-chip */}
      {overdue.length > 0 && (
        <Link
          href="/v3/garden/sasong"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            background: "rgba(176,69,46,0.08)",
            border: `1px solid ${t.bad}`,
            borderRadius: 14,
            textDecoration: "none",
          }}
        >
          <span
            style={{
              fontFamily: body,
              fontSize: 12,
              fontWeight: 700,
              color: t.bad,
            }}
          >
            {overdue.length} försenad{overdue.length > 1 ? "e" : ""}
          </span>
          <span style={{ fontFamily: body, fontSize: 11, color: t.mute }}>
            · äldsta {shortDateSv(overdue[0]!.datum)}
          </span>
          <ChevronRight size={13} color={t.bad} style={{ marginLeft: "auto" }} />
        </Link>
      )}

      {/* Kommande rader */}
      {upcoming.map((tk) => {
        const dotColor = TASK_STATUS_COLOR[tk.status] ?? ACC;
        const isToday = tk.datum === today;
        return (
          <Link
            key={tk.id}
            href="/v3/garden/sasong"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 14px",
              background: isToday ? `${ACC}0F` : t.paper,
              border: `1px solid ${isToday ? `${ACC}44` : t.line}`,
              borderRadius: 14,
              textDecoration: "none",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
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
              <div style={{ fontFamily: body, fontSize: 11, color: t.mute, marginTop: 1 }}>
                {isToday ? "Idag" : shortDateSv(tk.datum)}
                {tk.typ ? ` · ${tk.typ}` : ""}
              </div>
            </div>
            <ChevronRight size={14} color={t.dim} />
          </Link>
        );
      })}

      {/* Länk till säsongsplan */}
      <Link
        href="/v3/garden/sasong"
        style={{
          fontFamily: body,
          fontSize: 12,
          fontWeight: 600,
          color: ACC,
          textDecoration: "none",
          padding: "4px 2px",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        Se hela säsongsplanen
        <ChevronRight size={12} color={ACC} />
      </Link>
    </div>
  );
}

// ── Att sköta nu — växter med kommande uppgifter ────────────────────────────
// Visar växter som har uppgifter kopplade till dem de närmaste 60 dagarna.

function AttSkotaNu({ plants, tasks }: { plants: Plant[]; tasks: SeasonTask[] }) {
  const { t } = useWarmTheme();
  const today = isoToday();

  // ISO-datum 60 dagar framåt
  const cutoff = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 60);
    return d.toISOString().slice(0, 10);
  }, []);

  // Samla plantIds som förekommer i kommande uppgifter
  const activeIds = useMemo(() => {
    const ids = new Set<string>();
    tasks
      .filter((tk) => tk.status !== "Klar" && tk.datum >= today && tk.datum <= cutoff)
      .forEach((tk) => tk.plantIds.forEach((id) => ids.add(id)));
    return ids;
  }, [tasks, today, cutoff]);

  const activePlants = useMemo(
    () => plants.filter((p) => activeIds.has(p.id)).slice(0, 4),
    [plants, activeIds],
  );

  if (activePlants.length === 0) {
    return null; // dölj sektionen om inga träffar — vill inte visa tomma tillstånd
  }

  return (
    <Section label="Att sköta nu">
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {activePlants.map((p) => {
          const color = plantTypeColor(p.typ);
          const plantTasks = tasks
            .filter(
              (tk) =>
                tk.plantIds.includes(p.id) &&
                tk.status !== "Klar" &&
                tk.datum >= today &&
                tk.datum <= cutoff,
            )
            .sort((a, b) => a.datum.localeCompare(b.datum));
          const nextTask = plantTasks[0];

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
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  background: `${color}1A`,
                  border: `1px solid ${color}33`,
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
                {nextTask && (
                  <div style={{ fontFamily: body, fontSize: 11, color: t.mute, marginTop: 1 }}>
                    {nextTask.uppgift
                      ? `${nextTask.uppgift.length > 28 ? nextTask.uppgift.slice(0, 27) + "…" : nextTask.uppgift}`
                      : "Uppgift"}
                    {" · "}
                    {shortDateSv(nextTask.datum)}
                    {plantTasks.length > 1 ? ` +${plantTasks.length - 1} till` : ""}
                  </div>
                )}
              </div>
              <ChevronRight size={14} color={t.dim} />
            </Link>
          );
        })}

        <Link
          href="/v3/garden/vaxter"
          style={{
            fontFamily: body,
            fontSize: 12,
            fontWeight: 600,
            color: ACC,
            textDecoration: "none",
            padding: "4px 2px",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          Alla växter
          <ChevronRight size={12} color={ACC} />
        </Link>
      </div>
    </Section>
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

      <div style={{ display: "flex", flexDirection: "column", gap: 18, padding: "0 18px" }}>
        {notReady ? (
          <Tile t={t}>
            <p style={{ fontFamily: body, fontSize: 13, color: t.mute, lineHeight: 1.55 }}>
              Trädgårds-DB:erna är inte konfigurerade. Sätt <code>NOTION_GARDEN_PLANTS_DB</code>,
              <code> NOTION_GARDEN_SEASON_DB</code> och <code>NOTION_GARDEN_PROJECTS_DB</code> i miljön.
            </p>
          </Tile>
        ) : (
          <>
            {/* Kompakt briefing-citat */}
            <BriefingQuote />

            {/* Att göra nu — primärt content */}
            <Section label="Att göra nu">
              <AttGoraNu tasks={tasks} />
            </Section>

            {/* Växter med kopplade kommande uppgifter */}
            <AttSkotaNu plants={plants} tasks={tasks} />

            {/* Dörr-tiles */}
            <Section label="Trädgården">
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

"use client";

// ─── Warm Home · Trädgård · Hub ──────────────────────────────────────────────
// Layout (Claude Design-stil):
//   1. HubDisplay-rubrik (säsongsfas).
//   2. SeasonCard — sage-tinted "JUST NU"-kort med närmaste aktivitet, växter
//      som berörs och 12-månaders bar med aktuell månad markerad.
//   3. "Att göra nu" — kort-grupp med kommande uppgifter.
//   4. FragaAICard — terracotta-tinted prompt-kort som leder till AI-chatten.
//   5. "Trädgården" — dörr-tiles (växter / säsong / projekt) i samma kort-grupp.

import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useWarmTheme } from "@/lib/warm/theme";
import { ACC, SAGE, body, ital, lab, num } from "@/lib/warm/tokens";
import type { WarmTheme } from "@/lib/warm/tokens";
import { Tile } from "@/components/warm/primitives";
import { HubDisplay, Section } from "@/components/warm/fit/parts";
import { ChevronRight } from "@/components/warm/icons/extra";
import { ThemeIcon } from "@/components/warm/icons";
import { SparkleIcon } from "@/components/warm/icons/garden";
import {
  isoToday,
  seasonPhase,
  shortDateSv,
  TASK_STATUS_COLOR,
} from "@/lib/warm/garden";
import type {
  GardenOverviewResponse,
  PlantsResponse,
  TasksResponse,
  Plant,
  SeasonTask,
} from "@/lib/garden/types";

// ── Hjälpare ────────────────────────────────────────────────────────────────

const WEEKDAYS = ["söndag", "måndag", "tisdag", "onsdag", "torsdag", "fredag", "lördag"];
const MONTH_INITIALS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

function formatTodayHeader(): string {
  const d = new Date();
  return WEEKDAYS[d.getDay()] ?? "";
}

// ── SeasonCard — sage-tinted "JUST NU"-kort ─────────────────────────────────

function SeasonCard({
  tasks,
  plants,
  monthIdx,
}: {
  tasks: SeasonTask[];
  plants: Plant[];
  monthIdx: number;
}) {
  const { t } = useWarmTheme();
  const today = isoToday();

  // Närmaste framtida uppgift (inkl. idag).
  const nextTask = tasks
    .filter((tk) => tk.status !== "Klar" && tk.datum && tk.datum >= today)
    .sort((a, b) => a.datum.localeCompare(b.datum))[0];

  // Berörda växter: en växt → fullt namn; flera → deduperad typ-lista
  // ("fruktträd · buske · perenn"). Håller rubriken läsbar även när uppgiften
  // är knuten till många växter.
  const involvedPlants = nextTask
    ? plants.filter((p) => nextTask.plantIds.includes(p.id))
    : [];
  const titleText = nextTask?.uppgift?.trim() || "Inga aktiviteter inplanerade";
  const subtitle = (() => {
    if (involvedPlants.length === 1) {
      return `${(involvedPlants[0]!.vaxt ?? "").toLowerCase()}.`;
    }
    if (involvedPlants.length > 1) {
      const types = Array.from(
        new Set(involvedPlants.map((p) => (p.typ ?? "").toLowerCase()).filter(Boolean)),
      );
      return types.length > 0 ? types.join(" · ") + "." : "";
    }
    return nextTask?.kommentar?.trim() || nextTask?.typ?.toLowerCase() || "";
  })();

  return (
    <div
      style={{
        background: t.tintSage,
        border: `1px solid ${SAGE}33`,
        borderRadius: 14,
        padding: "14px 16px",
      }}
    >
      {/* Eyebrow-rad: JUST NU · SENAST */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ ...lab(t), color: SAGE }}>JUST NU</span>
        {nextTask && <span style={{ ...lab(t), color: SAGE }}>SENAST</span>}
      </div>

      {/* Titel-rad */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
        <div
          style={{
            ...num(t, 22, 500),
            lineHeight: 1.2,
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {titleText}
        </div>
        {nextTask && (
          <div style={{ ...num(t, 18, 500), lineHeight: 1.2, color: t.ink, flexShrink: 0 }}>
            {shortDateSv(nextTask.datum)}
          </div>
        )}
      </div>

      {/* Subtitel — italic plantor eller fallback */}
      {subtitle && (
        <div style={{ ...ital(t, 13, t.mute), marginTop: 4, lineHeight: 1.4 }}>{subtitle}</div>
      )}

      {/* Månads-bar */}
      <MonthBar t={t} monthIdx={monthIdx} />
    </div>
  );
}

function MonthBar({ t, monthIdx }: { t: WarmTheme; monthIdx: number }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: "flex", gap: 4 }}>
        {MONTH_INITIALS.map((_, i) => {
          const active = i === monthIdx;
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: 6,
                borderRadius: 3,
                background: active ? ACC : t.line,
                opacity: active ? 1 : 0.6,
              }}
            />
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
        {MONTH_INITIALS.map((label, i) => {
          const active = i === monthIdx;
          return (
            <div
              key={i}
              style={{
                flex: 1,
                fontFamily: body,
                fontSize: 10,
                fontWeight: active ? 700 : 500,
                textAlign: "center",
                color: active ? ACC : t.dim,
                letterSpacing: "0.04em",
              }}
            >
              {label}
            </div>
          );
        })}
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
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Försenade — separat varnings-chip ovanför kort-gruppen */}
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
          <span style={{ fontFamily: body, fontSize: 12, fontWeight: 700, color: t.bad }}>
            {overdue.length} försenad{overdue.length > 1 ? "e" : ""}
          </span>
          <span style={{ fontFamily: body, fontSize: 11, color: t.mute }}>
            · äldsta {shortDateSv(overdue[0]!.datum)}
          </span>
          <ChevronRight size={13} color={t.bad} style={{ marginLeft: "auto" }} />
        </Link>
      )}

      {/* Kort-grupp med interna avdelare */}
      <div
        style={{
          background: t.paper,
          border: `1px solid ${t.line}`,
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        {upcoming.map((tk, i) => {
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
                background: isToday ? `${ACC}0F` : "transparent",
                borderTop: i === 0 ? "none" : `1px solid ${t.line}`,
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
                    display: "flex",
                    alignItems: "baseline",
                    gap: 6,
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      fontFamily: body,
                      fontSize: 13,
                      fontWeight: 600,
                      color: t.ink,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      minWidth: 0,
                    }}
                  >
                    {tk.uppgift || "Namnlös uppgift"}
                  </span>
                  {tk.status && tk.status !== "Klar" && (
                    <span
                      style={{
                        ...ital(t, 12, dotColor),
                        flexShrink: 0,
                        opacity: 0.9,
                      }}
                    >
                      {tk.status === "Pågår" ? "pågår" : "planerad"}
                    </span>
                  )}
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
      </div>

    </div>
  );
}

// ── FragaAICard — terracotta-tinted prompt-kort ─────────────────────────────

const AI_PROMPT_CHIPS = [
  "När bör jag plantera ut?",
  "Behöver något extra ljus nu?",
  "Vilka växter ska gödslas?",
];

// Hero-frågan väljs heuristiskt efter månad så hubben känns säsongs-närvarande
// utan att bero på ett extra API-anrop.
function heroQuestion(monthIdx: number): string {
  if (monthIdx <= 1) return "Vad ska jag förbereda för våren?";
  if (monthIdx === 2) return "Vad ska jag så denna vecka?";
  if (monthIdx === 3 || monthIdx === 4) return "Vad ska jag göra med plantorna i helgen?";
  if (monthIdx === 5) return "När kan jag flytta ut citronen?";
  if (monthIdx === 6 || monthIdx === 7) return "Vilka växter behöver mer vatten just nu?";
  if (monthIdx === 8) return "Vad ska jag skörda först?";
  return "Hur förbereder jag trädgården för vintern?";
}

function FragaAICard() {
  const { t } = useWarmTheme();
  const monthIdx = new Date().getMonth();
  const hero = heroQuestion(monthIdx);

  return (
    <div
      style={{
        background: t.tint,
        border: `1px solid ${ACC}33`,
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      <Link
        href="/v3/garden/ai"
        style={{
          display: "block",
          padding: "14px 16px",
          textDecoration: "none",
          color: t.ink,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ ...lab(t), color: ACC, display: "inline-flex", alignItems: "center", gap: 5 }}>
            <SparkleIcon size={11} color={ACC} />
            FRÅGA AI
          </span>
          <ChevronRight size={14} color={ACC} />
        </div>
        <div style={{ ...num(t, 17, 500), lineHeight: 1.25 }}>
          <span style={{ fontStyle: "italic" }}>&ldquo;{hero}&rdquo;</span>
        </div>
      </Link>

      {/* Snabb-chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "0 16px 14px" }}>
        {AI_PROMPT_CHIPS.map((q) => (
          <Link
            key={q}
            href={`/v3/garden/ai?prompt=${encodeURIComponent(q)}`}
            style={{
              ...ital(t, 12, t.mute),
              padding: "5px 11px",
              borderRadius: 999,
              border: `1px solid ${t.line}`,
              background: t.paper,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            {q}
          </Link>
        ))}
      </div>
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
  first,
}: {
  href: string;
  eyebrow: string;
  title: string;
  tail: string;
  count: number | string;
  unit: string;
  first?: boolean;
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
        borderTop: first ? "none" : `1px solid ${t.line}`,
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
            {/* Säsongs-card med JUST NU + nästa aktivitet + månadsbar */}
            <SeasonCard tasks={tasks} plants={plants} monthIdx={monthIdx} />

            {/* Att göra nu — primärt content */}
            <Section
              label="Att göra nu"
              right={
                <Link
                  href="/v3/garden/sasong"
                  style={{
                    ...ital(t, 12, ACC),
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  se hela säsongsplanen
                  <ChevronRight size={11} color={ACC} />
                </Link>
              }
            >
              <AttGoraNu tasks={tasks} />
            </Section>

            {/* Fråga AI — terracotta-tinted prompt-kort */}
            <FragaAICard />

            {/* Dörr-tiles — grupperade i ett kort */}
            <Section label="Trädgården">
              <div
                style={{
                  background: t.paper,
                  border: `1px solid ${t.line}`,
                  borderRadius: 14,
                  overflow: "hidden",
                }}
              >
                <DoorTile
                  href="/v3/garden/vaxter"
                  eyebrow="VÄXTER"
                  title="Registret,"
                  tail="alla växter."
                  count={plantsSwr.isLoading ? "…" : plants.length}
                  unit="växter"
                  first
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

"use client";

// ─── Warm Home · Trädgård · Växt-detalj ──────────────────────────────────────
// Drill-down från grid. Stora info-block: typ, plats, beskärning, gödsling,
// skötselråd. Kopplade säsongs-uppgifter listas under. AI-deep-link i Warm-
// terracotta som primärknapp + "Öppna i Notion" som sekundär.

import Link from "next/link";
import { use } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useWarmTheme } from "@/lib/warm/theme";
import { ACC, body, ital, lab, num } from "@/lib/warm/tokens";
import { Tile } from "@/components/warm/primitives";
import { DetailHero, Section } from "@/components/warm/fit/parts";
import {
  plantGlyph,
  CalendarIcon,
  SparkleIcon,
  ExternalLinkIcon,
} from "@/components/warm/icons/garden";
import { ChevronRight } from "@/components/warm/icons/extra";
import { plantTypeColor, shortDateSv, TASK_STATUS_COLOR } from "@/lib/warm/garden";
import type { Plant, SeasonTask } from "@/lib/garden/types";

interface PlantResponse {
  plant: Plant;
}

interface TaskListResponse {
  tasks: SeasonTask[];
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  const { t } = useWarmTheme();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        padding: "12px 0",
        borderBottom: `1px solid ${t.line}`,
      }}
    >
      <div
        style={{
          ...lab(t),
          width: 110,
          flexShrink: 0,
          paddingTop: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          fontFamily: body,
          fontSize: 13,
          color: t.ink,
          lineHeight: 1.5,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Chips({ items, color }: { items: string[]; color?: string }) {
  const { t } = useWarmTheme();
  if (items.length === 0) return <span style={{ color: t.dim }}>–</span>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
      {items.map((i) => (
        <span
          key={i}
          style={{
            fontFamily: body,
            fontSize: 11,
            fontWeight: 500,
            background: color ? `${color}1A` : t.tint,
            color: color ?? t.ink,
            border: color ? `1px solid ${color}33` : `1px solid ${t.line}`,
            borderRadius: 999,
            padding: "3px 10px",
            lineHeight: 1.3,
          }}
        >
          {i}
        </span>
      ))}
    </div>
  );
}

export default function PlantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useWarmTheme();

  const { data, error, isLoading } = useSWR<PlantResponse>(
    `/api/garden/plants/${id}`,
    fetcher,
    { revalidateOnFocus: false },
  );

  const { data: tasksData } = useSWR<TaskListResponse>(
    "/api/garden/tasks",
    fetcher,
    { revalidateOnFocus: false },
  );

  const plant = data?.plant;
  const relatedTasks = (tasksData?.tasks ?? []).filter((tk) => tk.plantIds.includes(id));
  const errMsg = error instanceof Error ? error.message : "";

  if (isLoading || (!plant && !errMsg)) {
    return (
      <div style={{ paddingBottom: 24 }}>
        <DetailHero
          backHref="/v3/garden/vaxter"
          backLabel="Växter"
          eyebrow="VÄXT"
          title="Laddar…"
        />
      </div>
    );
  }
  if (errMsg || !plant) {
    return (
      <div style={{ paddingBottom: 24 }}>
        <DetailHero
          backHref="/v3/garden/vaxter"
          backLabel="Växter"
          eyebrow="VÄXT"
          title="Hittades inte"
        />
        <div style={{ padding: "0 18px" }}>
          <Tile t={t}>
            <p style={{ fontFamily: body, fontSize: 13, color: t.mute }}>
              Kunde inte ladda växten. {errMsg}
            </p>
          </Tile>
        </div>
      </div>
    );
  }

  const color = plantTypeColor(plant.typ);
  const aiPrompt = `Berätta om ${plant.vaxt}: skötsel, beskärning och vanliga problem. Vad bör jag tänka på just nu?`;

  return (
    <div style={{ paddingBottom: 24 }}>
      <DetailHero
        backHref="/v3/garden/vaxter"
        backLabel="Växter"
        eyebrow={(plant.typ || "VÄXT").toUpperCase()}
        title={plant.vaxt || "Namnlös växt"}
        italicTail={plant.platser.length > 0 ? `· ${plant.platser[0]!.toLowerCase()}.` : undefined}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 18, padding: "0 18px" }}>
        {/* Hero-strip med ikon + plats-pills */}
        <Tile t={t} hi style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              background: `${color}1A`,
              border: `1px solid ${color}33`,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {plantGlyph(plant.typ, 26, color)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...lab(t), color: color, marginBottom: 4 }}>{plant.typ || "växt"}</div>
            <div style={{ fontFamily: body, fontSize: 12, color: t.mute, lineHeight: 1.4 }}>
              {plant.platser.length > 0 ? plant.platser.join(" · ") : "Plats ej angiven"}
            </div>
          </div>
        </Tile>

        {/* Skötseluppgifter */}
        <Tile t={t} style={{ padding: "4px 16px" }}>
          <FieldRow label="Beskärning">
            <Chips items={plant.beskarning} color={color} />
          </FieldRow>
          <FieldRow label="Gödsling">
            <Chips items={plant.godsling} color={color} />
          </FieldRow>
          <FieldRow label="Skötselråd">
            {plant.skotselrad ? (
              <span style={{ whiteSpace: "pre-wrap", lineHeight: 1.55 }}>{plant.skotselrad}</span>
            ) : (
              <span style={{ color: t.dim }}>–</span>
            )}
          </FieldRow>
        </Tile>

        {/* Action-rad */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link
            href={`/v3/garden/ai?prompt=${encodeURIComponent(aiPrompt)}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontFamily: body,
              fontSize: 12,
              fontWeight: 600,
              background: ACC,
              color: "#FFFBF0",
              borderRadius: 999,
              padding: "8px 14px",
              textDecoration: "none",
            }}
          >
            <SparkleIcon size={13} color="#FFFBF0" />
            Fråga AI om {plant.vaxt}
          </Link>
          <a
            href={plant.notionUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontFamily: body,
              fontSize: 12,
              fontWeight: 600,
              background: t.paper,
              color: t.ink,
              border: `1px solid ${t.line}`,
              borderRadius: 999,
              padding: "8px 14px",
              textDecoration: "none",
            }}
          >
            <ExternalLinkIcon size={13} color={t.ink} />
            Öppna i Notion
          </a>
        </div>

        {/* Kopplade åtgärder */}
        <Section label="Kopplade åtgärder">
          {relatedTasks.length === 0 ? (
            <Tile t={t}>
              <p style={{ ...ital(t, 13), textAlign: "center", padding: "4px 0" }}>
                Inga kopplade uppgifter i säsongsplanen.
              </p>
            </Tile>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {relatedTasks.map((tk) => {
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
                        width: 30,
                        height: 30,
                        borderRadius: 15,
                        background: t.paperHi,
                        border: `1px solid ${t.line}`,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <CalendarIcon size={14} color={dotColor} />
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
                        {tk.uppgift || "Namnlös uppgift"}
                      </div>
                      <div
                        style={{
                          fontFamily: body,
                          fontSize: 11,
                          color: t.mute,
                          marginTop: 2,
                        }}
                      >
                        {shortDateSv(tk.datum) || "—"}
                        {tk.typ ? ` · ${tk.typ}` : ""}
                        {` · ${tk.status}`}
                      </div>
                    </div>
                    <ChevronRight size={14} color={t.dim} />
                  </Link>
                );
              })}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { use } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import ErrorBanner from "@/components/ErrorBanner";
import type { Plant, SeasonTask } from "@/lib/garden/types";

interface PlantResponse { plant: Plant }
interface TaskListResponse { tasks: SeasonTask[] }

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

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      className="flex items-start gap-3"
      style={{ paddingTop: 10, paddingBottom: 10, borderBottom: "1px solid var(--color-outline-variant)" }}
    >
      <div
        className="text-[11px] font-semibold uppercase tracking-wider shrink-0"
        style={{ color: "var(--color-on-surface-variant)", width: 110, paddingTop: 2 }}
      >
        {label}
      </div>
      <div className="text-sm flex-1 min-w-0" style={{ color: "var(--color-on-surface)" }}>
        {children}
      </div>
    </div>
  );
}

function Chips({ items }: { items: string[] }) {
  if (items.length === 0) return <span style={{ color: "var(--color-outline)" }}>–</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((i) => (
        <span
          key={i}
          className="text-xs font-semibold rounded-full"
          style={{
            backgroundColor: "var(--color-surface-container)",
            color: "var(--color-on-surface-variant)",
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

function formatShortDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("sv-SE", { weekday: "short", day: "numeric", month: "short" });
  } catch {
    return iso;
  }
}

export default function PlantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data, error, isLoading, mutate } = useSWR<PlantResponse>(
    `/api/garden/plants/${id}`,
    fetcher,
    { revalidateOnFocus: false },
  );

  // Hämta alla uppgifter och filtrera på växtens id client-side. Notion stödjer
  // relation-contains-filter men att bara lista lokalt räcker för första versionen.
  const { data: tasksData } = useSWR<TaskListResponse>(
    `/api/garden/tasks`,
    fetcher,
    { revalidateOnFocus: false },
  );

  const plant = data?.plant;
  const relatedTasks = (tasksData?.tasks ?? []).filter((t) => t.plantIds.includes(id));

  return (
    <div className="space-y-5">
      <Link
        href="/garden/vaxter"
        className="inline-flex items-center gap-1 text-sm font-semibold"
        style={{ color: "var(--color-on-surface-variant)", textDecoration: "none" }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_left</span>
        Växtregister
      </Link>

      {error ? (
        <ErrorBanner onRetry={() => mutate()} />
      ) : isLoading || !plant ? (
        <div className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>Laddar…</div>
      ) : (
        <>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight font-headline" style={{ color: "var(--color-on-surface)" }}>
              {plant.vaxt || "Namnlös växt"}
            </h1>
            {plant.typ && (
              <p className="text-sm font-medium mt-1" style={{ color: "var(--color-on-surface-variant)" }}>
                {plant.typ}
              </p>
            )}
          </div>

          <Card>
            <FieldRow label="Typ">{plant.typ || <span style={{ color: "var(--color-outline)" }}>–</span>}</FieldRow>
            <FieldRow label="Plats"><Chips items={plant.platser} /></FieldRow>
            <FieldRow label="Beskärning"><Chips items={plant.beskarning} /></FieldRow>
            <FieldRow label="Gödsling"><Chips items={plant.godsling} /></FieldRow>
            <FieldRow label="Skötselråd">
              {plant.skotselrad ? (
                <span style={{ whiteSpace: "pre-wrap" }}>{plant.skotselrad}</span>
              ) : (
                <span style={{ color: "var(--color-outline)" }}>–</span>
              )}
            </FieldRow>

            <div className="flex flex-wrap gap-2" style={{ marginTop: 16 }}>
              <Link
                href={`/garden/ai?prompt=${encodeURIComponent(`Berätta om ${plant.vaxt}: skötsel, beskärning och vanliga problem. Vad bör jag tänka på just nu?`)}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  backgroundColor: "var(--color-primary)",
                  color: "var(--color-on-primary)",
                  border: "none",
                  padding: "6px 14px",
                  textDecoration: "none",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>auto_awesome</span>
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
                  backgroundColor: "var(--color-surface-container)",
                  color: "var(--color-on-surface)",
                  border: "1px solid var(--color-outline-variant)",
                  padding: "6px 14px",
                  textDecoration: "none",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
                Öppna i Notion
              </a>
            </div>
          </Card>

          <Card>
            <h2
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-3"
              style={{ color: "var(--color-on-surface-variant)" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>list_alt</span>
              Kopplade åtgärder
            </h2>
            {relatedTasks.length === 0 ? (
              <div className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
                Inga kopplade uppgifter i säsongsplanen.
              </div>
            ) : (
              <div className="space-y-2">
                {relatedTasks.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-xl flex items-center gap-3"
                    style={{ padding: "10px 12px", backgroundColor: "var(--color-surface-container)" }}
                  >
                    <span
                      className="material-symbols-outlined shrink-0"
                      style={{ fontSize: 18, color: "var(--color-primary)" }}
                    >
                      event
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate" style={{ color: "var(--color-on-surface)" }}>
                        {t.uppgift || "Namnlös uppgift"}
                      </div>
                      <div className="text-[11px]" style={{ color: "var(--color-on-surface-variant)" }}>
                        {formatShortDate(t.datum)}
                        {t.typ && ` · ${t.typ}`}
                        {t.status && ` · ${t.status}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

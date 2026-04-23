"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import ErrorBanner from "@/components/ErrorBanner";
import type { Plant, PlantsResponse } from "@/lib/garden/types";

const TYPES = [
  "Alla",
  "Häck",
  "Buske",
  "Prydnadsgräs",
  "Prydnadsträd",
  "Perenn",
  "Gräs",
  "Fruktträd",
  "Marktäckare",
  "Grönsak",
  "Blomma",
];

const LOCATIONS = ["Alla", "Inomhus", "Växthus", "Altan", "Baksida", "Framsida"];

function typeIcon(typ: string): string {
  switch (typ) {
    case "Fruktträd":
    case "Prydnadsträd":
      return "park";
    case "Buske":
    case "Häck":
      return "forest";
    case "Perenn":
    case "Blomma":
      return "local_florist";
    case "Prydnadsgräs":
    case "Gräs":
      return "grass";
    case "Grönsak":
      return "eco";
    case "Marktäckare":
      return "nature";
    default:
      return "yard";
  }
}

function FilterRow({
  label, options, value, onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div
        className="text-[10px] font-semibold uppercase tracking-wider mb-1"
        style={{ color: "var(--color-on-surface-variant)" }}
      >
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = value === opt;
          return (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              className="text-xs font-semibold rounded-full transition-all"
              style={{
                backgroundColor: active ? "var(--color-inverse-surface)" : "var(--color-surface-container)",
                color: active ? "var(--color-surface)" : "var(--color-on-surface-variant)",
                padding: "5px 12px",
                border: "1px solid var(--color-outline-variant)",
                lineHeight: 1.2,
                cursor: "pointer",
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PlantCard({ plant }: { plant: Plant }) {
  return (
    <Link
      href={`/garden/vaxter/${plant.id}`}
      className="rounded-2xl transition-all"
      style={{
        backgroundColor: "var(--color-surface-container-lowest)",
        border: "1px solid var(--color-card-border)",
        padding: 14,
        textDecoration: "none",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minHeight: 140,
      }}
    >
      <div
        className="flex items-center justify-center rounded-full"
        style={{
          width: 44, height: 44,
          backgroundColor: "var(--color-surface-container)",
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 22, color: "var(--color-primary)" }}
        >
          {typeIcon(plant.typ)}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div
          className="text-sm font-bold leading-tight"
          style={{ color: "var(--color-on-surface)" }}
        >
          {plant.vaxt || "Namnlös växt"}
        </div>
        {plant.typ && (
          <div className="text-[11px] mt-0.5" style={{ color: "var(--color-on-surface-variant)" }}>
            {plant.typ}
          </div>
        )}
      </div>

      {plant.platser.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {plant.platser.slice(0, 3).map((p) => (
            <span
              key={p}
              className="text-[10px] font-semibold rounded-full"
              style={{
                backgroundColor: "var(--color-surface-container)",
                color: "var(--color-on-surface-variant)",
                padding: "2px 8px",
                lineHeight: 1.4,
              }}
            >
              {p}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}

export default function PlantsPage() {
  const [typFilter, setTypFilter] = useState("Alla");
  const [platsFilter, setPlatsFilter] = useState("Alla");

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (typFilter !== "Alla") p.set("typ", typFilter);
    if (platsFilter !== "Alla") p.set("plats", platsFilter);
    return p.toString();
  }, [typFilter, platsFilter]);

  const { data, error, isLoading, mutate } = useSWR<PlantsResponse>(
    `/api/garden/plants${qs ? `?${qs}` : ""}`,
    fetcher,
    { refreshInterval: 10 * 60 * 1000, revalidateOnFocus: false },
  );

  const plants = data?.plants ?? [];
  const errMsg = error instanceof Error ? error.message : "";
  const notReady = errMsg.includes(": 501");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight font-headline" style={{ color: "var(--color-on-surface)" }}>
          Växter
        </h1>
        <p className="text-sm font-medium mt-1" style={{ color: "var(--color-on-surface-variant)" }}>
          {isLoading ? "Laddar…" : `${plants.length} växter i registret`}
        </p>
      </div>

      <div className="space-y-3">
        <FilterRow label="Typ" options={TYPES} value={typFilter} onChange={setTypFilter} />
        <FilterRow label="Plats" options={LOCATIONS} value={platsFilter} onChange={setPlatsFilter} />
      </div>

      {notReady ? (
        <div
          className="rounded-2xl p-5"
          style={{ backgroundColor: "var(--color-surface-container-lowest)", border: "1px solid var(--color-card-border)" }}
        >
          <p className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
            Trädgårds-DB:erna är inte konfigurerade. Sätt <code>NOTION_GARDEN_PLANTS_DB</code> m.fl. i miljön.
          </p>
        </div>
      ) : error ? (
        <ErrorBanner onRetry={() => mutate()} />
      ) : isLoading ? (
        <div className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>Laddar växter…</div>
      ) : plants.length === 0 ? (
        <div
          className="rounded-2xl p-8 text-center"
          style={{ backgroundColor: "var(--color-surface-container-lowest)", border: "1px solid var(--color-card-border)" }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 32, color: "var(--color-outline)" }}>
            yard
          </span>
          <p className="text-sm mt-2" style={{ color: "var(--color-on-surface-variant)" }}>
            Inga växter matchar filtret.
          </p>
        </div>
      ) : (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}
        >
          {plants.map((p) => <PlantCard key={p.id} plant={p} />)}
        </div>
      )}
    </div>
  );
}

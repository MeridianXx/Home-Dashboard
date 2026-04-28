"use client";

// ─── Warm Home · Trädgård · Växter (grid) ────────────────────────────────────
// Drill-down från hub. 2-kolumns grid med typ/plats-filter-chips. Varje kort
// är en länk till växtdetaljen.

import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useWarmTheme } from "@/lib/warm/theme";
import { ACC, body, ital, lab, num } from "@/lib/warm/tokens";
import { Tile } from "@/components/warm/primitives";
import { DetailHero } from "@/components/warm/fit/parts";
import { plantGlyph } from "@/components/warm/icons/garden";
import { plantTypeColor } from "@/lib/warm/garden";
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

function FilterRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useWarmTheme();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={lab(t)}>{label}</span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {options.map((opt) => {
          const active = value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              style={{
                fontFamily: body,
                fontSize: 11,
                fontWeight: 600,
                background: active ? ACC : t.tint,
                color: active ? "#FFFBF0" : t.ink,
                border: `1px solid ${active ? ACC : t.line}`,
                borderRadius: 999,
                padding: "5px 11px",
                cursor: "pointer",
                lineHeight: 1.2,
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
  const { t } = useWarmTheme();
  const color = plantTypeColor(plant.typ);
  return (
    <Link
      href={`/v3/garden/vaxt/${plant.id}`}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 12,
        background: t.paper,
        border: `1px solid ${t.line}`,
        borderRadius: 14,
        textDecoration: "none",
        minHeight: 134,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          background: t.paperHi,
          border: `1px solid ${t.line}`,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {plantGlyph(plant.typ, 20, color)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            ...num(t, 14, 500),
            lineHeight: 1.2,
            color: t.ink,
            display: "-webkit-box",
            WebkitBoxOrient: "vertical" as const,
            WebkitLineClamp: 2,
            overflow: "hidden",
          }}
        >
          {plant.vaxt || "Namnlös växt"}
        </div>
        {plant.typ ? (
          <div style={{ ...ital(t, 11, color), marginTop: 2 }}>{plant.typ}</div>
        ) : null}
      </div>
      {plant.platser.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {plant.platser.slice(0, 2).map((p) => (
            <span
              key={p}
              style={{
                fontFamily: body,
                fontSize: 10,
                fontWeight: 500,
                color: t.mute,
                background: t.paperHi,
                border: `1px solid ${t.line}`,
                borderRadius: 999,
                padding: "2px 8px",
                lineHeight: 1.4,
              }}
            >
              {p}
            </span>
          ))}
          {plant.platser.length > 2 ? (
            <span
              style={{
                fontFamily: body,
                fontSize: 10,
                color: t.dim,
                padding: "2px 4px",
              }}
            >
              +{plant.platser.length - 2}
            </span>
          ) : null}
        </div>
      ) : null}
    </Link>
  );
}

export default function GardenPlantsPage() {
  const { t } = useWarmTheme();
  const [typFilter, setTypFilter] = useState("Alla");
  const [platsFilter, setPlatsFilter] = useState("Alla");

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (typFilter !== "Alla") p.set("typ", typFilter);
    if (platsFilter !== "Alla") p.set("plats", platsFilter);
    return p.toString();
  }, [typFilter, platsFilter]);

  const { data, error, isLoading } = useSWR<PlantsResponse>(
    `/api/garden/plants${qs ? `?${qs}` : ""}`,
    fetcher,
    { refreshInterval: 10 * 60 * 1000, revalidateOnFocus: false },
  );

  const plants = data?.plants ?? [];
  const errMsg = error instanceof Error ? error.message : "";
  const notReady = errMsg.includes(": 501");

  return (
    <div style={{ paddingBottom: 24 }}>
      <DetailHero
        backHref="/v3/garden"
        backLabel="Trädgård"
        eyebrow="VÄXTER"
        title={isLoading ? "Registret" : `${plants.length} växter,`}
        italicTail="alla typer."
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 18px" }}>
        <FilterRow label="Typ" options={TYPES} value={typFilter} onChange={setTypFilter} />
        <FilterRow label="Plats" options={LOCATIONS} value={platsFilter} onChange={setPlatsFilter} />

        {notReady ? (
          <Tile t={t}>
            <p style={{ fontFamily: body, fontSize: 13, color: t.mute, lineHeight: 1.55 }}>
              Trädgårds-DB:erna är inte konfigurerade. Sätt <code>NOTION_GARDEN_PLANTS_DB</code>{" "}
              i miljön.
            </p>
          </Tile>
        ) : isLoading ? (
          <Tile t={t}>
            <p style={ital(t, 13)}>Laddar växter…</p>
          </Tile>
        ) : plants.length === 0 ? (
          <Tile t={t}>
            <p style={{ ...ital(t, 13), textAlign: "center" }}>
              Inga växter matchar filtret.
            </p>
          </Tile>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            {plants.map((p) => (
              <PlantCard key={p.id} plant={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

// ─── Warm Home · Trädgård · Växter (grid) ────────────────────────────────────
// Drill-down från hub. 2-kolumns grid med typ/plats-filter-chips. Varje kort
// är en länk till växtdetaljen. "Ny växt"-knapp + skapa-modal.

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useWarmTheme } from "@/lib/warm/theme";
import { ACC, body, ital, lab, num } from "@/lib/warm/tokens";
import { Tile } from "@/components/warm/primitives";
import { DetailHero } from "@/components/warm/fit/parts";
import { WarmModal } from "@/components/warm/Modal";
import { inputStyle, Field, SelectBox, MultiSelectChips } from "@/components/warm/garden/forms";
import { plantGlyph, PlusIcon } from "@/components/warm/icons/garden";
import { plantTypeColor } from "@/lib/warm/garden";
import type { Plant, PlantsResponse, PlantInput } from "@/lib/garden/types";

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
  "Ört",
];

const LOCATIONS = ["Alla", "Inomhus", "Växthus", "Altan", "Baksida", "Framsida"];

const PLANT_TYPES = ["Häck", "Buske", "Prydnadsgräs", "Prydnadsträd", "Perenn", "Gräs", "Fruktträd", "Marktäckare", "Grönsak", "Blomma", "Ört"];
const PLANT_LOCATIONS = ["Inomhus", "Växthus", "Altan", "Baksida", "Framsida"];
const PRUNING_SEASONS = ["Höst", "Efter blomning", "Ingen", "JAS", "Vår", "Vårvinter", "Löpande"];
const FERTILIZE_SEASONS = ["Ingen", "Höst", "Sommar", "Försommar", "Vår"];
const PHASES = ["Sådd", "Plantskola", "Härdning", "Utplantering", "Skörd", "Etablerad", "Vilande"];
const WATERING_INTERVALS = ["Dagligen", "Varannan dag", "Veckovis", "Vid behov", "Inte nu"];

// ── Filter-rad ───────────────────────────────────────────────────────────────

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

// ── Växt-kort ────────────────────────────────────────────────────────────────

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

// ── Skapa-modal ──────────────────────────────────────────────────────────────

interface CreateForm {
  vaxt: string;
  sorttnamn: string;
  typ: string;
  platser: string[];
  fas: string;
  sadddatum: string;
  antalPlantor: string;
  sasongslangd: string;
  vattningsintervall: string;
  vattningsnotering: string;
  naring: string;
  ljusbehov: string;
  temperaturintervall: string;
  hojd: string;
  skordeperiod: string;
  skotselguide: string;
  beskarning: string[];
  godsling: string[];
}

const EMPTY_FORM: CreateForm = {
  vaxt: "",
  sorttnamn: "",
  typ: "",
  platser: [],
  fas: "",
  sadddatum: "",
  antalPlantor: "",
  sasongslangd: "",
  vattningsintervall: "",
  vattningsnotering: "",
  naring: "",
  ljusbehov: "",
  temperaturintervall: "",
  hojd: "",
  skordeperiod: "",
  skotselguide: "",
  beskarning: [],
  godsling: [],
};

function formToInput(f: CreateForm): PlantInput {
  return {
    vaxt: f.vaxt || undefined,
    sorttnamn: f.sorttnamn || null,
    typ: f.typ || undefined,
    platser: f.platser,
    fas: f.fas || null,
    sadddatum: f.sadddatum || null,
    antalPlantor: f.antalPlantor ? Number(f.antalPlantor) : null,
    sasongslangd: f.sasongslangd ? Number(f.sasongslangd) : null,
    vattningsintervall: f.vattningsintervall || null,
    vattningsnotering: f.vattningsnotering || null,
    naring: f.naring || null,
    ljusbehov: f.ljusbehov || null,
    temperaturintervall: f.temperaturintervall || null,
    hojd: f.hojd || null,
    skordeperiod: f.skordeperiod || null,
    skotselguide: f.skotselguide || null,
    beskarning: f.beskarning,
    godsling: f.godsling,
  };
}

function CreateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { t } = useWarmTheme();
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof CreateForm, val: string | string[]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const iStyle = inputStyle(t);

  const handleSave = async () => {
    if (!form.vaxt.trim()) { setError("Namn krävs"); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/garden/plants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formToInput(form)),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      onCreated(json.plant?.id ?? "");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fel vid sparning");
      setSaving(false);
    }
  };

  return (
    <WarmModal
      onClose={onClose}
      title="Ny växt"
      footer={
        <div style={{ display: "flex", gap: 8, width: "100%", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onClose}
            style={{ fontFamily: body, fontSize: 13, fontWeight: 500, background: "transparent", border: `1px solid ${t.line}`, borderRadius: 999, padding: "8px 16px", color: t.mute, cursor: "pointer" }}
          >
            Avbryt
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{ fontFamily: body, fontSize: 13, fontWeight: 600, background: ACC, border: "none", borderRadius: 999, padding: "8px 20px", color: "#FFFBF0", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Skapar…" : "Skapa växt"}
          </button>
        </div>
      }
    >
      {error && (
        <div style={{ background: `${t.bad}1A`, border: `1px solid ${t.bad}`, borderRadius: 10, padding: "8px 12px", fontFamily: body, fontSize: 12, color: t.bad, marginBottom: 12 }}>
          {error}
        </div>
      )}

      <div style={{ fontFamily: body, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: ACC, marginBottom: 8 }}>Grundinfo</div>
      <Field label="Namn *" style={{ marginBottom: 10 }}>
        <input style={iStyle} value={form.vaxt} onChange={(e) => set("vaxt", e.target.value)} placeholder="Växtens namn" autoFocus />
      </Field>
      <Field label="Sort / kultivar" style={{ marginBottom: 10 }}>
        <input style={iStyle} value={form.sorttnamn} onChange={(e) => set("sorttnamn", e.target.value)} placeholder="t.ex. San Marzano" />
      </Field>
      <Field label="Typ" style={{ marginBottom: 10 }}>
        <SelectBox value={form.typ} onChange={(v) => set("typ", v)} options={PLANT_TYPES} placeholder="Välj typ" />
      </Field>
      <Field label="Plats" style={{ marginBottom: 16 }}>
        <MultiSelectChips values={form.platser} onChange={(v) => set("platser", v)} options={PLANT_LOCATIONS} />
      </Field>

      <div style={{ fontFamily: body, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: ACC, marginBottom: 8 }}>Livscykel</div>
      <Field label="Fas" style={{ marginBottom: 10 }}>
        <SelectBox value={form.fas} onChange={(v) => set("fas", v)} options={PHASES} placeholder="Välj fas" />
      </Field>
      <Field label="Sådddatum" style={{ marginBottom: 10 }}>
        <input type="date" style={iStyle} value={form.sadddatum} onChange={(e) => set("sadddatum", e.target.value)} />
      </Field>
      <Field label="Antal plantor" style={{ marginBottom: 10 }}>
        <input type="number" style={iStyle} value={form.antalPlantor} onChange={(e) => set("antalPlantor", e.target.value)} placeholder="t.ex. 6" min="0" />
      </Field>
      <Field label="Säsongslängd (dagar)" style={{ marginBottom: 16 }}>
        <input type="number" style={iStyle} value={form.sasongslangd} onChange={(e) => set("sasongslangd", e.target.value)} placeholder="t.ex. 120" min="0" />
      </Field>

      <div style={{ fontFamily: body, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: ACC, marginBottom: 8 }}>Daglig skötsel</div>
      <Field label="Vattningsintervall" style={{ marginBottom: 10 }}>
        <SelectBox value={form.vattningsintervall} onChange={(v) => set("vattningsintervall", v)} options={WATERING_INTERVALS} placeholder="Välj frekvens" />
      </Field>
      <Field label="Vattningsnotering" style={{ marginBottom: 10 }}>
        <input style={iStyle} value={form.vattningsnotering} onChange={(e) => set("vattningsnotering", e.target.value)} placeholder="t.ex. jord torr ca 2 cm ner" />
      </Field>
      <Field label="Ljusbehov" style={{ marginBottom: 10 }}>
        <input style={iStyle} value={form.ljusbehov} onChange={(e) => set("ljusbehov", e.target.value)} placeholder="t.ex. Halvskugga" />
      </Field>
      <Field label="Temperaturintervall" style={{ marginBottom: 16 }}>
        <input style={iStyle} value={form.temperaturintervall} onChange={(e) => set("temperaturintervall", e.target.value)} placeholder="t.ex. 20–22 °C" />
      </Field>

      <div style={{ fontFamily: body, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: ACC, marginBottom: 8 }}>Om växten</div>
      <Field label="Höjd" style={{ marginBottom: 10 }}>
        <input style={iStyle} value={form.hojd} onChange={(e) => set("hojd", e.target.value)} placeholder="t.ex. 160–200 cm" />
      </Field>
      <Field label="Skördeperiod" style={{ marginBottom: 10 }}>
        <input style={iStyle} value={form.skordeperiod} onChange={(e) => set("skordeperiod", e.target.value)} placeholder="t.ex. Aug–sep" />
      </Field>
      <Field label="Skötselguide" style={{ marginBottom: 10 }}>
        <textarea style={{ ...iStyle, height: 80, resize: "vertical" as const }} value={form.skotselguide} onChange={(e) => set("skotselguide", e.target.value)} placeholder="Beskriv skötseln och växtens egenskaper." />
      </Field>
      <Field label="Beskärning" style={{ marginBottom: 10 }}>
        <MultiSelectChips values={form.beskarning} onChange={(v) => set("beskarning", v)} options={PRUNING_SEASONS} />
      </Field>
      <Field label="Gödsling" style={{ marginBottom: 0 }}>
        <MultiSelectChips values={form.godsling} onChange={(v) => set("godsling", v)} options={FERTILIZE_SEASONS} />
      </Field>
    </WarmModal>
  );
}

// ── Sidkomponent ─────────────────────────────────────────────────────────────

export default function GardenPlantsPage() {
  const { t } = useWarmTheme();
  const router = useRouter();
  const [typFilter, setTypFilter] = useState("Alla");
  const [platsFilter, setPlatsFilter] = useState("Alla");
  const [createOpen, setCreateOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

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
    <div style={{ paddingBottom: 24 }}>
      <DetailHero
        backHref="/v3/garden"
        backLabel="Trädgård"
        eyebrow="VÄXTER"
        title={isLoading ? "Registret" : `${plants.length} växter,`}
        italicTail="alla typer."
        right={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontFamily: body,
              fontSize: 11,
              fontWeight: 600,
              background: ACC,
              border: "none",
              borderRadius: 999,
              padding: "6px 12px",
              color: "#FFFBF0",
              cursor: "pointer",
            }}
          >
            <PlusIcon size={13} color="#FFFBF0" />
            Ny växt
          </button>
        }
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

      {mounted && createOpen &&
        createPortal(
          <CreateModal
            onClose={() => setCreateOpen(false)}
            onCreated={(id) => {
              mutate();
              if (id) router.push(`/v3/garden/vaxt/${id}`);
            }}
          />,
          document.body,
        )}
    </div>
  );
}

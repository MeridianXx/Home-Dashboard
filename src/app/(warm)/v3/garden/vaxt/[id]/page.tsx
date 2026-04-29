"use client";

// ─── Warm Home · Trädgård · Växt-detalj ──────────────────────────────────────
// Claude Design-stil: DAG X AV ~Y-eyebrow, sorttnamn i italic tail, livscykel-
// tracker, skötsel idag 2×2-grid, skötselguide, edit-modal med alla fält,
// "Vattnad nu"-snabbknapp.

import Link from "next/link";
import { use, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useWarmTheme } from "@/lib/warm/theme";
import { ACC, SAGE, body, ital, lab, num } from "@/lib/warm/tokens";
import { Tile } from "@/components/warm/primitives";
import { DetailHero, Section } from "@/components/warm/fit/parts";
import { WarmModal } from "@/components/warm/Modal";
import { inputStyle, Field, SelectBox, MultiSelectChips } from "@/components/warm/garden/forms";
import {
  plantGlyph,
  SparkleIcon,
  ExternalLinkIcon,
  EditIcon,
} from "@/components/warm/icons/garden";
import { ChevronRight } from "@/components/warm/icons/extra";
import { plantTypeColor, shortDateSv, TASK_STATUS_COLOR } from "@/lib/warm/garden";
import type { Plant, SeasonTask, PlantInput } from "@/lib/garden/types";

interface PlantResponse { plant: Plant }
interface TaskListResponse { tasks: SeasonTask[] }

// ── Beräkna dagar sen sådd ───────────────────────────────────────────────────

function daysSince(isoDate: string | null): number | null {
  if (!isoDate) return null;
  const ms = Date.now() - new Date(isoDate).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

function formatSowDate(iso: string): string {
  const d = new Date(iso);
  const months = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

// ── Livscykel-tracker ─────────────────────────────────────────────────────────

const LIFECYCLE_PHASES = ["Sådd", "Plantskola", "Härdning", "Utplantering", "Skörd"] as const;

function LifecycleTracker({
  fas,
  note,
}: {
  fas: string | null;
  note?: string | null;
}) {
  const { t } = useWarmTheme();
  const phases = LIFECYCLE_PHASES;
  const currentIdx = phases.findIndex((p) => p === fas);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        {phases.map((phase, i) => {
          const isCurrent = i === currentIdx;
          const isPast = currentIdx >= 0 && i < currentIdx;
          return (
            <div
              key={phase}
              style={{
                display: "flex",
                alignItems: "center",
                flex: i < phases.length - 1 ? 1 : 0,
              }}
            >
              {/* Dot */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div
                  style={{
                    width: isCurrent ? 14 : 10,
                    height: isCurrent ? 14 : 10,
                    borderRadius: "50%",
                    background: isCurrent ? ACC : isPast ? SAGE : t.line,
                    border: isCurrent ? `2px solid ${ACC}` : isPast ? `2px solid ${SAGE}` : `2px solid ${t.line}`,
                    transition: "all 150ms ease",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontFamily: body,
                    fontSize: 9,
                    fontWeight: isCurrent ? 700 : 400,
                    color: isCurrent ? ACC : isPast ? t.mute : t.dim,
                    letterSpacing: "0.02em",
                    whiteSpace: "nowrap",
                  }}
                >
                  {phase}
                </span>
              </div>
              {/* Connector line */}
              {i < phases.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: 2,
                    marginBottom: 16,
                    background: isPast ? SAGE : t.line,
                    marginLeft: 2,
                    marginRight: 2,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
      {note && (
        <p style={{ ...ital(t, 12, t.mute), marginTop: 8, lineHeight: 1.45 }}>{note}</p>
      )}
    </div>
  );
}

// ── Metadata-rad (Höjd / Sort / Skörd) ─────────────────────────────────────

function MetaRow({ plant }: { plant: Plant }) {
  const { t } = useWarmTheme();
  const items = [
    { label: "HÖJD", value: plant.hojd },
    { label: "SORT", value: plant.sorttnamn },
    { label: "SKÖRD", value: plant.skordeperiod },
  ].filter((i) => i.value);

  if (items.length === 0) return null;

  return (
    <div style={{ display: "flex", gap: 0 }}>
      {items.map(({ label, value }, i) => (
        <div
          key={label}
          style={{
            flex: 1,
            padding: "10px 0",
            borderRight: i < items.length - 1 ? `1px solid ${t.line}` : "none",
            paddingRight: i < items.length - 1 ? 12 : 0,
            paddingLeft: i > 0 ? 12 : 0,
          }}
        >
          <div style={lab(t, { marginBottom: 4 })}>{label}</div>
          <div style={{ fontFamily: body, fontSize: 13, fontWeight: 600, color: t.ink }}>{value}</div>
        </div>
      ))}
    </div>
  );
}

// ── Redigera-modal ──────────────────────────────────────────────────────────

const PLANT_TYPES = ["Häck", "Buske", "Prydnadsgräs", "Prydnadsträd", "Perenn", "Gräs", "Fruktträd", "Marktäckare", "Grönsak", "Blomma", "Ört"];
const PLANT_LOCATIONS = ["Inomhus", "Växthus", "Altan", "Baksida", "Framsida"];
const PRUNING_SEASONS = ["Höst", "Efter blomning", "Ingen", "JAS", "Vår", "Vårvinter", "Löpande"];
const FERTILIZE_SEASONS = ["Ingen", "Höst", "Sommar", "Försommar", "Vår"];
const PHASES = ["Sådd", "Plantskola", "Härdning", "Utplantering", "Skörd", "Etablerad", "Vilande"];
interface EditForm {
  vaxt: string;
  sorttnamn: string;
  typ: string;
  platser: string[];
  fas: string;
  sadddatum: string;
  antalPlantor: string;
  sasongslangd: string;
  hojd: string;
  skordeperiod: string;
  skotselguide: string;
  beskarning: string[];
  godsling: string[];
}

function plantToForm(p: Plant): EditForm {
  return {
    vaxt: p.vaxt ?? "",
    sorttnamn: p.sorttnamn ?? "",
    typ: p.typ ?? "",
    platser: p.platser as string[],
    fas: p.fas ?? "",
    sadddatum: p.sadddatum ?? "",
    antalPlantor: p.antalPlantor != null ? String(p.antalPlantor) : "",
    sasongslangd: p.sasongslangd != null ? String(p.sasongslangd) : "",
    hojd: p.hojd ?? "",
    skordeperiod: p.skordeperiod ?? "",
    skotselguide: p.skotselguide ?? p.skotselrad ?? "",
    beskarning: p.beskarning as string[],
    godsling: p.godsling as string[],
  };
}

function formToInput(f: EditForm): PlantInput {
  return {
    vaxt: f.vaxt || undefined,
    sorttnamn: f.sorttnamn || null,
    typ: f.typ || undefined,
    platser: f.platser,
    fas: f.fas || null,
    sadddatum: f.sadddatum || null,
    antalPlantor: f.antalPlantor ? Number(f.antalPlantor) : null,
    sasongslangd: f.sasongslangd ? Number(f.sasongslangd) : null,
    hojd: f.hojd || null,
    skordeperiod: f.skordeperiod || null,
    skotselguide: f.skotselguide || null,
    beskarning: f.beskarning,
    godsling: f.godsling,
  };
}

function EditModal({
  plant,
  onClose,
  onSaved,
}: {
  plant: Plant;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useWarmTheme();
  const [form, setForm] = useState<EditForm>(() => plantToForm(plant));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof EditForm, val: string | string[]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const iStyle = inputStyle(t);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/garden/plants/${plant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formToInput(form)),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.error || `HTTP ${res.status}`);
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fel vid sparning");
      setSaving(false);
    }
  };

  return (
    <WarmModal
      onClose={onClose}
      title={`Redigera · ${plant.vaxt}`}
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
            {saving ? "Sparar…" : "Spara"}
          </button>
        </div>
      }
    >
      {error && (
        <div
          style={{
            background: `${t.bad}1A`,
            border: `1px solid ${t.bad}`,
            borderRadius: 10,
            padding: "8px 12px",
            fontFamily: body,
            fontSize: 12,
            color: t.bad,
            marginBottom: 12,
          }}
        >
          {error}
        </div>
      )}

      {/* Grundinfo */}
      <div style={{ fontFamily: body, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: ACC, marginBottom: 8 }}>
        Grundinfo
      </div>
      <Field label="Namn" style={{ marginBottom: 10 }}>
        <input style={iStyle} value={form.vaxt} onChange={(e) => set("vaxt", e.target.value)} placeholder="Växtens namn" />
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

      {/* Livscykel */}
      <div style={{ fontFamily: body, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: ACC, marginBottom: 8 }}>
        Livscykel
      </div>
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

      {/* Om växten */}
      <div style={{ fontFamily: body, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: ACC, marginBottom: 8 }}>
        Om växten
      </div>
      <Field label="Höjd" style={{ marginBottom: 10 }}>
        <input style={iStyle} value={form.hojd} onChange={(e) => set("hojd", e.target.value)} placeholder="t.ex. 160–200 cm" />
      </Field>
      <Field label="Skördeperiod" style={{ marginBottom: 10 }}>
        <input style={iStyle} value={form.skordeperiod} onChange={(e) => set("skordeperiod", e.target.value)} placeholder="t.ex. Aug–sep" />
      </Field>
      <Field label="Skötselguide" style={{ marginBottom: 10 }}>
        <textarea
          style={{ ...iStyle, height: 80, resize: "vertical" as const }}
          value={form.skotselguide}
          onChange={(e) => set("skotselguide", e.target.value)}
          placeholder="Beskriv skötseln, sortens egenskaper osv."
        />
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

// ── Sidkomponent ────────────────────────────────────────────────────────────

export default function PlantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useWarmTheme();
  const [editOpen, setEditOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const { data, error, isLoading, mutate } = useSWR<PlantResponse>(
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
        <DetailHero backHref="/v3/garden/vaxter" backLabel="Växter" eyebrow="VÄXT" title="Laddar…" />
      </div>
    );
  }
  if (errMsg || !plant) {
    return (
      <div style={{ paddingBottom: 24 }}>
        <DetailHero backHref="/v3/garden/vaxter" backLabel="Växter" eyebrow="VÄXT" title="Hittades inte" />
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
  const days = daysSince(plant.sadddatum);

  // Bygg eyebrow och titel
  const eyebrowParts = [(plant.typ || "VÄXT").toUpperCase()];
  if (days !== null && plant.sasongslangd) {
    eyebrowParts.push(`DAG ${days} AV ~${plant.sasongslangd}`);
  }
  const eyebrow = eyebrowParts.join(" · ");

  const italicTail = plant.sorttnamn ? `'${plant.sorttnamn}'.` : undefined;

  // Subtitle under titeln. Plats visas på raden under — undvik dubblett här.
  const subtitleParts: string[] = [];
  if (plant.fas) subtitleParts.push(plant.fas);
  if (plant.antalPlantor) {
    subtitleParts.push(`${plant.antalPlantor} ${plant.antalPlantor === 1 ? "planta" : "plantor"}`);
  }
  if (plant.sadddatum) subtitleParts.push(`sådd ${formatSowDate(plant.sadddatum)}`);

  const aiPrompt = `Berätta om ${plant.vaxt}${plant.sorttnamn ? ` '${plant.sorttnamn}'` : ""}: skötsel, beskärning och vanliga problem. Vad bör jag tänka på just nu?`;

  // Livscykel-tracker visas bara för säsongs-faser (Sådd → Skörd).
  // Etablerad/Vilande är slutlägen — växten progresserar inte vidare, så
  // tracker-staplarna är vilseledande. Fas-info visas redan i subtitle-raden.
  const hasLifecycle = plant.fas
    ? LIFECYCLE_PHASES.includes(plant.fas as (typeof LIFECYCLE_PHASES)[number])
    : false;

  return (
    <div style={{ paddingBottom: 24 }}>
      <DetailHero
        backHref="/v3/garden/vaxter"
        backLabel="Växter"
        eyebrow={eyebrow}
        title={plant.vaxt || "Namnlös växt"}
        italicTail={italicTail}
        right={
          <button
            type="button"
            onClick={() => { setMounted(true); setEditOpen(true); }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontFamily: body,
              fontSize: 11,
              fontWeight: 600,
              background: t.paper,
              border: `1px solid ${t.line}`,
              borderRadius: 999,
              padding: "6px 12px",
              color: t.ink,
              cursor: "pointer",
            }}
          >
            <EditIcon size={12} color={t.mute} />
            Redigera
          </button>
        }
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 18px" }}>
        {/* Subtitle + glyf-strip */}
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
            {subtitleParts.length > 0 && (
              <div style={{ ...lab(t), color, marginBottom: 4 }}>
                {subtitleParts.join(" · ")}
              </div>
            )}
            <div style={{ fontFamily: body, fontSize: 12, color: t.mute, lineHeight: 1.4 }}>
              {plant.platser.length > 0 ? plant.platser.join(" · ") : "Plats ej angiven"}
            </div>
          </div>
        </Tile>

        {/* Livscykel-tracker */}
        {hasLifecycle && (
          <Tile t={t} style={{ padding: "12px 14px" }}>
            <div style={{ ...lab(t), marginBottom: 12 }}>LIVSCYKEL</div>
            <LifecycleTracker fas={plant.fas} />
          </Tile>
        )}

        {/* Skötselguide */}
        {(plant.skotselguide || plant.skotselrad) && (
          <Tile t={t} style={{ padding: "12px 14px" }}>
            <div style={{ ...lab(t), marginBottom: 8 }}>SKÖTSELGUIDE</div>
            <div style={{ ...num(t, 15, 500), marginBottom: 8 }}>
              Om{" "}
              <span style={{ fontStyle: "italic" }}>
                {plant.sorttnamn ? `'${plant.sorttnamn}'` : plant.vaxt}
              </span>
            </div>
            <p
              style={{
                fontFamily: body,
                fontSize: 13,
                color: t.ink,
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                margin: 0,
              }}
            >
              {plant.skotselguide || plant.skotselrad}
            </p>
          </Tile>
        )}

        {/* Metadata-rad */}
        {(plant.hojd || plant.sorttnamn || plant.skordeperiod) && (
          <Tile t={t} style={{ padding: "12px 14px" }}>
            <MetaRow plant={plant} />
          </Tile>
        )}

        {/* Beskärning + gödsling */}
        {(plant.beskarning.length > 0 || plant.godsling.length > 0) && (
          <Tile t={t} style={{ padding: "4px 14px" }}>
            {plant.beskarning.length > 0 && (
              <div style={{ padding: "10px 0", borderBottom: `1px solid ${t.line}`, display: "flex", gap: 10 }}>
                <span style={{ ...lab(t), width: 90, flexShrink: 0, paddingTop: 2 }}>Beskärning</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {plant.beskarning.map((b) => (
                    <span key={b} style={{ fontFamily: body, fontSize: 11, fontWeight: 500, background: `${color}1A`, color, border: `1px solid ${color}33`, borderRadius: 999, padding: "3px 10px" }}>{b}</span>
                  ))}
                </div>
              </div>
            )}
            {plant.godsling.length > 0 && (
              <div style={{ padding: "10px 0", display: "flex", gap: 10 }}>
                <span style={{ ...lab(t), width: 90, flexShrink: 0, paddingTop: 2 }}>Gödsling</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {plant.godsling.map((g) => (
                    <span key={g} style={{ fontFamily: body, fontSize: 11, fontWeight: 500, background: `${color}1A`, color, border: `1px solid ${color}33`, borderRadius: 999, padding: "3px 10px" }}>{g}</span>
                  ))}
                </div>
              </div>
            )}
          </Tile>
        )}

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
        {relatedTasks.length > 0 && (
          <Section label="Kopplade åtgärder">
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
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        background: dotColor,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: body, fontSize: 13, fontWeight: 600, color: t.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {tk.uppgift || "Namnlös uppgift"}
                      </div>
                      <div style={{ fontFamily: body, fontSize: 11, color: t.mute, marginTop: 2 }}>
                        {shortDateSv(tk.datum) || "—"}{tk.typ ? ` · ${tk.typ}` : ""}
                        {` · ${tk.status}`}
                      </div>
                    </div>
                    <ChevronRight size={14} color={t.dim} />
                  </Link>
                );
              })}
            </div>
          </Section>
        )}
      </div>

      {/* Edit-modal via portal */}
      {mounted && editOpen &&
        createPortal(
          <EditModal
            plant={plant}
            onClose={() => setEditOpen(false)}
            onSaved={() => mutate()}
          />,
          document.body,
        )}
    </div>
  );
}

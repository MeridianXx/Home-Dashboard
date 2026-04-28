"use client";

// ─── Warm Home · Trädgård · Säsongsplan ─────────────────────────────────────
// Tre vy-lägen: Kalender / Lista / Per växt. CRUD via WarmModal (portal). Allt
// stylas inline mot Warm-tokens. Klick på dag = ny uppgift. Klick på etikett
// = redigera. "Markera klar"-bock-knapp i listan.

import { useMemo, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useWarmTheme } from "@/lib/warm/theme";
import {
  ACC,
  AMBER,
  SAGE,
  SKY,
  body,
  ital,
  lab,
  num,
} from "@/lib/warm/tokens";
import { Tile } from "@/components/warm/primitives";
import { DetailHero } from "@/components/warm/fit/parts";
import { ChevronLeft, ChevronRight, CheckIcon } from "@/components/warm/icons/extra";
import {
  CalendarIcon,
  ListIcon,
  PlusIcon,
  CheckCircleIcon,
} from "@/components/warm/icons/garden";
import { WarmModal } from "@/components/warm/Modal";
import {
  Field,
  SelectBox,
  MultiSelectChips,
  PlantPicker,
  ModalFooter,
  ModalErrorRow,
  inputStyle,
} from "@/components/warm/garden/forms";
import {
  isoDate,
  isoToday,
  parseISO,
  monthLabelSv,
  monthGrid,
  shortDateSv,
  TASK_STATUS_COLOR,
} from "@/lib/warm/garden";
import type {
  SeasonTask,
  SeasonTaskInput,
  TasksResponse,
  Plant,
  PlantsResponse,
} from "@/lib/garden/types";

const STATUS_OPTIONS = ["Planerad", "Pågår", "Klar"];
const TYPE_OPTIONS = ["Gräsmatta", "Rabatter", "Träd & buskar", "Grönsaker"];
const ACTION_OPTIONS = ["Underhåll", "Delning", "Beskärning", "Gödsling", "Inspektion", "Plantering"];

const VIEWS = ["Kalender", "Lista", "Per växt"] as const;
type View = (typeof VIEWS)[number];

type Draft = SeasonTaskInput & { id?: string };

// ── View-toggle (segmented pill) ────────────────────────────────────────────

function ViewToggle({ value, onChange }: { value: View; onChange: (v: View) => void }) {
  const { t } = useWarmTheme();
  return (
    <div
      style={{
        display: "inline-flex",
        gap: 2,
        padding: 3,
        background: t.paper,
        border: `1px solid ${t.line}`,
        borderRadius: 999,
      }}
    >
      {VIEWS.map((v) => {
        const active = v === value;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            style={{
              fontFamily: body,
              fontSize: 11,
              fontWeight: 600,
              background: active ? ACC : "transparent",
              color: active ? "#FFFBF0" : t.mute,
              border: "none",
              borderRadius: 999,
              padding: "6px 12px",
              cursor: "pointer",
              transition: "background 160ms ease, color 160ms ease",
            }}
          >
            {v}
          </button>
        );
      })}
    </div>
  );
}

// ── Kalender-vy ─────────────────────────────────────────────────────────────

function CalendarView({
  tasks,
  onPickDate,
  onPickTask,
}: {
  tasks: SeasonTask[];
  onPickDate: (iso: string) => void;
  onPickTask: (task: SeasonTask) => void;
}) {
  const { t } = useWarmTheme();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [monthIdx, setMonthIdx] = useState(today.getMonth());

  const grid = useMemo(() => monthGrid(year, monthIdx), [year, monthIdx]);
  const todayIso = isoToday();

  const tasksByDate = useMemo(() => {
    const map = new Map<string, SeasonTask[]>();
    for (const tk of tasks) {
      if (!tk.datum) continue;
      const list = map.get(tk.datum) ?? [];
      list.push(tk);
      map.set(tk.datum, list);
    }
    return map;
  }, [tasks]);

  const navigate = (delta: number) => {
    const next = new Date(year, monthIdx + delta, 1);
    setYear(next.getFullYear());
    setMonthIdx(next.getMonth());
  };
  const goToday = () => {
    const d = new Date();
    setYear(d.getFullYear());
    setMonthIdx(d.getMonth());
  };

  return (
    <Tile t={t} style={{ padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <button
          type="button"
          onClick={goToday}
          title="Gå till idag"
          style={{
            ...num(t, 16, 500),
            textTransform: "capitalize",
            background: "transparent",
            border: "none",
            color: t.ink,
            cursor: "pointer",
            padding: "2px 0",
            textAlign: "left",
            flex: 1,
          }}
        >
          {monthLabelSv(year, monthIdx)}
        </button>
        <button type="button" onClick={() => navigate(-1)} aria-label="Föregående månad" style={navBtn(t)}>
          <ChevronLeft size={16} color={t.mute} />
        </button>
        <button type="button" onClick={() => navigate(1)} aria-label="Nästa månad" style={navBtn(t)}>
          <ChevronRight size={16} color={t.mute} />
        </button>
      </div>

      {/* Veckodags-rubriker */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap: 4,
          marginBottom: 6,
        }}
      >
        {["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"].map((d) => (
          <div
            key={d}
            style={{
              ...lab(t),
              textAlign: "center",
              fontSize: 9,
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Dag-grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap: 4,
        }}
      >
        {grid.flat().map((cell) => {
          const dayNum = parseISO(cell.iso)?.getDate() ?? 1;
          const dayTasks = tasksByDate.get(cell.iso) ?? [];
          const isToday = cell.iso === todayIso;
          return (
            <button
              key={cell.iso}
              type="button"
              onClick={() => onPickDate(cell.iso)}
              aria-label={`${cell.iso} (${dayTasks.length} uppgifter)`}
              style={{
                position: "relative",
                aspectRatio: "1 / 1",
                minHeight: 44,
                borderRadius: 8,
                background: cell.inMonth ? t.paper : "transparent",
                border: isToday ? `1.5px solid ${ACC}` : `1px solid ${t.line}`,
                color: cell.inMonth ? t.ink : t.dim,
                opacity: cell.inMonth ? 1 : 0.5,
                cursor: "pointer",
                padding: 4,
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                justifyContent: "space-between",
                gap: 2,
              }}
            >
              <span
                style={{
                  fontFamily: body,
                  fontSize: 11,
                  fontWeight: isToday ? 700 : 500,
                  color: isToday ? ACC : "inherit",
                  textAlign: "left",
                  lineHeight: 1,
                }}
              >
                {dayNum}
              </span>
              {dayTasks.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    alignItems: "stretch",
                  }}
                >
                  {dayTasks.slice(0, 2).map((tk) => (
                    <span
                      key={tk.id}
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onPickTask(tk);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.stopPropagation();
                          onPickTask(tk);
                        }
                      }}
                      title={tk.uppgift}
                      style={{
                        fontFamily: body,
                        fontSize: 9,
                        lineHeight: 1.2,
                        background: TASK_STATUS_COLOR[tk.status] ?? ACC,
                        color: "#FFFBF0",
                        borderRadius: 4,
                        padding: "1px 4px",
                        textAlign: "left",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        cursor: "pointer",
                      }}
                    >
                      {tk.uppgift}
                    </span>
                  ))}
                  {dayTasks.length > 2 && (
                    <span style={{ fontFamily: body, fontSize: 9, color: t.mute }}>
                      +{dayTasks.length - 2}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Status-legend */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginTop: 14,
        }}
      >
        {STATUS_OPTIONS.map((s) => (
          <div
            key={s}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontFamily: body,
              fontSize: 10,
              color: t.mute,
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 9,
                height: 9,
                borderRadius: 2,
                background: TASK_STATUS_COLOR[s],
              }}
            />
            {s}
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <span style={ital(t, 10)}>klick på dag · ny uppgift</span>
      </div>
    </Tile>
  );
}

function navBtn(t: { paper: string; line: string }): React.CSSProperties {
  return {
    width: 30,
    height: 30,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    background: t.paper,
    border: `1px solid ${t.line}`,
    cursor: "pointer",
  };
}

// ── Lista-vy ────────────────────────────────────────────────────────────────

function ListView({
  tasks,
  onPickTask,
  onMarkDone,
}: {
  tasks: SeasonTask[];
  onPickTask: (t: SeasonTask) => void;
  onMarkDone: (t: SeasonTask) => Promise<void>;
}) {
  const { t } = useWarmTheme();
  const todayIso = isoToday();
  const groups: Record<string, SeasonTask[]> = { Planerad: [], Pågår: [], Klar: [] };
  for (const tk of tasks) {
    const key = STATUS_OPTIONS.includes(tk.status) ? tk.status : "Planerad";
    groups[key]!.push(tk);
  }
  const sortAsc = (a: SeasonTask, b: SeasonTask) => a.datum.localeCompare(b.datum);
  const sortDesc = (a: SeasonTask, b: SeasonTask) => b.datum.localeCompare(a.datum);
  groups.Planerad!.sort(sortAsc);
  groups["Pågår"]!.sort(sortAsc);
  groups.Klar!.sort(sortDesc);

  const order = ["Pågår", "Planerad", "Klar"] as const;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {order.map((status) => {
        const list = groups[status] ?? [];
        return (
          <Tile key={status} t={t}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  background: TASK_STATUS_COLOR[status],
                }}
              />
              <span style={lab(t)}>{status}</span>
              <span style={{ fontFamily: body, fontSize: 11, color: t.dim }}>· {list.length}</span>
            </div>

            {list.length === 0 ? (
              <div style={ital(t, 12)}>Inga uppgifter.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {list.map((tk) => {
                  const isOverdue = tk.status !== "Klar" && tk.datum && tk.datum < todayIso;
                  const isToday = tk.datum === todayIso;
                  return (
                    <div
                      key={tk.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 12px",
                        background: t.paper,
                        border: `1px solid ${t.line}`,
                        borderRadius: 12,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => onPickTask(tk)}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          textAlign: "left",
                          background: "transparent",
                          border: "none",
                          padding: 0,
                          cursor: "pointer",
                        }}
                      >
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
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            flexWrap: "wrap",
                          }}
                        >
                          <span
                            style={{
                              color: isOverdue ? t.bad : isToday ? ACC : t.mute,
                              fontWeight: isToday || isOverdue ? 600 : 400,
                            }}
                          >
                            {isToday ? "I dag" : shortDateSv(tk.datum) || "—"}
                          </span>
                          {tk.typ && <span>· {tk.typ}</span>}
                          {tk.atgarder.length > 0 && <span>· {tk.atgarder.join(", ")}</span>}
                        </div>
                      </button>

                      {status !== "Klar" && (
                        <button
                          type="button"
                          onClick={() => onMarkDone(tk)}
                          aria-label="Markera som klar"
                          title="Markera som klar"
                          style={{
                            width: 30,
                            height: 30,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: 15,
                            background: t.paperHi,
                            border: `1px solid ${t.line}`,
                            cursor: "pointer",
                            color: t.mute,
                            flexShrink: 0,
                          }}
                        >
                          <CheckIcon size={14} color={SAGE} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Tile>
        );
      })}
    </div>
  );
}

// ── Per växt-vy ─────────────────────────────────────────────────────────────

function PerPlantView({
  tasks,
  plants,
  onPickTask,
}: {
  tasks: SeasonTask[];
  plants: Plant[];
  onPickTask: (t: SeasonTask) => void;
}) {
  const { t } = useWarmTheme();
  const map = new Map<string, SeasonTask[]>();
  for (const tk of tasks) {
    for (const pid of tk.plantIds) {
      const list = map.get(pid) ?? [];
      list.push(tk);
      map.set(pid, list);
    }
  }
  const entries = plants
    .filter((p) => map.has(p.id))
    .map((p) => ({
      plant: p,
      tasks: (map.get(p.id) ?? []).sort((a, b) => a.datum.localeCompare(b.datum)),
    }))
    .sort((a, b) => a.plant.vaxt.localeCompare(b.plant.vaxt, "sv"));

  if (entries.length === 0) {
    return (
      <Tile t={t}>
        <p style={{ ...ital(t, 13), textAlign: "center", padding: "8px 0" }}>
          Inga uppgifter kopplade till växter än.
        </p>
      </Tile>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {entries.map(({ plant, tasks }) => (
        <Tile key={plant.id} t={t}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 10,
            }}
          >
            <span style={{ ...num(t, 14, 500), color: t.ink }}>{plant.vaxt}</span>
            {plant.typ && (
              <span style={{ fontFamily: body, fontSize: 11, color: t.mute }}>· {plant.typ}</span>
            )}
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: body, fontSize: 11, color: t.mute }}>{tasks.length} st</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {tasks.map((tk) => (
              <button
                key={tk.id}
                type="button"
                onClick={() => onPickTask(tk)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  textAlign: "left",
                  padding: "7px 10px",
                  background: t.paper,
                  border: `1px solid ${t.line}`,
                  borderRadius: 10,
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    background: TASK_STATUS_COLOR[tk.status] ?? ACC,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontFamily: body,
                    fontSize: 12,
                    fontWeight: 600,
                    color: t.ink,
                    flex: 1,
                    minWidth: 0,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {tk.uppgift}
                </span>
                <span style={{ fontFamily: body, fontSize: 10, color: t.mute, flexShrink: 0 }}>
                  {shortDateSv(tk.datum) || "—"}
                </span>
              </button>
            ))}
          </div>
        </Tile>
      ))}
    </div>
  );
}

// ── Modal ───────────────────────────────────────────────────────────────────

function TaskModal({
  draft,
  plants,
  onClose,
  onSave,
  onDelete,
}: {
  draft: Draft;
  plants: Plant[];
  onClose: () => void;
  onSave: (d: Draft) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const { t } = useWarmTheme();
  const [form, setForm] = useState<Draft>({ ...draft });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isEdit = Boolean(draft.id);

  const upd = (patch: Partial<Draft>) => setForm((f) => ({ ...f, ...patch }));

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setErr(null);
    try {
      await onSave(form);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    if (!onDelete || saving) return;
    if (typeof window !== "undefined" && !window.confirm("Arkivera denna uppgift?")) return;
    setSaving(true);
    setErr(null);
    try {
      await onDelete();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const selectedPlantIds = form.plantIds ?? [];
  const togglePlant = (id: string) => {
    upd({
      plantIds: selectedPlantIds.includes(id)
        ? selectedPlantIds.filter((x) => x !== id)
        : [...selectedPlantIds, id],
    });
  };

  return (
    <WarmModal
      title={isEdit ? "Redigera uppgift" : "Ny uppgift"}
      onClose={onClose}
      footer={
        <ModalFooter
          onCancel={onClose}
          onSave={save}
          saveLabel={isEdit ? "Spara" : "Skapa"}
          saving={saving}
          canSave={!!form.uppgift && !!form.datum}
          destructiveLabel={isEdit ? "Arkivera" : undefined}
          onDestructive={isEdit ? del : undefined}
        />
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Uppgift">
          <input
            type="text"
            value={form.uppgift ?? ""}
            onChange={(e) => upd({ uppgift: e.target.value })}
            placeholder="t.ex. Beskär syrenhortensia"
            style={inputStyle(t)}
          />
        </Field>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          <Field label="Datum">
            <input
              type="date"
              value={form.datum ?? ""}
              onChange={(e) => upd({ datum: e.target.value })}
              style={inputStyle(t)}
            />
          </Field>
          <Field label="Status">
            <SelectBox
              value={form.status ?? "Planerad"}
              options={STATUS_OPTIONS}
              onChange={(v) => upd({ status: v })}
            />
          </Field>
        </div>

        <Field label="Typ">
          <SelectBox
            value={form.typ ?? ""}
            options={TYPE_OPTIONS}
            placeholder="Välj…"
            onChange={(v) => upd({ typ: v })}
          />
        </Field>

        <Field label="Åtgärd">
          <MultiSelectChips
            options={ACTION_OPTIONS}
            values={form.atgarder ?? []}
            onChange={(next) => upd({ atgarder: next })}
          />
        </Field>

        <Field label="Kommentar">
          <textarea
            value={form.kommentar ?? ""}
            onChange={(e) => upd({ kommentar: e.target.value })}
            rows={3}
            placeholder="Kort om vad som ska göras"
            style={{ ...inputStyle(t), resize: "vertical", fontFamily: body }}
          />
        </Field>

        <Field label={`Växt (${selectedPlantIds.length} valda)`}>
          <PlantPicker
            plants={plants}
            selectedIds={selectedPlantIds}
            onToggle={togglePlant}
          />
        </Field>
      </div>

      <ModalErrorRow message={err} />
    </WarmModal>
  );
}

// ── Sidkomponent ────────────────────────────────────────────────────────────

export default function GardenSeasonPage() {
  const { t } = useWarmTheme();
  const [view, setView] = useState<View>("Kalender");
  const [editing, setEditing] = useState<Draft | null>(null);

  const tasksSwr = useSWR<TasksResponse>("/api/garden/tasks", fetcher, {
    refreshInterval: 10 * 60 * 1000,
    revalidateOnFocus: false,
  });
  const plantsSwr = useSWR<PlantsResponse>("/api/garden/plants", fetcher, {
    refreshInterval: 30 * 60 * 1000,
    revalidateOnFocus: false,
  });

  const tasks = tasksSwr.data?.tasks ?? [];
  const plants = plantsSwr.data?.plants ?? [];

  const errMsg = tasksSwr.error instanceof Error ? tasksSwr.error.message : "";
  const notReady = errMsg.includes(": 501");

  const refresh = async () => {
    await Promise.all([tasksSwr.mutate(), plantsSwr.mutate()]);
  };

  const handleSave = async (d: Draft) => {
    const isEdit = !!d.id;
    const url = isEdit ? `/api/garden/tasks/${d.id}` : `/api/garden/tasks`;
    const method = isEdit ? "PATCH" : "POST";
    const { id: _id, ...payload } = d;
    void _id;
    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `${res.status}`);
    }
    setEditing(null);
    await refresh();
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/garden/tasks/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `${res.status}`);
    }
    setEditing(null);
    await refresh();
  };

  const markDone = async (tk: SeasonTask) => {
    await fetch(`/api/garden/tasks/${tk.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "Klar" }),
    });
    await refresh();
  };

  const draftFromTask = (tk: SeasonTask): Draft => ({
    id: tk.id,
    uppgift: tk.uppgift,
    datum: tk.datum,
    status: tk.status,
    typ: tk.typ,
    atgarder: tk.atgarder,
    kommentar: tk.kommentar,
    plantIds: tk.plantIds,
  });

  return (
    <div style={{ paddingBottom: 24 }}>
      <DetailHero
        backHref="/v3/garden"
        backLabel="Trädgård"
        eyebrow="SÄSONG"
        title={`${tasks.length} uppgifter,`}
        italicTail="månad för månad."
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "0 18px" }}>
        {/* Verktygsrad */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <ViewToggle value={view} onChange={setView} />
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={() => setEditing({ datum: isoToday(), status: "Planerad" })}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontFamily: body,
              fontSize: 12,
              fontWeight: 600,
              background: ACC,
              color: "#FFFBF0",
              border: "none",
              borderRadius: 999,
              padding: "8px 14px",
              cursor: "pointer",
            }}
          >
            <PlusIcon size={14} color="#FFFBF0" />
            Ny uppgift
          </button>
        </div>

        {notReady ? (
          <Tile t={t}>
            <p style={{ fontFamily: body, fontSize: 13, color: t.mute, lineHeight: 1.55 }}>
              Trädgårds-DB:erna är inte konfigurerade. Sätt <code>NOTION_GARDEN_SEASON_DB</code>{" "}
              m.fl. i miljön.
            </p>
          </Tile>
        ) : tasksSwr.isLoading ? (
          <Tile t={t}>
            <p style={ital(t, 13)}>Laddar…</p>
          </Tile>
        ) : view === "Kalender" ? (
          <CalendarView
            tasks={tasks}
            onPickDate={(iso) => setEditing({ datum: iso, status: "Planerad" })}
            onPickTask={(tk) => setEditing(draftFromTask(tk))}
          />
        ) : view === "Lista" ? (
          <ListView
            tasks={tasks}
            onPickTask={(tk) => setEditing(draftFromTask(tk))}
            onMarkDone={markDone}
          />
        ) : (
          <PerPlantView
            tasks={tasks}
            plants={plants}
            onPickTask={(tk) => setEditing(draftFromTask(tk))}
          />
        )}
      </div>

      {editing && (
        <TaskModal
          draft={editing}
          plants={plants}
          onClose={() => setEditing(null)}
          onSave={handleSave}
          onDelete={editing.id ? () => handleDelete(editing.id!) : undefined}
        />
      )}
    </div>
  );
}

// Suppress unused-warning för ikoner som kommer användas i framtida iteration
void CalendarIcon;
void ListIcon;
void CheckCircleIcon;
void AMBER;
void SKY;

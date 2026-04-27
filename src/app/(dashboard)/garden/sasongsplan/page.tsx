"use client";

// ─── Trädgård · Säsongsplan ──────────────────────────────────────────────────
// Tre vy-lägen (Kalender / Lista / Per växt) ovanpå Notion-DB:n. CRUD via
// portal-renderad TaskModal. Markera-klar-knapp + i-dag-indikator.

import { useMemo, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import ErrorBanner from "@/components/ErrorBanner";
import {
  Field,
  SelectBox,
  MultiSelectChips,
  ModalShell,
  ModalHeader,
  ModalFooter,
  ModalErrorRow,
  inputStyle,
} from "@/components/garden/forms";
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

const STATUS_COLORS: Record<string, string> = {
  Planerad: "var(--color-primary)",
  Pågår: "#f59e0b",
  Klar: "#10b981",
};

// ─── Hjälpare ────────────────────────────────────────────────────────────────

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function isoToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return isoDate(d);
}
function parseISO(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : null;
}
function formatShortDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("sv-SE", {
      weekday: "short", day: "numeric", month: "short",
    });
  } catch {
    return iso;
  }
}
function monthLabel(year: number, monthIdx: number): string {
  return new Date(year, monthIdx, 1).toLocaleDateString("sv-SE", {
    month: "long", year: "numeric",
  });
}

/** Bygg månadsgrid mån–sön. Returnerar 6 rader × 7 kolumner med ev. dagar
 *  från grannmånaderna utfyllda så veckostarten alltid är måndag. */
function monthGrid(year: number, monthIdx: number): { iso: string; inMonth: boolean }[][] {
  const first = new Date(year, monthIdx, 1);
  // JS getDay: 0 = sön … 6 = lör. Vi vill 0 = mån.
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(start.getDate() - offset);

  const rows: { iso: string; inMonth: boolean }[][] = [];
  const cur = new Date(start);
  for (let r = 0; r < 6; r++) {
    const row: { iso: string; inMonth: boolean }[] = [];
    for (let c = 0; c < 7; c++) {
      row.push({ iso: isoDate(cur), inMonth: cur.getMonth() === monthIdx });
      cur.setDate(cur.getDate() + 1);
    }
    rows.push(row);
  }
  return rows;
}

// ─── Card-shell + view-toggle ───────────────────────────────────────────────

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
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

function ViewToggle({ value, onChange }: { value: View; onChange: (v: View) => void }) {
  return (
    <div
      className="rounded-full inline-flex"
      style={{
        backgroundColor: "var(--color-surface-container)",
        padding: 3,
        gap: 2,
      }}
    >
      {VIEWS.map((v) => {
        const active = v === value;
        return (
          <button
            key={v}
            onClick={() => onChange(v)}
            className="text-xs font-semibold rounded-full transition-all"
            style={{
              backgroundColor: active ? "var(--color-surface-container-lowest)" : "transparent",
              color: active ? "var(--color-on-surface)" : "var(--color-on-surface-variant)",
              padding: "6px 12px",
              border: "none",
              cursor: "pointer",
              boxShadow: active ? "0px 2px 8px rgba(56,56,51,0.08)" : "none",
            }}
          >
            {v}
          </button>
        );
      })}
    </div>
  );
}

// ─── Kalender-vy ─────────────────────────────────────────────────────────────

function CalendarView({
  tasks, onPickDate, onPickTask,
}: {
  tasks: SeasonTask[];
  onPickDate: (iso: string) => void;
  onPickTask: (task: SeasonTask) => void;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [monthIdx, setMonthIdx] = useState(today.getMonth());

  const grid = useMemo(() => monthGrid(year, monthIdx), [year, monthIdx]);
  const todayIso = isoToday();

  const tasksByDate = useMemo(() => {
    const map = new Map<string, SeasonTask[]>();
    for (const t of tasks) {
      if (!t.datum) continue;
      const list = map.get(t.datum) ?? [];
      list.push(t);
      map.set(t.datum, list);
    }
    return map;
  }, [tasks]);

  const navigate = (delta: number) => {
    const next = new Date(year, monthIdx + delta, 1);
    setYear(next.getFullYear());
    setMonthIdx(next.getMonth());
  };
  const goToday = () => {
    const t = new Date();
    setYear(t.getFullYear());
    setMonthIdx(t.getMonth());
  };

  return (
    <Card className="p-5">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={goToday}
          className="text-base font-bold capitalize"
          style={{
            background: "none",
            border: "none",
            color: "var(--color-on-surface)",
            cursor: "pointer",
            padding: "4px 0",
            textAlign: "left",
            flex: 1,
          }}
          title="Gå till idag"
        >
          {monthLabel(year, monthIdx)}
        </button>
        <button
          onClick={() => navigate(-1)}
          aria-label="Föregående månad"
          style={navBtnStyle()}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>chevron_left</span>
        </button>
        <button
          onClick={() => navigate(1)}
          aria-label="Nästa månad"
          style={navBtnStyle()}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>chevron_right</span>
        </button>
      </div>

      <div
        className="grid"
        style={{
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap: 4,
          fontSize: 10,
          color: "var(--color-on-surface-variant)",
          marginBottom: 6,
        }}
      >
        {["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"].map((d) => (
          <div key={d} className="text-center font-semibold uppercase tracking-wider" style={{ fontSize: 10 }}>
            {d}
          </div>
        ))}
      </div>

      <div
        className="grid"
        style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4 }}
      >
        {grid.flat().map((cell) => {
          const dayNum = parseISO(cell.iso)!.getDate();
          const dayTasks = tasksByDate.get(cell.iso) ?? [];
          const isToday = cell.iso === todayIso;
          return (
            <button
              key={cell.iso}
              onClick={() => onPickDate(cell.iso)}
              style={{
                position: "relative",
                aspectRatio: "1 / 1",
                minHeight: 44,
                borderRadius: 8,
                backgroundColor: cell.inMonth
                  ? "var(--color-surface-container)"
                  : "transparent",
                border: isToday
                  ? "1.5px solid var(--color-primary)"
                  : "1px solid var(--color-outline-variant)",
                color: cell.inMonth
                  ? "var(--color-on-surface)"
                  : "var(--color-outline)",
                opacity: cell.inMonth ? 1 : 0.45,
                cursor: "pointer",
                padding: 4,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                alignItems: "stretch",
              }}
              aria-label={`${cell.iso} (${dayTasks.length} uppgifter)`}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: isToday ? 700 : 500,
                  color: isToday ? "var(--color-primary)" : "inherit",
                  textAlign: "left",
                  lineHeight: 1,
                }}
              >
                {dayNum}
              </span>
              {dayTasks.length > 0 && (
                <div className="flex flex-col gap-0.5" style={{ marginTop: 2, alignItems: "stretch" }}>
                  {dayTasks.slice(0, 2).map((t) => (
                    <span
                      key={t.id}
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onPickTask(t);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.stopPropagation();
                          onPickTask(t);
                        }
                      }}
                      title={t.uppgift}
                      style={{
                        fontSize: 9,
                        lineHeight: 1.2,
                        backgroundColor: STATUS_COLORS[t.status] ?? "var(--color-primary)",
                        color: "white",
                        borderRadius: 4,
                        padding: "1px 4px",
                        textAlign: "left",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        cursor: "pointer",
                      }}
                    >
                      {t.uppgift}
                    </span>
                  ))}
                  {dayTasks.length > 2 && (
                    <span style={{ fontSize: 9, color: "var(--color-on-surface-variant)" }}>
                      +{dayTasks.length - 2}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 mt-4 flex-wrap" style={{ fontSize: 10, color: "var(--color-on-surface-variant)" }}>
        {STATUS_OPTIONS.map((s) => (
          <div key={s} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, backgroundColor: STATUS_COLORS[s] }} />
            {s}
          </div>
        ))}
        <div className="flex-1" />
        <span>Klick på dag → ny uppgift · klick på etikett → redigera</span>
      </div>
    </Card>
  );
}

function navBtnStyle(): React.CSSProperties {
  return {
    width: 32,
    height: 32,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "var(--color-surface-container)",
    border: "1px solid var(--color-outline-variant)",
    color: "var(--color-on-surface)",
    cursor: "pointer",
  };
}

// ─── Lista-vy ────────────────────────────────────────────────────────────────

function ListView({
  tasks, onPickTask, onMarkDone,
}: {
  tasks: SeasonTask[];
  onPickTask: (t: SeasonTask) => void;
  onMarkDone: (t: SeasonTask) => Promise<void>;
}) {
  const todayIso = isoToday();
  const groups: Record<string, SeasonTask[]> = { Planerad: [], "Pågår": [], Klar: [] };
  for (const t of tasks) {
    const key = STATUS_OPTIONS.includes(t.status) ? t.status : "Planerad";
    groups[key].push(t);
  }
  // Kommande först inom Planerad/Pågår, senaste först inom Klar
  const sortAsc = (a: SeasonTask, b: SeasonTask) => a.datum.localeCompare(b.datum);
  const sortDesc = (a: SeasonTask, b: SeasonTask) => b.datum.localeCompare(a.datum);
  groups.Planerad.sort(sortAsc);
  groups["Pågår"].sort(sortAsc);
  groups.Klar.sort(sortDesc);

  const order: Array<keyof typeof groups> = ["Pågår", "Planerad", "Klar"];

  return (
    <div className="space-y-4">
      {order.map((status) => {
        const list = groups[status];
        return (
          <Card key={status} className="p-4">
            <div
              className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider"
              style={{ color: "var(--color-on-surface-variant)" }}
            >
              <span style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: STATUS_COLORS[status] }} />
              {status}
              <span style={{ opacity: 0.6 }}>· {list.length}</span>
            </div>

            {list.length === 0 ? (
              <div className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
                Inga uppgifter.
              </div>
            ) : (
              <div className="space-y-2">
                {list.map((t) => {
                  const isOverdue = t.status !== "Klar" && t.datum && t.datum < todayIso;
                  const isToday = t.datum === todayIso;
                  return (
                    <div
                      key={t.id}
                      className="rounded-xl flex items-center gap-3"
                      style={{
                        padding: "10px 12px",
                        backgroundColor: "var(--color-surface-container)",
                      }}
                    >
                      <button
                        onClick={() => onPickTask(t)}
                        className="flex-1 min-w-0 text-left"
                        style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
                      >
                        <div className="text-sm font-semibold truncate" style={{ color: "var(--color-on-surface)" }}>
                          {t.uppgift || "Namnlös uppgift"}
                        </div>
                        <div className="text-[11px] mt-0.5 flex items-center gap-1.5 flex-wrap" style={{ color: "var(--color-on-surface-variant)" }}>
                          <span style={{ color: isOverdue ? "var(--color-error, #b3261e)" : isToday ? "var(--color-primary)" : undefined, fontWeight: isToday || isOverdue ? 600 : 400 }}>
                            {isToday ? "I dag" : formatShortDate(t.datum) || "–"}
                          </span>
                          {t.typ && <>· <span>{t.typ}</span></>}
                          {t.atgarder.length > 0 && <>· <span>{t.atgarder.join(", ")}</span></>}
                        </div>
                      </button>

                      {status !== "Klar" && (
                        <button
                          onClick={() => onMarkDone(t)}
                          aria-label="Markera som klar"
                          className="shrink-0 rounded-full"
                          style={{
                            width: 32, height: 32,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            backgroundColor: "var(--color-surface-container-lowest)",
                            border: "1px solid var(--color-outline-variant)",
                            cursor: "pointer",
                            color: "var(--color-on-surface-variant)",
                          }}
                          title="Markera som klar"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ─── Per växt-vy ─────────────────────────────────────────────────────────────

function PerPlantView({
  tasks, plants, onPickTask,
}: {
  tasks: SeasonTask[];
  plants: Plant[];
  onPickTask: (t: SeasonTask) => void;
}) {
  // Bygg map plantId → tasks. Hoppa över uppgifter utan kopplad växt.
  const map = new Map<string, SeasonTask[]>();
  for (const t of tasks) {
    for (const pid of t.plantIds) {
      const list = map.get(pid) ?? [];
      list.push(t);
      map.set(pid, list);
    }
  }
  // Behåll bara växter som faktiskt har uppgifter
  const entries = plants
    .filter((p) => map.has(p.id))
    .map((p) => ({ plant: p, tasks: (map.get(p.id) ?? []).sort((a, b) => a.datum.localeCompare(b.datum)) }))
    .sort((a, b) => a.plant.vaxt.localeCompare(b.plant.vaxt, "sv"));

  if (entries.length === 0) {
    return (
      <Card className="p-8 text-center">
        <span className="material-symbols-outlined" style={{ fontSize: 32, color: "var(--color-outline)" }}>local_florist</span>
        <p className="text-sm mt-2" style={{ color: "var(--color-on-surface-variant)" }}>
          Inga uppgifter kopplade till växter än.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map(({ plant, tasks }) => (
        <Card key={plant.id} className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--color-primary)" }}>local_florist</span>
            <div className="text-sm font-bold" style={{ color: "var(--color-on-surface)" }}>{plant.vaxt}</div>
            {plant.typ && (
              <span className="text-[11px]" style={{ color: "var(--color-on-surface-variant)" }}>· {plant.typ}</span>
            )}
            <div className="flex-1" />
            <span className="text-[11px]" style={{ color: "var(--color-on-surface-variant)" }}>{tasks.length} st</span>
          </div>

          <div className="space-y-1.5">
            {tasks.map((t) => (
              <button
                key={t.id}
                onClick={() => onPickTask(t)}
                className="w-full text-left rounded-lg flex items-center gap-2"
                style={{
                  padding: "8px 10px",
                  backgroundColor: "var(--color-surface-container)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: STATUS_COLORS[t.status] ?? "var(--color-primary)" }} />
                <div className="text-xs font-semibold flex-1 min-w-0 truncate" style={{ color: "var(--color-on-surface)" }}>
                  {t.uppgift}
                </div>
                <div className="text-[10px] shrink-0" style={{ color: "var(--color-on-surface-variant)" }}>
                  {formatShortDate(t.datum) || "–"}
                </div>
              </button>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────

type Draft = SeasonTaskInput & { id?: string };

function TaskModal({
  draft, plants, onClose, onSave, onDelete,
}: {
  draft: Draft;
  plants: Plant[];
  onClose: () => void;
  onSave: (d: Draft) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
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
    if (!confirm("Arkivera denna uppgift?")) return;
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

  // Rendera växt-multi-select som filtrerbar lista. Kompakt — bara namn.
  const [plantQuery, setPlantQuery] = useState("");
  const plantsFiltered = useMemo(() => {
    const q = plantQuery.trim().toLowerCase();
    const sorted = [...plants].sort((a, b) => a.vaxt.localeCompare(b.vaxt, "sv"));
    if (!q) return sorted;
    return sorted.filter((p) => p.vaxt.toLowerCase().includes(q));
  }, [plants, plantQuery]);
  const selectedPlantIds = form.plantIds ?? [];
  const togglePlant = (id: string) => {
    upd({
      plantIds: selectedPlantIds.includes(id)
        ? selectedPlantIds.filter((x) => x !== id)
        : [...selectedPlantIds, id],
    });
  };

  return (
    <ModalShell onClose={onClose}>
      <ModalHeader title={isEdit ? "Redigera uppgift" : "Ny uppgift"} onClose={onClose} />

      <div className="space-y-3">
        <Field label="Uppgift">
          <input
            type="text"
            value={form.uppgift ?? ""}
            onChange={(e) => upd({ uppgift: e.target.value })}
            placeholder="t.ex. Beskär syrenhortensia"
            style={inputStyle()}
          />
        </Field>

        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <Field label="Datum">
            <input
              type="date"
              value={form.datum ?? ""}
              onChange={(e) => upd({ datum: e.target.value })}
              style={inputStyle()}
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
            style={{ ...inputStyle(), resize: "vertical", fontFamily: "inherit" }}
          />
        </Field>

        <Field label={`🌿 Växt (${selectedPlantIds.length} valda)`}>
          <input
            type="text"
            value={plantQuery}
            onChange={(e) => setPlantQuery(e.target.value)}
            placeholder="Sök växt…"
            style={{ ...inputStyle(), marginBottom: 6 }}
          />
          <div
            style={{
              maxHeight: 180,
              overflowY: "auto",
              borderRadius: 8,
              border: "1px solid var(--color-outline-variant)",
              backgroundColor: "var(--color-surface-container)",
            }}
          >
            {plantsFiltered.length === 0 ? (
              <div className="text-xs p-2" style={{ color: "var(--color-on-surface-variant)" }}>Inga träffar.</div>
            ) : plantsFiltered.map((p) => {
              const checked = selectedPlantIds.includes(p.id);
              return (
                <label
                  key={p.id}
                  className="flex items-center gap-2"
                  style={{ padding: "6px 10px", cursor: "pointer", fontSize: 13 }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => togglePlant(p.id)}
                  />
                  <span style={{ color: "var(--color-on-surface)", flex: 1, minWidth: 0 }} className="truncate">
                    {p.vaxt}
                  </span>
                  {p.typ && (
                    <span className="text-[10px]" style={{ color: "var(--color-on-surface-variant)" }}>{p.typ}</span>
                  )}
                </label>
              );
            })}
          </div>
        </Field>
      </div>

      <ModalErrorRow message={err} />
      <ModalFooter
        onCancel={onClose}
        onSave={save}
        saveLabel={isEdit ? "Spara" : "Skapa"}
        saving={saving}
        canSave={!!form.uppgift && !!form.datum}
        destructiveLabel={isEdit ? "Arkivera" : undefined}
        onDestructive={isEdit ? del : undefined}
      />
    </ModalShell>
  );
}

// ─── Sidan ───────────────────────────────────────────────────────────────────

export default function SeasonPlanPage() {
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

  const markDone = async (t: SeasonTask) => {
    await fetch(`/api/garden/tasks/${t.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "Klar" }),
    });
    await refresh();
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight font-headline" style={{ color: "var(--color-on-surface)" }}>
          Säsongsplan
        </h1>
        <p className="text-sm font-medium mt-1" style={{ color: "var(--color-on-surface-variant)" }}>
          {tasks.length} uppgifter totalt
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <ViewToggle value={view} onChange={setView} />
        <div className="flex-1" />
        <button
          onClick={() => setEditing({ datum: isoToday(), status: "Planerad" })}
          className="text-xs font-semibold rounded-full"
          style={{
            backgroundColor: "var(--color-primary)",
            color: "var(--color-on-primary)",
            border: "none",
            padding: "8px 14px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
          Ny uppgift
        </button>
      </div>

      {notReady ? (
        <Card className="p-5">
          <p className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
            Trädgårds-DB:erna är inte konfigurerade. Sätt <code>NOTION_GARDEN_SEASON_DB</code> m.fl. i miljön.
          </p>
        </Card>
      ) : tasksSwr.error ? (
        <ErrorBanner onRetry={() => tasksSwr.mutate()} />
      ) : tasksSwr.isLoading ? (
        <div className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>Laddar…</div>
      ) : view === "Kalender" ? (
        <CalendarView
          tasks={tasks}
          onPickDate={(iso) => setEditing({ datum: iso, status: "Planerad" })}
          onPickTask={(t) => setEditing({
            id: t.id,
            uppgift: t.uppgift,
            datum: t.datum,
            status: t.status,
            typ: t.typ,
            atgarder: t.atgarder,
            kommentar: t.kommentar,
            plantIds: t.plantIds,
          })}
        />
      ) : view === "Lista" ? (
        <ListView
          tasks={tasks}
          onPickTask={(t) => setEditing({
            id: t.id,
            uppgift: t.uppgift,
            datum: t.datum,
            status: t.status,
            typ: t.typ,
            atgarder: t.atgarder,
            kommentar: t.kommentar,
            plantIds: t.plantIds,
          })}
          onMarkDone={markDone}
        />
      ) : (
        <PerPlantView
          tasks={tasks}
          plants={plants}
          onPickTask={(t) => setEditing({
            id: t.id,
            uppgift: t.uppgift,
            datum: t.datum,
            status: t.status,
            typ: t.typ,
            atgarder: t.atgarder,
            kommentar: t.kommentar,
            plantIds: t.plantIds,
          })}
        />
      )}

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

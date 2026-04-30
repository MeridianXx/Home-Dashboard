"use client";

// ─── Warm Home · Trädgård · Säsongsplan ─────────────────────────────────────
// Kalender alltid synlig överst. Under den: uppgifter grupperade per tidsperiod
// (Försenade / Denna vecka / Nästa vecka / månad-för-månad).
// CRUD via WarmModal (portal). Klick på dag = ny uppgift med datum förifyllt.
// Klick på dag-event = redigera. "Markera klar"-bock-knapp på rader.

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useWarmTheme } from "@/lib/warm/theme";
import {
  ACC,
  body,
  ital,
  lab,
  num,
} from "@/lib/warm/tokens";
import { Tile } from "@/components/warm/primitives";
import { DetailHero } from "@/components/warm/fit/parts";
import { ChevronLeft, ChevronRight } from "@/components/warm/icons/extra";
import { haptic } from "@/lib/warm/haptics";
import {
  PlusIcon,
  CheckCircleIcon,
  CheckIcon,
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

type Draft = SeasonTaskInput & { id?: string };

// ── Helpers ──────────────────────────────────────────────────────────────────

function startOfWeek(d: Date): Date {
  const r = new Date(d);
  const dow = (r.getDay() + 6) % 7; // 0=Mon
  r.setDate(r.getDate() - dow);
  r.setHours(0, 0, 0, 0);
  return r;
}

function isoFromDate(d: Date): string {
  return isoDate(d);
}

// ── Kalender ─────────────────────────────────────────────────────────────────

const navBtn = (t: ReturnType<typeof useWarmTheme>["t"]): React.CSSProperties => ({
  background: "transparent",
  border: `1px solid ${t.line}`,
  borderRadius: 8,
  padding: "5px 7px",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
});

function CalendarStrip({
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
    setYear(today.getFullYear());
    setMonthIdx(today.getMonth());
  };

  return (
    <Tile t={t} style={{ padding: 14 }}>
      {/* Månadsnavigation */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => { void haptic("tap"); goToday(); }}
          title="Gå till idag"
          style={{
            ...num(t, 15, 500),
            textTransform: "capitalize" as const,
            background: "transparent",
            border: "none",
            color: t.ink,
            cursor: "pointer",
            padding: "2px 0",
            textAlign: "left" as const,
            flex: 1,
          }}
        >
          {monthLabelSv(year, monthIdx)}
        </button>
        <button type="button" onClick={() => { void haptic("tap"); navigate(-1); }} aria-label="Föregående månad" style={navBtn(t)}>
          <ChevronLeft size={14} color={t.mute} />
        </button>
        <button type="button" onClick={() => { void haptic("tap"); navigate(1); }} aria-label="Nästa månad" style={navBtn(t)}>
          <ChevronRight size={14} color={t.mute} />
        </button>
      </div>

      {/* Veckodagshuvuden */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          marginBottom: 4,
        }}
      >
        {["M", "T", "O", "T", "F", "L", "S"].map((d, i) => (
          <div key={i} style={{ ...lab(t), fontSize: 9, textAlign: "center" as const }}>
            {d}
          </div>
        ))}
      </div>

      {/* Dag-grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap: 2,
        }}
      >
        {grid.flat().map((cell) => {
          const dayNum = parseISO(cell.iso)?.getDate() ?? 1;
          const dayTasks = tasksByDate.get(cell.iso) ?? [];
          const isToday = cell.iso === todayIso;
          const hasDone = dayTasks.some((tk) => tk.status === "Klar");
          const hasPending = dayTasks.some((tk) => tk.status !== "Klar");

          return (
            <button
              key={cell.iso}
              type="button"
              onClick={() => { void haptic("tap"); onPickDate(cell.iso); }}
              aria-label={`${cell.iso}`}
              style={{
                position: "relative" as const,
                aspectRatio: "1 / 1",
                borderRadius: 7,
                background: cell.inMonth ? t.paper : "transparent",
                border: isToday ? `1.5px solid ${ACC}` : `1px solid ${cell.inMonth ? t.line : "transparent"}`,
                color: cell.inMonth ? t.ink : t.dim,
                opacity: cell.inMonth ? 1 : 0.4,
                cursor: "pointer",
                padding: "3px 2px 2px",
                display: "flex",
                flexDirection: "column" as const,
                alignItems: "center",
                justifyContent: "flex-start",
                gap: 2,
              }}
            >
              <span
                style={{
                  fontFamily: body,
                  fontSize: 10,
                  fontWeight: isToday ? 700 : 400,
                  color: isToday ? ACC : "inherit",
                  lineHeight: 1,
                }}
              >
                {dayNum}
              </span>
              {dayTasks.length > 0 && (
                <div style={{ display: "flex", gap: 2, flexWrap: "wrap", justifyContent: "center" }}>
                  {hasPending && (
                    <span
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: 99,
                        background: ACC,
                      }}
                    />
                  )}
                  {hasDone && (
                    <span
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: 99,
                        background: TASK_STATUS_COLOR["Klar"] ?? "#5A7F4A",
                        opacity: 0.6,
                      }}
                    />
                  )}
                </div>
              )}
              {/* Klick på event: visas som overlay-lager — hantera via onPickDate och låt listan filtrera */}
            </button>
          );
        })}
      </div>

      {/* Legenda */}
      <div
        style={{ display: "flex", gap: 12, marginTop: 10, alignItems: "center", justifyContent: "flex-end" }}
      >
        <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: 99, background: ACC, display: "inline-block" }} />
          <span style={{ ...lab(t), fontSize: 9 }}>Planerad</span>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: 99, background: "#5A7F4A", opacity: 0.6, display: "inline-block" }} />
          <span style={{ ...lab(t), fontSize: 9 }}>Klar</span>
        </div>
      </div>
    </Tile>
  );
}

// ── Uppgifts-rad ─────────────────────────────────────────────────────────────

function TaskRow({
  task,
  onEdit,
  onMarkDone,
  overdue,
}: {
  task: SeasonTask;
  onEdit: (tk: SeasonTask) => void;
  onMarkDone: (tk: SeasonTask) => void;
  overdue?: boolean;
}) {
  const { t } = useWarmTheme();
  const isDone = task.status === "Klar";
  const statusColor = TASK_STATUS_COLOR[task.status] ?? ACC;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        background: t.paper,
        border: `1px solid ${overdue && !isDone ? `${ACC}55` : t.line}`,
        borderRadius: 12,
      }}
    >
      {/* Status-prick */}
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: 99,
          background: statusColor,
          flexShrink: 0,
          opacity: isDone ? 0.5 : 1,
        }}
      />

      {/* Info */}
      <button
        type="button"
        onClick={() => { void haptic("tap"); onEdit(task); }}
        style={{
          flex: 1,
          minWidth: 0,
          textAlign: "left" as const,
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
        }}
      >
        <div
          style={{
            fontFamily: body,
            fontSize: 13,
            fontWeight: 500,
            color: isDone ? t.mute : t.ink,
            textDecoration: isDone ? "line-through" : "none",
            lineHeight: 1.25,
            whiteSpace: "nowrap" as const,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {task.uppgift}
        </div>
        <div style={{ fontFamily: body, fontSize: 11, color: overdue && !isDone ? ACC : t.mute, marginTop: 2 }}>
          {shortDateSv(task.datum) || "Inget datum"}
          {task.typ ? ` · ${task.typ}` : ""}
        </div>
      </button>

      {/* Markera klar */}
      {!isDone && (
        <button
          type="button"
          onClick={() => { void haptic("success"); onMarkDone(task); }}
          aria-label="Markera klar"
          style={{
            background: "none",
            border: `1px solid ${t.line}`,
            borderRadius: 99,
            padding: 5,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <CheckIcon size={13} color={t.mute} />
        </button>
      )}
    </div>
  );
}

// ── Tid-grupperad lista ───────────────────────────────────────────────────────

function TaskList({
  tasks,
  onEdit,
  onMarkDone,
}: {
  tasks: SeasonTask[];
  onEdit: (tk: SeasonTask) => void;
  onMarkDone: (tk: SeasonTask) => void;
}) {
  const { t } = useWarmTheme();
  const today = isoToday();
  const todayD = parseISO(today)!;
  const weekStart = isoFromDate(startOfWeek(todayD));
  const weekEnd = isoFromDate(new Date(startOfWeek(todayD).getTime() + 6 * 86400000));
  const nextWeekStart = isoFromDate(new Date(startOfWeek(todayD).getTime() + 7 * 86400000));
  const nextWeekEnd = isoFromDate(new Date(startOfWeek(todayD).getTime() + 13 * 86400000));

  // Group tasks
  const grouped = useMemo(() => {
    const overdue: SeasonTask[] = [];
    const thisWeek: SeasonTask[] = [];
    const nextWeek: SeasonTask[] = [];
    const later = new Map<string, SeasonTask[]>(); // key = "YYYY-MM" label
    const done: SeasonTask[] = [];

    for (const tk of tasks) {
      if (tk.status === "Klar") {
        done.push(tk);
        continue;
      }
      const d = tk.datum;
      if (!d) {
        // No date — show in "this week" area
        thisWeek.push(tk);
        continue;
      }
      if (d < today) {
        overdue.push(tk);
      } else if (d >= weekStart && d <= weekEnd) {
        thisWeek.push(tk);
      } else if (d >= nextWeekStart && d <= nextWeekEnd) {
        nextWeek.push(tk);
      } else {
        // Group by month label
        const parsed = parseISO(d);
        if (!parsed) continue;
        const key = monthLabelSv(parsed.getFullYear(), parsed.getMonth());
        const list = later.get(key) ?? [];
        list.push(tk);
        later.set(key, list);
      }
    }

    return { overdue, thisWeek, nextWeek, later, done };
  }, [tasks, today, weekStart, weekEnd, nextWeekStart, nextWeekEnd]);

  const [showDone, setShowDone] = useState(false);

  const SectionHeader = ({ label, count }: { label: string; count: number }) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 0 8px",
      }}
    >
      <span style={lab(t)}>{label}</span>
      <span style={{ fontFamily: body, fontSize: 10, color: t.dim }}>· {count}</span>
      <div style={{ flex: 1, height: 1, background: t.line }} />
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {/* Försenade */}
      {grouped.overdue.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <SectionHeader label="FÖRSENADE" count={grouped.overdue.length} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {grouped.overdue.map((tk) => (
              <TaskRow key={tk.id} task={tk} onEdit={onEdit} onMarkDone={onMarkDone} overdue />
            ))}
          </div>
        </div>
      )}

      {/* Denna vecka */}
      {grouped.thisWeek.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <SectionHeader label="DENNA VECKA" count={grouped.thisWeek.length} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {grouped.thisWeek.map((tk) => (
              <TaskRow key={tk.id} task={tk} onEdit={onEdit} onMarkDone={onMarkDone} />
            ))}
          </div>
        </div>
      )}

      {/* Nästa vecka */}
      {grouped.nextWeek.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <SectionHeader label="NÄSTA VECKA" count={grouped.nextWeek.length} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {grouped.nextWeek.map((tk) => (
              <TaskRow key={tk.id} task={tk} onEdit={onEdit} onMarkDone={onMarkDone} />
            ))}
          </div>
        </div>
      )}

      {/* Senare månadsvis */}
      {Array.from(grouped.later.entries()).map(([month, tks]) => (
        <div key={month} style={{ marginBottom: 12 }}>
          <SectionHeader label={month.toUpperCase()} count={tks.length} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {tks.map((tk) => (
              <TaskRow key={tk.id} task={tk} onEdit={onEdit} onMarkDone={onMarkDone} />
            ))}
          </div>
        </div>
      ))}

      {/* Klara (kollapsbar) */}
      {grouped.done.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <button
            type="button"
            onClick={() => { void haptic("tap"); setShowDone((s) => !s); }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "none",
              border: "none",
              padding: "4px 0 8px",
              cursor: "pointer",
              width: "100%",
            }}
          >
            <span style={lab(t)}>KLARA</span>
            <span style={{ fontFamily: body, fontSize: 10, color: t.dim }}>· {grouped.done.length}</span>
            <div style={{ flex: 1, height: 1, background: t.line }} />
            <span style={{ ...lab(t), color: ACC }}>{showDone ? "Dölj" : "Visa"}</span>
          </button>
          {showDone && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {grouped.done.map((tk) => (
                <TaskRow key={tk.id} task={tk} onEdit={onEdit} onMarkDone={onMarkDone} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tom-state */}
      {grouped.overdue.length === 0 &&
        grouped.thisWeek.length === 0 &&
        grouped.nextWeek.length === 0 &&
        grouped.later.size === 0 &&
        grouped.done.length === 0 && (
          <p style={{ ...ital(t, 13), textAlign: "center" as const, padding: "32px 0" }}>
            Inga uppgifter planerade.
          </p>
        )}
    </div>
  );
}

// ── Task-modal ────────────────────────────────────────────────────────────────

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
            style={{ ...inputStyle(t), resize: "vertical" as const, fontFamily: body }}
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

// ── Sidkomponent ─────────────────────────────────────────────────────────────

export default function GardenSeasonPage() {
  const { t } = useWarmTheme();
  const [editing, setEditing] = useState<Draft | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    atgarder: tk.atgarder as string[],
    kommentar: tk.kommentar,
    plantIds: tk.plantIds,
  });

  // Antal aktiva uppgifter (ej klara)
  const activeCount = tasks.filter((tk) => tk.status !== "Klar").length;

  return (
    <div style={{ paddingBottom: 140 }}>
      <DetailHero
        backHref="/v3/garden"
        backLabel="Trädgård"
        eyebrow="SÄSONG"
        title={`${activeCount} uppgifter,`}
        italicTail="månad för månad."
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 18px" }}>
        {/* Ny uppgift-knapp */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={() => { void haptic("tap"); setEditing({ datum: isoToday(), status: "Planerad" }); }}
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
              Trädgårds-DB:erna är inte konfigurerade. Sätt{" "}
              <code>NOTION_GARDEN_SEASON_DB</code> m.fl. i miljön.
            </p>
          </Tile>
        ) : tasksSwr.isLoading ? (
          <Tile t={t}>
            <p style={ital(t, 13)}>Laddar…</p>
          </Tile>
        ) : (
          <>
            {/* Uppgiftslista grupperad per tidsperiod. Kalender-vyn togs
                bort (kunde inte rymma något meningsfullt utöver prickar
                på 375 px-mobil). Lista ger samma info i läsbar form. */}
            <TaskList
              tasks={tasks}
              onEdit={(tk) => setEditing(draftFromTask(tk))}
              onMarkDone={markDone}
            />
          </>
        )}
      </div>

      {/* Modal via portal */}
      {mounted &&
        editing &&
        createPortal(
          <TaskModal
            draft={editing}
            plants={plants}
            onClose={() => setEditing(null)}
            onSave={handleSave}
            onDelete={editing.id ? () => handleDelete(editing.id!) : undefined}
          />,
          document.body
        )}
    </div>
  );
}

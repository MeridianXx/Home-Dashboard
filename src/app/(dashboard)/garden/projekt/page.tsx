"use client";

// ─── Trädgård · Projekt ──────────────────────────────────────────────────────
// Kanban-board över utomhusprojekt. dnd-kit för drag-mellan-kolumner; i fall
// drag inte triggas (t.ex. mobil) finns en status-dropdown direkt på kortet.

import { useMemo, useState } from "react";
import useSWR from "swr";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  useDroppable,
  useDraggable,
  closestCenter,
} from "@dnd-kit/core";
import { fetcher } from "@/lib/fetcher";
import ErrorBanner from "@/components/ErrorBanner";
import {
  Field,
  SelectBox,
  ModalShell,
  ModalHeader,
  ModalFooter,
  ModalErrorRow,
  inputStyle,
} from "@/components/garden/forms";
import type {
  OutdoorProject,
  OutdoorProjectInput,
  ProjectsResponse,
} from "@/lib/garden/types";

const STATUS_COLUMNS = ["Ny", "Utreds", "Planerad", "Pågående", "Väntar", "Klart", "Skrotad"];
const PRIORITY_OPTIONS = ["Hög", "Normal", "Låg"];
const AREA_OPTIONS = ["Uppfart", "Finplanering", "Grovplanering", "Trädgård", "Bygg", "Altan"];
const TIMEFRAME_OPTIONS = ["Oklart", "2026", "2027"];

const ACTIVE_STATUSES = new Set(["Planerad", "Pågående", "Utreds", "Väntar"]);

const STATUS_COLORS: Record<string, string> = {
  Ny: "#94a3b8",
  Utreds: "#a855f7",
  Planerad: "var(--color-primary)",
  "Pågående": "#f59e0b",
  "Väntar": "#64748b",
  Klart: "#10b981",
  Skrotad: "#ef4444",
};

const PRIORITY_COLORS: Record<string, string> = {
  "Hög": "#ef4444",
  Normal: "var(--color-primary)",
  "Låg": "#94a3b8",
};

// ─── Hjälpare ────────────────────────────────────────────────────────────────

function formatSek(value: number | null | undefined): string {
  if (value == null) return "–";
  return value.toLocaleString("sv-SE", { maximumFractionDigits: 0 });
}

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

// ─── Filter-rad + budget-summering ───────────────────────────────────────────

function FilterPills({
  label, options, value, onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-on-surface-variant)" }}>
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

function StatTile({
  label, value, unit, accent,
}: {
  label: string;
  value: string | number;
  unit?: string;
  accent?: string;
}) {
  return (
    <div
      className="rounded-xl"
      style={{
        backgroundColor: "var(--color-surface-container)",
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: 86,
      }}
    >
      <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-on-surface-variant)" }}>
        {label}
      </div>
      <div>
        <div
          className="text-xl font-bold tabular-nums leading-none"
          style={{ color: accent ?? "var(--color-on-surface)" }}
        >
          {value}
        </div>
        {unit && (
          <div className="mt-1 text-[11px] leading-none" style={{ color: "var(--color-on-surface-variant)" }}>
            {unit}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Kanban — kolumn + kort ─────────────────────────────────────────────────

function Column({
  status, projects, onPick, onDropStatus,
}: {
  status: string;
  projects: OutdoorProject[];
  onPick: (p: OutdoorProject) => void;
  onDropStatus: (id: string, next: string) => Promise<void>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className="rounded-2xl"
      style={{
        backgroundColor: "var(--color-surface-container-lowest)",
        border: `1px solid ${isOver ? "var(--color-primary)" : "var(--color-card-border)"}`,
        padding: 12,
        minWidth: 240,
        width: 240,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
        style={{ color: "var(--color-on-surface-variant)" }}
      >
        <span style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: STATUS_COLORS[status] ?? "var(--color-primary)" }} />
        {status}
        <span style={{ opacity: 0.6 }}>· {projects.length}</span>
      </div>
      <div className="space-y-2" style={{ minHeight: 40 }}>
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} onPick={onPick} onDropStatus={onDropStatus} />
        ))}
      </div>
    </div>
  );
}

function ProjectCard({
  project, onPick, onDropStatus,
}: {
  project: OutdoorProject;
  onPick: (p: OutdoorProject) => void;
  onDropStatus: (id: string, next: string) => Promise<void>;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: project.id });
  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: "var(--color-surface-container)",
    borderRadius: 10,
    padding: 10,
    border: "1px solid var(--color-outline-variant)",
    cursor: "grab",
    touchAction: "none",
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-start gap-2" {...attributes} {...listeners}>
        <span
          style={{
            width: 6, minWidth: 6, height: 32, borderRadius: 3,
            backgroundColor: PRIORITY_COLORS[project.prioritet] ?? "var(--color-outline)",
            marginTop: 2,
          }}
          title={`Prioritet: ${project.prioritet || "—"}`}
        />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold leading-tight" style={{ color: "var(--color-on-surface)" }}>
            {project.namn || "Namnlöst projekt"}
          </div>
          <div className="text-[10px] mt-1 flex flex-wrap gap-1.5" style={{ color: "var(--color-on-surface-variant)" }}>
            {project.omrade && <span>{project.omrade}</span>}
            {project.tidsram && <span>· {project.tidsram}</span>}
            {project.budget != null && project.budget > 0 && (
              <span>· {formatSek(project.budget)} kr</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 mt-2">
        <select
          value={project.status}
          onChange={(e) => onDropStatus(project.id, e.target.value)}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            ...inputStyle(),
            padding: "3px 6px",
            fontSize: 10,
            width: "auto",
            flex: 1,
          }}
          aria-label="Byt status"
        >
          {STATUS_COLUMNS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button
          onClick={() => onPick(project)}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Redigera"
          style={{
            width: 26, height: 26,
            display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: 13,
            backgroundColor: "var(--color-surface-container-lowest)",
            border: "1px solid var(--color-outline-variant)",
            cursor: "pointer",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14, color: "var(--color-on-surface-variant)" }}>edit</span>
        </button>
      </div>
    </div>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────

type Draft = OutdoorProjectInput & { id?: string };

function ProjectModal({
  draft, onClose, onSave, onDelete,
}: {
  draft: Draft;
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
    if (!confirm("Arkivera detta projekt?")) return;
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

  const numberInput = (val: number | null | undefined, set: (n: number | null) => void) => (
    <input
      type="number"
      value={val == null ? "" : val}
      onChange={(e) => {
        const v = e.target.value;
        set(v === "" ? null : Number(v));
      }}
      style={inputStyle()}
      placeholder="kr"
    />
  );

  return (
    <ModalShell onClose={onClose}>
      <ModalHeader title={isEdit ? "Redigera projekt" : "Nytt projekt"} onClose={onClose} />

      <div className="space-y-3">
        <Field label="Namn">
          <input
            type="text"
            value={form.namn ?? ""}
            onChange={(e) => upd({ namn: e.target.value })}
            placeholder="t.ex. Mur under buskar baksida"
            style={inputStyle()}
          />
        </Field>

        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <Field label="Status">
            <SelectBox
              value={form.status ?? "Ny"}
              options={STATUS_COLUMNS}
              onChange={(v) => upd({ status: v })}
            />
          </Field>
          <Field label="Prioritet">
            <SelectBox
              value={form.prioritet ?? "Normal"}
              options={PRIORITY_OPTIONS}
              onChange={(v) => upd({ prioritet: v })}
            />
          </Field>
        </div>

        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <Field label="Område">
            <SelectBox
              value={form.omrade ?? ""}
              options={AREA_OPTIONS}
              placeholder="Välj…"
              onChange={(v) => upd({ omrade: v })}
            />
          </Field>
          <Field label="Tidsram">
            <SelectBox
              value={form.tidsram ?? ""}
              options={TIMEFRAME_OPTIONS}
              placeholder="Välj…"
              onChange={(v) => upd({ tidsram: v })}
            />
          </Field>
        </div>

        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <Field label="Budget (kr)">
            {numberInput(form.budget, (n) => upd({ budget: n }))}
          </Field>
          <Field label="Faktisk kostnad (kr)">
            {numberInput(form.faktiskKostnad, (n) => upd({ faktiskKostnad: n }))}
          </Field>
        </div>

        <Field label="Kommentar">
          <textarea
            value={form.kommentar ?? ""}
            onChange={(e) => upd({ kommentar: e.target.value })}
            rows={3}
            placeholder="Anteckningar, leverantörer, länkar"
            style={{ ...inputStyle(), resize: "vertical", fontFamily: "inherit" }}
          />
        </Field>
      </div>

      <ModalErrorRow message={err} />
      <ModalFooter
        onCancel={onClose}
        onSave={save}
        saveLabel={isEdit ? "Spara" : "Skapa"}
        saving={saving}
        canSave={!!form.namn}
        destructiveLabel={isEdit ? "Arkivera" : undefined}
        onDestructive={isEdit ? del : undefined}
      />
    </ModalShell>
  );
}

// ─── Sidan ───────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const [editing, setEditing] = useState<Draft | null>(null);
  const [tidsramFilter, setTidsramFilter] = useState("Alla");
  const [omradeFilter, setOmradeFilter] = useState("Alla");
  const [prioritetFilter, setPrioritetFilter] = useState("Alla");

  const swr = useSWR<ProjectsResponse>("/api/garden/projects", fetcher, {
    refreshInterval: 10 * 60 * 1000,
    revalidateOnFocus: false,
  });

  const projects = swr.data?.projects ?? [];
  const errMsg = swr.error instanceof Error ? swr.error.message : "";
  const notReady = errMsg.includes(": 501");

  const filtered = useMemo(() => projects.filter((p) => {
    if (tidsramFilter !== "Alla" && (p.tidsram || "Oklart") !== tidsramFilter) return false;
    if (omradeFilter !== "Alla" && p.omrade !== omradeFilter) return false;
    if (prioritetFilter !== "Alla" && p.prioritet !== prioritetFilter) return false;
    return true;
  }), [projects, tidsramFilter, omradeFilter, prioritetFilter]);

  const summary = useMemo(() => {
    let active = 0;
    let totalBudget = 0;
    let totalSpent = 0;
    for (const p of filtered) {
      if (!ACTIVE_STATUSES.has(p.status)) continue;
      active++;
      if (p.budget != null) totalBudget += p.budget;
      if (p.faktiskKostnad != null) totalSpent += p.faktiskKostnad;
    }
    return { active, totalBudget, totalSpent, diff: totalBudget - totalSpent };
  }, [filtered]);

  const grouped = useMemo(() => {
    const out: Record<string, OutdoorProject[]> = {};
    for (const s of STATUS_COLUMNS) out[s] = [];
    for (const p of filtered) {
      const col = STATUS_COLUMNS.includes(p.status) ? p.status : "Ny";
      out[col].push(p);
    }
    for (const s of STATUS_COLUMNS) {
      out[s].sort((a, b) => {
        // Hög prioritet först, sedan namn
        const pa = ["Hög", "Normal", "Låg"].indexOf(a.prioritet) ?? 99;
        const pb = ["Hög", "Normal", "Låg"].indexOf(b.prioritet) ?? 99;
        if (pa !== pb) return pa - pb;
        return a.namn.localeCompare(b.namn, "sv");
      });
    }
    return out;
  }, [filtered]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const updateStatus = async (id: string, next: string) => {
    const project = projects.find((p) => p.id === id);
    if (!project || project.status === next) return;
    // Optimistic update
    if (swr.data) {
      const nextProjects = swr.data.projects.map((p) => p.id === id ? { ...p, status: next } : p);
      swr.mutate({ ...swr.data, projects: nextProjects }, { revalidate: false });
    }
    try {
      const res = await fetch(`/api/garden/projects/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
    } finally {
      await swr.mutate();
    }
  };

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over) return;
    const id = String(e.active.id);
    const next = String(e.over.id);
    void updateStatus(id, next);
  };

  const refresh = async () => { await swr.mutate(); };

  const handleSave = async (d: Draft) => {
    const isEdit = !!d.id;
    const url = isEdit ? `/api/garden/projects/${d.id}` : `/api/garden/projects`;
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
    const res = await fetch(`/api/garden/projects/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `${res.status}`);
    }
    setEditing(null);
    await refresh();
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight font-headline" style={{ color: "var(--color-on-surface)" }}>
          Projekt
        </h1>
        <p className="text-sm font-medium mt-1" style={{ color: "var(--color-on-surface-variant)" }}>
          {filtered.length} av {projects.length} projekt
        </p>
      </div>

      {/* Budget-summering — auto-fit så stora siffror inte klipps på mobil */}
      <Card className="p-4">
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
          <StatTile label="Aktiva" value={summary.active} unit="projekt" />
          <StatTile label="Budget" value={formatSek(summary.totalBudget)} unit="kr" />
          <StatTile label="Utfall" value={formatSek(summary.totalSpent)} unit="kr" />
          <StatTile
            label="Återstår"
            value={formatSek(summary.diff)}
            unit="kr"
            accent={summary.diff < 0 ? "var(--color-error, #b3261e)" : "var(--color-on-surface)"}
          />
        </div>
      </Card>

      {/* Verktygsrad: åtgärdsknapp uppe till höger om filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1" />
        <button
          onClick={() => setEditing({ status: "Ny", prioritet: "Normal" })}
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
          Nytt projekt
        </button>
      </div>

      {/* Filter */}
      <div className="space-y-3">
        <FilterPills
          label="Tidsram"
          options={["Alla", ...TIMEFRAME_OPTIONS]}
          value={tidsramFilter}
          onChange={setTidsramFilter}
        />
        <FilterPills
          label="Område"
          options={["Alla", ...AREA_OPTIONS]}
          value={omradeFilter}
          onChange={setOmradeFilter}
        />
        <FilterPills
          label="Prioritet"
          options={["Alla", ...PRIORITY_OPTIONS]}
          value={prioritetFilter}
          onChange={setPrioritetFilter}
        />
      </div>

      {notReady ? (
        <Card className="p-5">
          <p className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
            Trädgårds-DB:erna är inte konfigurerade. Sätt <code>NOTION_GARDEN_PROJECTS_DB</code> m.fl. i miljön.
          </p>
        </Card>
      ) : swr.error ? (
        <ErrorBanner onRetry={() => swr.mutate()} />
      ) : swr.isLoading ? (
        <div className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>Laddar projekt…</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <div
            className="flex gap-3"
            style={{
              overflowX: "auto",
              paddingBottom: 12,
              scrollSnapType: "x proximity",
            }}
            onTouchStart={(e) => e.stopPropagation()}
          >
            {STATUS_COLUMNS.map((status) => (
              <div key={status} style={{ scrollSnapAlign: "start" }}>
                <Column
                  status={status}
                  projects={grouped[status]}
                  onPick={(p) => setEditing({
                    id: p.id,
                    namn: p.namn,
                    status: p.status,
                    prioritet: p.prioritet,
                    omrade: p.omrade,
                    tidsram: p.tidsram,
                    budget: p.budget,
                    faktiskKostnad: p.faktiskKostnad,
                    kommentar: p.kommentar,
                  })}
                  onDropStatus={updateStatus}
                />
              </div>
            ))}
          </div>
        </DndContext>
      )}

      {editing && (
        <ProjectModal
          draft={editing}
          onClose={() => setEditing(null)}
          onSave={handleSave}
          onDelete={editing.id ? () => handleDelete(editing.id!) : undefined}
        />
      )}
    </div>
  );
}

"use client";

// ─── Warm Home · Trädgård · Projekt ─────────────────────────────────────────
// Kanban-board över utomhusprojekt. dnd-kit för drag mellan kolumner. Status-
// dropdown på kortet är mobil-fallback. Filter på tidsram/område/prioritet +
// kompakt budget-summering högst upp.

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
import { useWarmTheme } from "@/lib/warm/theme";
import { ACC, body, ital, lab, num } from "@/lib/warm/tokens";
import { Tile } from "@/components/warm/primitives";
import { DetailHero } from "@/components/warm/fit/parts";
import { PlusIcon, EditIcon } from "@/components/warm/icons/garden";
import { WarmModal } from "@/components/warm/Modal";
import {
  Field,
  SelectBox,
  ModalFooter,
  ModalErrorRow,
  inputStyle,
} from "@/components/warm/garden/forms";
import {
  formatSek,
  PROJECT_STATUS_COLOR,
  PROJECT_PRIORITY_COLOR,
} from "@/lib/warm/garden";
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

type Draft = OutdoorProjectInput & { id?: string };

// ── Filter chips ────────────────────────────────────────────────────────────

function FilterPills({
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
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={lab(t)}>{label}</span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
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
                padding: "4px 10px",
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

// ── Stat-tile för budget-summering ─────────────────────────────────────────

function StatBox({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string | number;
  unit?: string;
  accent?: string;
}) {
  const { t } = useWarmTheme();
  return (
    <div
      style={{
        background: t.paper,
        border: `1px solid ${t.line}`,
        borderRadius: 12,
        padding: "10px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        minWidth: 0,
      }}
    >
      <span style={lab(t)}>{label}</span>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span
          style={{ ...num(t, 20, 500), color: accent ?? t.ink, lineHeight: 1 }}
          className="warm-tab-nums"
        >
          {value}
        </span>
        {unit ? (
          <span style={{ fontFamily: body, fontSize: 10, color: t.mute }}>{unit}</span>
        ) : null}
      </div>
    </div>
  );
}

// ── Kanban-kolumn + kort ───────────────────────────────────────────────────

function Column({
  status,
  projects,
  onPick,
  onDropStatus,
}: {
  status: string;
  projects: OutdoorProject[];
  onPick: (p: OutdoorProject) => void;
  onDropStatus: (id: string, next: string) => Promise<void>;
}) {
  const { t } = useWarmTheme();
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      style={{
        background: t.paper,
        border: `1px solid ${isOver ? ACC : t.line}`,
        borderRadius: 14,
        padding: 10,
        minWidth: 220,
        width: 220,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        transition: "border-color 160ms ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 2px" }}>
        <span
          style={{
            width: 9,
            height: 9,
            borderRadius: 999,
            background: PROJECT_STATUS_COLOR[status] ?? ACC,
          }}
        />
        <span style={lab(t)}>{status}</span>
        <span style={{ fontFamily: body, fontSize: 10, color: t.dim }}>· {projects.length}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, minHeight: 32 }}>
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} onPick={onPick} onDropStatus={onDropStatus} />
        ))}
      </div>
    </div>
  );
}

function ProjectCard({
  project,
  onPick,
  onDropStatus,
}: {
  project: OutdoorProject;
  onPick: (p: OutdoorProject) => void;
  onDropStatus: (id: string, next: string) => Promise<void>;
}) {
  const { t } = useWarmTheme();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: project.id,
  });
  const prio = PROJECT_PRIORITY_COLOR[project.prioritet] ?? t.dim;

  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
    background: t.paperHi,
    borderRadius: 10,
    padding: 10,
    border: `1px solid ${t.line}`,
    cursor: "grab",
    touchAction: "none",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }} {...attributes} {...listeners}>
        <span
          style={{
            width: 4,
            minWidth: 4,
            alignSelf: "stretch",
            borderRadius: 2,
            background: prio,
          }}
          title={`Prioritet: ${project.prioritet || "—"}`}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              ...num(t, 13, 500),
              lineHeight: 1.25,
              color: t.ink,
            }}
          >
            {project.namn || "Namnlöst projekt"}
          </div>
          <div
            style={{
              fontFamily: body,
              fontSize: 10,
              color: t.mute,
              marginTop: 4,
              display: "flex",
              flexWrap: "wrap",
              gap: 4,
            }}
          >
            {project.omrade && <span>{project.omrade}</span>}
            {project.tidsram && <span>· {project.tidsram}</span>}
            {project.budget != null && project.budget > 0 && (
              <span>· {formatSek(project.budget)} kr</span>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <select
          value={project.status}
          onChange={(e) => onDropStatus(project.id, e.target.value)}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Byt status"
          style={{
            ...inputStyle(t),
            padding: "3px 6px",
            fontSize: 10,
            width: "auto",
            flex: 1,
          }}
        >
          {STATUS_COLUMNS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onPick(project)}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Redigera"
          style={{
            width: 26,
            height: 26,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 13,
            background: t.paper,
            border: `1px solid ${t.line}`,
            cursor: "pointer",
          }}
        >
          <EditIcon size={12} color={t.mute} />
        </button>
      </div>
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────

function ProjectModal({
  draft,
  onClose,
  onSave,
  onDelete,
}: {
  draft: Draft;
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
    if (typeof window !== "undefined" && !window.confirm("Arkivera detta projekt?")) return;
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
      style={inputStyle(t)}
      placeholder="kr"
    />
  );

  return (
    <WarmModal
      title={isEdit ? "Redigera projekt" : "Nytt projekt"}
      onClose={onClose}
      footer={
        <ModalFooter
          onCancel={onClose}
          onSave={save}
          saveLabel={isEdit ? "Spara" : "Skapa"}
          saving={saving}
          canSave={!!form.namn}
          destructiveLabel={isEdit ? "Arkivera" : undefined}
          onDestructive={isEdit ? del : undefined}
        />
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Namn">
          <input
            type="text"
            value={form.namn ?? ""}
            onChange={(e) => upd({ namn: e.target.value })}
            placeholder="t.ex. Mur under buskar baksida"
            style={inputStyle(t)}
          />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
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

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
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

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
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
            style={{ ...inputStyle(t), resize: "vertical", fontFamily: body }}
          />
        </Field>
      </div>

      <ModalErrorRow message={err} />
    </WarmModal>
  );
}

// ── Sidkomponent ────────────────────────────────────────────────────────────

export default function GardenProjectsPage() {
  const { t } = useWarmTheme();
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

  const filtered = useMemo(
    () =>
      projects.filter((p) => {
        if (tidsramFilter !== "Alla" && (p.tidsram || "Oklart") !== tidsramFilter) return false;
        if (omradeFilter !== "Alla" && p.omrade !== omradeFilter) return false;
        if (prioritetFilter !== "Alla" && p.prioritet !== prioritetFilter) return false;
        return true;
      }),
    [projects, tidsramFilter, omradeFilter, prioritetFilter],
  );

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
      out[col]!.push(p);
    }
    for (const s of STATUS_COLUMNS) {
      out[s]!.sort((a, b) => {
        const order = ["Hög", "Normal", "Låg"];
        const pa = order.indexOf(a.prioritet);
        const pb = order.indexOf(b.prioritet);
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
    if (swr.data) {
      const nextProjects = swr.data.projects.map((p) =>
        p.id === id ? { ...p, status: next } : p,
      );
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

  const refresh = async () => {
    await swr.mutate();
  };

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
    <div style={{ paddingBottom: 24 }}>
      <DetailHero
        backHref="/v3/garden"
        backLabel="Trädgård"
        eyebrow="PROJEKT"
        title={`${filtered.length} av ${projects.length},`}
        italicTail="planer i pipen."
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "0 18px" }}>
        {/* Budget-summering */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 8,
          }}
        >
          <StatBox label="Aktiva" value={summary.active} unit="projekt" />
          <StatBox label="Budget" value={formatSek(summary.totalBudget)} unit="kr" />
          <StatBox label="Utfall" value={formatSek(summary.totalSpent)} unit="kr" />
          <StatBox
            label="Återstår"
            value={formatSek(summary.diff)}
            unit="kr"
            accent={summary.diff < 0 ? t.bad : undefined}
          />
        </div>

        {/* Verktygsrad */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={() => setEditing({ status: "Ny", prioritet: "Normal" })}
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
            Nytt projekt
          </button>
        </div>

        {/* Filter */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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

        {/* Kanban */}
        {notReady ? (
          <Tile t={t}>
            <p style={{ fontFamily: body, fontSize: 13, color: t.mute, lineHeight: 1.55 }}>
              Trädgårds-DB:erna är inte konfigurerade. Sätt <code>NOTION_GARDEN_PROJECTS_DB</code>{" "}
              m.fl. i miljön.
            </p>
          </Tile>
        ) : swr.isLoading ? (
          <Tile t={t}>
            <p style={ital(t, 13)}>Laddar projekt…</p>
          </Tile>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <div
              style={{
                display: "flex",
                gap: 10,
                overflowX: "auto",
                paddingBottom: 12,
                scrollSnapType: "x proximity",
              }}
              onTouchStart={(e) => e.stopPropagation()}
            >
              {STATUS_COLUMNS.map((status) => (
                <div key={status} style={{ scrollSnapAlign: "start", flexShrink: 0 }}>
                  <Column
                    status={status}
                    projects={grouped[status] ?? []}
                    onPick={(p) =>
                      setEditing({
                        id: p.id,
                        namn: p.namn,
                        status: p.status,
                        prioritet: p.prioritet,
                        omrade: p.omrade,
                        tidsram: p.tidsram,
                        budget: p.budget,
                        faktiskKostnad: p.faktiskKostnad,
                        kommentar: p.kommentar,
                      })
                    }
                    onDropStatus={updateStatus}
                  />
                </div>
              ))}
            </div>
          </DndContext>
        )}
      </div>

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

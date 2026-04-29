"use client";

// ─── Warm Home · Trädgård · Projekt ─────────────────────────────────────────
// Vertikalt grupperade projekt per status — utan kanban/DnD. Mobilvänlig.
// Status ändras via inline-dropdown på kortet eller i redigera-modal.

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useWarmTheme } from "@/lib/warm/theme";
import { ACC, body, ital, lab, num } from "@/lib/warm/tokens";
import { Tile } from "@/components/warm/primitives";
import { DetailHero } from "@/components/warm/fit/parts";
import { PlusIcon, EditIcon } from "@/components/warm/icons/garden";
import { ChevronLeft } from "@/components/warm/icons/extra";
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

const STATUS_ORDER = ["Pågående", "Väntar", "Planerad", "Utreds", "Ny", "Klart", "Skrotad"];
const STATUS_OPTIONS = ["Ny", "Utreds", "Planerad", "Pågående", "Väntar", "Klart", "Skrotad"];
const PRIORITY_OPTIONS = ["Hög", "Normal", "Låg"];
const AREA_OPTIONS = ["Uppfart", "Finplanering", "Grovplanering", "Trädgård", "Bygg", "Altan"];
const TIMEFRAME_OPTIONS = ["Oklart", "2026", "2027"];
const ACTIVE_STATUSES = new Set(["Planerad", "Pågående", "Utreds", "Väntar"]);
// These groups start collapsed by default
const DEFAULT_COLLAPSED = new Set(["Klart", "Skrotad"]);

type Draft = OutdoorProjectInput & { id?: string };

// ── Filter pills ─────────────────────────────────────────────────────────────

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
        {["Alla", ...options].map((opt) => {
          const active = value === opt || (opt === "Alla" && !options.includes(value));
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt === "Alla" ? "" : opt)}
              style={{
                fontFamily: body,
                fontSize: 11,
                fontWeight: 600,
                background: active ? ACC : t.paper,
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

// ── Budget-summering ─────────────────────────────────────────────────────────

function BudgetBar({ projects }: { projects: OutdoorProject[] }) {
  const { t } = useWarmTheme();
  const active = projects.filter((p) => ACTIVE_STATUSES.has(p.status));
  const budget = active.reduce((s, p) => s + (p.budget || 0), 0);
  const spent = active.reduce((s, p) => s + (p.faktiskKostnad || 0), 0);
  const remaining = budget - spent;
  const stats = [
    { label: "AKTIVA", value: active.length, unit: "projekt" },
    { label: "BUDGET", value: budget ? formatSek(budget) : "–" },
    { label: "UTFALL", value: spent ? formatSek(spent) : "–" },
    { label: "KVAR", value: remaining ? formatSek(remaining) : "–" },
  ];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))",
        gap: 8,
      }}
    >
      {stats.map((s) => (
        <Tile key={s.label} t={t} style={{ padding: "10px 12px" }}>
          <div style={{ ...lab(t), marginBottom: 4 }}>{s.label}</div>
          <div style={{ ...num(t, 18, 600), lineHeight: 1 }} className="warm-tab-nums">
            {s.value}
          </div>
          {s.unit && (
            <div style={{ ...lab(t), marginTop: 2, opacity: 0.7 }}>{s.unit}</div>
          )}
        </Tile>
      ))}
    </div>
  );
}

// ── Projekt-kort ─────────────────────────────────────────────────────────────

function ProjectCard({
  project,
  onEdit,
  onStatusChange,
}: {
  project: OutdoorProject;
  onEdit: (p: OutdoorProject) => void;
  onStatusChange: (id: string, next: string) => void;
}) {
  const { t } = useWarmTheme();
  const prio = PROJECT_PRIORITY_COLOR[project.prioritet] ?? t.dim;

  return (
    <Tile
      t={t}
      style={{
        padding: "14px 16px",
        borderLeft: `3px solid ${prio}`,
        gap: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 8,
        }}
      >
        <div
          style={{
            fontFamily: body,
            fontSize: 15,
            fontWeight: 500,
            color: t.ink,
            flex: 1,
            lineHeight: 1.3,
          }}
        >
          {project.namn || "Namnlöst projekt"}
        </div>
        <button
          type="button"
          onClick={() => onEdit(project)}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            background: "none",
            border: "none",
            padding: 4,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <EditIcon size={14} color={t.mute} />
        </button>
      </div>

      {/* Tags */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
        {project.omrade && (
          <span
            style={{
              fontFamily: body,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase" as const,
              background: `${ACC}18`,
              color: ACC,
              padding: "2px 8px",
              borderRadius: 99,
            }}
          >
            {project.omrade}
          </span>
        )}
        {project.tidsram && project.tidsram !== "Oklart" && (
          <span
            style={{
              fontFamily: body,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase" as const,
              background: t.paper,
              border: `1px solid ${t.line}`,
              color: t.mute,
              padding: "2px 8px",
              borderRadius: 99,
            }}
          >
            {project.tidsram}
          </span>
        )}
        {project.budget ? (
          <span style={{ fontFamily: body, fontSize: 11, color: t.dim }}>
            {formatSek(project.budget)}
          </span>
        ) : null}
      </div>

      {project.kommentar && (
        <p
          style={{
            fontFamily: body,
            fontSize: 12,
            color: t.mute,
            lineHeight: 1.4,
            margin: 0,
          }}
        >
          {project.kommentar}
        </p>
      )}

      {/* Inline status change */}
      <select
        value={project.status}
        onChange={(e) => onStatusChange(project.id, e.target.value)}
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          ...inputStyle(t),
          padding: "4px 8px",
          fontSize: 12,
          width: "auto",
          alignSelf: "flex-start",
        }}
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </Tile>
  );
}

// ── Status-grupp (kollapsbar) ─────────────────────────────────────────────────

function StatusGroup({
  status,
  projects,
  onEdit,
  onStatusChange,
}: {
  status: string;
  projects: OutdoorProject[];
  onEdit: (p: OutdoorProject) => void;
  onStatusChange: (id: string, next: string) => void;
}) {
  const { t } = useWarmTheme();
  const [open, setOpen] = useState(!DEFAULT_COLLAPSED.has(status));
  const dot = PROJECT_STATUS_COLOR[status] ?? t.dim;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "none",
          border: "none",
          padding: "8px 0",
          cursor: "pointer",
          textAlign: "left" as const,
        }}
      >
        <span
          style={{ width: 8, height: 8, borderRadius: 99, background: dot, flexShrink: 0 }}
        />
        <span style={{ ...lab(t), flex: 1 }}>{status}</span>
        <span style={{ fontFamily: body, fontSize: 11, color: t.dim }}>{projects.length}</span>
        <ChevronLeft
          size={14}
          color={t.dim}
          style={{
            transform: open ? "rotate(-90deg)" : "rotate(180deg)",
            transition: "transform 200ms ease",
          }}
        />
      </button>

      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 16 }}>
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onEdit={onEdit}
              onStatusChange={onStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Redigera / skapa modal ────────────────────────────────────────────────────

function ProjectModal({
  draft,
  onChange,
  onSave,
  onDelete,
  onClose,
  saving,
  error,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
  onSave: () => void;
  onDelete?: () => void;
  onClose: () => void;
  saving: boolean;
  error: string;
}) {
  const { t } = useWarmTheme();
  const set = (k: keyof Draft, v: unknown) => onChange({ ...draft, [k]: v });

  return (
    <WarmModal
      title={draft.id ? "Redigera projekt" : "Nytt projekt"}
      onClose={onClose}
      footer={
        <ModalFooter
          onCancel={onClose}
          onSave={onSave}
          saving={saving}
          destructiveLabel={draft.id ? "Arkivera" : undefined}
          onDestructive={draft.id ? onDelete : undefined}
        />
      }
    >
      <Field label="Projektnamn">
        <input
          style={inputStyle(t)}
          value={draft.namn ?? ""}
          onChange={(e) => set("namn", e.target.value)}
          placeholder="Beskriv projektet"
        />
      </Field>
      <Field label="Status">
        <SelectBox
          value={draft.status ?? "Ny"}
          onChange={(v) => set("status", v)}
          options={STATUS_OPTIONS}
        />
      </Field>
      <Field label="Prioritet">
        <SelectBox
          value={draft.prioritet ?? "Normal"}
          onChange={(v) => set("prioritet", v)}
          options={PRIORITY_OPTIONS}
        />
      </Field>
      <Field label="Område">
        <SelectBox
          value={draft.omrade ?? ""}
          onChange={(v) => set("omrade", v)}
          options={AREA_OPTIONS}
        />
      </Field>
      <Field label="Tidsram">
        <SelectBox
          value={draft.tidsram ?? "Oklart"}
          onChange={(v) => set("tidsram", v)}
          options={TIMEFRAME_OPTIONS}
        />
      </Field>
      <Field label="Budget (SEK)">
        <input
          type="number"
          style={inputStyle(t)}
          value={draft.budget ?? ""}
          onChange={(e) =>
            set("budget", e.target.value ? Number(e.target.value) : null)
          }
          placeholder="0"
        />
      </Field>
      <Field label="Faktisk kostnad (SEK)">
        <input
          type="number"
          style={inputStyle(t)}
          value={draft.faktiskKostnad ?? ""}
          onChange={(e) =>
            set("faktiskKostnad", e.target.value ? Number(e.target.value) : null)
          }
          placeholder="0"
        />
      </Field>
      <Field label="Kommentar">
        <textarea
          style={{ ...inputStyle(t), height: 72, resize: "vertical" }}
          value={draft.kommentar ?? ""}
          onChange={(e) => set("kommentar", e.target.value)}
        />
      </Field>
      <ModalErrorRow message={error || null} />
    </WarmModal>
  );
}

// ── Huvud-komponent ───────────────────────────────────────────────────────────

const EMPTY_DRAFT: Draft = {
  namn: "",
  status: "Ny",
  prioritet: "Normal",
  omrade: "",
  tidsram: "Oklart",
  budget: null,
  faktiskKostnad: null,
  kommentar: "",
};

export default function ProjektPage() {
  const { t } = useWarmTheme();
  const { data, mutate } = useSWR<ProjectsResponse>("/api/garden/projects", fetcher);
  const projects = data?.projects ?? [];

  // Filter state
  const [filterArea, setFilterArea] = useState("");
  const [filterTime, setFilterTime] = useState("");
  const [filterPrio, setFilterPrio] = useState("");

  // Modal state
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Filter projects
  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (filterArea && p.omrade !== filterArea) return false;
      if (filterTime && p.tidsram !== filterTime) return false;
      if (filterPrio && p.prioritet !== filterPrio) return false;
      return true;
    });
  }, [projects, filterArea, filterTime, filterPrio]);

  // Group by status (only statuses that have projects)
  const grouped = useMemo(() => {
    const map = new Map<string, OutdoorProject[]>();
    for (const s of STATUS_ORDER) map.set(s, []);
    for (const p of filtered) {
      const list = map.get(p.status);
      if (list) list.push(p);
      else {
        // Unknown status → put in Ny
        const ny = map.get("Ny")!;
        ny.push(p);
      }
    }
    return STATUS_ORDER.filter((s) => (map.get(s)?.length ?? 0) > 0).map(
      (s) => ({ status: s, projects: map.get(s)! })
    );
  }, [filtered]);

  const openCreate = () => {
    setDraft({ ...EMPTY_DRAFT });
    setError("");
  };

  const openEdit = (p: OutdoorProject) => {
    setDraft({
      id: p.id,
      namn: p.namn,
      status: p.status,
      prioritet: p.prioritet,
      omrade: p.omrade,
      tidsram: p.tidsram,
      budget: p.budget,
      faktiskKostnad: p.faktiskKostnad,
      kommentar: p.kommentar,
    });
    setError("");
  };

  const handleStatusChange = async (id: string, next: string) => {
    // Optimistic update
    mutate(
      (d) =>
        d
          ? { ...d, projects: d.projects.map((p) => (p.id === id ? { ...p, status: next } : p)) }
          : d,
      { revalidate: false }
    );
    try {
      await fetch(`/api/garden/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      mutate();
    } catch {
      mutate();
    }
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    setError("");
    try {
      if (draft.id) {
        const res = await fetch(`/api/garden/projects/${draft.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        });
        if (!res.ok) throw new Error(await res.text());
      } else {
        const res = await fetch("/api/garden/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        });
        if (!res.ok) throw new Error(await res.text());
      }
      await mutate();
      setDraft(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunde inte spara.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!draft?.id) return;
    setSaving(true);
    try {
      await fetch(`/api/garden/projects/${draft.id}`, { method: "DELETE" });
      await mutate();
      setDraft(null);
    } catch {
      setError("Kunde inte arkivera.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ paddingBottom: 140 }}>
      <DetailHero
        eyebrow="PROJEKT"
        title="Utomhusprojekt"
        italicTail="budget och framåt."
        backHref="/v3/garden"
        backLabel="Trädgård"
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "0 18px" }}>
        {/* Budget-summering */}
        <BudgetBar projects={projects} />

        {/* Filter */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <FilterPills
            label="TIDSRAM"
            options={TIMEFRAME_OPTIONS}
            value={filterTime}
            onChange={setFilterTime}
          />
          <FilterPills
            label="OMRÅDE"
            options={AREA_OPTIONS}
            value={filterArea}
            onChange={setFilterArea}
          />
          <FilterPills
            label="PRIORITET"
            options={PRIORITY_OPTIONS}
            value={filterPrio}
            onChange={setFilterPrio}
          />
        </div>

        {/* Projekt per status */}
        <div>
          {grouped.map(({ status, projects: ps }) => (
            <StatusGroup
              key={status}
              status={status}
              projects={ps}
              onEdit={openEdit}
              onStatusChange={handleStatusChange}
            />
          ))}
          {grouped.length === 0 && (
            <p
              style={{
                ...ital(t, 13),
                textAlign: "center" as const,
                padding: "40px 0",
              }}
            >
              Inga projekt matchar filtret.
            </p>
          )}
        </div>

        {/* Nytt projekt-knapp */}
        <button
          type="button"
          onClick={openCreate}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            background: ACC,
            color: "#FFFBF0",
            border: "none",
            borderRadius: 12,
            padding: "12px 20px",
            fontFamily: body,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            width: "100%",
          }}
        >
          <PlusIcon size={16} color="#FFFBF0" />
          Nytt projekt
        </button>
      </div>

      {/* Modal via portal */}
      {mounted &&
        draft &&
        createPortal(
          <ProjectModal
            draft={draft}
            onChange={setDraft}
            onSave={handleSave}
            onDelete={draft.id ? handleDelete : undefined}
            onClose={() => setDraft(null)}
            saving={saving}
            error={error}
          />,
          document.body
        )}
    </div>
  );
}

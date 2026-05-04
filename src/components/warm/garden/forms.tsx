"use client";

// Warm Home · Trädgård — delade form-primitiver för CRUD-modaler.
// Återanvänds av sasong-modal och projekt-modal.

import { useState, type CSSProperties, type ReactNode } from "react";
import { useWarmTheme } from "@/lib/warm/theme";
import { haptic } from "@/lib/warm/haptics";
import { ACC, body, lab } from "@/lib/warm/tokens";
import type { WarmTheme } from "@/lib/warm/tokens";

export function inputStyle(t: WarmTheme): CSSProperties {
  return {
    width: "100%",
    fontFamily: body,
    // 16px = minst för iOS Safari (mindre triggar autozoom vid focus).
    fontSize: 16,
    lineHeight: 1.5,
    // backgroundColor (inte shorthand `background`) så att globals.warm.css
    // chevron-bilden på <select> inte resetas till none av inline-style.
    backgroundColor: t.paper,
    border: `1px solid ${t.line}`,
    borderRadius: 8,
    // 14px vertikal padding + minHeight 50 = säker plats för iOS native
    // date/select-pickers som ignorerar CSS line-height. Tidigare 11px
    // klippte descenders i datumfältet på iPhone.
    padding: "14px 12px",
    minHeight: 50,
    color: t.ink,
    outline: "none",
    boxSizing: "border-box",
  };
}

export function Field({
  label,
  children,
  hint,
  style,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  style?: CSSProperties;
}) {
  const { t } = useWarmTheme();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, ...style }}>
      <span style={lab(t)}>{label}</span>
      {children}
      {hint ? (
        <span style={{ fontFamily: body, fontSize: 11, color: t.dim }}>{hint}</span>
      ) : null}
    </div>
  );
}

export function SelectBox({
  value,
  options,
  onChange,
  placeholder,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const { t } = useWarmTheme();
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      // appearance hanteras av globals.warm.css (none + custom chevron) så
      // line-height och padding på <select> respekteras på iOS Safari.
      style={inputStyle(t)}
    >
      {placeholder ? (
        <option value="" disabled>
          {placeholder}
        </option>
      ) : null}
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

export function MultiSelectChips({
  options,
  values,
  onChange,
}: {
  options: string[];
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const { t } = useWarmTheme();
  const toggle = (v: string) => {
    onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
  };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map((opt) => {
        const active = values.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => {
              void haptic("tap");
              toggle(opt);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "5px 11px",
              borderRadius: 999,
              fontFamily: body,
              fontSize: 12,
              fontWeight: 500,
              background: active ? ACC : t.tint,
              color: active ? "#FFFBF0" : t.ink,
              border: `1px solid ${active ? ACC : t.line}`,
              cursor: "pointer",
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

/** Sökbar checkbox-lista för växtval i task-modalen. */
export function PlantPicker({
  plants,
  selectedIds,
  onToggle,
}: {
  plants: { id: string; vaxt: string; typ?: string }[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  const { t } = useWarmTheme();
  const [query, setQuery] = useState("");
  const sorted = [...plants].sort((a, b) => a.vaxt.localeCompare(b.vaxt, "sv"));
  const filtered = query.trim()
    ? sorted.filter((p) => p.vaxt.toLowerCase().includes(query.trim().toLowerCase()))
    : sorted;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Sök växt…"
        style={inputStyle(t)}
      />
      <div
        style={{
          maxHeight: 180,
          overflowY: "auto",
          borderRadius: 8,
          border: `1px solid ${t.line}`,
          background: t.paper,
        }}
      >
        {filtered.length === 0 ? (
          <div style={{ padding: 10, fontSize: 12, color: t.mute }}>Inga träffar.</div>
        ) : (
          filtered.map((p) => {
            const checked = selectedIds.includes(p.id);
            return (
              <label
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 10px",
                  cursor: "pointer",
                  fontSize: 13,
                  color: t.ink,
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(p.id)}
                  style={{ accentColor: ACC }}
                />
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.vaxt}
                </span>
                {p.typ ? (
                  <span style={{ fontSize: 10, color: t.mute }}>{p.typ}</span>
                ) : null}
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}

/** Footer-rad för WarmModal: Avbryt | Arkivera (destruktiv, valfri) | Spara (primär). */
export function ModalFooter({
  onCancel,
  onSave,
  saveLabel = "Spara",
  saving = false,
  canSave = true,
  destructiveLabel,
  onDestructive,
}: {
  onCancel: () => void;
  onSave: () => void;
  saveLabel?: string;
  saving?: boolean;
  canSave?: boolean;
  destructiveLabel?: string;
  onDestructive?: () => void;
}) {
  const { t } = useWarmTheme();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
      {destructiveLabel && onDestructive ? (
        <button
          type="button"
          onClick={() => {
            void haptic("warning");
            onDestructive?.();
          }}
          disabled={saving}
          style={{
            fontFamily: body,
            fontSize: 12,
            fontWeight: 600,
            color: t.bad,
            background: "transparent",
            border: "none",
            padding: "8px 4px",
            cursor: saving ? "wait" : "pointer",
          }}
        >
          {destructiveLabel}
        </button>
      ) : null}
      <div style={{ flex: 1 }} />
      <button
        type="button"
        onClick={() => {
          void haptic("tap");
          onCancel();
        }}
        disabled={saving}
        style={{
          fontFamily: body,
          fontSize: 12,
          fontWeight: 600,
          color: t.mute,
          background: "transparent",
          border: "none",
          padding: "8px 12px",
          cursor: saving ? "wait" : "pointer",
        }}
      >
        Avbryt
      </button>
      <button
        type="button"
        onClick={() => {
          void haptic("success");
          onSave();
        }}
        disabled={saving || !canSave}
        style={{
          fontFamily: body,
          fontSize: 13,
          fontWeight: 600,
          color: "#FFFBF0",
          background: ACC,
          border: "none",
          borderRadius: 999,
          padding: "8px 16px",
          cursor: saving ? "wait" : canSave ? "pointer" : "not-allowed",
          opacity: !canSave ? 0.55 : 1,
        }}
      >
        {saving ? "Sparar…" : saveLabel}
      </button>
    </div>
  );
}

export function ModalErrorRow({ message }: { message: string | null }) {
  const { t } = useWarmTheme();
  if (!message) return null;
  return (
    <div
      style={{
        marginTop: 12,
        padding: "8px 12px",
        background: "rgba(176,69,46,0.08)",
        border: `1px solid ${t.bad}`,
        borderRadius: 8,
        fontFamily: body,
        fontSize: 12,
        color: t.bad,
      }}
    >
      {message}
    </div>
  );
}

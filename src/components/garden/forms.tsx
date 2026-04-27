"use client";

// ─── Garden — delade formulär-primitiver för säsongsplan + projekt ───────────
// Avsiktligt liten yta: Field/Input/Select/MultiSelect + ModalShell (portal +
// framer-motion-wrapper). Båda CRUD-modalerna i sasongsplan/projekt importerar
// härifrån så vi inte duplicerar styles eller portal-wiring.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";

export function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    boxSizing: "border-box",
    backgroundColor: "var(--color-surface-container)",
    color: "var(--color-on-surface)",
    border: "1px solid var(--color-outline-variant)",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 14,
    outline: "none",
  };
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block" style={{ minWidth: 0 }}>
      <div
        className="text-[10px] font-semibold uppercase tracking-wider mb-1"
        style={{ color: "var(--color-on-surface-variant)" }}
      >
        {label}
      </div>
      {children}
    </label>
  );
}

export function SelectBox({
  value, options, onChange, placeholder,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputStyle(), appearance: "none", paddingRight: 32 }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <span
        className="material-symbols-outlined"
        style={{
          position: "absolute",
          right: 8,
          top: "50%",
          transform: "translateY(-50%)",
          fontSize: 18,
          color: "var(--color-on-surface-variant)",
          pointerEvents: "none",
        }}
      >
        expand_more
      </span>
    </div>
  );
}

/** Klickbara chips som togglar in/ut värden i en multi_select-array. */
export function MultiSelectChips({
  options, values, onChange,
}: {
  options: string[];
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (opt: string) => {
    const has = values.includes(opt);
    onChange(has ? values.filter((v) => v !== opt) : [...values, opt]);
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = values.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
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
  );
}

/**
 * Portal-renderad modal med fade+slide-up. Måste portala till body —
 * dashboard-layoutens motion.div skapar en stacking context som annars
 * gömmer modalen under MobileNav (z-50).
 */
export function ModalShell({
  onClose, children, maxWidth = 560,
}: {
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(4px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: "0 8px 8px 8px",
      }}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        className="rounded-2xl w-full"
        style={{
          backgroundColor: "var(--color-surface-container-lowest)",
          border: "1px solid var(--color-card-border)",
          maxWidth,
          maxHeight: "90vh",
          overflowY: "auto",
          padding: 20,
          marginBottom: "max(16px, env(safe-area-inset-bottom))",
        }}
      >
        {children}
      </motion.div>
    </motion.div>,
    document.body,
  );
}

export function ModalHeader({
  title, onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-bold" style={{ color: "var(--color-on-surface)" }}>
        {title}
      </h3>
      <button
        onClick={onClose}
        aria-label="Stäng"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--color-on-surface-variant)",
          padding: 4,
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
      </button>
    </div>
  );
}

export function ModalFooter({
  onCancel, onSave, saveLabel = "Spara", saving, canSave = true,
  destructiveLabel, onDestructive,
}: {
  onCancel: () => void;
  onSave: () => void;
  saveLabel?: string;
  saving: boolean;
  canSave?: boolean;
  destructiveLabel?: string;
  onDestructive?: () => void;
}) {
  return (
    <div
      className="flex items-center gap-2"
      style={{
        marginTop: 20,
        paddingTop: 16,
        borderTop: "1px solid var(--color-outline-variant)",
      }}
    >
      {destructiveLabel && onDestructive && (
        <button
          onClick={onDestructive}
          disabled={saving}
          className="text-xs font-semibold rounded-full"
          style={{
            backgroundColor: "transparent",
            color: "var(--color-error, #b3261e)",
            border: "1px solid var(--color-outline-variant)",
            padding: "8px 14px",
            cursor: saving ? "wait" : "pointer",
          }}
        >
          {destructiveLabel}
        </button>
      )}
      <div className="flex-1" />
      <button
        onClick={onCancel}
        disabled={saving}
        className="text-xs font-semibold rounded-full"
        style={{
          backgroundColor: "transparent",
          color: "var(--color-on-surface-variant)",
          border: "1px solid var(--color-outline-variant)",
          padding: "8px 14px",
          cursor: saving ? "wait" : "pointer",
        }}
      >
        Avbryt
      </button>
      <button
        onClick={onSave}
        disabled={saving || !canSave}
        className="text-xs font-semibold rounded-full flex items-center gap-1.5"
        style={{
          backgroundColor: "var(--color-primary)",
          color: "var(--color-on-primary)",
          border: "none",
          padding: "8px 16px",
          cursor: saving ? "wait" : "pointer",
          opacity: saving || !canSave ? 0.7 : 1,
        }}
      >
        {saving && (
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 12, animation: "spin-anim 0.8s linear infinite" }}
          >
            progress_activity
          </span>
        )}
        {saveLabel}
      </button>
    </div>
  );
}

export function ModalErrorRow({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      className="text-xs mt-3 flex items-center gap-1.5"
      style={{ color: "var(--color-error, #b3261e)" }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>error</span>
      {message}
    </div>
  );
}

"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { useWarmTheme } from "@/lib/warm/theme";
import { body, num } from "@/lib/warm/tokens";
import { CloseIcon } from "@/components/warm/icons/fit";

/**
 * Bottom-sheet-style modal i Warm-stil. Renderas via React-portal mot
 * document.body så den kommer ovanför TabBar och layoutens motion.div
 * stacking context.
 */
export function WarmModal({
  title,
  onClose,
  children,
  footer,
  icon,
  maxWidth = 520,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  icon?: ReactNode;
  maxWidth?: number;
}) {
  const { t } = useWarmTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
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
        backgroundColor: "rgba(20, 14, 8, 0.55)",
        backdropFilter: "blur(6px)",
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
        style={{
          background: t.paperHi,
          border: `1px solid ${t.line}`,
          borderRadius: 16,
          width: "100%",
          maxWidth,
          maxHeight: "92vh",
          overflowY: "auto",
          padding: 18,
          marginBottom: "max(16px, env(safe-area-inset-bottom))",
          boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
          color: t.ink,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {icon}
            <h3 style={{ ...num(t, 18, 500), letterSpacing: "-0.01em" }}>{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Stäng"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: t.mute,
              padding: 4,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CloseIcon size={20} color={t.mute} />
          </button>
        </div>
        <div style={{ fontFamily: body, fontSize: 13, color: t.ink }}>{children}</div>
        {footer ? (
          <div
            style={{
              marginTop: 18,
              paddingTop: 14,
              borderTop: `1px solid ${t.line}`,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {footer}
          </div>
        ) : null}
      </motion.div>
    </motion.div>,
    document.body,
  );
}

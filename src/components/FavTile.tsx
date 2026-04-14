"use client";

import { useState } from "react";

export function Pressable({ children, onClick, disabled = false, loading = false, className = "", style = {} }: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      className={`select-none ${className}`}
      style={{
        transform: pressed && !disabled && !loading ? "scale(0.93)" : "scale(1)",
        transition: "transform 0.08s ease, opacity 0.08s ease",
        opacity: loading ? 1 : disabled ? 0.6 : pressed ? 0.85 : 1,
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        cursor: loading ? "default" : "pointer",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function FavTile({ label, icon, color, active, loading, onClick }: {
  label: string; icon: string; color: string;
  active: boolean; loading: boolean; onClick: () => void;
}) {
  return (
    <Pressable
      onClick={onClick}
      loading={loading}
      className="flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-2xl text-center w-full"
      style={{
        backgroundColor: "var(--color-surface-container)",
        border: `2px solid ${active && !loading ? color : "transparent"}`,
        boxShadow: active && !loading ? `inset 0 0 0 99px ${color}14` : "none",
        minHeight: 84,
        width: "100%",
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}
    >
      {loading ? (
        <svg className="spin-anim" viewBox="0 0 24 24" fill="none"
          style={{ color, width: 26, height: 26, flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25"/>
          <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      ) : (
        <span className="material-symbols-outlined text-[26px]"
          style={{ color, fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>{icon}</span>
      )}
      <span className="text-[11px] font-semibold leading-tight w-full truncate px-1"
        style={{ color: active && !loading ? color : "var(--color-on-surface)" }}>{label}</span>
    </Pressable>
  );
}

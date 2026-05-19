"use client";

import type { CSSProperties, ReactNode } from "react";
import { haptic } from "@/lib/warm/haptics";
import {
  ACC,
  RADII,
  body,
  ital,
  lab,
  num,
  serif,
  type WarmTheme,
} from "@/lib/warm/tokens";

/* ---------- Tile ---------- */

export function Tile({
  t,
  children,
  style,
  hi = false,
  onClick,
  as = "div",
}: {
  t: WarmTheme;
  children: ReactNode;
  style?: CSSProperties;
  hi?: boolean;
  onClick?: () => void;
  as?: "div" | "button";
}) {
  const baseStyle: CSSProperties = {
    background: hi ? t.paperHi : t.paper,
    border: `1px solid ${t.line}`,
    borderRadius: RADII.tile,
    padding: 14,
    color: t.ink,
    ...style,
  };
  if (as === "button" || onClick) {
    return (
      <button
        type="button"
        onClick={() => {
          void haptic("tap");
          onClick?.();
        }}
        style={{ ...baseStyle, textAlign: "left", width: "100%", cursor: onClick ? "pointer" : "default" }}
      >
        {children}
      </button>
    );
  }
  return <div style={baseStyle}>{children}</div>;
}

/* ---------- Pill ---------- */

export function Pill({
  t,
  children,
  active = false,
  tone = "neutral",
  onClick,
  style,
}: {
  t: WarmTheme;
  children: ReactNode;
  active?: boolean;
  tone?: "neutral" | "acc" | "sage" | "amber" | "sky";
  onClick?: () => void;
  style?: CSSProperties;
}) {
  const toneBg: Record<string, string> = {
    neutral: t.tint,
    acc: t.tint,
    sage: t.tintSage,
    amber: t.tintAmber,
    sky: t.tintSky,
  };
  const toneFg: Record<string, string> = {
    neutral: t.ink,
    acc: ACC,
    sage: t.ok,
    amber: t.warn,
    sky: "#5C7891",
  };
  const bg = active ? ACC : toneBg[tone];
  const fg = active ? "#FFFBF0" : toneFg[tone];
  return (
    <button
      type="button"
      onClick={() => {
        void haptic("tap");
        onClick?.();
      }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: "7px 12px",
        borderRadius: 999,
        background: bg,
        color: fg,
        border: `1px solid ${active ? ACC : t.line}`,
        fontFamily: body,
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: "0.01em",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

/* ---------- Stat (label + värde + enhet, opt. tagline) ---------- */

export function Stat({
  t,
  label,
  value,
  unit,
  tagline,
  size = 28,
}: {
  t: WarmTheme;
  label: string;
  value: ReactNode;
  unit?: string;
  tagline?: string;
  size?: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={lab(t)}>{label}</span>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ ...num(t, size), lineHeight: 1 }} className="warm-tab-nums">
          {value}
        </span>
        {unit ? (
          <span
            style={{
              fontFamily: body,
              fontSize: 11,
              color: t.mute,
              fontWeight: 500,
            }}
          >
            {unit}
          </span>
        ) : null}
      </div>
      {tagline ? <span style={ital(t, 12)}>{tagline}</span> : null}
    </div>
  );
}

/* ---------- Bar (procent-stapel) ---------- */

export function Bar({
  t,
  value,
  color,
  height = 6,
}: {
  t: WarmTheme;
  value: number; // 0–100
  color?: string;
  height?: number;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      style={{
        position: "relative",
        height,
        background: t.line,
        borderRadius: 999,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          width: `${pct}%`,
          background: color || ACC,
          borderRadius: 999,
        }}
      />
    </div>
  );
}

/* ---------- HubHeader ---------- */

export function HubHeader({
  t,
  title,
  subtitle,
  right,
}: {
  t: WarmTheme;
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 16,
        padding: "20px 18px 12px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <h1 style={{ ...num(t, 30, 400), lineHeight: 1.05 }}>{title}</h1>
        {subtitle ? <span style={ital(t, 13)}>{subtitle}</span> : null}
      </div>
      {right ? <div style={{ display: "flex", gap: 8 }}>{right}</div> : null}
    </header>
  );
}

/* ---------- DetailHeader (back-chevron + titel) ---------- */

export function DetailHeader({
  t,
  back,
  backLabel,
  title,
  right,
}: {
  t: WarmTheme;
  back: () => void;
  backLabel: string;
  title: string;
  right?: ReactNode;
}) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "16px 18px 10px",
      }}
    >
      <button
        type="button"
        onClick={() => {
          void haptic("tap");
          back();
        }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontFamily: body,
          fontSize: 13,
          color: t.mute,
          cursor: "pointer",
        }}
      >
        <span style={{ fontSize: 18, lineHeight: 1, color: t.mute }}>‹</span>
        <span>{backLabel}</span>
      </button>
      <h1
        style={{
          ...num(t, 17, 500),
          letterSpacing: "-0.01em",
          flex: 1,
          textAlign: "center",
        }}
      >
        {title}
      </h1>
      <div style={{ minWidth: 40, display: "flex", justifyContent: "flex-end" }}>{right}</div>
    </header>
  );
}

/* ---------- TabBar (floating bottom-pill, 4–5 tabs) ---------- */

export type TabKey = "hem" | "lab" | "fit" | "gard" | "mat";

export function TabBar({
  t,
  active,
  onChange,
  iconFor,
  labelFor,
  tabs,
  activeColor = ACC,
}: {
  t: WarmTheme;
  active: TabKey;
  onChange: (key: TabKey) => void;
  iconFor: (key: TabKey, active: boolean) => ReactNode;
  labelFor: (key: TabKey) => string;
  tabs?: TabKey[];
  /** Bakgrund för aktiv tab-pill. Default ACC (terracotta). Sektioner med
   *  egen accent (t.ex. Mat → AMBER) kan flippa hela pill-färgen genom att
   *  beräkna den i föräldern utifrån `active`. */
  activeColor?: string;
}) {
  const keys: TabKey[] = tabs ?? ["hem", "lab", "fit", "gard"];
  return (
    <nav
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 22,
        display: "flex",
        justifyContent: "center",
        zIndex: 50,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          gap: 4,
          padding: 8,
          background: t.paperHi,
          border: `1px solid ${t.line}`,
          borderRadius: 30,
          boxShadow: "0 12px 32px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)",
          backdropFilter: "blur(12px)",
          pointerEvents: "auto",
        }}
      >
        {keys.map((k) => {
          const isActive = active === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => {
                void haptic("tap");
                onChange(k);
              }}
              aria-label={labelFor(k)}
              style={{
                display: "inline-flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                minWidth: 70,
                padding: "10px 6px",
                borderRadius: 18,
                background: isActive ? activeColor : "transparent",
                color: isActive ? "#FFFBF0" : t.mute,
                cursor: "pointer",
                transition: "background 160ms ease, color 160ms ease",
              }}
            >
              {iconFor(k, isActive)}
              <span
                style={{
                  fontFamily: body,
                  fontSize: 11,
                  fontWeight: isActive ? 600 : 500,
                  letterSpacing: "0.01em",
                }}
              >
                {labelFor(k)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* ---------- Sidebar (desktop ≥1024px, ersätter TabBar) ---------- */

export function Sidebar({
  t,
  active,
  onChange,
  iconFor,
  labelFor,
  footer,
  tabs,
  activeColor = ACC,
}: {
  t: WarmTheme;
  active: TabKey;
  onChange: (key: TabKey) => void;
  iconFor: (key: TabKey, active: boolean) => ReactNode;
  labelFor: (key: TabKey) => string;
  footer?: ReactNode;
  tabs?: TabKey[];
  /** Se TabBar — samma princip för desktop-sidebar. */
  activeColor?: string;
}) {
  const keys: TabKey[] = tabs ?? ["hem", "lab", "fit", "gard"];
  return (
    <aside
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        bottom: 0,
        width: 96,
        display: "flex",
        flexDirection: "column",
        background: t.paperHi,
        borderRight: `1px solid ${t.line}`,
        padding: "20px 12px 18px",
        zIndex: 50,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          gap: 4,
          flex: 1,
          marginTop: 12,
        }}
      >
        {keys.map((k) => {
          const isActive = active === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => {
                void haptic("tap");
                onChange(k);
              }}
              aria-label={labelFor(k)}
              aria-current={isActive ? "page" : undefined}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                padding: "12px 4px",
                borderRadius: 16,
                background: isActive ? activeColor : "transparent",
                color: isActive ? "#FFFBF0" : t.mute,
                cursor: "pointer",
                transition: "background 160ms ease, color 160ms ease",
              }}
            >
              {iconFor(k, isActive)}
              <span
                style={{
                  fontFamily: body,
                  fontSize: 11,
                  fontWeight: isActive ? 600 : 500,
                  letterSpacing: "0.01em",
                }}
              >
                {labelFor(k)}
              </span>
            </button>
          );
        })}
      </div>
      {footer ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: 12,
            borderTop: `1px solid ${t.line}`,
          }}
        >
          {footer}
        </div>
      ) : null}
    </aside>
  );
}

export const SIDEBAR_WIDTH = 96;
export const HUB_PANE_WIDTH = 430;

/* ---------- Spark (mini-line för trender, valfri data 0-1) ---------- */

export function Spark({
  data,
  color,
  width = 80,
  height = 22,
  strokeWidth = 1.6,
  fluid = false,
}: {
  data: number[]; // normaliserade 0–1
  color: string;
  width?: number;
  height?: number;
  strokeWidth?: number;
  fluid?: boolean; // true = SVG sträcker sig till container-bredd
}) {
  if (data.length < 2) return null;
  const stepX = width / (data.length - 1);
  const points = data
    .map((v, i) => `${(i * stepX).toFixed(2)},${(height - v * height).toFixed(2)}`)
    .join(" ");
  const svgProps = fluid
    ? { width: "100%" as const, height, preserveAspectRatio: "none" as const }
    : { width, height };
  return (
    <svg
      {...svgProps}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ---------- Ring (cirkulär progress, 0–100) ---------- */

export function Ring({
  value,
  size = 72,
  stroke = 5,
  trackColor,
  color,
  children,
}: {
  value: number; // 0–100
  size?: number;
  stroke?: number;
  trackColor: string;
  color: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const dash = (pct / 100) * c;
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash.toFixed(2)} ${(c - dash).toFixed(2)}`}
        />
      </svg>
      {children ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: serif,
            fontSize: size * 0.32,
            letterSpacing: "-0.02em",
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

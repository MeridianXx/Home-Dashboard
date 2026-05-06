"use client";

// Warm Home · Fitness — delade primitiver för Hub, Coach, Historik, Pass.

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { useWarmTheme } from "@/lib/warm/theme";
import { ACC, body, ital, lab, num } from "@/lib/warm/tokens";
import { ChevronLeft, ChevronRight } from "@/components/warm/icons/extra";
import { ThemeIcon } from "@/components/warm/icons";
import { haptic } from "@/lib/warm/haptics";
import { useRegisterCompactTitle } from "@/lib/warm/topbar";

/**
 * `HubThemeToggle` — den ENDA standardiserade toggle-knappen för hub-headers.
 * Används inuti `HubDisplay`s `right`-slot på alla 4 hubbar så ikon, storlek,
 * bakgrund och position är identiska över sektioner. Desktop-läget gömmer
 * den (toggle bor i sidebar-foten istället).
 *
 * Tre-läges (light → dark → auto → light). Auto-läget visar en liten ACC-prick
 * på sol/mån-glyfen för att signalera att appen följer `sun.sun` från HA.
 */
export function HubThemeToggle({
  isDesktop,
}: {
  isDesktop: boolean;
}) {
  const { t, dark, mode, cycleMode } = useWarmTheme();
  if (isDesktop) return null;
  const label =
    mode === "auto"
      ? `Tema: auto (${dark ? "mörkt" : "ljust"})`
      : mode === "dark"
      ? "Tema: mörkt"
      : "Tema: ljust";
  return (
    <button
      type="button"
      onClick={() => {
        void haptic("tap");
        cycleMode();
      }}
      aria-label={label}
      title={label}
      style={{
        width: 36,
        height: 36,
        borderRadius: 999,
        background: t.paperHi,
        border: `1px solid ${t.line}`,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: t.ink,
        flexShrink: 0,
      }}
    >
      <ThemeIcon dark={dark} mode={mode} size={16} color={t.ink} />
    </button>
  );
}

/* ───── HubEyebrow + Display ──────────────────────────────────────────── */

/**
 * Display-rubrik enligt Warm Home: ACC-tinted eyebrow + stort serif med
 * valfri italic-svans (t.ex. "Bra återhämtning, *kör tungt.*").
 */
export function HubDisplay({
  eyebrow,
  title,
  italicTail,
  subtitle,
  right,
  compactTitle,
}: {
  eyebrow: string;
  title: string;
  italicTail?: string;
  subtitle?: string;
  right?: ReactNode;
  /** Visas i blur-strippen ovan content när användaren scrollar förbi
   *  tröskeln. Default = första ordet i `eyebrow` (t.ex. "HEM" → "Hem"). */
  compactTitle?: string;
}) {
  const { t } = useWarmTheme();
  // Default compact-titel = eyebrow:s första segment, kapitaliserat.
  const fallback = eyebrow.split("·")[0]?.trim() ?? "";
  const cap =
    fallback.length > 0
      ? fallback.charAt(0).toUpperCase() + fallback.slice(1).toLowerCase()
      : "";
  useRegisterCompactTitle(compactTitle ?? cap);
  return (
    <header style={{ padding: "20px 18px 12px", display: "flex", alignItems: "flex-start", gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...lab(t, { color: ACC, marginBottom: 8 }) }}>{eyebrow}</div>
        <h1
          style={{
            ...num(t, 30, 400),
            lineHeight: 1.05,
            color: t.ink,
          }}
        >
          {title}
          {italicTail ? (
            <>
              {" "}
              <span style={{ fontStyle: "italic", color: t.dim }}>{italicTail}</span>
            </>
          ) : null}
        </h1>
        {subtitle ? <p style={{ ...ital(t, 13), marginTop: 6 }}>{subtitle}</p> : null}
      </div>
      {right ? <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>{right}</div> : null}
    </header>
  );
}

/**
 * Detalj-header enligt design: "‹ Fitness" back-chevron + ACC-eyebrow +
 * stort display-titel med ital-tail + valfri subtitle (italic).
 */
export function DetailHero({
  backHref,
  backLabel,
  eyebrow,
  title,
  italicTail,
  italicColor,
  subtitle,
  right,
  compactTitle,
}: {
  backHref: string;
  backLabel: string;
  eyebrow: string;
  title: string;
  italicTail?: string;
  /** Färg på italic-svansen. Default `t.dim`. Sätt t.ex. ACC när svansen
   *  är ett semantiskt skilt fragment (sortnamn, status) som ska sticka ut. */
  italicColor?: string;
  subtitle?: string;
  right?: ReactNode;
  /** Visas i blur-strippen ovan content vid scroll. Default = `backLabel`
   *  (sektionsnamnet — bäst för detail-pages där titeln är dynamisk). */
  compactTitle?: string;
}) {
  const { t } = useWarmTheme();
  useRegisterCompactTitle(compactTitle ?? backLabel);
  return (
    <header style={{ padding: "16px 18px 8px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <Link
          href={backHref}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontFamily: body,
            fontSize: 13,
            color: t.mute,
            textDecoration: "none",
          }}
        >
          <ChevronLeft size={16} color={t.mute} />
          {backLabel}
        </Link>
        {right ? <div style={{ display: "flex", gap: 8 }}>{right}</div> : null}
      </div>
      <div style={{ ...lab(t, { color: ACC, marginBottom: 6 }) }}>{eyebrow}</div>
      <h1 style={{ ...num(t, 30, 400), lineHeight: 1.05, color: t.ink }}>
        {title}
        {italicTail ? (
          <>
            {" "}
            <span style={{ fontStyle: "italic", color: italicColor ?? t.dim }}>{italicTail}</span>
          </>
        ) : null}
      </h1>
      {subtitle ? <p style={{ ...ital(t, 13), marginTop: 6 }}>{subtitle}</p> : null}
    </header>
  );
}

/* ───── SectionLabel (lab-caps över sektioner) ────────────────────────── */

export function SectionLabel({ children, right, style }: { children: ReactNode; right?: ReactNode; style?: CSSProperties }) {
  const { t } = useWarmTheme();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 4px",
        ...style,
      }}
    >
      <span style={lab(t)}>{children}</span>
      {right}
    </div>
  );
}

/**
 * Wrappar en sektions-etikett med dess innehåll i en inner flex-column
 * med tight gap (12). Matchar Lab/Hem-mönstret: ytterklassens gap (14)
 * separerar sektioner från varandra, inner gap (12) håller etiketten
 * nära sitt innehåll. Ger ~14 över etiketten, ~12 under.
 */
export function Section({
  label,
  right,
  children,
  innerGap = 12,
  topGap = 14,
}: {
  label: string;
  right?: ReactNode;
  children: ReactNode;
  innerGap?: number;
  topGap?: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: innerGap, marginTop: topGap - 14 /* default = 0 (samma som container-gap) */ }}>
      <SectionLabel right={right}>{label}</SectionLabel>
      {children}
    </div>
  );
}

/* ───── StatBox (3-up rad enligt design) ─────────────────────────────── */

export function StatBox({
  label,
  value,
  unit,
  tagline,
  taglineColor,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  tagline?: string;
  taglineColor?: string;
}) {
  const { t } = useWarmTheme();
  return (
    <div
      style={{
        flex: 1,
        background: t.paper,
        border: `1px solid ${t.line}`,
        borderRadius: 14,
        padding: "10px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        minWidth: 0,
      }}
    >
      <span style={lab(t)}>{label}</span>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ ...num(t, 22), lineHeight: 1 }} className="warm-tab-nums">
          {value}
        </span>
        {unit ? (
          <span style={{ fontFamily: body, fontSize: 11, color: t.mute, fontWeight: 500 }}>{unit}</span>
        ) : null}
      </div>
      {tagline ? (
        <span
          style={{
            ...ital(t, 11, taglineColor ?? t.mute),
            display: "block",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {tagline}
        </span>
      ) : null}
    </div>
  );
}

/* ───── ChevronRight re-export — användbart i hub-tile-länkar ─────────── */

export { ChevronRight, ChevronLeft };

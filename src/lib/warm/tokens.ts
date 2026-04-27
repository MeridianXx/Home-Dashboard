// Warm Home — Mobile v4 designtokens (verbatim från prototypen)

export const ACC = "#C96F4A"; // terracotta — primärt accent
export const SAGE = "#7A9475"; // ok, växter, lugn
export const LINGON = "#A83E4A"; // hård varning
export const AMBER = "#D9954B"; // coach, observera
export const SKY = "#6E8AA6"; // info, blå nyans

export type WarmTheme = {
  bg: string;
  paper: string;
  paperHi: string;
  line: string;
  ink: string;
  mute: string;
  dim: string;
  ok: string;
  bad: string;
  warn: string;
  tint: string;
  tintSage: string;
  tintAmber: string;
  tintSky: string;
};

export const lightT: WarmTheme = {
  bg: "#F5EEDE",
  paper: "#FBF6EA",
  paperHi: "#FFFBF0",
  line: "#E5DAC0",
  ink: "#2B241B",
  mute: "#6E6456",
  dim: "#9C907B",
  ok: "#5A7F4A",
  bad: "#B0452E",
  warn: "#B87823",
  tint: "rgba(201,111,74,0.12)",
  tintSage: "rgba(122,148,117,0.14)",
  tintAmber: "rgba(217,149,75,0.14)",
  tintSky: "rgba(110,138,166,0.14)",
};

export const darkT: WarmTheme = {
  bg: "#1A1712",
  paper: "#221E18",
  paperHi: "#2B2620",
  line: "#3A332B",
  ink: "#F3ECDE",
  mute: "#B5AA95",
  dim: "#7A7163",
  ok: "#8FAE70",
  bad: "#D17A6B",
  warn: "#E0A455",
  tint: "rgba(201,111,74,0.18)",
  tintSage: "rgba(122,148,117,0.18)",
  tintAmber: "rgba(217,149,75,0.20)",
  tintSky: "rgba(110,138,166,0.18)",
};

// Typografi — referera CSS-variabler från next/font så fallbacks håller
export const serif = `var(--font-fraunces), Georgia, serif`;
export const body = `var(--font-dm-sans), system-ui, sans-serif`;

import type { CSSProperties } from "react";

export const lab = (
  t: WarmTheme,
  extra: CSSProperties = {}
): CSSProperties => ({
  fontFamily: body,
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: t.mute,
  ...extra,
});

export const num = (t: WarmTheme, size: number, weight = 400): CSSProperties => ({
  fontFamily: serif,
  fontSize: size,
  fontWeight: weight,
  letterSpacing: "-0.02em",
  color: t.ink,
});

export const ital = (
  t: WarmTheme,
  size = 12,
  color?: string
): CSSProperties => ({
  fontFamily: serif,
  fontStyle: "italic",
  fontSize: size,
  color: color || t.mute,
  fontWeight: 400,
});

// Geometri-konstanter
export const RADII = {
  tile: 14,
  tabPill: 26,
} as const;

export const STROKE = {
  border: 1,
  glyph: 1.6,
} as const;

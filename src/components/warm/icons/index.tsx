// Warm Home — egna SVG-glyfer (1.6px stroke, outline).
// Material Symbols ersätts av dessa per W0/princip 8.

import type { CSSProperties } from "react";

const STROKE = 1.6;

type IconProps = {
  size?: number;
  color?: string;
  fill?: boolean;
  style?: CSSProperties;
};

const baseSvg = (size: number, color: string): React.SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: color,
  strokeWidth: STROKE,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  // SVG krymper annars i flex-layout när intilliggande text är lång
  // (t.ex. "Morgon" är 6 tecken — pressade ner SVG:n till 5.7 px).
  style: { flexShrink: 0 },
});

/* ---------- Tab-ikoner ---------- */

export function HemIcon({ size = 20, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M5.5 10v9h13v-9" />
      <path d="M10 19v-5h4v5" />
    </svg>
  );
}

export function LabIcon({ size = 20, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <rect x="3.5" y="5" width="17" height="11" rx="1.5" />
      <path d="M8 19h8" />
      <path d="M12 16v3" />
    </svg>
  );
}

export function FitIcon({ size = 20, color = "currentColor", style }: IconProps) {
  // Dumbbell: handle + två viktblock vid ändarna
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <path d="M8 12h8" />
      <rect x="4.5" y="9" width="3" height="6" rx="0.6" />
      <rect x="16.5" y="9" width="3" height="6" rx="0.6" />
      <path d="M3 10.5v3" />
      <path d="M21 10.5v3" />
    </svg>
  );
}

export function GardIcon({ size = 20, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <path d="M12 20v-6" />
      <path d="M12 14c-3 0-5-2-5-5 3 0 5 2 5 5Z" />
      <path d="M12 14c3 0 5-2 5-5-3 0-5 2-5 5Z" />
    </svg>
  );
}

/* ---------- Scen-glyfer (sex scener) ---------- */

export function SceneGlyph({
  scene,
  size = 16,
  color = "currentColor",
  style,
}: {
  scene: "morgon" | "dag" | "kvall" | "natt" | "film" | "borta";
  size?: number;
  color?: string;
  style?: CSSProperties;
}) {
  // flexShrink: 0 (via baseSvg + spread i style) förhindrar att SVG:n
  // krymper när intilliggande text är lång — t.ex. "Morgon" 6 tecken
  // tryckte annars ner ikonen till ~5 px i flex-pillen.
  const props = baseSvg(size, color);
  switch (scene) {
    case "morgon":
      // Hel sol med strålar (samma storlek som "Dag"-ikonen) över en
      // horisontlinje = soluppgång. Tidigare halvsol-version blev för
      // tunn vid 14–16 px; en full disk ger samma optiska tyngd som Dag.
      return (
        <svg {...props} style={{ flexShrink: 0, ...style }}>
          <circle cx="12" cy="10" r="3.4" />
          <path d="M12 3.5v1.8" />
          <path d="M4.5 10h1.8" />
          <path d="M17.7 10h1.8" />
          <path d="M5.6 3.6l1.3 1.3" />
          <path d="M17.1 4.9l1.3-1.3" />
          <path d="M3 17.5h18" />
        </svg>
      );
    case "dag":
      return (
        <svg {...props} style={{ flexShrink: 0, ...style }}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3v2.5" />
          <path d="M12 18.5V21" />
          <path d="M3 12h2.5" />
          <path d="M18.5 12H21" />
          <path d="M5.6 5.6 7.4 7.4" />
          <path d="M16.6 16.6l1.8 1.8" />
          <path d="M5.6 18.4 7.4 16.6" />
          <path d="M16.6 7.4l1.8-1.8" />
        </svg>
      );
    case "kvall":
      // Solnedgång: halv sol över horisontlinje + två nedåt-strålar som
      // antyder rörelse mot horisonten. Skiljer sig tydligt från "Natt"
      // (måne med stjärnor) och från "Morgon" (full sol över horisont).
      return (
        <svg {...props} style={{ flexShrink: 0, ...style }}>
          <path d="M6 14a6 6 0 0 1 12 0" />
          <path d="M3 17h18" />
          <path d="M12 4v2" />
          <path d="M5.6 7.6 7 9" />
          <path d="M18.4 7.6 17 9" />
          <path d="M9 19.5l-1.5 1.5" />
          <path d="M15 19.5l1.5 1.5" />
        </svg>
      );
    case "natt":
      return (
        <svg {...props} style={{ flexShrink: 0, ...style }}>
          <path d="M19 14.5A7 7 0 0 1 9.5 5a7 7 0 1 0 9.5 9.5Z" />
          <circle cx="16" cy="6" r="0.8" fill={color} stroke="none" />
          <circle cx="13.5" cy="8.5" r="0.5" fill={color} stroke="none" />
        </svg>
      );
    case "film":
      return (
        <svg {...props} style={{ flexShrink: 0, ...style }}>
          <rect x="3.5" y="6" width="17" height="12" rx="1.5" />
          <path d="M3.5 9.5h17" />
          <path d="M7 6V4.5" />
          <path d="M11 6V4.5" />
          <path d="M15 6V4.5" />
          <path d="M19 6V4.5" />
        </svg>
      );
    case "borta":
      return (
        <svg {...props} style={{ flexShrink: 0, ...style }}>
          <path d="M5 11.5 12 5l7 6.5" />
          <path d="M6.5 10.5V18h11v-7.5" />
          <path d="M9 18v-3.5h6V18" />
          <circle cx="12" cy="12.5" r="1.2" />
        </svg>
      );
  }
}

/* ---------- Theme-toggle (sol/måne) ---------- */

export function ThemeIcon({ dark, size = 18, color = "currentColor", style }: IconProps & { dark: boolean }) {
  if (dark) {
    return (
      <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
        <path d="M19 14.5A7 7 0 0 1 9.5 5a7 7 0 1 0 9.5 9.5Z" />
      </svg>
    );
  }
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2.5" />
      <path d="M12 18.5V21" />
      <path d="M3 12h2.5" />
      <path d="M18.5 12H21" />
      <path d="M5.6 5.6 7.4 7.4" />
      <path d="M16.6 16.6l1.8 1.8" />
      <path d="M5.6 18.4 7.4 16.6" />
      <path d="M16.6 7.4l1.8-1.8" />
    </svg>
  );
}

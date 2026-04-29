// Warm Home — Fitness-glyfer (sport-typer, sparkle, plus, refresh, send, error)
// 1.6 px stroke, outline. Passar 13–22 px.

import type { CSSProperties, ReactElement } from "react";

const STROKE = 1.6;

type IconProps = {
  size?: number;
  color?: string;
  fill?: string;
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
});

/* Löpning — figur i steg */
export function RunIcon({ size = 18, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <circle cx="14" cy="5" r="1.6" />
      <path d="M9 21l2.5-5 1.5-2.5 1.5 1L17 16" />
      <path d="M11.5 13.5 9 10l3-2 3 2-1.5 3" />
      <path d="M6 11l2-1" />
      <path d="M16 12l3 .5" />
    </svg>
  );
}

/* Promenad — kortare steg, böjt knä */
export function WalkIcon({ size = 18, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <circle cx="13" cy="4.5" r="1.4" />
      <path d="M9 21l2-5 1-3 2 .5 1.5 3.5L18 19" />
      <path d="M12 13l-1.5-3.5 3-1.5 2 3" />
      <path d="M8 12l1.5-1" />
    </svg>
  );
}

/* Cykel — två hjul + ram */
export function BikeIcon({ size = 18, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <circle cx="6" cy="16" r="3.5" />
      <circle cx="18" cy="16" r="3.5" />
      <path d="M6 16l4-7h4l3 7" />
      <path d="M10 9h-2" />
      <path d="M14 9l1.5-3h2" />
    </svg>
  );
}

/* Hantel — styrka */
export function StrengthIcon({ size = 18, color = "currentColor", style }: IconProps) {
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

/* Core — figur som gör situp */
export function CoreIcon({ size = 18, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <ellipse cx="12" cy="12" rx="8" ry="3.5" />
      <path d="M12 8.5v7" />
      <path d="M9 12h6" />
    </svg>
  );
}

/* Simning — vågor */
export function SwimIcon({ size = 18, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <circle cx="17" cy="6" r="1.4" />
      <path d="M3 11c2 0 2 1 4 1s2-1 4-1 2 1 4 1 2-1 4-1" />
      <path d="M3 16c2 0 2 1 4 1s2-1 4-1 2 1 4 1 2-1 4-1" />
      <path d="M11 9l3-2 2 2" />
    </svg>
  );
}

/* Skidor — slalomåkare */
export function SkiIcon({ size = 18, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <circle cx="14" cy="5" r="1.4" />
      <path d="M3 19l8-3 6-1 4 1" />
      <path d="M11 16l-2-4 4-2 2 3" />
      <path d="M7 13l-1 5" />
    </svg>
  );
}

/* Padel — racket + boll */
export function PadelIcon({ size = 18, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <ellipse cx="9" cy="9" rx="5" ry="6" transform="rotate(-30 9 9)" />
      <path d="M13 13l5 6" />
      <circle cx="9" cy="9" r="0.8" fill={color} stroke="none" />
      <circle cx="11" cy="6" r="0.8" fill={color} stroke="none" />
      <circle cx="6" cy="11" r="0.8" fill={color} stroke="none" />
    </svg>
  );
}

/* Yoga — figur i sittande pose */
export function YogaIcon({ size = 18, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <circle cx="12" cy="5" r="1.5" />
      <path d="M12 7v4" />
      <path d="M5 19c2-3 5-3 7-3s5 0 7 3" />
      <path d="M9 13c-1.5 0-3 1-4 2" />
      <path d="M15 13c1.5 0 3 1 4 2" />
    </svg>
  );
}

/* Hjärta — för pulsdata */
export function HeartIcon({ size = 18, color = "currentColor", fill, style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <path
        d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z"
        fill={fill ?? "none"}
      />
    </svg>
  );
}

/* Sparkle — AI-analys-badge */
export function SparkleIcon({ size = 14, color = "currentColor", fill, style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <path
        d="M12 3l1.4 5.2L18.5 9.5l-5.1 1.3L12 16l-1.4-5.2L5.5 9.5l5.1-1.3L12 3Z"
        fill={fill ?? "none"}
      />
    </svg>
  );
}

/* Plus */
export function PlusIcon({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

/* Refresh / regenerate */
export function RefreshIcon({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <path d="M4 12a8 8 0 0 1 14-5.5L20 9" />
      <path d="M20 4v5h-5" />
      <path d="M20 12a8 8 0 0 1-14 5.5L4 15" />
      <path d="M4 20v-5h5" />
    </svg>
  );
}

/* Send (paper plane) */
export function SendIcon({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <path d="M21 4 3 11l7 2 2 7 9-16Z" />
      <path d="M10 13l5-5" />
    </svg>
  );
}

/* Calendar */
export function CalendarIcon({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3.5V6" />
      <path d="M16 3.5V6" />
    </svg>
  );
}

/* Flag — mål */
export function FlagIcon({ size = 16, color = "currentColor", fill, style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <path d="M5 4v17" />
      <path d="M5 5h12l-3 3 3 3H5" fill={fill ?? "none"} />
    </svg>
  );
}

/* History */
export function HistoryIcon({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v4h4" />
      <path d="M12 8v5l3 2" />
    </svg>
  );
}

/* Bolt — readiness */
export function BoltIcon({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <path d="M13 3 5 14h6l-1 7 8-11h-6l1-7Z" />
    </svg>
  );
}

/* Map pin */
export function MapPinIcon({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <path d="M12 21s-6-5.5-6-11a6 6 0 1 1 12 0c0 5.5-6 11-6 11Z" />
      <circle cx="12" cy="10" r="2.2" />
    </svg>
  );
}

/* Trending up / mountain (elevation) */
export function MountainIcon({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <path d="M3 19l5-9 4 6 3-4 6 7Z" />
    </svg>
  );
}

/* Sport-ikon utifrån typsträng. */
export function sportIcon(
  type: string,
  size: number,
  color: string,
  style?: CSSProperties,
): ReactElement {
  const t = (type ?? "").toLowerCase();
  if (t.includes("löp") || t.includes("run") || t.includes("jogg") || t.includes("intervall") || t.includes("tempo") || t.includes("tröskel") || t.includes("långpass") || t.includes("återhämtning") || t.includes("distans")) {
    return <RunIcon size={size} color={color} style={style} />;
  }
  if (t.includes("walk") || t.includes("promenad") || t.includes("vandring")) {
    return <WalkIcon size={size} color={color} style={style} />;
  }
  if (t.includes("cykl") || t.includes("bike") || t.includes("cycl")) {
    return <BikeIcon size={size} color={color} style={style} />;
  }
  if (t.includes("core") || t.includes("bål")) {
    return <CoreIcon size={size} color={color} style={style} />;
  }
  if (t.includes("strength") || t.includes("styr")) {
    return <StrengthIcon size={size} color={color} style={style} />;
  }
  if (t.includes("swim") || t.includes("sim")) {
    return <SwimIcon size={size} color={color} style={style} />;
  }
  if (t.includes("ski") || t.includes("skid")) {
    return <SkiIcon size={size} color={color} style={style} />;
  }
  if (t.includes("padel")) {
    return <PadelIcon size={size} color={color} style={style} />;
  }
  if (t.includes("yoga")) {
    return <YogaIcon size={size} color={color} style={style} />;
  }
  return <StrengthIcon size={size} color={color} style={style} />;
}

/* Trash / close / chevron-double */
export function TrashIcon({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <path d="M5 7h14" />
      <path d="M9 7V4.5h6V7" />
      <path d="M7 7l1 13h8l1-13" />
    </svg>
  );
}

export function CloseIcon({ size = 18, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

export function ErrorIcon({ size = 14, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6" />
      <circle cx="12" cy="16.5" r="0.6" fill={color} stroke="none" />
    </svg>
  );
}

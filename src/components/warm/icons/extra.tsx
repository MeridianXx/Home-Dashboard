// Fler Warm-glyfer: väder, energi, bil, ljus, rum, media, expand, dammsugare, värme.

import type { CSSProperties } from "react";

const STROKE = 1.6;

type IconProps = {
  size?: number;
  color?: string;
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

export function ChevronRight({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={style}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function ChevronLeft({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={style}>
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}

export function ChevronDown({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={style}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function ChevronUp({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={style}>
      <path d="m18 15-6-6-6 6" />
    </svg>
  );
}

export function CheckIcon({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={style}>
      <path d="M4 12.5 9 17l11-11" />
    </svg>
  );
}

export function BulbIcon({
  size = 18,
  color = "currentColor",
  fill,
  style,
}: IconProps & { fill?: string }) {
  return (
    <svg {...baseSvg(size, color)} style={style}>
      <path
        d="M9 17h6"
        fill={fill ?? "none"}
      />
      <path d="M10 20h4" />
      <path d="M8.5 14a5.5 5.5 0 1 1 7 0c-.6.5-1 1.2-1 2v.5h-5V16c0-.8-.4-1.5-1-2Z" fill={fill ?? "none"} />
    </svg>
  );
}

export function ThermoIcon({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={style}>
      <path d="M14 14V5a2 2 0 1 0-4 0v9a3.5 3.5 0 1 0 4 0Z" />
      <circle cx="12" cy="16.5" r="1.2" fill={color} stroke="none" />
    </svg>
  );
}

export function DropletIcon({ size = 14, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={style}>
      <path d="M12 3.5s5 6 5 10a5 5 0 0 1-10 0c0-4 5-10 5-10Z" />
    </svg>
  );
}

export function BoltIcon({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={style}>
      <path d="M13 3 5 14h6l-1 7 8-11h-6l1-7Z" />
    </svg>
  );
}

export function CarIcon({ size = 18, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={style}>
      <path d="M4 14h16v4H4z" />
      <path d="M5 14 7 8h10l2 6" />
      <circle cx="7" cy="18" r="1.4" />
      <circle cx="17" cy="18" r="1.4" />
    </svg>
  );
}

export function PlugIcon({ size = 14, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={style}>
      <path d="M9 6V3" />
      <path d="M15 6V3" />
      <rect x="6.5" y="6" width="11" height="7" rx="2" />
      <path d="M12 13v3.5a3 3 0 0 0 3 3h2" />
    </svg>
  );
}

export function PlayIcon({ size = 16, color = "currentColor", style, fill }: IconProps & { fill?: string }) {
  return (
    <svg {...baseSvg(size, color)} style={style}>
      <path d="M7.5 5v14l12-7-12-7Z" fill={fill ?? "none"} />
    </svg>
  );
}

export function PauseIcon({ size = 16, color = "currentColor", style, fill }: IconProps & { fill?: string }) {
  return (
    <svg {...baseSvg(size, color)} style={style}>
      <rect x="6" y="5" width="4" height="14" rx="0.8" fill={fill ?? "none"} />
      <rect x="14" y="5" width="4" height="14" rx="0.8" fill={fill ?? "none"} />
    </svg>
  );
}

export function SkipPrevIcon({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={style}>
      <path d="M6 5v14" />
      <path d="M19 5 8 12l11 7V5Z" />
    </svg>
  );
}

export function SkipNextIcon({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={style}>
      <path d="M18 5v14" />
      <path d="M5 5l11 7-11 7V5Z" />
    </svg>
  );
}

export function VolumeIcon({
  level = 2,
  size = 16,
  color = "currentColor",
  style,
}: IconProps & { level?: 0 | 1 | 2 }) {
  return (
    <svg {...baseSvg(size, color)} style={style}>
      <path d="M5 9h3l5-4v14l-5-4H5V9Z" />
      {level >= 1 ? <path d="M16 9.5a3.5 3.5 0 0 1 0 5" /> : null}
      {level >= 2 ? <path d="M18.5 7a7 7 0 0 1 0 10" /> : null}
    </svg>
  );
}

export function PowerIcon({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={style}>
      <path d="M12 4v8" />
      <path d="M7.5 7.5a6 6 0 1 0 9 0" />
    </svg>
  );
}

export function SpeakerIcon({ size = 18, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={style}>
      <rect x="6" y="3.5" width="12" height="17" rx="2" />
      <circle cx="12" cy="14" r="3" />
      <circle cx="12" cy="7.5" r="0.9" fill={color} stroke="none" />
    </svg>
  );
}

export function TvIcon({ size = 18, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={style}>
      <rect x="3" y="5" width="18" height="12" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
    </svg>
  );
}

export function CloudIcon({ size = 18, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={style}>
      <path d="M7 17a4 4 0 1 1 1-7.9 5 5 0 0 1 9.6 1.4A3.5 3.5 0 0 1 17 17H7Z" />
    </svg>
  );
}

export function SunIcon({ size = 18, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={style}>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 3v2" />
      <path d="M12 19v2" />
      <path d="M3 12h2" />
      <path d="M19 12h2" />
      <path d="M5.6 5.6 7 7" />
      <path d="M17 17l1.4 1.4" />
      <path d="M5.6 18.4 7 17" />
      <path d="M17 7l1.4-1.4" />
    </svg>
  );
}

export function MoonIcon({ size = 18, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={style}>
      <path d="M19 14.5A7 7 0 0 1 9.5 5a7 7 0 1 0 9.5 9.5Z" />
    </svg>
  );
}

export function CloudRainIcon({ size = 18, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={style}>
      <path d="M7 13a4 4 0 1 1 1-7.9 5 5 0 0 1 9.6 1.4A3.5 3.5 0 0 1 17 13H7Z" />
      <path d="M9 17l-1 3" />
      <path d="M13 17l-1 3" />
      <path d="M17 17l-1 3" />
    </svg>
  );
}

export function CloudSnowIcon({ size = 18, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={style}>
      <path d="M7 13a4 4 0 1 1 1-7.9 5 5 0 0 1 9.6 1.4A3.5 3.5 0 0 1 17 13H7Z" />
      <circle cx="9" cy="18" r="0.6" fill={color} stroke="none" />
      <circle cx="13" cy="18" r="0.6" fill={color} stroke="none" />
      <circle cx="17" cy="18" r="0.6" fill={color} stroke="none" />
      <circle cx="11" cy="20.5" r="0.6" fill={color} stroke="none" />
      <circle cx="15" cy="20.5" r="0.6" fill={color} stroke="none" />
    </svg>
  );
}

export function PartlyCloudyIcon({ size = 18, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={style}>
      <circle cx="9" cy="9" r="3" />
      <path d="M9 4v1.5" />
      <path d="M5 9H3.5" />
      <path d="M5.5 5.5 4.5 4.5" />
      <path d="M11 17a3.5 3.5 0 1 1 1.4-6.7A4 4 0 0 1 19 12a3 3 0 0 1 0 5h-8Z" />
    </svg>
  );
}

export function FogIcon({ size = 18, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={style}>
      <path d="M4 9h16" />
      <path d="M4 13h16" />
      <path d="M6 17h12" />
      <path d="M5 21h14" />
    </svg>
  );
}

export function WindIcon({ size = 18, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={style}>
      <path d="M3 9h12a3 3 0 1 0-3-3" />
      <path d="M3 15h15a3 3 0 1 1-3 3" />
    </svg>
  );
}

export function StormIcon({ size = 18, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={style}>
      <path d="M7 13a4 4 0 1 1 1-7.9 5 5 0 0 1 9.6 1.4A3.5 3.5 0 0 1 17 13H7Z" />
      <path d="M11 14l-2 4h3l-2 4" />
    </svg>
  );
}

export function HouseIcon({ size = 18, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={style}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M5.5 10v9h13v-9" />
    </svg>
  );
}

export function PlantIcon({ size = 18, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={style}>
      <path d="M12 20v-7" />
      <path d="M12 13c-3 0-5-2-5-5 3 0 5 2 5 5Z" />
      <path d="M12 13c3 0 5-2 5-5-3 0-5 2-5 5Z" />
      <path d="M8.5 20h7" />
    </svg>
  );
}

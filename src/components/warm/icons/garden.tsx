// Warm Home · Trädgård — egna SVG-glyfer.
// Stroke 1.6 px, outline. Plant-set: seedling/grown/tree/shrub/grass/herb +
// hjälpikoner för säsong, tools, kanban, AI, etc.

import type { CSSProperties } from "react";

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

/* ─────────── Plant-glyfer (typer) ─────────── */

/** Seedling — för Grönsak / nyplanterat / inomhus-perenn. */
export function SeedlingIcon({ size = 18, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <path d="M12 20v-7" />
      <path d="M12 13c-3 0-5-2-5-5 3 0 5 2 5 5Z" />
      <path d="M12 13c3 0 5-2 5-5-3 0-5 2-5 5Z" />
      <path d="M8.5 20h7" />
    </svg>
  );
}

/** Grown perenn / blomma — stjälk + tre löv. */
export function PerennialIcon({ size = 18, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <path d="M12 21V8" />
      <path d="M12 11c-2.5 0-4-1.5-4-4 2.5 0 4 1.5 4 4Z" />
      <path d="M12 14c-2.5 0-4-1.5-4-4 2.5 0 4 1.5 4 4Z" />
      <path d="M12 11c2.5 0 4-1.5 4-4-2.5 0-4 1.5-4 4Z" />
      <circle cx="12" cy="6" r="1.6" />
    </svg>
  );
}

/** Träd — kompakt krona + stam, för Fruktträd/Prydnadsträd. */
export function TreeIcon({ size = 18, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <path d="M12 20v-5" />
      <path d="M12 15c-4 0-6-3-6-7 0-3 2-5 6-5s6 2 6 5c0 4-2 7-6 7Z" />
      <path d="M9 9c1 1 2 1.5 3 1.5s2-.5 3-1.5" />
    </svg>
  );
}

/** Buske — bred krona, kort stam. */
export function ShrubIcon({ size = 18, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <path d="M12 20v-3" />
      <path d="M5 17a4 4 0 0 1-1-7.5A4 4 0 0 1 12 7a4 4 0 0 1 8 2.5A4 4 0 0 1 19 17H5Z" />
    </svg>
  );
}

/** Gräs — tre tussar. */
export function GrassIcon({ size = 18, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <path d="M5 19c0-4 2-8 4-10" />
      <path d="M12 19c0-4 0-9 0-12" />
      <path d="M19 19c0-4-2-8-4-10" />
      <path d="M3 19h18" />
    </svg>
  );
}

/** Marktäckare — bred bädd. */
export function GroundCoverIcon({ size = 18, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <path d="M3 17h18" />
      <path d="M5 17c1-2 2-3 3-3" />
      <path d="M10 17c1-2 2-3 3-3" />
      <path d="M15 17c1-2 2-3 3-3" />
      <circle cx="8" cy="11" r="1.2" />
      <circle cx="13" cy="11" r="1.2" />
      <circle cx="18" cy="11" r="1.2" />
    </svg>
  );
}

/** Mappar Notion-typ → glyf. */
export function plantGlyph(typ: string, size = 18, color = "currentColor", style?: CSSProperties) {
  const map: Record<string, (props: IconProps) => React.ReactElement> = {
    Häck: ShrubIcon,
    Buske: ShrubIcon,
    Prydnadsträd: TreeIcon,
    Fruktträd: TreeIcon,
    Perenn: PerennialIcon,
    Blomma: PerennialIcon,
    Prydnadsgräs: GrassIcon,
    Gräs: GrassIcon,
    Marktäckare: GroundCoverIcon,
    Grönsak: SeedlingIcon,
  };
  const Cmp = map[typ] ?? SeedlingIcon;
  return <Cmp size={size} color={color} style={style} />;
}

/* ─────────── Verktygs- + sektion-ikoner ─────────── */

export function CalendarIcon({ size = 18, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <rect x="3.5" y="5" width="17" height="15" rx="1.5" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3.5v3" />
      <path d="M16 3.5v3" />
    </svg>
  );
}

export function ListIcon({ size = 18, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <path d="M9 6h11" />
      <path d="M9 12h11" />
      <path d="M9 18h11" />
      <circle cx="5" cy="6" r="1.2" />
      <circle cx="5" cy="12" r="1.2" />
      <circle cx="5" cy="18" r="1.2" />
    </svg>
  );
}

export function PlusIcon({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export function TrashIcon({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <path d="M5 7h14" />
      <path d="M9 7V5h6v2" />
      <path d="M7 7l1 12h8l1-12" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}

export function EditIcon({ size = 14, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <path d="M4 20h4l11-11-4-4L4 16v4Z" />
      <path d="M14 6l4 4" />
    </svg>
  );
}

export function CheckCircleIcon({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5 11 15.5 16.5 9.5" />
    </svg>
  );
}

export function ExternalLinkIcon({ size = 14, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <path d="M14 4h6v6" />
      <path d="M20 4 12 12" />
      <path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
    </svg>
  );
}

export function SparkleIcon({ size = 14, color = "currentColor", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      stroke={color}
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ flexShrink: 0, ...style }}
    >
      <path d="M12 2.5l1.8 5 5 1.8-5 1.8L12 16l-1.8-5-5-1.8 5-1.8L12 2.5Z" />
      <path d="M19 17l.8 2 2 .8-2 .8L19 23l-.8-2-2-.8 2-.8L19 17Z" />
    </svg>
  );
}

export function SendIcon({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <path d="M3 12 21 4l-7 17-3-7-7-2Z" />
      <path d="M11 14l8-8" />
    </svg>
  );
}

export function ImageIcon({ size = 18, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M4 17l4-4 4 4 3-3 5 5" />
    </svg>
  );
}

export function CloseIcon({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <path d="M5 5l14 14" />
      <path d="M19 5 5 19" />
    </svg>
  );
}

export function RefreshIcon({ size = 14, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <path d="M3 12a9 9 0 1 1 3 6.7" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}

export function ChatIcon({ size = 14, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-9l-4 4v-4H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

export function PinIcon({ size = 14, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11Z" />
      <circle cx="12" cy="10" r="2" />
    </svg>
  );
}

export function SunIcon({ size = 14, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
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

export function CheckIcon({ size = 14, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <path d="M4 12.5 9 17l11-11" />
    </svg>
  );
}

export function AlertIcon({ size = 14, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5" />
      <circle cx="12" cy="16" r="0.9" fill={color} stroke="none" />
    </svg>
  );
}

export function ProgressIcon({ size = 14, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <path d="M12 4a8 8 0 1 1-8 8" />
    </svg>
  );
}

export function DropletIcon({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <path d="M12 3C12 3 6 10 6 14a6 6 0 0 0 12 0C18 10 12 3 12 3Z" />
    </svg>
  );
}

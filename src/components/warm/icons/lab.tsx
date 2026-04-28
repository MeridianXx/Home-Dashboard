// Warm Home — ikoner för Lab-sektionen.

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

/** Server — staplade rackenheter med LED-prick (Proxmox-host) */
export function ServerIcon({ size = 18, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <rect x="4" y="4.5" width="16" height="6" rx="1.4" />
      <rect x="4" y="13.5" width="16" height="6" rx="1.4" />
      <circle cx="7" cy="7.5" r="0.7" fill={color} stroke="none" />
      <circle cx="7" cy="16.5" r="0.7" fill={color} stroke="none" />
      <path d="M11 7.5h6" />
      <path d="M11 16.5h6" />
    </svg>
  );
}

/** Storage — diskstack (Unraid-host) */
export function StorageIcon({ size = 18, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <ellipse cx="12" cy="6" rx="7.5" ry="2.2" />
      <path d="M4.5 6v5c0 1.2 3.3 2.2 7.5 2.2s7.5-1 7.5-2.2V6" />
      <path d="M4.5 11v5c0 1.2 3.3 2.2 7.5 2.2s7.5-1 7.5-2.2v-5" />
    </svg>
  );
}

/** Container — Docker-aktig låda med flikar */
export function ContainerIcon({ size = 18, color = "currentColor", style }: IconProps) {
  return (
    <svg {...baseSvg(size, color)} style={{ flexShrink: 0, ...style }}>
      <rect x="4" y="9.5" width="16" height="9" rx="1" />
      <path d="M8 9.5V7h2.5v2.5" />
      <path d="M11.5 9.5V7H14v2.5" />
      <path d="M15 9.5V7h2.5v2.5" />
    </svg>
  );
}

/** Spinning-disk indikator — fylld cirkel (samma stil som spin-dot i v2) */
export function DiskDot({ spinning, color, size = 7 }: { spinning: boolean; color: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: spinning ? color : "transparent",
        border: `1.5px solid ${color}`,
        display: "inline-block",
        flexShrink: 0,
      }}
    />
  );
}

/** Status-prick (online/offline) — fylld cirkel */
export function StatusDot({ ok, color, size = 7 }: { ok: boolean; color: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: ok ? color : "transparent",
        border: `1.5px solid ${color}`,
        display: "inline-block",
        flexShrink: 0,
      }}
    />
  );
}

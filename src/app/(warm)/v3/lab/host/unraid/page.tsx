"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useHydrated, useWarmTheme } from "@/lib/warm/theme";
import { haptic } from "@/lib/warm/haptics";
import {
  ACC,
  SAGE,
  body,
  ital,
  lab,
  num,
  serif,
  type WarmTheme,
} from "@/lib/warm/tokens";
import { Bar, Ring } from "@/components/warm/primitives";
import { ChevronDown, ChevronLeft, ChevronUp } from "@/components/warm/icons/extra";
import { StorageIcon, StatusDot, DiskDot } from "@/components/warm/icons/lab";
import WarmErrorBanner from "@/components/warm/WarmErrorBanner";
import { formatTime } from "@/lib/warm/format";

// ─── Types ───────────────────────────────────────────────────────────────────

type DiskEntry = {
  name: string;
  status: string;
  temp: number | null;
  spinning: boolean;
  errors: number;
  used_tb: number | null;
  total_tb: number | null;
  used_pct: number | null;
  type: "disk" | "cache";
};
type CachePool = {
  name: string;
  disks: DiskEntry[];
  total_tb: number;
  used_tb: number;
  used_pct: number | null;
};
type UnraidData = {
  system: {
    hostname: string;
    uptime: string;
    cpu_brand: string;
    cpu_cores: number;
    cpu_pct: number;
    mem_used_gb: number;
    mem_total_gb: number;
    mem_pct: number;
  };
  array: {
    state: string;
    total_tb: number;
    used_tb: number;
    free_tb: number;
    used_pct: number;
    parity_ok: boolean;
    disks: DiskEntry[];
  };
  cache_pools: CachePool[];
  containers: Array<{
    name: string;
    image: string;
    state: string;
    status: string;
    auto_start: boolean;
    group: string | null;
  }>;
  error?: string;
};

// ─── Header ──────────────────────────────────────────────────────────────────

function PageHeading({
  t,
  back,
  title,
  italicTail,
  online,
  uptime,
}: {
  t: WarmTheme;
  back: () => void;
  title: string;
  italicTail: string;
  online: boolean;
  uptime: string;
}) {
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => forceTick((x) => x + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <header
      style={{
        padding: "16px 22px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button
          type="button"
          onClick={() => { void haptic("tap"); back(); }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontFamily: body,
            fontSize: 14,
            color: t.mute,
            cursor: "pointer",
          }}
        >
          <ChevronLeft size={14} color={t.mute} />
          Lab
        </button>
        <a
          href="https://unraid.inicio.cloud"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: body,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.07em",
            textTransform: "uppercase" as const,
            color: t.mute,
            textDecoration: "none",
            padding: "3px 8px",
            borderRadius: 6,
            border: `1px solid ${t.line}`,
            background: t.paperHi,
          }}
        >
          WebUI ↗
        </a>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span
          style={{ ...lab(t), color: ACC, letterSpacing: "0.18em" }}
          className="warm-tab-nums"
        >
          LAB · {formatTime(new Date())}
        </span>
        <h1
          style={{
            ...num(t, 32, 400),
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </h1>
        <p style={{ ...ital(t, 14, t.dim), marginTop: -2 }}>{italicTail}</p>
        <span
          style={{
            fontFamily: body,
            fontSize: 12,
            color: online ? SAGE : t.bad,
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            marginTop: 2,
          }}
        >
          <StatusDot ok={online} color={online ? SAGE : t.bad} size={6} />
          {online ? `online · ${uptime} uptime` : "offline"}
        </span>
      </div>
    </header>
  );
}

// ─── Ring-trio (CPU / RAM / Array) ───────────────────────────────────────────

function RingBlock({
  t,
  label,
  value,
  pct,
  tagline,
  color,
}: {
  t: WarmTheme;
  label: string;
  value: string;
  pct: number;
  tagline: string;
  color: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        padding: "4px 0",
      }}
    >
      <Ring
        value={pct}
        size={84}
        stroke={6}
        trackColor={t.line}
        color={color}
      >
        <span
          className="warm-tab-nums"
          style={{
            fontFamily: serif,
            fontSize: 16,
            fontWeight: 500,
            color: t.ink,
            letterSpacing: "-0.02em",
          }}
        >
          {value}
        </span>
      </Ring>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
        <span style={lab(t)}>{label}</span>
        <span style={ital(t, 11, t.mute)}>{tagline}</span>
      </div>
    </div>
  );
}

// ─── Disk-rad (samma stil i array + cache_pools) ─────────────────────────────

function DiskRow({ t, disk, isFirst }: { t: WarmTheme; disk: DiskEntry; isFirst: boolean }) {
  const healthy = disk.status === "DISK_OK" && disk.errors === 0;
  const barColor =
    disk.used_pct != null && disk.used_pct >= 90
      ? t.bad
      : disk.used_pct != null && disk.used_pct >= 80
      ? t.warn
      : disk.type === "cache"
      ? "#5C7891"
      : SAGE;
  const tempColor =
    disk.temp == null
      ? t.dim
      : disk.temp > 50
      ? t.bad
      : disk.temp > 40
      ? t.warn
      : t.mute;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "11px 14px",
        borderTop: isFirst ? "none" : `1px solid ${t.line}`,
      }}
    >
      <DiskDot spinning={disk.spinning} color={disk.spinning ? SAGE : t.dim} />
      <span
        className="warm-tab-nums"
        style={{
          fontFamily: body,
          fontSize: 11,
          fontWeight: 600,
          color: t.ink,
          minWidth: 56,
          flexShrink: 0,
        }}
      >
        {disk.name}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {disk.used_pct != null ? (
          <Bar t={t} value={disk.used_pct} color={barColor} height={4} />
        ) : (
          <span style={ital(t, 10, t.dim)}>standby</span>
        )}
      </div>
      <span
        className="warm-tab-nums"
        style={{
          fontFamily: body,
          fontSize: 10,
          color: t.mute,
          minWidth: 76,
          textAlign: "right",
          flexShrink: 0,
        }}
      >
        {disk.used_tb != null
          ? `${disk.used_tb}/${disk.total_tb} TB`
          : "—"}
      </span>
      <span
        className="warm-tab-nums"
        style={{
          fontFamily: body,
          fontSize: 10,
          color: tempColor,
          minWidth: 32,
          textAlign: "right",
          flexShrink: 0,
        }}
      >
        {disk.temp != null ? `${disk.temp}°` : ""}
      </span>
      <span
        style={{
          fontFamily: body,
          fontSize: 12,
          color: healthy ? SAGE : t.bad,
          flexShrink: 0,
          width: 14,
          textAlign: "center",
        }}
      >
        {healthy ? "✓" : "!"}
      </span>
    </div>
  );
}

// ─── Sektionslåda — kapsel kring disk-listor ─────────────────────────────────

function StorageBox({
  t,
  label,
  rightLabel,
  rightTone = t.mute,
  summary,
  children,
}: {
  t: WarmTheme;
  label: string;
  rightLabel: string;
  rightTone?: string;
  summary?: { state: string; pct: number; color: string };
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: t.paper,
        border: `1px solid ${t.line}`,
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          padding: "12px 14px",
          borderBottom: `1px solid ${t.line}`,
        }}
      >
        <span style={lab(t)}>{label}</span>
        <span
          className="warm-tab-nums"
          style={{
            fontFamily: body,
            fontSize: 11,
            color: rightTone,
            fontWeight: 500,
          }}
        >
          {rightLabel}
        </span>
      </div>
      {summary && (
        <div
          style={{
            padding: "10px 14px",
            borderBottom: `1px solid ${t.line}`,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <span style={ital(t, 11, t.dim)}>{summary.state}</span>
            <span
              className="warm-tab-nums"
              style={{
                fontFamily: body,
                fontSize: 11,
                color: t.mute,
                fontWeight: 500,
              }}
            >
              {summary.pct}%
            </span>
          </div>
          <Bar t={t} value={summary.pct} color={summary.color} height={5} />
        </div>
      )}
      {children}
    </div>
  );
}

// ─── Container-rad ───────────────────────────────────────────────────────────

function ContainerRow({
  t,
  c,
  isFirst,
}: {
  t: WarmTheme;
  c: { name: string; image: string; state: string; status: string; group: string | null };
  isFirst: boolean;
}) {
  const running = c.state === "RUNNING";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "11px 14px",
        borderTop: isFirst ? "none" : `1px solid ${t.line}`,
      }}
    >
      <StatusDot ok={running} color={running ? SAGE : t.dim} size={7} />
      <span
        style={{
          fontFamily: body,
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          padding: "3px 7px",
          borderRadius: 4,
          background: t.tint,
          color: ACC,
          minWidth: 32,
          textAlign: "center",
          flexShrink: 0,
        }}
      >
        CTR
      </span>
      <span
        style={{
          fontFamily: serif,
          fontSize: 13,
          fontWeight: 500,
          color: t.ink,
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          letterSpacing: "-0.01em",
        }}
      >
        {c.name}
      </span>
      {!running && (
        <span style={ital(t, 11, t.dim)}>{c.state.toLowerCase()}</span>
      )}
    </div>
  );
}

// ─── Action-knapp (ej impl) ──────────────────────────────────────────────────

function ActionButton({
  t,
  label,
  tagline,
}: {
  t: WarmTheme;
  label: string;
  tagline: string;
}) {
  return (
    <button
      type="button"
      title="Ej implementerat — visuell platshållare"
      aria-disabled="true"
      onClick={(e) => e.preventDefault()}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 3,
        padding: "12px 14px",
        background: t.paper,
        border: `1px dashed ${t.line}`,
        borderRadius: 12,
        color: t.mute,
        cursor: "not-allowed",
        opacity: 0.7,
        textAlign: "left",
      }}
    >
      <span
        style={{ fontFamily: body, fontSize: 13, fontWeight: 600, color: t.ink }}
      >
        {label}
      </span>
      <span style={ital(t, 11, t.dim)}>{tagline}</span>
    </button>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function WarmUnraidDetail() {
  const router = useRouter();
  const { t } = useWarmTheme();
  const hydrated = useHydrated();
  const [showAllContainers, setShowAllContainers] = useState(false);

  const {
    data,
    error,
    mutate: m,
  } = useSWR<UnraidData>(hydrated ? "/api/homelab/unraid" : null, fetcher, {
    refreshInterval: 5_000,
  });

  const sys = data?.system;
  const arr = data?.array;
  const pools = data?.cache_pools ?? [];
  const containers = data?.containers ?? [];
  const containersRunning = containers.filter((c) => c.state === "RUNNING").length;
  const containersStopped = containers.length - containersRunning;
  const online = sys != null;

  // Visa de 8 första som default; expandera till alla på begäran
  const visibleContainers = useMemo(
    () =>
      showAllContainers ? containers : containers.slice(0, 8),
    [containers, showAllContainers]
  );

  const arrColor =
    arr && arr.used_pct >= 90 ? t.bad : arr && arr.used_pct >= 80 ? t.warn : SAGE;
  const tagline = !sys
    ? "hämtar…"
    : !arr
    ? "host online."
    : arr.used_pct >= 90
    ? "lagring snart full."
    : arr.parity_ok
    ? `${pools.length} cache-pool${pools.length === 1 ? "" : "er"}.`
    : "kontrollera paritet.";

  return (
    <>
      <PageHeading
        t={t}
        back={() => router.push("/v3/lab")}
        title="unraid"
        italicTail={tagline}
        online={online}
        uptime={sys?.uptime ?? "—"}
      />

      <div
        style={{
          padding: "0 22px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        {(error || data?.error) && (
          <WarmErrorBanner
            t={t}
            message={data?.error ?? "Kunde inte nå Unraid."}
            onRetry={() => m()}
          />
        )}

        {sys && arr && (
          <>
            {/* Ring-trio */}
            <div
              style={{
                background: t.paper,
                border: `1px solid ${t.line}`,
                borderRadius: 16,
                padding: 16,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <RingBlock
                  t={t}
                  label="CPU"
                  value={`${sys.cpu_pct}%`}
                  pct={sys.cpu_pct}
                  tagline={`${sys.cpu_cores} kärnor`}
                  color={sys.cpu_pct >= 85 ? t.bad : sys.cpu_pct >= 70 ? t.warn : ACC}
                />
                <RingBlock
                  t={t}
                  label="RAM"
                  value={`${sys.mem_pct}%`}
                  pct={sys.mem_pct}
                  tagline={`${sys.mem_used_gb}/${sys.mem_total_gb.toFixed(0)} GB`}
                  color={sys.mem_pct >= 85 ? t.bad : sys.mem_pct >= 70 ? t.warn : ACC}
                />
                <RingBlock
                  t={t}
                  label="ARRAY"
                  value={`${arr.used_pct}%`}
                  pct={arr.used_pct}
                  tagline={`${arr.used_tb}/${arr.total_tb} TB`}
                  color={arrColor}
                />
              </div>
            </div>

            {/* Foot-rad */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: 8,
              }}
            >
              <FootStat t={t} label="DISKAR" value={`${arr.disks.length}`} />
              <FootStat
                t={t}
                label="PARITET"
                value={arr.parity_ok ? "ok" : "fel"}
                tone={arr.parity_ok ? SAGE : t.bad}
              />
              <FootStat
                t={t}
                label="CACHE"
                value={`${pools.reduce((s, p) => s + p.disks.length, 0)}`}
              />
              <FootStat
                t={t}
                label="LEDIGT"
                value={`${arr.free_tb} TB`}
                tone={arr.free_tb < 2 ? t.warn : t.ink}
              />
            </div>

            {/* Array-låda */}
            <StorageBox
              t={t}
              label="ARRAY"
              rightLabel={`${arr.used_tb}/${arr.total_tb} TB`}
              rightTone={arrColor}
              summary={{
                state: arr.state.toLowerCase(),
                pct: arr.used_pct,
                color: arrColor,
              }}
            >
              {arr.disks.map((d, i) => (
                <DiskRow key={d.name} t={t} disk={d} isFirst={i === 0} />
              ))}
            </StorageBox>

            {/* Cache-pools */}
            {pools.map((pool) => (
              <StorageBox
                key={pool.name}
                t={t}
                label={pool.name.replace(/_/g, " ").toUpperCase()}
                rightLabel={`${pool.used_tb}/${pool.total_tb} TB`}
                summary={
                  pool.used_pct != null
                    ? {
                        state: "pool",
                        pct: pool.used_pct,
                        color: "#5C7891",
                      }
                    : undefined
                }
              >
                {pool.disks.map((d, i) => (
                  <DiskRow
                    key={d.name}
                    t={t}
                    disk={d}
                    isFirst={i === 0}
                  />
                ))}
              </StorageBox>
            ))}

            {/* Docker-containers */}
            {containers.length > 0 && (
              <div
                style={{
                  background: t.paper,
                  border: `1px solid ${t.line}`,
                  borderRadius: 14,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    borderBottom: `1px solid ${t.line}`,
                  }}
                >
                  <span style={lab(t)}>DOCKER</span>
                  <span style={ital(t, 11, t.dim)}>
                    {containersRunning} igång
                    {containersStopped > 0
                      ? ` · ${containersStopped} stoppad`
                      : ""}
                  </span>
                </div>
                {visibleContainers.map((c, i) => (
                  <ContainerRow
                    key={c.name}
                    t={t}
                    c={c}
                    isFirst={i === 0}
                  />
                ))}
                {containers.length > 8 && (
                  <button
                    type="button"
                    onClick={() => { void haptic("tap"); setShowAllContainers((v) => !v); }}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderTop: `1px solid ${t.line}`,
                      background: "transparent",
                      cursor: "pointer",
                      fontFamily: body,
                      fontSize: 12,
                      fontWeight: 500,
                      color: t.mute,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    {showAllContainers ? (
                      <>
                        <ChevronUp size={12} color={t.mute} />
                        Visa färre
                      </>
                    ) : (
                      <>
                        <ChevronDown size={12} color={t.mute} />
                        Visa alla {containers.length}
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={lab(t)}>ÅTGÄRDER</span>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 8,
                }}
              >
                <ActionButton t={t} label="Paritetscheck" tagline="ej impl." />
                <ActionButton t={t} label="Spin down" tagline="ej impl." />
                <ActionButton t={t} label="SSH" tagline="ej impl." />
              </div>
              <span style={ital(t, 11, t.dim)}>
                Åtgärderna är visuella platshållare och anropar inga
                tjänster ännu.
              </span>
            </div>
          </>
        )}

        {!sys && !error && (
          <div
            style={{
              background: t.paper,
              border: `1px solid ${t.line}`,
              borderRadius: 14,
              padding: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              color: t.mute,
            }}
          >
            <StorageIcon size={16} color={t.mute} />
            <span style={{ fontFamily: body, fontSize: 13 }}>Hämtar Unraid-data…</span>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Foot-stat (samma som proxmox men inline för att slippa import-cykel) ───

function FootStat({
  t,
  label,
  value,
  tone,
}: {
  t: WarmTheme;
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div
      style={{
        background: t.paper,
        border: `1px solid ${t.line}`,
        borderRadius: 12,
        padding: "8px 10px",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <span style={{ ...lab(t), fontSize: 9 }}>{label}</span>
      <span
        className="warm-tab-nums"
        style={{
          fontFamily: serif,
          fontSize: 14,
          fontWeight: 500,
          color: tone ?? t.ink,
          letterSpacing: "-0.01em",
        }}
      >
        {value}
      </span>
    </div>
  );
}

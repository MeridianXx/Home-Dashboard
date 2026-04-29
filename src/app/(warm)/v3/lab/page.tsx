"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useDesktop, useHydrated, useWarmTheme } from "@/lib/warm/theme";
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
import { Bar } from "@/components/warm/primitives";
import { HubDisplay, HubThemeToggle } from "@/components/warm/fit/parts";
import { ChevronRight } from "@/components/warm/icons/extra";
import { ServerIcon, StorageIcon, StatusDot } from "@/components/warm/icons/lab";
import WarmErrorBanner from "@/components/warm/WarmErrorBanner";
import { formatHubEyebrow } from "@/lib/warm/format";

// ─── Types ───────────────────────────────────────────────────────────────────

type PveVm = {
  vmid: number;
  name: string;
  type: string;
  status: string;
  cpu_pct: number;
  mem_used_gb: number;
  mem_total_gb: number;
};
type PveNode = {
  node: string;
  status: string;
  cpu_pct: number;
  cpu_cores: number;
  mem_used_gb: number;
  mem_total_gb: number;
  mem_pct: number;
  uptime: string;
  net_in: string | null;
  net_out: string | null;
  vms: PveVm[];
};
type ProxmoxData = { nodes: PveNode[]; error?: string };

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

type PortainerData = {
  containers: Array<{
    id: string;
    name: string;
    state: string;
    status: string;
    ports: Array<{ public: number; private: number; webui: string }>;
    webui: string | null;
    webuiLabel: string | null;
  }>;
  error?: string;
};

// ─── Header — delad HubDisplay + HubThemeToggle (linjerar med Hem/Fit/Garden)

function HubHeading({
  dark,
  onToggle,
}: {
  t: WarmTheme;
  dark: boolean;
  onToggle: () => void;
}) {
  const [, setTick] = useState(0);
  const isDesktop = useDesktop();
  useEffect(() => {
    // Tick var 30 min — eyebrow visar dag/vecka, inga minuter att uppdatera.
    const id = window.setInterval(() => setTick((x) => x + 1), 30 * 60_000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <HubDisplay
      eyebrow={formatHubEyebrow("LAB")}
      title="Homelab,"
      italicTail="allt rullar."
      right={<HubThemeToggle dark={dark} onToggle={onToggle} isDesktop={isDesktop} />}
    />
  );
}

// ─── Tillstånds-card ─────────────────────────────────────────────────────────

function StateCard({
  t,
  proxmoxOnline,
  unraidOnline,
  totalServices,
  downServices,
}: {
  t: WarmTheme;
  proxmoxOnline: boolean;
  unraidOnline: boolean;
  totalServices: number;
  downServices: number;
}) {
  const allOk = proxmoxOnline && unraidOnline && downServices === 0;
  const tagline = allOk
    ? "Allt online."
    : !proxmoxOnline || !unraidOnline
    ? "En host nere."
    : `${downServices} tjänst${downServices === 1 ? "" : "er"} avstängda.`;
  return (
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
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <span style={{ ...lab(t), letterSpacing: "0.16em" }}>TILLSTÅND</span>
        <StatusDot ok={allOk} color={allOk ? SAGE : t.bad} size={8} />
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 6,
          flexWrap: "wrap",
        }}
      >
        <span
          className="warm-tab-nums"
          style={{ ...num(t, 30, 400), lineHeight: 1.05 }}
        >
          {totalServices}
        </span>
        <span
          style={{
            fontFamily: body,
            fontSize: 13,
            color: t.mute,
            fontWeight: 500,
          }}
        >
          tjänster igång
        </span>
      </div>
      <p style={{ ...ital(t, 13, t.mute), marginTop: 4 }}>{tagline}</p>
    </div>
  );
}

// ─── Host card (klickbart, drill-down till /v3/lab/host/...) ────────────────

function HostCard({
  t,
  href,
  icon,
  title,
  online,
  uptime,
  cpu_pct,
  mem_pct,
  mem_used_gb,
  mem_total_gb,
  storageLabel,
  storagePct,
  storageOk,
  servicesLabel,
  webui,
  loading,
}: {
  t: WarmTheme;
  href: string;
  icon: React.ReactNode;
  title: string;
  online: boolean;
  uptime: string;
  cpu_pct: number;
  mem_pct: number;
  mem_used_gb: number;
  mem_total_gb: number;
  storageLabel: string | null;
  storagePct: number | null;
  storageOk: boolean | null;
  servicesLabel: string;
  webui: string;
  loading: boolean;
}) {
  const router = useRouter();
  return (
    <div
      onClick={() => router.push(href)}
      style={{
        display: "block",
        color: t.ink,
        background: t.paper,
        border: `1px solid ${t.line}`,
        borderRadius: 16,
        padding: 16,
        cursor: "pointer",
      }}
    >
      {/* Header: icon + title/status + chevron */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: t.tint,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {icon}
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span
              style={{
                fontFamily: serif,
                fontSize: 17,
                fontWeight: 500,
                letterSpacing: "-0.01em",
                color: t.ink,
              }}
            >
              {title}
            </span>
            <span
              style={{
                fontFamily: body,
                fontSize: 11,
                color: online ? SAGE : t.bad,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <StatusDot ok={online} color={online ? SAGE : t.bad} size={6} />
              {loading ? "hämtar…" : online ? `online · ${uptime}` : "offline"}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <a
            href={webui}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
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
          <ChevronRight size={16} color={t.dim} />
        </div>
      </div>

      {/* Services summary — full-width row, small italic, no wrap risk */}
      {!loading && servicesLabel && (
        <p
          style={{
            fontFamily: body,
            fontSize: 10,
            color: t.dim,
            fontStyle: "italic",
            margin: "0 0 10px 0",
            lineHeight: 1.3,
          }}
        >
          {servicesLabel}
        </p>
      )}

      {/* Stats: flat rows — no nested boxes */}
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        <FlatStatRow t={t} label="CPU" value={`${cpu_pct}%`} pct={cpu_pct} />
        <FlatStatRow
          t={t}
          label="RAM"
          value={`${mem_used_gb.toFixed(1)}/${mem_total_gb.toFixed(0)} GB`}
          pct={mem_pct}
        />
        {storageLabel != null && storagePct != null && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              paddingTop: 6,
              borderTop: `1px solid ${t.line}`,
            }}
          >
            <span style={{ ...lab(t), minWidth: 44 }}>ARRAY</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Bar
                t={t}
                value={storagePct}
                color={storagePct >= 90 ? t.bad : storagePct >= 80 ? t.warn : SAGE}
                height={4}
              />
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                minWidth: 0,
              }}
            >
              <span
                className="warm-tab-nums"
                style={{
                  fontFamily: body,
                  fontSize: 11,
                  color:
                    storagePct >= 90 ? t.bad : storagePct >= 80 ? t.warn : t.mute,
                  fontWeight: 500,
                }}
              >
                {storageLabel}
              </span>
              {storageOk != null && (
                <span
                  style={{
                    fontFamily: body,
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase" as const,
                    color: storageOk ? SAGE : t.warn,
                  }}
                >
                  {storageOk ? "✓" : "!"}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FlatStatRow({
  t,
  label,
  value,
  pct,
}: {
  t: WarmTheme;
  label: string;
  value: string;
  pct: number;
}) {
  const color = pct >= 85 ? t.bad : pct >= 70 ? t.warn : ACC;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ ...lab(t), minWidth: 32 }}>{label}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Bar t={t} value={pct} color={color} height={4} />
      </div>
      <span
        className="warm-tab-nums"
        style={{
          fontFamily: body,
          fontSize: 11,
          fontWeight: 500,
          color: pct >= 70 ? color : t.mute,
          minWidth: 56,
          textAlign: "right" as const,
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Services grid ───────────────────────────────────────────────────────────

const NAMED_SERVICES = [
  { name: "HA", href: "https://iot.inicio.cloud" },
  { name: "Nextcloud", href: "https://nextcloud.inicio.cloud" },
  { name: "Adguard", href: "https://adblock.inicio.cloud" },
  { name: "Portainer", href: "https://portainer.inicio.cloud" },
  { name: "Seerr", href: "https://overseerr.inicio.cloud" },
  { name: "Sonarr", href: "https://sonarr.inicio.cloud" },
  { name: "Radarr", href: "https://radarr.inicio.cloud" },
  { name: "Torrent", href: "https://torrent.inicio.cloud" },
];

function ServicesGrid({ t }: { t: WarmTheme }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={lab(t)}>TJÄNSTER</span>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 8,
        }}
      >
        {NAMED_SERVICES.map((svc) => (
          <a
            key={svc.name}
            href={svc.href}
            style={{
              background: t.paper,
              border: `1px solid ${t.line}`,
              borderRadius: 12,
              padding: "10px 10px 8px",
              display: "flex",
              flexDirection: "column",
              gap: 6,
              textDecoration: "none",
              color: t.ink,
            }}
          >
            <StatusDot ok={true} color={SAGE} size={7} />
            <span
              style={{
                fontFamily: body,
                fontSize: 11,
                fontWeight: 600,
                color: t.mute,
                letterSpacing: "0.01em",
                whiteSpace: "nowrap" as const,
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {svc.name}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function WarmLabHub() {
  const { t, dark, toggle } = useWarmTheme();
  const hydrated = useHydrated();

  const {
    data: proxmox,
    error: proxmoxError,
    mutate: mProxmox,
  } = useSWR<ProxmoxData>(
    hydrated ? "/api/homelab/proxmox" : null,
    fetcher,
    { refreshInterval: 5_000 }
  );
  const { data: unraid, error: unraidError } = useSWR<UnraidData>(
    hydrated ? "/api/homelab/unraid" : null,
    fetcher,
    { refreshInterval: 5_000 }
  );
  const { data: portainer } = useSWR<PortainerData>(
    hydrated ? "/api/homelab/portainer" : null,
    fetcher,
    { refreshInterval: 5_000 }
  );

  const proxNode = proxmox?.nodes?.[0];
  const proxVmsRunning = proxNode?.vms.filter((v) => v.status === "running").length ?? 0;
  const proxVmsStopped = proxNode?.vms.filter((v) => v.status !== "running").length ?? 0;
  const proxContainers = portainer?.containers?.length ?? 0;
  const unraidContainers = unraid?.containers?.filter((c) => c.state === "RUNNING").length ?? 0;
  const unraidContainersStopped = unraid?.containers?.filter((c) => c.state !== "RUNNING").length ?? 0;

  const proxOnline = proxNode?.status === "online";
  const unraidOnline = unraid?.system != null;

  const totalServices = proxVmsRunning + proxContainers + unraidContainers;
  const downServices = proxVmsStopped + unraidContainersStopped;

  const proxLoading = !proxmox && !proxmoxError;
  const unraidLoading = !unraid && !unraidError;

  return (
    <>
      <HubHeading t={t} dark={dark} onToggle={toggle} />

      <div
        style={{
          padding: "0 22px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        {(proxmoxError || unraidError || proxmox?.error || unraid?.error) && (
          <WarmErrorBanner
            t={t}
            message={
              proxmox?.error ??
              unraid?.error ??
              "Kunde inte nå hemlab-tjänsterna."
            }
            onRetry={() => mProxmox()}
          />
        )}

        <StateCard
          t={t}
          proxmoxOnline={proxOnline}
          unraidOnline={unraidOnline}
          totalServices={totalServices}
          downServices={downServices}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span style={lab(t)}>HOSTAR</span>

          <HostCard
            t={t}
            href="/v3/lab/host/proxmox"
            webui="https://proxmox.inicio.cloud"
            icon={<ServerIcon size={16} color={ACC} />}
            title={proxNode?.node ?? "proxmox"}
            online={proxOnline}
            uptime={proxNode?.uptime ?? "—"}
            cpu_pct={proxNode?.cpu_pct ?? 0}
            mem_pct={proxNode?.mem_pct ?? 0}
            mem_used_gb={proxNode?.mem_used_gb ?? 0}
            mem_total_gb={proxNode?.mem_total_gb ?? 0}
            storageLabel={null}
            storagePct={null}
            storageOk={null}
            servicesLabel={
              proxNode
                ? `${proxVmsRunning} VM/LXC igång${
                    proxVmsStopped > 0 ? ` · ${proxVmsStopped} stoppad` : ""
                  } · ${proxContainers} containrar`
                : "—"
            }
            loading={proxLoading}
          />

          <HostCard
            t={t}
            href="/v3/lab/host/unraid"
            webui="https://unraid.inicio.cloud"
            icon={<StorageIcon size={16} color={ACC} />}
            title="unraid"
            online={unraidOnline}
            uptime={unraid?.system?.uptime ?? "—"}
            cpu_pct={unraid?.system?.cpu_pct ?? 0}
            mem_pct={unraid?.system?.mem_pct ?? 0}
            mem_used_gb={unraid?.system?.mem_used_gb ?? 0}
            mem_total_gb={unraid?.system?.mem_total_gb ?? 0}
            storageLabel={
              unraid?.array
                ? `${unraid.array.used_tb}/${unraid.array.total_tb} TB`
                : null
            }
            storagePct={unraid?.array?.used_pct ?? null}
            storageOk={unraid?.array?.parity_ok ?? null}
            servicesLabel={
              unraid
                ? `${unraidContainers} containrar igång${
                    unraidContainersStopped > 0
                      ? ` · ${unraidContainersStopped} stoppad`
                      : ""
                  }`
                : "—"
            }
            loading={unraidLoading}
          />
        </div>

        <ServicesGrid t={t} />

        {/* Status-sektion — placeholder */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={lab(t)}>STATUS</span>
          <div
            style={{
              border: `1px dashed ${t.line}`,
              borderRadius: 14,
              padding: "20px 16px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              background: t.paper,
            }}
          >
            <span style={{ ...num(t, 13, 400), color: t.dim }}>
              Kommer snart
            </span>
            <span style={ital(t, 12, t.dim)}>
              uptime · latensmätningar · varningar
            </span>
          </div>
        </div>

      </div>
    </>
  );
}

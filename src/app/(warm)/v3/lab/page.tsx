"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useHydrated, useWarmTheme } from "@/lib/warm/theme";
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
import { ChevronRight } from "@/components/warm/icons/extra";
import { ServerIcon, StorageIcon, ContainerIcon, StatusDot } from "@/components/warm/icons/lab";
import { ThemeIcon } from "@/components/warm/icons";
import WarmErrorBanner from "@/components/warm/WarmErrorBanner";
import { formatTime } from "@/lib/warm/format";

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

// ─── Header (likt HemHub) ───────────────────────────────────────────────────

function HubHeading({
  t,
  dark,
  onToggle,
}: {
  t: WarmTheme;
  dark: boolean;
  onToggle: () => void;
}) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((x) => x + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);
  void tick;
  return (
    <header
      style={{
        padding: "20px 22px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{ ...lab(t), color: ACC, letterSpacing: "0.18em" }}
          className="warm-tab-nums"
        >
          LAB · {formatTime(new Date())}
        </span>
        <button
          type="button"
          onClick={onToggle}
          aria-label="Växla tema"
          style={{
            width: 34,
            height: 34,
            borderRadius: 999,
            background: t.paperHi,
            border: `1px solid ${t.line}`,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <ThemeIcon dark={dark} color={t.ink} size={15} />
        </button>
      </div>
      <h1
        style={{
          ...num(t, 32, 400),
          lineHeight: 1.05,
          letterSpacing: "-0.02em",
        }}
      >
        Hemlab,{" "}
        <span style={{ ...ital(t, 32, t.dim), fontWeight: 400 }}>
          allt rullar.
        </span>
      </h1>
    </header>
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
  loading: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "block",
        textDecoration: "none",
        color: t.ink,
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
          marginBottom: 14,
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
              <StatusDot
                ok={online}
                color={online ? SAGE : t.bad}
                size={6}
              />
              {loading
                ? "hämtar…"
                : online
                ? `online · ${uptime}`
                : "offline"}
            </span>
          </div>
        </div>
        <ChevronRight size={16} color={t.dim} />
      </div>

      {/* Stats: CPU / RAM */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 10,
          marginBottom: storageLabel != null ? 10 : 0,
        }}
      >
        <StatBlock t={t} label="CPU" value={`${cpu_pct}%`} pct={cpu_pct} />
        <StatBlock
          t={t}
          label="RAM"
          value={`${mem_used_gb.toFixed(1)}/${mem_total_gb.toFixed(0)} GB`}
          pct={mem_pct}
        />
      </div>

      {/* Storage-rad */}
      {storageLabel != null && storagePct != null && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            paddingTop: 10,
            borderTop: `1px solid ${t.line}`,
          }}
        >
          <span style={{ ...lab(t), minWidth: 56 }}>LAGRING</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Bar
              t={t}
              value={storagePct}
              color={
                storagePct >= 90
                  ? t.bad
                  : storagePct >= 80
                  ? t.warn
                  : SAGE
              }
              height={5}
            />
          </div>
          <span
            className="warm-tab-nums"
            style={{
              fontFamily: body,
              fontSize: 11,
              color:
                storagePct >= 90
                  ? t.bad
                  : storagePct >= 80
                  ? t.warn
                  : t.mute,
              fontWeight: 500,
            }}
          >
            {storageLabel}
          </span>
        </div>
      )}

      {/* Tjänst-rad */}
      <div
        style={{
          marginTop: storageLabel != null ? 8 : 10,
          paddingTop: storageLabel != null ? 0 : 10,
          borderTop: storageLabel != null ? "none" : `1px solid ${t.line}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={ital(t, 12, t.mute)}>{servicesLabel}</span>
        {storageOk != null && (
          <span
            style={{
              fontFamily: body,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: storageOk ? SAGE : t.warn,
            }}
          >
            {storageOk ? "✓ paritet ok" : "kontrollera"}
          </span>
        )}
      </div>
    </Link>
  );
}

function StatBlock({
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
  return (
    <div
      style={{
        background: t.paperHi,
        border: `1px solid ${t.line}`,
        borderRadius: 12,
        padding: "9px 11px",
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
        <span style={lab(t)}>{label}</span>
        <span
          className="warm-tab-nums"
          style={{
            fontFamily: serif,
            fontSize: 14,
            fontWeight: 500,
            color: t.ink,
            letterSpacing: "-0.01em",
          }}
        >
          {value}
        </span>
      </div>
      <Bar
        t={t}
        value={pct}
        color={pct >= 85 ? t.bad : pct >= 70 ? t.warn : ACC}
        height={4}
      />
    </div>
  );
}

// ─── Services-strip ──────────────────────────────────────────────────────────

function ServicesStrip({
  t,
  proxVms,
  proxContainers,
  unraidContainers,
}: {
  t: WarmTheme;
  proxVms: number;
  proxContainers: number;
  unraidContainers: number;
}) {
  const items: Array<{ label: string; count: number; tone: string }> = [
    { label: "VM/LXC", count: proxVms, tone: "vm" },
    { label: "Docker · proxmox", count: proxContainers, tone: "ctr" },
    { label: "Docker · unraid", count: unraidContainers, tone: "ctr" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={lab(t)}>TJÄNSTER</span>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 8,
        }}
      >
        {items.map((it) => (
          <div
            key={it.label}
            style={{
              background: t.paper,
              border: `1px solid ${t.line}`,
              borderRadius: 12,
              padding: "10px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <span
              className="warm-tab-nums"
              style={{
                ...num(t, 22, 400),
                lineHeight: 1,
              }}
            >
              {it.count}
            </span>
            <span
              style={{
                fontFamily: body,
                fontSize: 10,
                fontWeight: 500,
                color: t.mute,
                letterSpacing: "0.04em",
              }}
            >
              {it.label}
            </span>
          </div>
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
            icon={<StorageIcon size={16} color={ACC} />}
            title={unraid?.system?.hostname ?? "unraid"}
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

        <ServicesStrip
          t={t}
          proxVms={proxVmsRunning}
          proxContainers={proxContainers}
          unraidContainers={unraidContainers}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            paddingTop: 4,
          }}
        >
          <span
            style={{
              ...ital(t, 12, t.dim),
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <ContainerIcon size={13} color={t.dim} />
            klicka en host för detaljer
          </span>
        </div>
      </div>
    </>
  );
}

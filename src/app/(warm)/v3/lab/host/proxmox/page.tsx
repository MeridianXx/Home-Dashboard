"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Bar, Ring } from "@/components/warm/primitives";
import { ChevronLeft } from "@/components/warm/icons/extra";
import { ServerIcon, StatusDot } from "@/components/warm/icons/lab";
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

// ─── Header (back-chevron + LAB · HH:MM + titel) ─────────────────────────────

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
      <button
        type="button"
        onClick={back}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontFamily: body,
          fontSize: 14,
          color: t.mute,
          cursor: "pointer",
          alignSelf: "flex-start",
        }}
      >
        <ChevronLeft size={14} color={t.mute} />
        Lab
      </button>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span
          style={{ ...lab(t), color: ACC, letterSpacing: "0.18em" }}
          className="warm-tab-nums"
        >
          LAB · {formatTime(new Date())}
        </span>
        <h1
          style={{
            ...num(t, 30, 400),
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
          }}
        >
          {title},{" "}
          <span style={{ ...ital(t, 30, t.dim) }}>{italicTail}</span>
        </h1>
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

// ─── Ring-trio + Foot-rad ────────────────────────────────────────────────────

function RingTrio({
  t,
  cpu,
  ram,
  ramLabel,
  cores,
}: {
  t: WarmTheme;
  cpu: number;
  ram: number;
  ramLabel: string;
  cores: number;
}) {
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
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 12,
          alignItems: "center",
        }}
      >
        <RingBlock
          t={t}
          label="CPU"
          value={`${cpu}%`}
          pct={cpu}
          tagline={`${cores} kärnor`}
        />
        <RingBlock
          t={t}
          label="RAM"
          value={`${ram}%`}
          pct={ram}
          tagline={ramLabel}
        />
      </div>
    </div>
  );
}

function RingBlock({
  t,
  label,
  value,
  pct,
  tagline,
}: {
  t: WarmTheme;
  label: string;
  value: string;
  pct: number;
  tagline: string;
}) {
  const color = pct >= 85 ? t.bad : pct >= 70 ? t.warn : ACC;
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
            fontSize: 18,
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

function FootRow({
  t,
  items,
}: {
  t: WarmTheme;
  items: Array<{ label: string; value: string }>;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
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
            padding: "8px 10px",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            alignItems: "flex-start",
          }}
        >
          <span style={{ ...lab(t), fontSize: 9 }}>{it.label}</span>
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
            {it.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── VM- och container-rader ────────────────────────────────────────────────

function VmRow({
  t,
  vm,
  isFirst,
}: {
  t: WarmTheme;
  vm: PveVm;
  isFirst: boolean;
}) {
  const isVm = vm.type === "qemu";
  const running = vm.status === "running";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 14px",
        borderTop: isFirst ? "none" : `1px solid ${t.line}`,
      }}
    >
      <StatusDot
        ok={running}
        color={running ? SAGE : t.dim}
        size={7}
      />
      <span
        style={{
          fontFamily: body,
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          padding: "3px 7px",
          borderRadius: 4,
          background: isVm ? t.tintSky : t.tintSage,
          color: isVm ? "#5C7891" : t.ok,
          minWidth: 32,
          textAlign: "center",
          flexShrink: 0,
        }}
      >
        {isVm ? "VM" : "LXC"}
      </span>
      <span
        style={{
          fontFamily: serif,
          fontSize: 14,
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
        {vm.name}
      </span>
      {running ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 1,
          }}
        >
          <span
            className="warm-tab-nums"
            style={{
              fontFamily: body,
              fontSize: 11,
              color: t.ink,
              fontWeight: 500,
            }}
          >
            CPU {vm.cpu_pct}%
          </span>
          <span
            className="warm-tab-nums"
            style={{
              fontFamily: body,
              fontSize: 10,
              color: t.mute,
            }}
          >
            {vm.mem_used_gb.toFixed(1)}/{vm.mem_total_gb.toFixed(0)} GB
          </span>
        </div>
      ) : (
        <span style={ital(t, 11, t.dim)}>stoppad</span>
      )}
    </div>
  );
}

function ContainerRow({
  t,
  c,
  isFirst,
}: {
  t: WarmTheme;
  c: {
    id: string;
    name: string;
    state: string;
    webui: string | null;
    webuiLabel: string | null;
  };
  isFirst: boolean;
}) {
  const running = c.state === "running";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 14px",
        borderTop: isFirst ? "none" : `1px solid ${t.line}`,
      }}
    >
      <StatusDot
        ok={running}
        color={running ? SAGE : t.dim}
        size={7}
      />
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
          fontSize: 14,
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
      {c.webui && c.webuiLabel ? (
        <a
          href={c.webui}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="warm-tab-nums"
          style={{
            fontFamily: body,
            fontSize: 10,
            color: ACC,
            textDecoration: "none",
            background: t.tint,
            border: `1px solid ${t.line}`,
            borderRadius: 6,
            padding: "3px 7px",
            opacity: 0.9,
          }}
        >
          {c.webuiLabel}
        </a>
      ) : null}
    </div>
  );
}

// ─── Sektionslåda — bg + label-rad + innehåll ────────────────────────────────

function SectionBox({
  t,
  label,
  countLabel,
  children,
}: {
  t: WarmTheme;
  label: string;
  countLabel?: string;
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
        {countLabel && (
          <span style={ital(t, 11, t.dim)}>{countLabel}</span>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Action-knapp (ej implementerat) ─────────────────────────────────────────

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
        style={{
          fontFamily: body,
          fontSize: 13,
          fontWeight: 600,
          color: t.ink,
        }}
      >
        {label}
      </span>
      <span style={ital(t, 11, t.dim)}>{tagline}</span>
    </button>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function WarmProxmoxDetail() {
  const router = useRouter();
  const { t } = useWarmTheme();
  const hydrated = useHydrated();

  const {
    data: proxmox,
    error,
    mutate: m,
  } = useSWR<ProxmoxData>(
    hydrated ? "/api/homelab/proxmox" : null,
    fetcher,
    { refreshInterval: 5_000 }
  );
  const { data: portainer } = useSWR<PortainerData>(
    hydrated ? "/api/homelab/portainer" : null,
    fetcher,
    { refreshInterval: 5_000 }
  );

  const node = proxmox?.nodes?.[0];
  const online = node?.status === "online";
  const containers = portainer?.containers ?? [];
  const vmsRunning = node?.vms.filter((v) => v.status === "running").length ?? 0;
  const vmsStopped = node?.vms.filter((v) => v.status !== "running").length ?? 0;
  const containersRunning = containers.filter((c) => c.state === "running").length;

  const tagline = online
    ? `${vmsRunning} VM/LXC + ${containersRunning} containrar.`
    : "host nere.";

  return (
    <>
      <PageHeading
        t={t}
        back={() => router.push("/v3/lab")}
        title={node?.node ?? "proxmox"}
        italicTail={tagline}
        online={online}
        uptime={node?.uptime ?? "—"}
      />

      <div
        style={{
          padding: "0 22px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        {(error || proxmox?.error) && (
          <WarmErrorBanner
            t={t}
            message={proxmox?.error ?? "Kunde inte nå Proxmox."}
            onRetry={() => m()}
          />
        )}

        {node && (
          <>
            <RingTrio
              t={t}
              cpu={node.cpu_pct}
              ram={node.mem_pct}
              ramLabel={`${node.mem_used_gb.toFixed(1)}/${node.mem_total_gb.toFixed(0)} GB`}
              cores={node.cpu_cores}
            />

            <FootRow
              t={t}
              items={[
                { label: "NÄT IN", value: node.net_in ?? "—" },
                { label: "NÄT UT", value: node.net_out ?? "—" },
                {
                  label: "VM/LXC",
                  value:
                    vmsStopped > 0
                      ? `${vmsRunning}/${vmsRunning + vmsStopped}`
                      : `${vmsRunning}`,
                },
                {
                  label: "DOCKER",
                  value: `${containersRunning}`,
                },
              ]}
            />

            {/* VMs & LXC */}
            <SectionBox
              t={t}
              label="VIRTUELLA MASKINER"
              countLabel={
                vmsStopped > 0
                  ? `${vmsRunning} igång · ${vmsStopped} stoppad`
                  : `${vmsRunning} igång`
              }
            >
              {node.vms.map((v, i) => (
                <VmRow key={v.vmid} t={t} vm={v} isFirst={i === 0} />
              ))}
            </SectionBox>

            {/* Containers via Portainer */}
            {containers.length > 0 && (
              <SectionBox
                t={t}
                label="CONTAINERS"
                countLabel={`${containersRunning} igång`}
              >
                {containers.map((c, i) => (
                  <ContainerRow key={c.id} t={t} c={c} isFirst={i === 0} />
                ))}
              </SectionBox>
            )}

            {/* Actions — ej implementerat */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={lab(t)}>ÅTGÄRDER</span>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 8,
                }}
              >
                <ActionButton t={t} label="Backup" tagline="ej impl." />
                <ActionButton t={t} label="SSH" tagline="ej impl." />
                <ActionButton t={t} label="Starta om" tagline="ej impl." />
              </div>
              <span style={ital(t, 11, t.dim)}>
                Åtgärderna är visuella platshållare och anropar inga
                tjänster ännu.
              </span>
            </div>
          </>
        )}

        {!node && !error && (
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
            <ServerIcon size={16} color={t.mute} />
            <span style={{ fontFamily: body, fontSize: 13 }}>Hämtar Proxmox-data…</span>
          </div>
        )}
      </div>
    </>
  );
}

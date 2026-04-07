"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";

function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type PveNode = {
  node: string; status: string; cpu_pct: number; cpu_cores: number;
  mem_used_gb: number; mem_total_gb: number; mem_pct: number;
  uptime: string; net_in: string | null; net_out: string | null;
  vms: Array<{
    vmid: number; name: string; type: string; status: string;
    cpu_pct: number; mem_used_gb: number; mem_total_gb: number;
  }>;
};

type DiskEntry = {
  name: string; status: string; temp: number | null; spinning: boolean;
  errors: number; used_tb: number | null; total_tb: number | null;
  used_pct: number | null; type: "disk" | "cache";
};

type CachePool = { name: string; disks: DiskEntry[]; total_tb: number; used_tb: number; used_pct: number | null };

type UnraidData = {
  system: {
    hostname: string; uptime: string; cpu_brand: string; cpu_cores: number;
    cpu_pct: number; mem_used_gb: number; mem_total_gb: number; mem_pct: number;
  };
  array: {
    state: string; total_tb: number; used_tb: number; free_tb: number;
    used_pct: number; parity_ok: boolean; disks: DiskEntry[];
  };
  cache_pools: CachePool[];
  containers: Array<{ name: string; image: string; state: string; status: string; auto_start: boolean; group: string | null }>;
  error?: string;
};

type ProxmoxData = { nodes: PveNode[]; error?: string };

type PortainerData = {
  containers: Array<{
    id: string; name: string; state: string; status: string;
    ports: Array<{ public: number; private: number; webui: string }>;
    webui: string | null;
  }>;
  error?: string;
};

// ─── Shared UI ────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then(r => r.json());

function Card({ children, className = "", accent }: {
  children: React.ReactNode; className?: string; accent?: string;
}) {
  return (
    <div className={`rounded-2xl p-5 ${className}`} style={{
      backgroundColor: "var(--color-surface-container-lowest)",
      boxShadow: "0px 8px 24px rgba(56,56,51,0.06)",
      borderLeft: accent ? `4px solid ${accent}` : undefined,
    }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-widest mb-3"
      style={{ color: "var(--color-on-surface-variant)" }}>{children}</p>
  );
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`rounded-lg animate-pulse ${className}`}
    style={{ backgroundColor: "var(--color-surface-container)" }} />;
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-xl text-sm"
      style={{ backgroundColor: "rgba(175,59,80,0.1)", color: "var(--color-error)" }}>
      <span className="material-symbols-outlined text-[18px]">error</span>
      {message}
    </div>
  );
}

/** Bar with visible track + optional label beside it */
function StatBar({ pct, color = "var(--color-primary)", label }: { pct: number; color?: string; label?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 min-w-0 h-2 rounded-full border"
        style={{ backgroundColor: "var(--color-surface-container-high)", borderColor: "var(--color-outline-variant)" }}>
        <div className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
      </div>
      {label && <span className="text-xs font-bold shrink-0 w-10 text-right" style={{ color }}>{label}</span>}
    </div>
  );
}

/** Spinning / standby indicator */
function SpinDot({ spinning }: { spinning: boolean }) {
  return (
    <span className="w-2 h-2 rounded-full shrink-0"
      style={{ backgroundColor: spinning ? "var(--color-secondary)" : "var(--color-outline)" }} />
  );
}

/** Inline warning icon with tooltip */
function WarnTooltip({ text }: { text: string }) {
  return (
    <span className="relative group cursor-default">
      <span className="material-symbols-outlined text-[16px]" style={{ color: "var(--color-error)" }}>warning</span>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block
        whitespace-nowrap text-xs px-2 py-1 rounded-lg z-10 pointer-events-none"
        style={{ backgroundColor: "var(--color-error)", color: "#fff" }}>
        {text}
      </span>
    </span>
  );
}

/** Consistent server header block — includes bottom divider */
function ServerHeader({ hostname, online, uptime, cpu_pct, mem_pct, mem_used_gb, mem_total_gb, accent, icon }: {
  hostname: string; online: boolean; uptime: string;
  cpu_pct: number; mem_pct: number; mem_used_gb: number; mem_total_gb: number;
  accent: string; icon: string;
}) {
  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <span className="material-symbols-outlined text-2xl" style={{ color: accent }}>{icon}</span>
        <div>
          <h2 className="text-base font-bold font-headline" style={{ color: "var(--color-on-surface)" }}>{hostname}</h2>
          <p className="text-xs flex items-center gap-1.5" style={{ color: online ? "var(--color-secondary)" : "var(--color-outline)" }}>
            <span className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: online ? "var(--color-secondary)" : "var(--color-outline)" }} />
            {online ? `Online · ${uptime} uptime` : "Offline"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "CPU", value: `${cpu_pct}%`, pct: cpu_pct },
          { label: "RAM", value: `${mem_used_gb}/${mem_total_gb} GB`, pct: mem_pct },
        ].map(({ label, value, pct }) => (
          <div key={label} className="p-3 rounded-xl" style={{ backgroundColor: "var(--color-surface-container)" }}>
            <div className="flex justify-between text-xs mb-2">
              <span style={{ color: "var(--color-on-surface-variant)" }}>{label}</span>
              <span className="font-bold" style={{ color: accent }}>{value}</span>
            </div>
            <StatBar pct={pct} color={accent} />
          </div>
        ))}
      </div>

      {/* Divider — padding-based so spacing never collapses */}
      <div className="py-5">
        <div className="border-t" style={{ borderColor: "var(--color-outline-variant)" }} />
      </div>
    </>
  );
}

/** Disk row inside an integrated section box — no own background, border-t divider */
function DiskTableRow({ disk }: { disk: DiskEntry }) {
  const healthy = disk.status === "DISK_OK" && disk.errors === 0;
  const barColor = disk.used_pct != null && disk.used_pct >= 90
    ? "var(--color-error)"
    : disk.type === "cache"
      ? "var(--color-outline)"
      : "var(--color-tertiary)";
  return (
    <div className="flex items-center gap-3 px-3 py-3 border-t"
      style={{ borderColor: "var(--color-outline-variant)" }}>
      <SpinDot spinning={disk.spinning} />
      <span className="text-xs font-bold w-16 shrink-0" style={{ color: "var(--color-on-surface)" }}>{disk.name}</span>
      <div className="flex-1 min-w-0">
        {disk.used_pct != null
          ? <StatBar pct={disk.used_pct} color={barColor} />
          : <span className="text-[10px]" style={{ color: "var(--color-outline)" }}>standby</span>
        }
      </div>
      <span className="text-xs w-20 text-right shrink-0" style={{ color: "var(--color-on-surface-variant)" }}>
        {disk.used_tb != null ? `${disk.used_tb}/${disk.total_tb} TB` : "–"}
      </span>
      {disk.temp != null
        ? <span className="text-xs font-bold w-10 text-right shrink-0"
            style={{ color: disk.temp > 50 ? "var(--color-error)" : disk.temp > 40 ? "var(--color-tertiary)" : "var(--color-on-surface-variant)" }}>
            {disk.temp}°C
          </span>
        : <span className="w-10 shrink-0" />
      }
      <span className="material-symbols-outlined text-[16px] shrink-0"
        style={{ color: healthy ? "var(--color-secondary)" : "var(--color-error)" }}>
        {healthy ? "check_circle" : "error"}
      </span>
    </div>
  );
}

// ─── Proxmox Card ─────────────────────────────────────────────────────────────

function ProxmoxCard() {
  const hydrated = useHydrated();
  const { data, error, isLoading } = useSWR<ProxmoxData>(
    "/api/homelab/proxmox", fetcher, { refreshInterval: 5_000 }
  );
  const { data: portainer } = useSWR<PortainerData>(
    "/api/homelab/portainer", fetcher, { refreshInterval: 5_000 }
  );
  const n = data?.nodes?.[0];
  const pContainers = portainer?.containers ?? [];

  return (
    <Card accent="var(--color-primary)">
      {error || data?.error ? (
        <ErrorBanner message={data?.error ?? "Kunde inte nå Proxmox"} />
      ) : !hydrated || isLoading || !n ? (
        <div className="space-y-3">
          <Skeleton className="h-10" /><Skeleton className="h-14" /><Skeleton className="h-32" />
        </div>
      ) : (
        <>
          <ServerHeader
            hostname="proxmox" online={n.status === "online"} uptime={n.uptime}
            cpu_pct={n.cpu_pct} mem_pct={n.mem_pct}
            mem_used_gb={n.mem_used_gb} mem_total_gb={n.mem_total_gb}
            accent="var(--color-primary)" icon="dns"
          />

          {/* VMs & LXC */}
          <div>
            <SectionLabel>Virtual Machines &amp; Containers</SectionLabel>
            <div className="space-y-1.5">
              {n.vms.map(v => {
                const isVM = v.type === "qemu";
                const running = v.status === "running";
                return (
                  <div key={v.vmid} className="flex items-center gap-2.5 p-2.5 rounded-lg"
                    style={{ backgroundColor: "var(--color-surface-container)" }}>
                    <span className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: running ? "var(--color-secondary)" : "var(--color-outline)" }} />
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0"
                      style={isVM
                        ? { backgroundColor: "rgba(71,91,194,0.18)", color: "var(--color-primary)" }
                        : { backgroundColor: "rgba(100,170,120,0.18)", color: "var(--color-secondary)" }}>
                      {isVM ? "VM" : "LXC"}
                    </span>
                    <span className="text-sm font-mono font-semibold flex-1 min-w-0 truncate"
                      style={{ color: "var(--color-on-surface)" }}>{v.name}</span>
                    {running ? (
                      <div className="text-xs shrink-0 text-right" style={{ color: "var(--color-on-surface-variant)" }}>
                        <span>CPU {v.cpu_pct}%</span>
                        <span className="ml-2">RAM {v.mem_used_gb}/{v.mem_total_gb} GB</span>
                      </div>
                    ) : (
                      <span className="text-xs shrink-0" style={{ color: "var(--color-outline)" }}>stoppad</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Docker containers via Portainer */}
          {pContainers.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-bold uppercase tracking-widest"
                  style={{ color: "var(--color-on-surface-variant)" }}>Containers</p>
                <span className="text-xs" style={{ color: "var(--color-on-surface-variant)" }}>
                  {pContainers.length} igång
                </span>
              </div>
              <div className="space-y-1.5">
                {pContainers.map(c => (
                  <div key={c.id} className="flex items-center gap-2.5 p-2.5 rounded-lg"
                    style={{ backgroundColor: "var(--color-surface-container)" }}>
                    <span className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: "var(--color-secondary)" }} />
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0"
                      style={{ backgroundColor: "rgba(71,91,194,0.12)", color: "var(--color-primary)" }}>
                      CTR
                    </span>
                    <span className="text-sm font-mono font-semibold flex-1 min-w-0 truncate"
                      style={{ color: "var(--color-on-surface)" }}>{c.name}</span>
                    {c.webui ? (
                      <a href={c.webui} target="_blank" rel="noopener noreferrer"
                        className="text-xs font-mono shrink-0 px-1.5 py-0.5 rounded-md transition-opacity hover:opacity-100 opacity-60"
                        style={{ backgroundColor: "rgba(71,91,194,0.10)", color: "var(--color-primary)" }}>
                        :{c.ports.find(p => p.webui === c.webui)?.public}
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

// ─── Unraid Card ──────────────────────────────────────────────────────────────

function UnraidCard() {
  const hydrated = useHydrated();
  const { data, error, isLoading } = useSWR<UnraidData>(
    "/api/homelab/unraid", fetcher, { refreshInterval: 5_000 }
  );
  const sys = data?.system;
  const arr = data?.array;
  const pools = data?.cache_pools ?? [];

  return (
    <Card accent="var(--color-tertiary)">
      {error || data?.error ? (
        <ErrorBanner message={data?.error ?? "Kunde inte nå Unraid"} />
      ) : !hydrated || isLoading || !sys ? (
        <div className="space-y-3">
          <Skeleton className="h-10" /><Skeleton className="h-14" /><Skeleton className="h-40" />
        </div>
      ) : (
        <>
          <ServerHeader
            hostname="unraid" online uptime={sys.uptime}
            cpu_pct={sys.cpu_pct} mem_pct={sys.mem_pct}
            mem_used_gb={sys.mem_used_gb} mem_total_gb={sys.mem_total_gb}
            accent="var(--color-tertiary)" icon="storage"
          />

          {arr && (
            <div className="space-y-4">
              <SectionLabel>Storage</SectionLabel>

              {/* Array — label + summary bar INSIDE the box */}
              <div className="rounded-xl overflow-hidden border"
                style={{ backgroundColor: "var(--color-surface-container)", borderColor: "var(--color-outline-variant)" }}>
                {/* Box header: label + usage + optional warning */}
                <div className="flex items-center justify-between px-3 py-3 border-b"
                  style={{ borderColor: "var(--color-outline-variant)" }}>
                  <p className="text-[11px] font-bold uppercase tracking-widest"
                    style={{ color: "var(--color-on-surface-variant)" }}>Array</p>
                  <div className="flex items-center gap-3">
                    {arr.used_pct >= 85 && (
                      <span className="flex items-center gap-1 text-xs font-medium" style={{ color: "var(--color-error)" }}>
                        <span className="material-symbols-outlined text-[13px]">warning</span>
                        {arr.free_tb} TB kvar
                      </span>
                    )}
                    <span className="text-xs font-bold"
                      style={{ color: arr.used_pct >= 85 ? "var(--color-error)" : "var(--color-tertiary)" }}>
                      {arr.used_tb}/{arr.total_tb} TB
                    </span>
                  </div>
                </div>
                {/* Summary bar */}
                <div className="px-3 py-3 border-b" style={{ borderColor: "var(--color-outline-variant)" }}>
                  <div className="flex items-center justify-between text-[11px] mb-2">
                    <span style={{ color: "var(--color-outline)" }}>{arr.state}</span>
                    <span style={{ color: "var(--color-outline)" }}>{arr.used_pct}%</span>
                  </div>
                  <StatBar pct={arr.used_pct} color={arr.used_pct >= 85 ? "var(--color-error)" : "var(--color-tertiary)"} />
                </div>
                {/* Disk rows */}
                {arr.disks.map(d => <DiskTableRow key={d.name} disk={d} />)}
              </div>

              {/* Cache pools — same structure */}
              {pools.map(pool => {
                const poolColor = "var(--color-secondary)";
                return (
                  <div key={pool.name} className="rounded-xl overflow-hidden border"
                    style={{ backgroundColor: "var(--color-surface-container)", borderColor: "var(--color-outline-variant)" }}>
                    {/* Box header */}
                    <div className="flex items-center justify-between px-3 py-3 border-b"
                      style={{ borderColor: "var(--color-outline-variant)" }}>
                      <p className="text-[11px] font-bold uppercase tracking-widest"
                        style={{ color: "var(--color-on-surface-variant)" }}>
                        {pool.name.replace(/_/g, " ")}
                      </p>
                      <span className="text-xs font-bold" style={{ color: "var(--color-on-surface-variant)" }}>
                        {pool.used_tb}/{pool.total_tb} TB
                      </span>
                    </div>
                    {/* Summary bar */}
                    {pool.used_pct != null && (
                      <div className="px-3 py-3 border-b" style={{ borderColor: "var(--color-outline-variant)" }}>
                        <div className="flex items-center justify-between text-[11px] mb-2">
                          <span style={{ color: "var(--color-outline)" }}>pool</span>
                          <span style={{ color: "var(--color-outline)" }}>{pool.used_pct}%</span>
                        </div>
                        <StatBar pct={pool.used_pct} color={poolColor} />
                      </div>
                    )}
                    {/* Disk rows */}
                    {pool.disks.map(d => <DiskTableRow key={d.name} disk={d} />)}
                  </div>
                );
              })}
            </div>
          )}

        </>
      )}
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomelabPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight font-headline"
          style={{ color: "var(--color-on-surface)" }}>Homelab</h1>
        <p className="text-sm font-medium mt-1" style={{ color: "var(--color-on-surface-variant)" }}>
          Proxmox · Unraid · live-data · uppdateras var 5:e sek
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
        <ProxmoxCard />
        <UnraidCard />
      </div>
    </div>
  );
}

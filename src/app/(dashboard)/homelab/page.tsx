"use client";

import useSWR from "swr";

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
  containers: Array<{ name: string; image: string; state: string; status: string; auto_start: boolean }>;
  error?: string;
};

type ProxmoxData = { nodes: PveNode[]; error?: string };

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

/** Consistent server header block */
function ServerHeader({ hostname, online, uptime, cpu_pct, mem_pct, mem_used_gb, mem_total_gb, net_in, net_out, accent, icon, sub }: {
  hostname: string; online: boolean; uptime: string;
  cpu_pct: number; mem_pct: number; mem_used_gb: number; mem_total_gb: number;
  net_in?: string | null; net_out?: string | null;
  accent: string; icon: string; sub?: string;
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
            {sub && <span style={{ color: "var(--color-outline)" }}>· {sub}</span>}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
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

      {(net_in || net_out) && (
        <div className="flex items-center gap-4 px-1 mb-1 text-xs" style={{ color: "var(--color-on-surface-variant)" }}>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">arrow_downward</span>
            <span className="font-semibold" style={{ color: "var(--color-on-surface)" }}>{net_in}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">arrow_upward</span>
            <span className="font-semibold" style={{ color: "var(--color-on-surface)" }}>{net_out}</span>
          </span>
          <span>nät i/o</span>
        </div>
      )}
    </>
  );
}

/** Disk row used in both array and cache sections */
function DiskRow({ disk }: { disk: DiskEntry }) {
  const warn = disk.errors > 0;
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg"
      style={{ backgroundColor: "var(--color-surface-container)" }}>
      <SpinDot spinning={disk.spinning} />
      <span className="text-xs font-bold w-14 shrink-0" style={{ color: "var(--color-on-surface)" }}>{disk.name}</span>
      <div className="flex-1 min-w-0">
        {disk.used_pct != null
          ? <StatBar pct={disk.used_pct} color={disk.used_pct >= 90 ? "var(--color-error)" : disk.type === "cache" ? "var(--color-outline)" : "var(--color-tertiary)"} />
          : <span className="text-[10px]" style={{ color: "var(--color-outline)" }}>standby</span>
        }
      </div>
      <span className="text-xs w-20 text-right shrink-0" style={{ color: "var(--color-on-surface-variant)" }}>
        {disk.used_tb != null ? `${disk.used_tb}/${disk.total_tb} TB` : disk.status}
      </span>
      {disk.temp != null
        ? <span className="text-xs font-bold w-10 text-right shrink-0"
            style={{ color: disk.temp > 50 ? "var(--color-error)" : disk.temp > 40 ? "var(--color-tertiary)" : "var(--color-on-surface-variant)" }}>
            {disk.temp}°C
          </span>
        : <span className="w-10 shrink-0" />
      }
      {warn && <WarnTooltip text={`${disk.errors} fel`} />}
    </div>
  );
}

// ─── Proxmox Card ─────────────────────────────────────────────────────────────

function ProxmoxCard() {
  const { data, error, isLoading } = useSWR<ProxmoxData>(
    "/api/homelab/proxmox", fetcher, { refreshInterval: 30_000 }
  );
  const n = data?.nodes?.[0];

  return (
    <Card accent="var(--color-primary)">
      {error || data?.error ? (
        <ErrorBanner message={data?.error ?? "Kunde inte nå Proxmox"} />
      ) : isLoading || !n ? (
        <div className="space-y-3">
          <Skeleton className="h-10" /><Skeleton className="h-14" /><Skeleton className="h-32" />
        </div>
      ) : (
        <>
          <ServerHeader
            hostname="Proxmox VE" online={n.status === "online"} uptime={n.uptime}
            cpu_pct={n.cpu_pct} mem_pct={n.mem_pct}
            mem_used_gb={n.mem_used_gb} mem_total_gb={n.mem_total_gb}
            net_in={n.net_in} net_out={n.net_out}
            accent="var(--color-primary)" icon="dns"
            sub={`${n.cpu_cores} kärnor`}
          />

          <div className="mt-4">
            <SectionLabel>Virtual Machines &amp; Containers</SectionLabel>
            <div className="space-y-1.5">
              {n.vms.map(v => (
                <div key={v.vmid} className="flex items-center gap-2.5 p-2.5 rounded-lg"
                  style={{ backgroundColor: "var(--color-surface-container)" }}>
                  <span className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: v.status === "running" ? "var(--color-secondary)" : "var(--color-outline)" }} />
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                    style={{ backgroundColor: "var(--color-surface-container-high)", color: "var(--color-on-surface-variant)" }}>
                    {v.type === "qemu" ? "VM" : "LXC"}
                  </span>
                  <span className="text-sm font-mono font-semibold flex-1 min-w-0 truncate" style={{ color: "var(--color-on-surface)" }}>{v.name}</span>
                  {v.status === "running"
                    ? <span className="text-xs shrink-0" style={{ color: "var(--color-on-surface-variant)" }}>{v.cpu_pct}% · {v.mem_used_gb}/{v.mem_total_gb} GB</span>
                    : <span className="text-xs shrink-0" style={{ color: "var(--color-outline)" }}>stoppad</span>
                  }
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

// ─── Unraid Card ──────────────────────────────────────────────────────────────

function UnraidCard() {
  const { data, error, isLoading } = useSWR<UnraidData>(
    "/api/homelab/unraid", fetcher, { refreshInterval: 30_000 }
  );
  const sys = data?.system;
  const arr = data?.array;
  const pools = data?.cache_pools ?? [];

  return (
    <Card accent="var(--color-tertiary)">
      {error || data?.error ? (
        <ErrorBanner message={data?.error ?? "Kunde inte nå Unraid"} />
      ) : isLoading || !sys ? (
        <div className="space-y-3">
          <Skeleton className="h-10" /><Skeleton className="h-14" /><Skeleton className="h-40" />
        </div>
      ) : (
        <>
          <ServerHeader
            hostname={sys.hostname} online uptime={sys.uptime}
            cpu_pct={sys.cpu_pct} mem_pct={sys.mem_pct}
            mem_used_gb={sys.mem_used_gb} mem_total_gb={sys.mem_total_gb}
            accent="var(--color-tertiary)" icon="storage"
            sub={`i9-9900K · ${sys.cpu_cores} kärnor`}
          />

          {arr && (
            <div className="mt-4">
              {/* Array */}
              <div className="flex items-center gap-2 mb-2">
                <SectionLabel>Array</SectionLabel>
                {arr.used_pct >= 85 && (
                  <span className="mb-3">
                    <WarnTooltip text={`${arr.used_pct}% full — ${arr.free_tb} TB kvar`} />
                  </span>
                )}
              </div>
              <div className="p-3 rounded-xl mb-2" style={{ backgroundColor: "var(--color-surface-container)" }}>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span style={{ color: "var(--color-on-surface-variant)" }}>{arr.state}</span>
                  <span className="font-bold" style={{ color: arr.used_pct >= 85 ? "var(--color-error)" : "var(--color-tertiary)" }}>
                    {arr.used_tb}/{arr.total_tb} TB
                  </span>
                </div>
                <StatBar pct={arr.used_pct} color={arr.used_pct >= 85 ? "var(--color-error)" : "var(--color-tertiary)"} />
              </div>
              <div className="space-y-1.5">
                {arr.disks.map(d => <DiskRow key={d.name} disk={d} />)}
              </div>

              {/* Cache pools */}
              {pools.map(pool => (
                <div key={pool.name} className="mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <SectionLabel>{pool.name.replace(/_/g, " ").toUpperCase()}</SectionLabel>
                  </div>
                  <div className="p-3 rounded-xl mb-2" style={{ backgroundColor: "var(--color-surface-container)" }}>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span style={{ color: "var(--color-on-surface-variant)" }}>pool</span>
                      <span className="font-bold" style={{ color: "var(--color-on-surface-variant)" }}>
                        {pool.used_tb}/{pool.total_tb} TB
                      </span>
                    </div>
                    {pool.used_pct != null && <StatBar pct={pool.used_pct} color="var(--color-outline)" />}
                  </div>
                  <div className="space-y-1.5">
                    {pool.disks.map(d => <DiskRow key={d.name} disk={d} />)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

// ─── Containers Card ──────────────────────────────────────────────────────────

function ContainersCard() {
  const { data, isLoading } = useSWR<UnraidData>("/api/homelab/unraid", fetcher, { refreshInterval: 30_000 });
  const containers = data?.containers ?? [];
  const problems = containers.filter(c => c.auto_start && c.state !== "RUNNING");
  const running = containers.filter(c => c.state === "RUNNING").length;

  return (
    <Card className="xl:col-span-2">
      <div className="flex items-center justify-between mb-3">
        <SectionLabel>Unraid — Docker-containers</SectionLabel>
        {!isLoading && containers.length > 0 && (
          <span className="text-xs mb-3">
            <span style={{ color: "var(--color-secondary)" }}>{running} igång</span>
            {" / "}
            <span style={{ color: "var(--color-on-surface-variant)" }}>{containers.length} totalt</span>
          </span>
        )}
      </div>

      {problems.length > 0 && (
        <div className="mb-3 space-y-1">
          {problems.map(c => (
            <div key={c.name} className="flex items-center gap-2 p-2 rounded-lg text-xs"
              style={{ backgroundColor: "rgba(175,59,80,0.08)", color: "var(--color-error)" }}>
              <span className="material-symbols-outlined text-[14px]">warning</span>
              <span className="font-semibold">{c.name}</span>
              <span className="font-normal opacity-70">{c.status}</span>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {containers
            .filter(c => c.auto_start)
            .sort((a, b) => (b.state === "RUNNING" ? 1 : 0) - (a.state === "RUNNING" ? 1 : 0))
            .map(c => (
              <div key={c.name} className="flex items-center gap-2 p-2.5 rounded-xl"
                style={{ backgroundColor: "var(--color-surface-container)" }}>
                <span className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: c.state === "RUNNING" ? "var(--color-secondary)" : "var(--color-error)" }} />
                <span className="text-xs font-semibold truncate" style={{ color: "var(--color-on-surface)" }}>{c.name}</span>
              </div>
            ))}
        </div>
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
          Proxmox · Unraid · live-data · uppdateras var 30:e sek
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ProxmoxCard />
        <UnraidCard />
        <ContainersCard />
      </div>
    </div>
  );
}

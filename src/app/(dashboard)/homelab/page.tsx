"use client";

import useSWR from "swr";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProxmoxData = {
  nodes: Array<{
    node: string; status: string; cpu_pct: number; cpu_cores: number;
    mem_used_gb: number; mem_total_gb: number; uptime_s: number;
  }>;
  vms: Array<{
    vmid: number; name: string; type: string; node: string; status: string;
    cpu_pct: number; mem_used_gb: number; mem_total_gb: number; uptime_s: number;
  }>;
};

type UnraidData = {
  system: {
    hostname: string; version: string; uptime: string;
    cpu_brand: string; cpu_cores: number; cpu_threads: number; cpu_pct: number;
    mem_used_gb: number; mem_total_gb: number; mem_pct: number;
  };
  array: {
    state: string; total_tb: number; used_tb: number; free_tb: number;
    used_pct: number; parity_ok: boolean;
  };
  disks: Array<{
    name: string; device: string; status: string; temp: number | null;
    spinning: boolean; errors: number; used_tb: number | null;
    total_tb: number | null; used_pct: number | null; type: "disk" | "cache";
  }>;
  containers: Array<{ name: string; image: string; state: string; status: string; auto_start: boolean }>;
};

// ─── Shared UI ────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then(r => r.json());

function Card({ children, className = "", style = {} }: {
  children: React.ReactNode; className?: string; style?: React.CSSProperties;
}) {
  return (
    <div className={`rounded-2xl p-5 ${className}`} style={{
      backgroundColor: "var(--color-surface-container-lowest)",
      boxShadow: "0px 8px 24px rgba(56,56,51,0.06)", ...style,
    }}>
      {children}
    </div>
  );
}

function Bar({ pct, color = "var(--color-primary)" }: { pct: number; color?: string }) {
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-surface-container)" }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
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
  return (
    <div className={`rounded-lg animate-pulse ${className}`}
      style={{ backgroundColor: "var(--color-surface-container)" }} />
  );
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

function fmtUptime(secs: number) {
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  return d > 0 ? `${d}d ${h}h uptime` : `${h}h uptime`;
}

// ─── Proxmox Card ─────────────────────────────────────────────────────────────

function ProxmoxCard() {
  const { data, error, isLoading } = useSWR<ProxmoxData & { error?: string }>(
    "/api/homelab/proxmox", fetcher, { refreshInterval: 30_000 }
  );

  const node = data?.nodes?.[0];
  const vms = data?.vms ?? [];

  return (
    <Card style={{ borderLeft: "4px solid var(--color-primary)" }}>
      <div className="flex items-center gap-3 mb-4">
        <span className="material-symbols-outlined text-2xl" style={{ color: "var(--color-primary)" }}>dns</span>
        <div>
          <h2 className="text-base font-bold font-headline" style={{ color: "var(--color-on-surface)" }}>Proxmox VE</h2>
          <p className="text-xs flex items-center gap-1" style={{ color: node ? "var(--color-secondary)" : "var(--color-outline)" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{
              backgroundColor: node?.status === "online" ? "var(--color-secondary)" : "var(--color-outline)",
              animation: node?.status === "online" ? "pulse 2s infinite" : undefined,
            }} />
            {isLoading ? "Ansluter…" : node ? `Online · ${fmtUptime(node.uptime_s)}` : "Offline"}
          </p>
        </div>
        {node && (
          <div className="ml-auto text-right">
            <p className="text-xs font-bold" style={{ color: "var(--color-outline)" }}>
              {node.cpu_cores} kärnor · {node.mem_total_gb} GB RAM
            </p>
          </div>
        )}
      </div>

      {error || data?.error ? (
        <ErrorBanner message={data?.error ?? "Kunde inte nå Proxmox"} />
      ) : isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14" /><Skeleton className="h-14" />
        </div>
      ) : node ? (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: "CPU", value: `${node.cpu_pct}%`, pct: node.cpu_pct },
              { label: "RAM", value: `${node.mem_used_gb} GB`, pct: Math.round((node.mem_used_gb / node.mem_total_gb) * 100) },
            ].map(({ label, value, pct }) => (
              <div key={label} className="p-3 rounded-xl" style={{ backgroundColor: "var(--color-surface-container)" }}>
                <div className="flex justify-between text-xs mb-2">
                  <span style={{ color: "var(--color-on-surface-variant)" }}>{label}</span>
                  <span className="font-bold" style={{ color: "var(--color-primary)" }}>{value}</span>
                </div>
                <Bar pct={pct} />
              </div>
            ))}
          </div>

          <SectionLabel>Virtual Machines &amp; Containers</SectionLabel>
          <div className="space-y-2">
            {vms.map(({ vmid, name, type, status, cpu_pct, mem_used_gb, mem_total_gb }) => (
              <div key={vmid} className="flex items-center gap-3 p-2.5 rounded-lg"
                style={{ backgroundColor: "var(--color-surface-container)" }}>
                <span className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: status === "running" ? "var(--color-secondary)" : "var(--color-outline)" }} />
                <span className="text-xs px-1.5 py-0.5 rounded font-mono text-[10px]"
                  style={{ backgroundColor: "var(--color-surface-container-high)", color: "var(--color-on-surface-variant)" }}>
                  {type === "qemu" ? "VM" : "LXC"}
                </span>
                <span className="text-sm font-mono font-semibold flex-1" style={{ color: "var(--color-on-surface)" }}>{name}</span>
                {status === "running" ? (
                  <span className="text-xs" style={{ color: "var(--color-on-surface-variant)" }}>
                    {cpu_pct}% · {mem_used_gb}/{mem_total_gb} GB
                  </span>
                ) : (
                  <span className="text-xs" style={{ color: "var(--color-outline)" }}>stoppad</span>
                )}
              </div>
            ))}
          </div>
        </>
      ) : null}
    </Card>
  );
}

// ─── Unraid Card ──────────────────────────────────────────────────────────────

function UnraidCard() {
  const { data, error, isLoading } = useSWR<UnraidData & { error?: string }>(
    "/api/homelab/unraid", fetcher, { refreshInterval: 30_000 }
  );

  const sys = data?.system;
  const arr = data?.array;
  const disks = data?.disks?.filter(d => d.type === "disk") ?? [];
  const caches = data?.disks?.filter(d => d.type === "cache") ?? [];

  return (
    <Card style={{ borderLeft: "4px solid var(--color-tertiary)" }}>
      <div className="flex items-center gap-3 mb-4">
        <span className="material-symbols-outlined text-2xl" style={{ color: "var(--color-tertiary)" }}>storage</span>
        <div>
          <h2 className="text-base font-bold font-headline" style={{ color: "var(--color-on-surface)" }}>
            {sys?.hostname ?? "Unraid"}
          </h2>
          <p className="text-xs flex items-center gap-1" style={{ color: arr ? "var(--color-secondary)" : "var(--color-outline)" }}>
            <span className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: arr?.state === "STARTED" ? "var(--color-secondary)" : "var(--color-outline)" }} />
            {isLoading ? "Ansluter…" : arr
              ? `Array ${arr.state === "STARTED" ? "aktiv" : arr.state} · ${arr.total_tb} TB · ${sys?.uptime}`
              : "Offline"}
          </p>
        </div>
      </div>

      {error || data?.error ? (
        <ErrorBanner message={data?.error ?? "Kunde inte nå Unraid"} />
      ) : isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14" /><Skeleton className="h-20" />
        </div>
      ) : sys && arr ? (
        <>
          {arr.used_pct >= 85 && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl mb-3 text-xs font-semibold"
              style={{ backgroundColor: "rgba(175,59,80,0.1)", color: "var(--color-error)" }}>
              <span className="material-symbols-outlined text-[16px]">warning</span>
              Array {arr.used_pct}% full — {arr.free_tb} TB kvar
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: "CPU", pct: sys.cpu_pct, value: `${sys.cpu_pct}%` },
              { label: "RAM", pct: sys.mem_pct, value: `${sys.mem_pct}%` },
              { label: "Array", pct: arr.used_pct, value: `${arr.used_pct}%` },
            ].map(({ label, pct, value }) => (
              <div key={label} className="p-3 rounded-xl" style={{ backgroundColor: "var(--color-surface-container)" }}>
                <p className="text-[10px] font-bold uppercase mb-1.5" style={{ color: "var(--color-on-surface-variant)" }}>{label}</p>
                <Bar pct={pct} color={pct >= 85 ? "var(--color-error)" : "var(--color-tertiary)"} />
                <p className="text-xs font-bold mt-1" style={{ color: "var(--color-on-surface)" }}>{value}</p>
              </div>
            ))}
          </div>

          <SectionLabel>Diskar</SectionLabel>
          <div className="space-y-2">
            {disks.map(({ name, status, temp, spinning, errors, used_tb, total_tb, used_pct }) => (
              <div key={name} className="flex items-center gap-3 p-2.5 rounded-lg"
                style={{ backgroundColor: "var(--color-surface-container)" }}>
                <span className="text-xs font-bold w-12 shrink-0" style={{ color: "var(--color-on-surface)" }}>{name}</span>
                <div className="flex-1">
                  {used_pct != null ? <Bar pct={used_pct} color="var(--color-tertiary)" /> : (
                    <span className="text-xs" style={{ color: "var(--color-outline)" }}>spinnad ned</span>
                  )}
                </div>
                <span className="text-xs w-20 text-right" style={{ color: "var(--color-on-surface-variant)" }}>
                  {used_tb != null ? `${used_tb}/${total_tb} TB` : `${status}`}
                </span>
                {temp != null && (
                  <span className="text-xs font-bold w-10 text-right"
                    style={{ color: temp > 45 ? "var(--color-error)" : "var(--color-tertiary)" }}>
                    {temp}°C
                  </span>
                )}
                {!spinning && temp == null && (
                  <span className="material-symbols-outlined text-[14px]" style={{ color: "var(--color-outline)" }}>
                    power_settings_new
                  </span>
                )}
                {errors > 0 && (
                  <span className="material-symbols-outlined text-[14px]" style={{ color: "var(--color-error)" }}>error</span>
                )}
              </div>
            ))}
            {caches.map(({ name, status, temp, errors, used_tb, total_tb, used_pct }) => (
              <div key={name} className="flex items-center gap-3 p-2.5 rounded-lg"
                style={{ backgroundColor: "var(--color-surface-container)" }}>
                <span className="text-xs font-bold w-12 shrink-0" style={{ color: "var(--color-on-surface-variant)" }}>{name}</span>
                <div className="flex-1">
                  {used_pct != null ? <Bar pct={used_pct} color="var(--color-outline)" /> : null}
                </div>
                <span className="text-xs w-20 text-right" style={{ color: "var(--color-outline)" }}>
                  {used_tb != null ? `${used_tb}/${total_tb} TB` : status}
                </span>
                {temp != null && (
                  <span className="text-xs font-bold w-10 text-right"
                    style={{ color: temp > 60 ? "var(--color-error)" : "var(--color-on-surface-variant)" }}>
                    {temp}°C
                  </span>
                )}
                {errors > 0 && (
                  <span className="material-symbols-outlined text-[14px]" style={{ color: "var(--color-error)" }}>error</span>
                )}
              </div>
            ))}
          </div>
        </>
      ) : null}
    </Card>
  );
}

// ─── Containers Card ──────────────────────────────────────────────────────────

function ContainersCard() {
  const { data, isLoading } = useSWR<UnraidData & { error?: string }>(
    "/api/homelab/unraid", fetcher, { refreshInterval: 30_000 }
  );

  const containers = data?.containers ?? [];
  const problemContainers = containers.filter(c => c.auto_start && c.state !== "RUNNING");
  const running = containers.filter(c => c.state === "RUNNING").length;

  return (
    <Card className="xl:col-span-2">
      <div className="flex items-center justify-between mb-3">
        <SectionLabel>Unraid — Docker-containers</SectionLabel>
        {!isLoading && containers.length > 0 && (
          <span className="text-xs font-medium">
            <span style={{ color: "var(--color-secondary)" }}>{running} igång</span>
            {" / "}
            <span style={{ color: "var(--color-on-surface-variant)" }}>{containers.length} totalt</span>
          </span>
        )}
      </div>

      {problemContainers.length > 0 && (
        <div className="mb-3 space-y-1">
          {problemContainers.map(c => (
            <div key={c.name} className="flex items-center gap-2 p-2 rounded-lg text-xs"
              style={{ backgroundColor: "rgba(175,59,80,0.08)", color: "var(--color-error)" }}>
              <span className="material-symbols-outlined text-[14px]">warning</span>
              <span className="font-semibold">{c.name}</span>
              <span className="font-normal">{c.status}</span>
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
            .map(({ name, state }) => (
              <div key={name} className="flex items-center gap-2 p-2.5 rounded-xl"
                style={{ backgroundColor: "var(--color-surface-container)" }}>
                <span className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: state === "RUNNING" ? "var(--color-secondary)" : "var(--color-error)" }} />
                <span className="text-xs font-semibold truncate" style={{ color: "var(--color-on-surface)" }}>{name}</span>
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

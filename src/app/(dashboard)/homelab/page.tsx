// Homelab context — Proxmox, Unraid, Portainer, network overview.
// Migrated from v1 /servers and /containers pages.
// All data is mock for Fas 1.

function Card({
  children,
  className = "",
  style = {},
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`rounded-2xl p-5 ${className}`}
      style={{
        backgroundColor: "var(--color-surface-container-lowest)",
        boxShadow: "0px 8px 24px rgba(56,56,51,0.06)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Bar({ pct, color = "var(--color-primary)" }: { pct: number; color?: string }) {
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-surface-container)" }}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--color-on-surface-variant)" }}>
      {children}
    </p>
  );
}

const VMS = [
  { name: "pve-router", status: "running", cpu: 4, mem: 2048 },
  { name: "pve-pihole", status: "running", cpu: 1, mem: 512 },
  { name: "pve-gitea", status: "running", cpu: 2, mem: 4096 },
  { name: "pve-dev01", status: "stopped", cpu: 0, mem: 0 },
];

const CONTAINERS = [
  { name: "home-assistant", image: "ghcr.io/home-assistant/home-assistant", status: "running" },
  { name: "nginx-proxy", image: "nginx:alpine", status: "running" },
  { name: "postgres-16", image: "postgres:16", status: "running" },
  { name: "redis", image: "redis:7", status: "running" },
  { name: "grafana", image: "grafana/grafana", status: "running" },
  { name: "backup-agent", image: "restic/restic", status: "exited" },
];

export default function HomelabPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight font-headline" style={{ color: "var(--color-on-surface)" }}>
          Homelab
        </h1>
        <p className="text-sm font-medium mt-1" style={{ color: "var(--color-on-surface-variant)" }}>
          Proxmox · Unraid · Portainer
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Proxmox */}
        <Card style={{ borderLeft: "4px solid var(--color-primary)" }}>
          <div className="flex items-center gap-3 mb-4">
            <span className="material-symbols-outlined text-2xl" style={{ color: "var(--color-primary)" }}>dns</span>
            <div>
              <h2 className="text-base font-bold font-headline" style={{ color: "var(--color-on-surface)" }}>Proxmox VE</h2>
              <p className="text-xs flex items-center gap-1" style={{ color: "var(--color-secondary)" }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "var(--color-secondary)" }} />
                Online · 12d 4h uptime
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs font-bold" style={{ color: "var(--color-outline)" }}>i9-13900K · 64GB DDR5</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: "CPU", value: "14%", pct: 14 },
              { label: "RAM", value: "42.8 GB", pct: 65 },
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

          <SectionLabel>Virtual Machines</SectionLabel>
          <div className="space-y-2">
            {VMS.map(({ name, status, cpu, mem }) => (
              <div key={name} className="flex items-center gap-3 p-2.5 rounded-lg"
                style={{ backgroundColor: "var(--color-surface-container)" }}>
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: status === "running" ? "var(--color-secondary)" : "var(--color-outline)" }}
                />
                <span className="text-sm font-mono font-semibold flex-1" style={{ color: "var(--color-on-surface)" }}>{name}</span>
                {status === "running" ? (
                  <span className="text-xs" style={{ color: "var(--color-on-surface-variant)" }}>
                    {cpu} vCPU · {(mem / 1024).toFixed(0)}GB
                  </span>
                ) : (
                  <span className="text-xs" style={{ color: "var(--color-outline)" }}>stopped</span>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Unraid */}
        <Card style={{ borderLeft: "4px solid var(--color-tertiary)" }}>
          <div className="flex items-center gap-3 mb-4">
            <span className="material-symbols-outlined text-2xl" style={{ color: "var(--color-tertiary)" }}>storage</span>
            <div>
              <h2 className="text-base font-bold font-headline" style={{ color: "var(--color-on-surface)" }}>Unraid Tower</h2>
              <p className="text-xs flex items-center gap-1" style={{ color: "var(--color-secondary)" }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "var(--color-secondary)" }} />
                Array Healthy · 142 TB
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            {[["CPU", 8], ["RAM", 18], ["Plex", 45]].map(([label, pct]) => (
              <div key={String(label)} className="p-3 rounded-xl" style={{ backgroundColor: "var(--color-surface-container)" }}>
                <p className="text-[10px] font-bold uppercase mb-1.5" style={{ color: "var(--color-on-surface-variant)" }}>{label}</p>
                <Bar pct={Number(pct)} color="var(--color-tertiary)" />
                <p className="text-xs font-bold mt-1" style={{ color: "var(--color-on-surface)" }}>{pct}%</p>
              </div>
            ))}
          </div>

          <SectionLabel>Disk Usage</SectionLabel>
          <div className="space-y-2">
            {[
              { name: "Disk 1", pct: 82, used: "18.2 TB", temp: "32°C" },
              { name: "Disk 2", pct: 75, used: "16.5 TB", temp: "34°C" },
              { name: "Parity", pct: 100, used: "Sync'd", temp: "38°C", parity: true },
            ].map(({ name, pct, used, temp, parity }) => (
              <div key={name} className="flex items-center gap-3 p-2.5 rounded-lg"
                style={{ backgroundColor: "var(--color-surface-container)" }}>
                <span className="text-xs font-bold w-12" style={{ color: "var(--color-on-surface)" }}>{name}</span>
                <div className="flex-1">
                  <Bar pct={pct} color={parity ? "rgba(0,116,62,0.3)" : "var(--color-tertiary)"} />
                </div>
                <span className="text-xs w-16 text-right" style={{ color: "var(--color-on-surface-variant)" }}>{used}</span>
                <span className="text-xs font-bold" style={{ color: "var(--color-tertiary)" }}>{temp}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Containers */}
        <Card className="xl:col-span-2">
          <SectionLabel>Portainer — Docker Containers</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {CONTAINERS.map(({ name, image, status }) => (
              <div key={name} className="flex items-center gap-3 p-3 rounded-xl"
                style={{ backgroundColor: "var(--color-surface-container)" }}>
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: status === "running" ? "var(--color-secondary)" : "var(--color-error)" }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--color-on-surface)" }}>{name}</p>
                  <p className="text-[11px] truncate" style={{ color: "var(--color-outline)" }}>{image}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

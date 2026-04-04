import DashboardShell from "@/components/layout/DashboardShell";

function Card({ children, className = "", style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-[1.25rem] p-6 ${className}`}
      style={{ backgroundColor: "var(--color-surface-container-lowest)", boxShadow: "0px 12px 32px rgba(56,56,51,0.06)", ...style }}
    >
      {children}
    </div>
  );
}

function Bar({ pct, color = "var(--color-primary)" }: { pct: number; color?: string }) {
  return (
    <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-surface-container)" }}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

const unraidDisks = [
  { name: "Disk 1", pct: 82, used: "18.2 TB", temp: "32°C" },
  { name: "Disk 2", pct: 75, used: "16.5 TB", temp: "34°C" },
  { name: "Parity", pct: 100, used: "Sync'd", temp: "38°C", synced: true },
];

const thermals = [
  { label: "Rack Intake", value: "22.4°C", color: "var(--color-on-surface)" },
  { label: "Rack Exhaust", value: "31.8°C", color: "var(--color-tertiary)" },
  { label: "UPS Internal", value: "28.0°C", color: "var(--color-on-surface)" },
];

const services = [
  { name: "Docker", status: "Running", ok: true },
  { name: "Postgres", status: "Stable", ok: true },
  { name: "Redis", status: "Connected", ok: true },
  { name: "Backup", status: "Active", ok: false },
];

const networkSparkline = [30, 45, 60, 40, 80, 55, 35];

export default function ServersPage() {
  return (
    <DashboardShell>
      <div className="mb-6">
        <h1 className="text-4xl font-extrabold tracking-tight font-headline" style={{ color: "var(--color-on-surface)" }}>
          System Infrastructure
        </h1>
        <p className="font-medium mt-1" style={{ color: "var(--color-on-surface-variant)" }}>
          Monitoring 2 core clusters across local network
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Proxmox — 2 cols */}
        <section
          className="xl:col-span-2 rounded-[1.25rem] p-6 flex flex-col gap-5"
          style={{ backgroundColor: "var(--color-surface-container)" }}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl" style={{ backgroundColor: "var(--color-surface-container-lowest)" }}>
                <span className="material-symbols-outlined text-3xl" style={{ color: "var(--color-primary)" }}>dns</span>
              </div>
              <div>
                <h2 className="text-xl font-bold font-headline" style={{ color: "var(--color-on-surface)" }}>Proxmox VE</h2>
                <p className="text-xs font-bold flex items-center gap-1 uppercase tracking-widest" style={{ color: "var(--color-secondary)" }}>
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "var(--color-secondary)", boxShadow: "0 0 8px #00743e" }} />
                  Online
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-tight" style={{ color: "var(--color-outline)" }}>Uptime</p>
              <p className="font-headline font-bold" style={{ color: "var(--color-primary)" }}>12d 4h 32m</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "CPU Load", value: "14%", pct: 14, sub: "Intel Core i9-13900K" },
              { label: "RAM Usage", value: "42.8 GB", pct: 65, sub: "of 64GB DDR5" },
            ].map(({ label, value, pct, sub }) => (
              <Card key={label}>
                <div className="flex justify-between items-end mb-2">
                  <p className="text-xs font-bold uppercase" style={{ color: "var(--color-on-surface-variant)" }}>{label}</p>
                  <p className="text-sm font-bold" style={{ color: "var(--color-primary)" }}>{value}</p>
                </div>
                <Bar pct={pct} />
                <p className="mt-3 text-[11px]" style={{ color: "var(--color-on-surface-variant)" }}>{sub}</p>
              </Card>
            ))}
          </div>

          <div className="flex gap-4">
            {[["12", "Active VMs"], ["08", "LXC Containers"], ["0", "Failures"]].map(([n, label]) => (
              <div key={label} className="flex-1 rounded-xl p-4 flex flex-col items-center" style={{ backgroundColor: "var(--color-surface-container-high)" }}>
                <span className="text-2xl font-black" style={{ color: "var(--color-on-surface)" }}>{n}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-center" style={{ color: "var(--color-outline)" }}>{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Unraid — 2 cols */}
        <section
          className="xl:col-span-2 rounded-[1.25rem] p-6 flex flex-col gap-5"
          style={{ backgroundColor: "var(--color-surface-container-high)" }}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl" style={{ backgroundColor: "var(--color-surface-container-lowest)" }}>
                <span className="material-symbols-outlined text-3xl" style={{ color: "var(--color-tertiary)" }}>storage</span>
              </div>
              <div>
                <h2 className="text-xl font-bold font-headline" style={{ color: "var(--color-on-surface)" }}>Unraid Tower</h2>
                <p className="text-xs font-bold flex items-center gap-1 uppercase tracking-widest" style={{ color: "var(--color-secondary)" }}>
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "var(--color-secondary)", boxShadow: "0 0 8px #00743e" }} />
                  Array Healthy
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase" style={{ color: "var(--color-outline)" }}>Total Capacity</p>
              <p className="font-headline font-bold" style={{ color: "var(--color-tertiary)" }}>142 TB</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[["Array CPU", 8, "8%"], ["Array RAM", 18, "18%"], ["Plex Load", 45, "45%"]].map(([label, pct, val]) => (
              <Card key={String(label)}>
                <p className="text-[10px] font-bold uppercase mb-1" style={{ color: "var(--color-on-surface-variant)" }}>{label}</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Bar pct={Number(pct)} color="var(--color-tertiary)" />
                  </div>
                  <span className="text-xs font-bold">{val}</span>
                </div>
              </Card>
            ))}
          </div>

          {/* Disk table */}
          <div className="rounded-xl p-4" style={{ backgroundColor: "var(--color-surface-container-lowest)" }}>
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-outline)" }}>Disk Usage</span>
              <span className="text-xs font-medium" style={{ color: "var(--color-on-surface-variant)" }}>6 disks active</span>
            </div>
            <div className="space-y-3">
              {unraidDisks.map(({ name, pct, used, temp, synced }) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-[11px] font-bold w-12" style={{ color: "var(--color-on-surface)" }}>{name}</span>
                  <div className="flex-1">
                    <Bar pct={pct} color={synced ? "rgba(0,116,62,0.2)" : "var(--color-primary)"} />
                  </div>
                  <span className="text-[10px] font-medium w-16 text-right" style={{ color: "var(--color-on-surface-variant)" }}>{used}</span>
                  <span className="text-[10px] font-bold" style={{ color: synced ? "var(--color-tertiary)" : "var(--color-secondary)" }}>{temp}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Network traffic */}
        <Card>
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined" style={{ color: "var(--color-primary-fixed-dim)" }}>swap_vert</span>
            <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--color-on-surface)" }}>Network Traffic</h3>
          </div>
          <div className="h-24 flex items-end gap-1 mb-6">
            {networkSparkline.map((h, i) => (
              <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, backgroundColor: i === 4 ? "var(--color-primary-container)" : "rgba(120,140,246,0.2)" }} />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[["Incoming", "128 Mbps"], ["Outgoing", "14.2 Mbps"]].map(([label, val]) => (
              <div key={label}>
                <p className="text-[10px] font-bold uppercase" style={{ color: "var(--color-outline)" }}>{label}</p>
                <p className="text-xl font-extrabold font-headline" style={{ color: "var(--color-on-surface)" }}>{val}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Thermals */}
        <Card>
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined" style={{ color: "var(--color-error)" }}>thermostat</span>
            <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--color-on-surface)" }}>Thermals</h3>
          </div>
          <div className="space-y-4">
            {thermals.map(({ label, value, color }) => (
              <div key={label} className="flex justify-between items-center p-3 rounded-xl" style={{ backgroundColor: "var(--color-surface-container)" }}>
                <span className="text-xs font-bold" style={{ color: "var(--color-on-surface)" }}>{label}</span>
                <span className="text-sm font-bold font-headline" style={{ color }}>{value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Critical Services — 2 cols */}
        <Card className="xl:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined" style={{ color: "var(--color-secondary)" }}>verified_user</span>
            <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--color-on-surface)" }}>Critical Services</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {services.map(({ name, status, ok }) => (
              <div
                key={name}
                className="pl-3"
                style={{ borderLeft: `4px solid ${ok ? "var(--color-secondary)" : "var(--color-tertiary)"}` }}
              >
                <p className="text-[10px] font-bold uppercase mb-1" style={{ color: "var(--color-outline)" }}>{name}</p>
                <p className="text-xs font-bold" style={{ color: "var(--color-on-surface)" }}>{status}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}

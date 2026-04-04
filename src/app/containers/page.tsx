import DashboardShell from "@/components/layout/DashboardShell";

type ContainerStatus = "running" | "building" | "stopped";

interface ContainerRow {
  name: string;
  meta: string;
  icon: string;
  status: ContainerStatus;
}

const statusStyles: Record<ContainerStatus, { bg: string; text: string; dot: string; label: string }> = {
  running:  { bg: "rgba(0,116,62,0.1)",  text: "var(--color-secondary)", dot: "var(--color-secondary)", label: "running" },
  building: { bg: "rgba(136,92,0,0.15)", text: "var(--color-tertiary)",  dot: "var(--color-tertiary)",  label: "building" },
  stopped:  { bg: "var(--color-surface-container-highest)", text: "var(--color-on-surface-variant)", dot: "var(--color-outline)", label: "stopped" },
};

const proxmoxContainers: ContainerRow[] = [
  { name: "PostgreSQL-Cluster", meta: "LXC 101 • 2GB RAM", icon: "database", status: "running" },
  { name: "AdGuard-Home", meta: "LXC 105 • 512MB RAM", icon: "shield", status: "running" },
  { name: "HomeAssistant-Core", meta: "LXC 200 • 4GB RAM", icon: "home_app_logo", status: "building" },
  { name: "Backup-Staging", meta: "LXC 301 • 1GB RAM", icon: "backup", status: "stopped" },
];

const unraidContainers: ContainerRow[] = [
  { name: "Plex-Media-Server", meta: "Official Image • GPU Transcoding", icon: "video_library", status: "running" },
  { name: "Nextcloud-AIO", meta: "LinuxServer • v24.0.2", icon: "folder_zip", status: "running" },
  { name: "Nginx-Proxy-Manager", meta: "v2.9.18 • Port 80/443", icon: "settings_ethernet", status: "running" },
  { name: "Immich-Machine-Learning", meta: "Worker Instance • Python 3.10", icon: "auto_awesome", status: "running" },
];

function ContainerItem({ row }: { row: ContainerRow }) {
  const s = statusStyles[row.status];
  return (
    <div
      className="p-4 rounded-xl flex items-center justify-between transition-all"
      style={{
        backgroundColor: "var(--color-surface-container-lowest)",
        boxShadow: "0px 12px 32px rgba(56,56,51,0.04)",
        opacity: row.status === "stopped" ? 0.7 : 1,
      }}
    >
      <div className="flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "var(--color-surface-container)" }}
        >
          <span className="material-symbols-outlined opacity-40" style={{ color: "var(--color-on-surface-variant)" }}>{row.icon}</span>
        </div>
        <div>
          <h3 className="font-bold text-sm" style={{ color: "var(--color-on-surface)" }}>{row.name}</h3>
          <p className="text-[11px] font-medium mt-0.5" style={{ color: "var(--color-on-surface-variant)" }}>{row.meta}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ backgroundColor: s.bg }}>
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor: s.dot,
              animation: row.status === "running" ? "pulse 2s ease-in-out infinite" : undefined,
            }}
          />
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: s.text }}>{s.label}</span>
        </div>
        <button
          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{ color: "var(--color-on-surface-variant)" }}
          aria-label={row.status === "stopped" ? "Start" : "Restart"}
        >
          <span className="material-symbols-outlined text-[20px]">{row.status === "stopped" ? "play_arrow" : "refresh"}</span>
        </button>
      </div>
    </div>
  );
}

const resourceBars = [40, 65, 30, 85, 55, 75];

export default function ContainersPage() {
  return (
    <DashboardShell>
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight font-headline" style={{ color: "var(--color-on-surface)" }}>
            Container Ecosystem
          </h1>
          <p className="font-medium mt-1 flex items-center gap-2" style={{ color: "var(--color-on-surface-variant)" }}>
            <span className="flex h-2 w-2 rounded-full" style={{ backgroundColor: "var(--color-secondary)", boxShadow: "0 0 8px rgba(0,116,62,0.4)" }} />
            Active orchestration layer
          </p>
        </div>
        <div className="flex gap-3">
          <div className="flex p-1 rounded-full" style={{ backgroundColor: "var(--color-surface-container)" }}>
            <button
              className="px-4 py-1.5 rounded-full text-xs font-bold"
              style={{ backgroundColor: "var(--color-surface-container-lowest)", color: "var(--color-on-surface)", boxShadow: "0 1px 4px rgba(56,56,51,0.08)" }}
            >
              Grid View
            </button>
            <button
              className="px-4 py-1.5 rounded-full text-xs font-bold opacity-60"
              style={{ color: "var(--color-on-surface-variant)" }}
            >
              Analytics
            </button>
          </div>
        </div>
      </div>

      {/* Two-column bento */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Proxmox */}
        <section className="flex flex-col gap-5">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "var(--color-surface-container-high)" }}>
                <span className="material-symbols-outlined" style={{ color: "var(--color-primary)" }}>dns</span>
              </div>
              <h2 className="text-xl font-bold font-headline" style={{ color: "var(--color-on-surface)" }}>Proxmox Containers</h2>
            </div>
            <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest" style={{ backgroundColor: "var(--color-surface-container-high)", color: "var(--color-on-surface-variant)" }}>
              8 Nodes
            </span>
          </div>
          <div className="space-y-3">
            {proxmoxContainers.map((row) => <ContainerItem key={row.name} row={row} />)}
          </div>
        </section>

        {/* Unraid */}
        <section className="flex flex-col gap-5">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "var(--color-surface-container-high)" }}>
                <span className="material-symbols-outlined" style={{ color: "var(--color-secondary)" }}>storage</span>
              </div>
              <h2 className="text-xl font-bold font-headline" style={{ color: "var(--color-on-surface)" }}>Unraid Containers</h2>
            </div>
            <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest" style={{ backgroundColor: "var(--color-surface-container-high)", color: "var(--color-on-surface-variant)" }}>
              Docker Engine
            </span>
          </div>
          <div className="space-y-3">
            {unraidContainers.map((row) => <ContainerItem key={row.name} row={row} />)}
          </div>
        </section>
      </div>

      {/* Analytics bar */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Resource allocation */}
        <div className="rounded-2xl p-6" style={{ backgroundColor: "var(--color-surface-container)" }}>
          <h4 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "var(--color-on-surface-variant)" }}>Resource Allocation</h4>
          <div className="flex items-end gap-1 h-24 mb-4">
            {resourceBars.map((h, i) => (
              <div key={i} className="flex-1 rounded-t-lg" style={{ height: `${h}%`, backgroundColor: `rgba(71,91,194,${0.2 + (h / 100) * 0.4})` }} />
            ))}
          </div>
          <div className="flex justify-between items-center">
            <p className="text-xs font-medium" style={{ color: "var(--color-on-surface-variant)" }}>Global CPU Usage</p>
            <p className="text-lg font-extrabold" style={{ color: "var(--color-on-surface)" }}>42.8%</p>
          </div>
        </div>

        {/* Network traffic */}
        <div className="rounded-2xl p-6" style={{ backgroundColor: "var(--color-surface-container)" }}>
          <h4 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "var(--color-on-surface-variant)" }}>Network Traffic</h4>
          <div className="flex items-center justify-center h-24 mb-4">
            <div className="w-full h-0.5 relative" style={{ backgroundColor: "rgba(187,185,178,0.2)" }}>
              <div className="absolute inset-0" style={{ backgroundColor: "rgba(71,91,194,0.4)", filter: "blur(4px)" }} />
              <div className="absolute h-0.5 w-3/5 left-1/5" style={{ backgroundColor: "var(--color-primary)" }} />
            </div>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-xs font-medium" style={{ color: "var(--color-on-surface-variant)" }}>Aggregate Throughput</p>
            <p className="text-lg font-extrabold" style={{ color: "var(--color-on-surface)" }}>1.2 GB/s</p>
          </div>
        </div>

        {/* Uptime */}
        <div
          className="rounded-2xl p-6 text-white"
          style={{ backgroundColor: "var(--color-primary)", boxShadow: "0 8px 32px rgba(71,91,194,0.3)" }}
        >
          <h4 className="text-xs font-bold uppercase tracking-widest mb-4 opacity-70">Uptime Overview</h4>
          <div className="flex items-center gap-4 mb-4">
            <span className="material-symbols-outlined text-4xl">cloud_done</span>
            <div>
              <p className="text-2xl font-black">99.99%</p>
              <p className="text-[10px] opacity-80 font-bold uppercase tracking-widest">Last 30 Days</p>
            </div>
          </div>
          <button
            className="w-full py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors"
            style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
          >
            View Detailed Log
          </button>
        </div>
      </div>
    </DashboardShell>
  );
}

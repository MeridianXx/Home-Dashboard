import DashboardShell from "@/components/layout/DashboardShell";

/* ── Static mock data ── */
const infrastructure = [
  { name: "Proxmox VE", status: "ACTIVE", ok: true },
  { name: "Unraid Array", status: "HEALTHY", ok: true },
];

const alerts = [
  {
    title: "Proxmox Backup Failed",
    detail: "Storage 'Local-ZFS' at 92% capacity",
  },
  {
    title: "Unraid Parity Check",
    detail: "Scheduled check in progress (42%)",
  },
];

const statsGrid = [
  {
    icon: "thermostat",
    label: "Indoor",
    value: "21.5",
    unit: "°C",
    color: "var(--color-primary)",
  },
  {
    icon: "bolt",
    label: "Tibber",
    value: "2.4",
    unit: "kW",
    color: "var(--color-tertiary)",
  },
];

const evs = [
  { name: "Enyaq", pct: 82, color: "var(--color-secondary)" },
  { name: "Polestar 2", pct: 45, color: "var(--color-tertiary)" },
];

const scenes = [
  { icon: "dark_mode", label: "Evening" },
  { icon: "logout", label: "Away" },
  { icon: "bedtime", label: "Night" },
  { icon: "movie", label: "Movie" },
];

const lightingZones = [
  {
    zone: "Living Room",
    status: "4 Lights On",
    statusColor: "var(--color-secondary)",
    lights: [
      {
        icon: "lightbulb",
        label: "Ceiling Hue",
        detail: "Brightness: 80%",
        on: true,
      },
      {
        icon: "floor_lamp",
        label: "Floor Plejd",
        detail: "State: Off",
        on: false,
      },
    ],
  },
  {
    zone: "Kitchen",
    status: "All Off",
    statusColor: "var(--color-on-surface-variant)",
    lights: [
      {
        icon: "countertops",
        label: "Counter Strips",
        detail: "System: Hue",
        on: false,
      },
      {
        icon: "dining",
        label: "Dining Table",
        detail: "System: Plejd",
        on: false,
      },
    ],
  },
  {
    zone: "Bedroom",
    status: "Active",
    statusColor: "var(--color-secondary)",
    lights: [
      { icon: "bed", label: "Bedside Hue", detail: "Mood: Read", on: true },
    ],
  },
  {
    zone: "Outdoor",
    status: "Auto Schedule",
    statusColor: "var(--color-on-surface-variant)",
    lights: [
      {
        icon: "deck",
        label: "Deck Spotlights",
        detail: "Plejd Timer",
        on: false,
      },
    ],
  },
];

const sparklineHeights = [40, 55, 35, 60, 85, 70, 45, 30, 50, 90, 65, 40, 75, 55];

/* ── Shared UI helpers ── */
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
      className={`rounded-[1.25rem] ${className}`}
      style={{
        backgroundColor: "var(--color-surface-container-lowest)",
        boxShadow: "0px 12px 32px rgba(56,56,51,0.06)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="text-[11px] font-bold uppercase tracking-widest mb-3"
      style={{ color: "var(--color-on-surface-variant)" }}
    >
      {children}
    </h3>
  );
}

function Toggle({ on }: { on: boolean }) {
  return (
    <div
      className="relative w-10 h-5 rounded-full cursor-pointer flex-shrink-0"
      style={{
        backgroundColor: on
          ? "var(--color-secondary-container)"
          : "rgba(187,185,178,0.3)",
      }}
    >
      <div
        className="absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all"
        style={{ left: on ? "calc(100% - 18px)" : "2px" }}
      />
    </div>
  );
}

/* ── Page ── */
export default function HomePage() {
  return (
    <DashboardShell>
      {/* Page header */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1
            className="text-4xl font-extrabold tracking-tight font-headline"
            style={{ color: "var(--color-on-surface)" }}
          >
            Overview
          </h1>
          <p
            className="font-medium mt-1"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            Welcome back, Admin. System is running stable.
          </p>
        </div>

        {/* Weather / time widget */}
        <div
          className="flex items-center gap-5 rounded-2xl px-5 py-3"
          style={{ backgroundColor: "var(--color-surface-container)" }}
        >
          <div className="flex items-center gap-3">
            <span
              className="material-symbols-outlined text-4xl"
              style={{
                color: "var(--color-tertiary-fixed)",
                fontVariationSettings: "'FILL' 1",
              }}
            >
              wb_sunny
            </span>
            <div>
              <span
                className="text-2xl font-bold font-headline block"
                style={{ color: "var(--color-on-surface)" }}
              >
                18°C
              </span>
              <span
                className="text-[11px] font-bold uppercase tracking-widest"
                style={{ color: "var(--color-on-surface-variant)" }}
              >
                Partly Cloudy
              </span>
            </div>
          </div>
          <div
            className="w-px h-8 opacity-20"
            style={{ backgroundColor: "var(--color-outline-variant)" }}
          />
          <div className="text-right">
            <span
              className="text-2xl font-bold font-headline block"
              style={{ color: "var(--color-on-surface)" }}
            >
              14:42
            </span>
            <span
              className="text-[11px] font-bold uppercase tracking-widest"
              style={{ color: "var(--color-on-surface-variant)" }}
            >
              Apr 4, 2026
            </span>
          </div>
        </div>
      </section>

      {/* Bento grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-start">
        {/* ── Col 1: Infrastructure / Alerts / Security ── */}
        <div className="flex flex-col gap-5">
          {/* Infrastructure health */}
          <Card className="p-6">
            <SectionLabel>Infrastructure</SectionLabel>
            <div className="space-y-4">
              {infrastructure.map(({ name, status, ok }) => (
                <div key={name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{
                        backgroundColor: ok
                          ? "var(--color-secondary)"
                          : "var(--color-error)",
                        boxShadow: ok
                          ? "0 0 8px rgba(0,116,62,0.5)"
                          : "0 0 8px rgba(175,59,80,0.5)",
                      }}
                    />
                    <span className="font-semibold text-sm">{name}</span>
                  </div>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: "var(--color-secondary-container)",
                      color: "var(--color-on-secondary-container)",
                    }}
                  >
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Alerts */}
          <div
            className="p-6 rounded-[1.25rem] relative overflow-hidden"
            style={{ backgroundColor: "rgba(249,115,134,0.1)" }}
          >
            <div className="flex items-center gap-3 mb-3">
              <span
                className="material-symbols-outlined"
                style={{ color: "var(--color-error)" }}
              >
                warning
              </span>
              <h3
                className="font-bold"
                style={{ color: "var(--color-on-error-container)" }}
              >
                System Alerts
              </h3>
            </div>
            <div className="space-y-3">
              {alerts.map(({ title, detail }) => (
                <div
                  key={title}
                  className="p-3 rounded-xl"
                  style={{ backgroundColor: "rgba(255,255,255,0.6)" }}
                >
                  <p
                    className="text-xs font-bold"
                    style={{ color: "var(--color-on-surface)" }}
                  >
                    {title}
                  </p>
                  <p
                    className="text-[11px]"
                    style={{ color: "var(--color-on-surface-variant)" }}
                  >
                    {detail}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Doorbell / Security */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <SectionLabel>Security</SectionLabel>
              <span
                className="text-[11px] font-bold"
                style={{ color: "var(--color-primary)" }}
              >
                LIVE
              </span>
            </div>
            <div
              className="relative rounded-xl overflow-hidden aspect-video mb-3 flex items-center justify-center"
              style={{ backgroundColor: "var(--color-surface-container-high)" }}
            >
              <span
                className="material-symbols-outlined text-5xl opacity-20"
                style={{ color: "var(--color-on-surface-variant)" }}
              >
                videocam
              </span>
              <div
                className="absolute top-2 left-2 px-2 py-1 rounded text-[10px] text-white font-bold"
                style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
              >
                AQARA G4 • FRONT DOOR
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span
                className="text-xs"
                style={{ color: "var(--color-on-surface-variant)" }}
              >
                Last motion
              </span>
              <span className="text-xs font-bold">12 mins ago</span>
            </div>
          </Card>
        </div>

        {/* ── Col 2: Stat grid + Scenes ── */}
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3">
            {statsGrid.map(({ icon, label, value, unit, color }) => (
              <Card key={label} className="p-4">
                <span
                  className="material-symbols-outlined mb-2 block"
                  style={{ color }}
                >
                  {icon}
                </span>
                <p
                  className="text-[11px] font-bold uppercase tracking-wider"
                  style={{ color: "var(--color-on-surface-variant)" }}
                >
                  {label}
                </p>
                <p
                  className="text-2xl font-bold font-headline mt-1"
                  style={{ color: "var(--color-on-surface)" }}
                >
                  {value}
                  <span className="text-sm font-normal">{unit}</span>
                </p>
              </Card>
            ))}

            {evs.map(({ name, pct, color }) => (
              <Card key={name} className="p-4">
                <p
                  className="text-[11px] font-bold uppercase tracking-wider"
                  style={{ color: "var(--color-on-surface-variant)" }}
                >
                  {name}
                </p>
                <p
                  className="text-2xl font-bold font-headline mt-1"
                  style={{ color: "var(--color-on-surface)" }}
                >
                  {pct}%
                </p>
                <div
                  className="w-full h-1 mt-3 rounded-full overflow-hidden"
                  style={{ backgroundColor: "var(--color-surface-container)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
              </Card>
            ))}

            <Card className="p-4 col-span-2 flex items-center justify-between">
              <div>
                <p
                  className="text-[11px] font-bold uppercase tracking-wider"
                  style={{ color: "var(--color-on-surface-variant)" }}
                >
                  Roborock S8
                </p>
                <p className="text-sm font-bold mt-1">Docked • 100%</p>
              </div>
              <span
                className="material-symbols-outlined"
                style={{ color: "var(--color-on-surface-variant)" }}
              >
                cleaning_services
              </span>
            </Card>
          </div>

          {/* Quick Scenes */}
          <div
            className="p-6 rounded-[1.25rem]"
            style={{ backgroundColor: "var(--color-surface-container)" }}
          >
            <SectionLabel>Quick Scenes</SectionLabel>
            <div className="grid grid-cols-2 gap-3">
              {scenes.map(({ icon, label }) => (
                <button
                  key={label}
                  className="p-4 rounded-xl flex flex-col items-center gap-2 transition-all group"
                  style={{
                    backgroundColor:
                      "var(--color-surface-container-lowest)",
                  }}
                >
                  <span className="material-symbols-outlined group-hover:scale-110 transition-transform">
                    {icon}
                  </span>
                  <span className="text-xs font-bold">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Col 3–4: Lighting + Network ── */}
        <div className="flex flex-col gap-5 md:col-span-2">
          {/* Lighting control */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-5">
              <SectionLabel>Lighting Control</SectionLabel>
              <span
                className="text-[11px] font-medium"
                style={{ color: "var(--color-on-surface-variant)" }}
              >
                12 active zones
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {lightingZones.map(({ zone, status, statusColor, lights }) => (
                <div key={zone} className="space-y-4">
                  <div
                    className="flex justify-between items-end pb-2"
                    style={{
                      borderBottom: "1px solid rgba(187,185,178,0.1)",
                    }}
                  >
                    <span
                      className="font-headline font-bold text-lg"
                      style={{ color: "var(--color-on-surface)" }}
                    >
                      {zone}
                    </span>
                    <span
                      className="text-[10px] uppercase font-black"
                      style={{ color: statusColor }}
                    >
                      {status}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {lights.map(({ icon, label, detail, on }) => (
                      <div
                        key={label}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{
                              backgroundColor: on
                                ? "var(--color-tertiary-fixed)"
                                : "var(--color-surface-container)",
                              color: on
                                ? "var(--color-on-tertiary-fixed)"
                                : "var(--color-on-surface-variant)",
                            }}
                          >
                            <span
                              className="material-symbols-outlined text-[18px]"
                              style={
                                on
                                  ? { fontVariationSettings: "'FILL' 1" }
                                  : {}
                              }
                            >
                              {icon}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{label}</p>
                            <p
                              className="text-[10px]"
                              style={{
                                color: "var(--color-on-surface-variant)",
                              }}
                            >
                              {detail}
                            </p>
                          </div>
                        </div>
                        <Toggle on={on} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Network sparkline */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <SectionLabel>Network Activity</SectionLabel>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: "var(--color-primary)" }}
                  />
                  <span className="text-[10px] font-bold">WAN</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: "var(--color-secondary)" }}
                  />
                  <span className="text-[10px] font-bold">LAN</span>
                </div>
              </div>
            </div>

            <div className="h-24 w-full flex items-end gap-1">
              {sparklineHeights.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm"
                  style={{
                    height: `${h}%`,
                    backgroundColor: "rgba(71,91,194,0.2)",
                  }}
                />
              ))}
            </div>

            <div
              className="flex justify-between mt-4 text-[10px] font-bold uppercase tracking-widest"
              style={{ color: "var(--color-on-surface-variant)" }}
            >
              <span>Current Throughput</span>
              <span style={{ color: "var(--color-on-surface)" }}>
                420 Mbps Down / 42 Mbps Up
              </span>
            </div>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}

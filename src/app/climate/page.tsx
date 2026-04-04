import DashboardShell from "@/components/layout/DashboardShell";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[1.25rem] p-6 ${className}`}
      style={{ backgroundColor: "var(--color-surface-container-lowest)", boxShadow: "0px 12px 32px rgba(56,56,51,0.04)" }}
    >
      {children}
    </div>
  );
}

const rooms = [
  { name: "Living Room", temp: 21.4, highlight: false },
  { name: "Kitchen", temp: 22.8, highlight: true },
  { name: "Bedroom", temp: 19.5, highlight: false },
  { name: "Office", temp: 20.9, highlight: false },
  { name: "Guest Room", temp: 18.2, highlight: false },
  { name: "Bath", temp: 24.1, highlight: false },
];

const humidity = [
  { room: "Bedroom", icon: "bed", pct: 42, label: "Ideal Range", color: "var(--color-secondary)" },
  { room: "Bathroom", icon: "bathtub", pct: 68, label: "High Humidity", color: "var(--color-error)" },
  { room: "Living Room", icon: "weekend", pct: 45, label: "Nominal", color: "var(--color-on-surface)" },
];

const appliances = [
  { icon: "dishwasher", name: "Dishwasher", detail: "Cycle: ECO • 12m left", status: "RUNNING", ok: true },
  { icon: "local_laundry_service", name: "Washing Machine", detail: "Idle • Ready to start", status: "STANDBY", ok: false },
  { icon: "kitchen", name: "Fridge/Freezer", detail: "T: 4°C / -18°C", status: "OPTIMAL", ok: true },
];

export default function ClimatePage() {
  return (
    <DashboardShell>
      <div className="mb-6">
        <h1 className="text-4xl font-extrabold tracking-tight font-headline" style={{ color: "var(--color-on-surface)" }}>
          Climate Control
        </h1>
        <p className="font-medium mt-1" style={{ color: "var(--color-on-surface-variant)" }}>
          Home environmental monitoring and HVAC systems
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Main column */}
        <div className="lg:col-span-8 space-y-5">
          {/* Room temperatures */}
          <Card>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2 font-headline" style={{ color: "var(--color-on-surface)" }}>
                <span className="material-symbols-outlined" style={{ color: "var(--color-primary)" }}>thermostat</span>
                Room Temperatures
              </h2>
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-outline-variant)" }}>
                IKEA VINDSTYRKA Sensors
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {rooms.map(({ name, temp, highlight }) => (
                <div
                  key={name}
                  className="p-4 rounded-xl flex flex-col gap-1 transition-all"
                  style={{
                    backgroundColor: "var(--color-surface-container)",
                    borderLeft: highlight ? "4px solid var(--color-primary)" : undefined,
                  }}
                >
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-on-surface-variant)" }}>
                    {name}
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold" style={{ color: "var(--color-on-surface)" }}>{temp}</span>
                    <span className="text-sm font-medium" style={{ color: "var(--color-on-surface-variant)" }}>°C</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Nibe */}
          <Card>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2 font-headline" style={{ color: "var(--color-on-surface)" }}>
                <span className="material-symbols-outlined" style={{ color: "var(--color-primary)" }}>heat_pump</span>
                Nibe S1255
              </h2>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "var(--color-secondary)", filter: "blur(1px)" }} />
                <span className="text-[10px] font-bold uppercase" style={{ color: "var(--color-secondary)" }}>Active</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[["Supply Temp", "34.2°C"], ["Return Temp", "28.9°C"]].map(([k, v]) => (
                  <div key={k} className="p-4 rounded-xl" style={{ backgroundColor: "var(--color-surface-container)" }}>
                    <span className="text-[10px] uppercase font-bold block mb-1" style={{ color: "var(--color-on-surface-variant)" }}>{k}</span>
                    <span className="text-xl font-bold" style={{ color: "var(--color-on-surface)" }}>{v}</span>
                  </div>
                ))}
              </div>
              {[["Operating Mode", "Heating + HW", "var(--color-primary)"], ["Instant COP", "4.82", "var(--color-on-surface)"]].map(([k, v, c]) => (
                <div key={k} className="flex justify-between items-center p-3 rounded-xl" style={{ backgroundColor: "var(--color-surface-container-low)" }}>
                  <span className="text-sm font-medium" style={{ color: "var(--color-on-surface)" }}>{k}</span>
                  <span className="text-sm font-bold" style={{ color: c as string }}>{v}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Mitsubishi AC */}
          <Card>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2 font-headline" style={{ color: "var(--color-on-surface)" }}>
                <span className="material-symbols-outlined" style={{ color: "var(--color-primary)" }}>ac_unit</span>
                Mitsubishi AC
              </h2>
            </div>
            <div className="space-y-5">
              <div className="text-center py-4">
                <span className="text-5xl font-black" style={{ color: "var(--color-on-surface)" }}>20°</span>
                <span className="text-sm font-semibold block mt-1" style={{ color: "var(--color-on-surface-variant)" }}>Target Temperature</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: "sunny", label: "Heat", active: true },
                  { icon: "ac_unit", label: "Cool", active: false },
                  { icon: "air", label: "Fan", active: false },
                ].map(({ icon, label, active }) => (
                  <button
                    key={label}
                    className="p-3 rounded-xl flex flex-col items-center gap-1 transition-transform active:scale-95"
                    style={{
                      backgroundColor: active ? "var(--color-primary)" : "var(--color-surface-container)",
                      color: active ? "var(--color-on-primary)" : "var(--color-on-surface-variant)",
                    }}
                  >
                    <span className="material-symbols-outlined text-xl">{icon}</span>
                    <span className="text-[10px] font-bold uppercase">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar column */}
        <aside className="lg:col-span-4 space-y-5">
          {/* Humidity */}
          <Card>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 font-headline" style={{ color: "var(--color-on-surface)" }}>
              <span className="material-symbols-outlined" style={{ color: "var(--color-primary)" }}>humidity_mid</span>
              Humidity
            </h2>
            <div className="space-y-4">
              {humidity.map(({ room, icon, pct, label, color }) => (
                <div key={room} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--color-surface-container)" }}>
                      <span className="material-symbols-outlined text-lg" style={{ color: "var(--color-primary)" }}>{icon}</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: "var(--color-on-surface)" }}>{room}</p>
                      <p className="text-[11px]" style={{ color }}>{label}</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold" style={{ color }}>{pct}%</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Kitchen appliances */}
          <Card>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 font-headline" style={{ color: "var(--color-on-surface)" }}>
              <span className="material-symbols-outlined" style={{ color: "var(--color-primary)" }}>kitchen</span>
              Kitchen Hub
            </h2>
            <div className="space-y-3">
              {appliances.map(({ icon, name, detail, status, ok }) => (
                <div
                  key={name}
                  className="p-4 rounded-xl flex justify-between items-center"
                  style={{
                    backgroundColor: ok ? "var(--color-surface-container)" : "var(--color-surface-container-low)",
                    borderLeft: ok ? "4px solid var(--color-secondary)" : undefined,
                    opacity: ok ? 1 : 0.8,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined">{icon}</span>
                    <div>
                      <p className="text-sm font-bold" style={{ color: "var(--color-on-surface)" }}>{name}</p>
                      <p className="text-[10px] font-medium" style={{ color: "var(--color-on-surface-variant)" }}>{detail}</p>
                    </div>
                  </div>
                  <span
                    className="text-[10px] font-bold px-2 py-1 rounded"
                    style={{
                      backgroundColor: ok ? "rgba(0,116,62,0.1)" : "rgba(187,185,178,0.1)",
                      color: ok ? "var(--color-secondary)" : "var(--color-on-surface-variant)",
                    }}
                  >
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Outdoor air quality */}
          <div
            className="rounded-[1.25rem] overflow-hidden h-48 relative flex items-end"
            style={{ backgroundColor: "var(--color-surface-container-high)" }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="material-symbols-outlined text-6xl opacity-10" style={{ color: "var(--color-on-surface)" }}>forest</span>
            </div>
            <div
              className="relative w-full p-4"
              style={{ background: "linear-gradient(to top, rgba(14,14,12,0.6), transparent)" }}
            >
              <span className="text-white text-[10px] font-bold uppercase tracking-widest">Outdoor Air Quality</span>
              <div className="flex items-center gap-2">
                <span className="text-white text-2xl font-bold">Good</span>
                <span className="font-bold text-sm" style={{ color: "var(--color-secondary-fixed)" }}>AQI 14</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </DashboardShell>
  );
}

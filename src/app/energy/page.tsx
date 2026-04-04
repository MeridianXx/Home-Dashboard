import DashboardShell from "@/components/layout/DashboardShell";

function Card({ children, className = "", style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-[1.25rem] p-6 ${className}`}
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

function Label({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--color-on-surface-variant)" }}>
      {children}
    </h3>
  );
}

function ProgressBar({ value, max = 100, color = "var(--color-primary)" }: { value: number; max?: number; color?: string }) {
  return (
    <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-surface-container)" }}>
      <div className="h-full rounded-full" style={{ width: `${(value / max) * 100}%`, backgroundColor: color }} />
    </div>
  );
}

const spotPriceHeights = [40, 35, 30, 25, 45, 85, 75, 60, 90, 80, 50, 40];
const spotLabels = ["00", "02", "04", "06", "08", "NOW", "12", "14", "16", "18", "20", "22"];

export default function EnergyPage() {
  return (
    <DashboardShell>
      <div className="mb-6">
        <h1 className="text-4xl font-extrabold tracking-tight font-headline" style={{ color: "var(--color-on-surface)" }}>
          Energy Orchestration
        </h1>
        <p className="font-medium mt-1" style={{ color: "var(--color-on-surface-variant)" }}>
          Real-time monitoring and smart automation for the atelier residence.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Tibber column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Spot price */}
          <div className="rounded-[1.25rem] p-6 space-y-5" style={{ backgroundColor: "var(--color-surface-container-high)" }}>
            <div className="flex justify-between items-start">
              <div>
                <Label>Tibber Real-time</Label>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black" style={{ color: "var(--color-on-surface)" }}>34.2</span>
                  <span className="text-lg font-bold" style={{ color: "var(--color-on-surface-variant)" }}>øre/kWh</span>
                </div>
                <p className="text-sm font-medium mt-1 flex items-center gap-1" style={{ color: "var(--color-secondary)" }}>
                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: "var(--color-secondary)" }} />
                  Currently Low
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-on-surface-variant)" }}>Today&apos;s Cost</p>
                <p className="text-2xl font-bold" style={{ color: "var(--color-on-surface)" }}>kr 14.20</p>
              </div>
            </div>

            {/* Price chart */}
            <div className="h-32 flex items-end gap-1 w-full">
              {spotPriceHeights.map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  {spotLabels[i] === "NOW" && (
                    <span className="text-[10px] font-bold" style={{ color: "var(--color-primary)" }}>NOW</span>
                  )}
                  <div
                    className="w-full rounded-t-sm"
                    style={{
                      height: `${h}%`,
                      backgroundColor:
                        spotLabels[i] === "NOW"
                          ? "var(--color-primary)"
                          : i < 5
                          ? "var(--color-surface-container-high)"
                          : "rgba(120,140,246,0.4)",
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Energy flow */}
          <Card>
            <Label>Energy Flow</Label>
            <div className="space-y-6">
              {[
                { label: "Solar Production", value: "4.2 kW", pct: 75, color: "var(--color-secondary)", bg: "var(--color-secondary-container)", textColor: "var(--color-secondary)" },
                { label: "Grid Import", value: "0.8 kW", pct: 15, color: "var(--color-primary)", bg: "var(--color-primary-container)", textColor: "var(--color-primary)" },
              ].map(({ label, value, pct, color, bg, textColor }) => (
                <div key={label}>
                  <div className="flex justify-between mb-2">
                    <span className="text-xs font-semibold px-2 py-1 uppercase rounded-full" style={{ backgroundColor: bg, color: textColor }}>{label}</span>
                    <span className="text-xs font-bold" style={{ color: textColor }}>{value}</span>
                  </div>
                  <ProgressBar value={pct} color={color} />
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* EV Charging column */}
        <div className="space-y-5">
          {[
            { name: "Skoda Enyaq", pct: 82, status: "Charging", statusColor: "var(--color-secondary)", power: "11.0 kW", session: "24.5 kWh", barColor: "var(--color-secondary)", icon: "ev_station", iconColor: "var(--color-secondary)" },
            { name: "Polestar 2", pct: 45, status: "Idle", statusColor: "var(--color-on-surface-variant)", power: "0.0 kW", session: "0.0 kWh", barColor: "rgba(120,140,246,0.4)", icon: "ev_station", iconColor: "var(--color-on-surface-variant)" },
          ].map(({ name, pct, status, statusColor, power, session, barColor }) => (
            <Card key={name}>
              <div className="flex justify-between items-center mb-3">
                <Label>{name}</Label>
                <span className="material-symbols-outlined" style={{ color: statusColor }}>ev_station</span>
              </div>
              <div className="flex items-center gap-4 mb-4">
                <span className="text-4xl font-black" style={{ color: "var(--color-on-surface)" }}>{pct}%</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-surface-container)" }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                </div>
              </div>
              <div className="space-y-3">
                {[["Status", status, statusColor], ["Power Draw", power, "var(--color-on-surface)"], ["Session", session, "var(--color-on-surface)"]].map(([k, v, c]) => (
                  <div key={String(k)} className="flex justify-between text-sm">
                    <span style={{ color: "var(--color-on-surface-variant)" }}>{k}</span>
                    <span className="font-bold" style={{ color: c as string }}>{v}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        {/* Heat pumps column */}
        <div className="space-y-5">
          {/* Nibe */}
          <Card style={{ borderLeft: "4px solid var(--color-primary)" }}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <Label>Nibe S1255</Label>
                <p className="text-lg font-bold" style={{ color: "var(--color-on-surface)" }}>Ground Source</p>
              </div>
              <span className="material-symbols-outlined" style={{ color: "var(--color-primary)" }}>heat_pump</span>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {[["Mode", "Auto"], ["Power", "1.2 kW"]].map(([k, v]) => (
                <div key={k} className="p-3 rounded-xl" style={{ backgroundColor: "var(--color-surface-container)" }}>
                  <p className="text-[10px] font-bold uppercase" style={{ color: "var(--color-on-surface-variant)" }}>{k}</p>
                  <p className="text-sm font-bold" style={{ color: "var(--color-on-surface)" }}>{v}</p>
                </div>
              ))}
            </div>
            <div className="p-4 rounded-xl flex justify-between items-center" style={{ backgroundColor: "rgba(71,91,194,0.1)" }}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg" style={{ color: "var(--color-primary)" }}>water_drop</span>
                <span className="text-sm font-medium" style={{ color: "var(--color-on-surface-variant)" }}>Hot Water</span>
              </div>
              <span className="text-xl font-bold" style={{ color: "var(--color-primary)" }}>52°C</span>
            </div>
          </Card>

          {/* Mitsubishi */}
          <Card style={{ borderLeft: "4px solid var(--color-tertiary)" }}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <Label>Mitsubishi</Label>
                <p className="text-lg font-bold" style={{ color: "var(--color-on-surface)" }}>Air-to-Air</p>
              </div>
              <span className="material-symbols-outlined" style={{ color: "var(--color-tertiary)" }}>ac_unit</span>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>Operation Mode</span>
                <span className="px-3 py-1 text-xs font-bold rounded-full" style={{ backgroundColor: "rgba(136,92,0,0.15)", color: "var(--color-tertiary)" }}>Heating</span>
              </div>
              <div className="flex items-center justify-between gap-4 mt-2">
                {[["Set", "22.5°", "var(--color-on-surface)"], ["Actual", "21.8°", "var(--color-tertiary)"]].map(([label, val, c]) => (
                  <div key={String(label)} className="text-center flex-1">
                    <p className="text-[10px] font-bold uppercase mb-1" style={{ color: "var(--color-on-surface-variant)" }}>{label}</p>
                    <p className="text-2xl font-bold" style={{ color: c as string }}>{val}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Optimization pill */}
          <div
            className="p-4 rounded-[1.25rem] flex items-center justify-between cursor-pointer hover:scale-[0.98] transition-transform"
            style={{ backgroundColor: "var(--color-inverse-surface)", color: "var(--color-surface)" }}
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined">bolt</span>
              <span className="text-sm font-bold">Optimization Active</span>
            </div>
            <span className="material-symbols-outlined text-lg">chevron_right</span>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

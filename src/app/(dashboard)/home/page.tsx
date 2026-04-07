// Home context — overview of the house: weather, lighting, climate, energy snapshot, media.
// All data is mock for Fas 1. Real HA integration comes in Fas 2.

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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[11px] font-bold uppercase tracking-widest mb-3"
      style={{ color: "var(--color-on-surface-variant)" }}
    >
      {children}
    </p>
  );
}

function StatChip({
  icon,
  value,
  label,
  color = "var(--color-primary)",
}: {
  icon: string;
  value: string;
  label: string;
  color?: string;
}) {
  return (
    <div
      className="flex items-center gap-3 p-4 rounded-xl"
      style={{ backgroundColor: "var(--color-surface-container)" }}
    >
      <span className="material-symbols-outlined text-[22px]" style={{ color }}>
        {icon}
      </span>
      <div>
        <p className="text-lg font-black leading-tight" style={{ color: "var(--color-on-surface)" }}>
          {value}
        </p>
        <p className="text-[11px] font-medium" style={{ color: "var(--color-on-surface-variant)" }}>
          {label}
        </p>
      </div>
    </div>
  );
}

const LIGHTING_ZONES = [
  { name: "Living Room", on: true, brightness: 80 },
  { name: "Kitchen", on: true, brightness: 100 },
  { name: "Office", on: false, brightness: 0 },
  { name: "Bedroom", on: false, brightness: 0 },
  { name: "Garage", on: true, brightness: 40 },
  { name: "Outdoor", on: false, brightness: 0 },
];

export default function HomePage() {
  const activeZones = LIGHTING_ZONES.filter((z) => z.on).length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1
          className="text-3xl font-extrabold tracking-tight font-headline"
          style={{ color: "var(--color-on-surface)" }}
        >
          Good morning, Adam
        </h1>
        <p className="text-sm font-medium mt-1" style={{ color: "var(--color-on-surface-variant)" }}>
          Villa Björkdalen · Monday, April 7
        </p>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatChip icon="thermostat" value="21.4°C" label="Indoor avg" color="var(--color-primary)" />
        <StatChip icon="wb_sunny" value="-2.1°C" label="Outdoor" color="var(--color-tertiary)" />
        <StatChip icon="bolt" value="34.2 øre" label="Spot price" color="var(--color-secondary)" />
        <StatChip icon="solar_power" value="4.2 kW" label="Solar output" color="var(--color-secondary)" />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {/* Lighting */}
        <Card className="xl:col-span-1">
          <SectionLabel>Lighting</SectionLabel>
          <div className="flex items-center justify-between mb-4">
            <span className="text-2xl font-black" style={{ color: "var(--color-on-surface)" }}>
              {activeZones} / {LIGHTING_ZONES.length}
            </span>
            <span className="text-sm font-medium px-3 py-1 rounded-full" style={{
              backgroundColor: "var(--color-secondary-container)",
              color: "var(--color-secondary)",
            }}>
              zones on
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {LIGHTING_ZONES.map((zone) => (
              <div
                key={zone.name}
                className="flex items-center gap-2 p-3 rounded-xl"
                style={{
                  backgroundColor: zone.on
                    ? "rgba(0,116,62,0.08)"
                    : "var(--color-surface-container)",
                }}
              >
                <span
                  className="material-symbols-outlined text-[18px]"
                  style={{ color: zone.on ? "var(--color-secondary)" : "var(--color-outline)" }}
                >
                  {zone.on ? "light_mode" : "light_off"}
                </span>
                <span className="text-xs font-semibold truncate" style={{ color: "var(--color-on-surface)" }}>
                  {zone.name}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Climate snapshot */}
        <Card>
          <SectionLabel>Climate</SectionLabel>
          <div className="space-y-3">
            {[
              { room: "Living Room", temp: "21.8°C", humidity: "45%", active: true },
              { room: "Kitchen", temp: "22.1°C", humidity: "48%", active: true },
              { room: "Office", temp: "20.5°C", humidity: "42%", active: false },
              { room: "Bedroom", temp: "19.2°C", humidity: "50%", active: false },
            ].map(({ room, temp, humidity, active }) => (
              <div key={room} className="flex items-center justify-between p-3 rounded-xl"
                style={{ backgroundColor: "var(--color-surface-container)" }}>
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: active ? "var(--color-secondary)" : "var(--color-outline)" }}
                  />
                  <span className="text-sm font-semibold" style={{ color: "var(--color-on-surface)" }}>{room}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold" style={{ color: "var(--color-primary)" }}>{temp}</span>
                  <span className="text-xs" style={{ color: "var(--color-outline)" }}>{humidity}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Energy snapshot */}
        <Card>
          <SectionLabel>Energy</SectionLabel>
          <div className="space-y-4">
            {/* Spot price big */}
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black" style={{ color: "var(--color-on-surface)" }}>34.2</span>
              <span className="text-sm font-bold" style={{ color: "var(--color-on-surface-variant)" }}>øre/kWh</span>
              <span
                className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "var(--color-secondary-container)", color: "var(--color-secondary)" }}
              >
                Low
              </span>
            </div>
            {[
              { label: "Today's cost", value: "kr 14.20", icon: "receipt" },
              { label: "Solar production", value: "4.2 kW", icon: "solar_power" },
              { label: "Grid import", value: "0.8 kW", icon: "electrical_services" },
              { label: "Hot water", value: "52°C", icon: "water_drop" },
            ].map(({ label, value, icon }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]" style={{ color: "var(--color-outline)" }}>
                    {icon}
                  </span>
                  <span className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>{label}</span>
                </div>
                <span className="text-sm font-bold" style={{ color: "var(--color-on-surface)" }}>{value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick actions */}
        <Card className="md:col-span-2 xl:col-span-3">
          <SectionLabel>Quick Actions</SectionLabel>
          <div className="flex flex-wrap gap-3">
            {[
              { label: "All lights off", icon: "light_off", color: "var(--color-on-surface)" },
              { label: "Good night", icon: "bedtime", color: "var(--color-primary)" },
              { label: "Away mode", icon: "lock", color: "var(--color-tertiary)" },
              { label: "Movie mode", icon: "movie", color: "var(--color-secondary)" },
              { label: "Boost heating", icon: "local_fire_department", color: "var(--color-tertiary)" },
            ].map(({ label, icon, color }) => (
              <button
                key={label}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all hover:scale-[0.97]"
                style={{
                  backgroundColor: "var(--color-surface-container)",
                  color: "var(--color-on-surface)",
                }}
              >
                <span className="material-symbols-outlined text-[18px]" style={{ color }}>{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

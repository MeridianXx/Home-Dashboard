// Hem-översikt — belysning, favoriter, klimat, energi, elbilar.
// Mock-data för Fas 1. Riktig HA-integration kommer i Fas 2.

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

// ─── Mock-data ────────────────────────────────────────────────────────────────

const LIGHTING_ZONES = [
  { name: "Vardagsrum", on: true, brightness: 80 },
  { name: "Kök", on: true, brightness: 100 },
  { name: "Kontor", on: false, brightness: 0 },
  { name: "Sovrum", on: false, brightness: 0 },
  { name: "Garage", on: true, brightness: 40 },
  { name: "Utomhus", on: false, brightness: 0 },
];

const FAVORITES = [
  { name: "Taklampa vardagsrum", icon: "ceiling_light", on: true, type: "light" },
  { name: "Golvlampa kontor", icon: "floor_lamp", on: false, type: "light" },
  { name: "Laddbox Skoda", icon: "ev_charger", on: true, type: "device" },
  { name: "Nibe S1255", icon: "heat_pump", on: true, type: "device" },
  { name: "Entrédörr", icon: "door_front", on: false, type: "lock" },
  { name: "Larm", icon: "security", on: true, type: "device" },
];

const EVS = [
  {
    name: "Skoda Enyaq",
    soc: 82,
    status: "Laddar",
    statusOk: true,
    power: "11,0 kW",
    session: "24,5 kWh",
    range: "ca 380 km",
    icon: "electric_car",
  },
  {
    name: "Polestar 2",
    soc: 45,
    status: "Klar",
    statusOk: false,
    power: "—",
    session: "—",
    range: "ca 195 km",
    icon: "electric_car",
  },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const activeZones = LIGHTING_ZONES.filter((z) => z.on).length;

  return (
    <div className="space-y-6">
      {/* Sidrubrik */}
      <div>
        <h1
          className="text-3xl font-extrabold tracking-tight font-headline"
          style={{ color: "var(--color-on-surface)" }}
        >
          God morgon, Adam
        </h1>
        <p className="text-sm font-medium mt-1" style={{ color: "var(--color-on-surface-variant)" }}>
          Villa Björkdalen · måndag 7 april
        </p>
      </div>

      {/* Snabbstatistik */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatChip icon="thermostat" value="21,4°C" label="Inomhus snitt" color="var(--color-primary)" />
        <StatChip icon="wb_sunny" value="-2,1°C" label="Utomhus" color="var(--color-tertiary)" />
        <StatChip icon="bolt" value="34,2 öre" label="Spotpris" color="var(--color-secondary)" />
        <StatChip icon="solar_power" value="4,2 kW" label="Solproduktion" color="var(--color-secondary)" />
      </div>

      {/* Huvudgrid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

        {/* Favoriter */}
        <Card>
          <SectionLabel>Favoriter</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            {FAVORITES.map((fav) => (
              <button
                key={fav.name}
                className="flex items-center gap-2 p-3 rounded-xl text-left transition-all hover:scale-[0.97]"
                style={{
                  backgroundColor: fav.on
                    ? "rgba(71,91,194,0.08)"
                    : "var(--color-surface-container)",
                }}
              >
                <span
                  className="material-symbols-outlined text-[20px] shrink-0"
                  style={{
                    color: fav.on ? "var(--color-primary)" : "var(--color-outline)",
                    fontVariationSettings: fav.on ? "'FILL' 1" : "'FILL' 0",
                  }}
                >
                  {fav.icon}
                </span>
                <span
                  className="text-xs font-semibold leading-tight"
                  style={{ color: "var(--color-on-surface)" }}
                >
                  {fav.name}
                </span>
              </button>
            ))}
          </div>
        </Card>

        {/* Belysning */}
        <Card>
          <SectionLabel>Belysning</SectionLabel>
          <div className="flex items-center justify-between mb-4">
            <span className="text-2xl font-black" style={{ color: "var(--color-on-surface)" }}>
              {activeZones} / {LIGHTING_ZONES.length}
            </span>
            <span
              className="text-sm font-medium px-3 py-1 rounded-full"
              style={{
                backgroundColor: "var(--color-secondary-container)",
                color: "var(--color-secondary)",
              }}
            >
              zoner på
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
                  style={{
                    color: zone.on ? "var(--color-secondary)" : "var(--color-outline)",
                    fontVariationSettings: zone.on ? "'FILL' 1" : "'FILL' 0",
                  }}
                >
                  {zone.on ? "light_mode" : "light_off"}
                </span>
                <span
                  className="text-xs font-semibold truncate"
                  style={{ color: "var(--color-on-surface)" }}
                >
                  {zone.name}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Klimat */}
        <Card>
          <SectionLabel>Klimat</SectionLabel>
          <div className="space-y-2">
            {[
              { rum: "Vardagsrum", temp: "21,8°C", fukt: "45%", aktiv: true },
              { rum: "Kök", temp: "22,1°C", fukt: "48%", aktiv: true },
              { rum: "Kontor", temp: "20,5°C", fukt: "42%", aktiv: false },
              { rum: "Sovrum", temp: "19,2°C", fukt: "50%", aktiv: false },
            ].map(({ rum, temp, fukt, aktiv }) => (
              <div
                key={rum}
                className="flex items-center justify-between p-3 rounded-xl"
                style={{ backgroundColor: "var(--color-surface-container)" }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: aktiv
                        ? "var(--color-secondary)"
                        : "var(--color-outline)",
                    }}
                  />
                  <span className="text-sm font-semibold" style={{ color: "var(--color-on-surface)" }}>
                    {rum}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold" style={{ color: "var(--color-primary)" }}>
                    {temp}
                  </span>
                  <span className="text-xs" style={{ color: "var(--color-outline)" }}>
                    {fukt}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Elbilar + laddboxar */}
        <Card className="md:col-span-2">
          <SectionLabel>Elbilar &amp; laddning</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {EVS.map(({ name, soc, status, statusOk, power, session, range, icon }) => (
              <div
                key={name}
                className="p-4 rounded-xl"
                style={{ backgroundColor: "var(--color-surface-container)" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="material-symbols-outlined text-[20px]"
                      style={{
                        color: statusOk ? "var(--color-secondary)" : "var(--color-on-surface-variant)",
                      }}
                    >
                      {icon}
                    </span>
                    <span className="text-sm font-bold" style={{ color: "var(--color-on-surface)" }}>
                      {name}
                    </span>
                  </div>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: statusOk
                        ? "var(--color-secondary-container)"
                        : "var(--color-surface-container-high)",
                      color: statusOk ? "var(--color-secondary)" : "var(--color-on-surface-variant)",
                    }}
                  >
                    {status}
                  </span>
                </div>

                {/* SOC-bar */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl font-black" style={{ color: "var(--color-on-surface)" }}>
                    {soc}%
                  </span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: "var(--color-surface-container-high)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${soc}%`,
                        backgroundColor: statusOk
                          ? "var(--color-secondary)"
                          : "rgba(120,140,246,0.5)",
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    ["Effekt", power],
                    ["Session", session],
                    ["Räckvidd", range],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <p className="text-[10px] font-bold uppercase" style={{ color: "var(--color-outline)" }}>
                        {k}
                      </p>
                      <p className="text-xs font-bold" style={{ color: "var(--color-on-surface)" }}>
                        {v}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Energiöversikt */}
        <Card>
          <SectionLabel>Energi</SectionLabel>
          <div className="space-y-3">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-4xl font-black" style={{ color: "var(--color-on-surface)" }}>
                34,2
              </span>
              <span className="text-sm font-bold" style={{ color: "var(--color-on-surface-variant)" }}>
                öre/kWh
              </span>
              <span
                className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: "var(--color-secondary-container)",
                  color: "var(--color-secondary)",
                }}
              >
                Lågt
              </span>
            </div>
            {[
              { label: "Dagens kostnad", value: "kr 14,20", icon: "receipt" },
              { label: "Solproduktion", value: "4,2 kW", icon: "solar_power" },
              { label: "Nätimport", value: "0,8 kW", icon: "electrical_services" },
              { label: "Varmvatten", value: "52°C", icon: "water_drop" },
            ].map(({ label, value, icon }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="material-symbols-outlined text-[16px]"
                    style={{ color: "var(--color-outline)" }}
                  >
                    {icon}
                  </span>
                  <span className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
                    {label}
                  </span>
                </div>
                <span className="text-sm font-bold" style={{ color: "var(--color-on-surface)" }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Snabbåtgärder */}
        <Card className="md:col-span-2 xl:col-span-3">
          <SectionLabel>Snabbåtgärder</SectionLabel>
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Alla ljus av", icon: "light_off", color: "var(--color-on-surface)" },
              { label: "God natt", icon: "bedtime", color: "var(--color-primary)" },
              { label: "Bortaläge", icon: "lock", color: "var(--color-tertiary)" },
              { label: "Filmläge", icon: "movie", color: "var(--color-secondary)" },
              { label: "Boost värme", icon: "local_fire_department", color: "var(--color-tertiary)" },
            ].map(({ label, icon, color }) => (
              <button
                key={label}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all hover:scale-[0.97]"
                style={{
                  backgroundColor: "var(--color-surface-container)",
                  color: "var(--color-on-surface)",
                }}
              >
                <span className="material-symbols-outlined text-[18px]" style={{ color }}>
                  {icon}
                </span>
                {label}
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

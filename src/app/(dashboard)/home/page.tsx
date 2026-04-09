"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import useSWR from "swr";

// ─── Types ────────────────────────────────────────────────────────────────────

type LightEntry = {
  entity_id: string; name: string; state: string;
  brightness_pct: number | null; dimmable: boolean;
};
type LightArea = {
  area_id: string; name: string;
  lights: LightEntry[]; on_count: number; total_count: number;
};
type SensorArea   = { area_id: string; name: string; temperature: number; humidity: number | null };
type SensorsData  = { areas: SensorArea[]; outdoor_temp: number | null; avg_indoor: number | null };
type LightsData   = { areas: LightArea[] };
type Car          = { id: string; name: string; soc: number; target_soc: number; range_km: number; plugged_in: boolean; charging: boolean };
type CarsData     = { cars: Car[] };
type EnergyData   = { spot_price_ore: number | null; spot_level: string; current_power_w: number; avg_power_w: number; min_power_w: number; max_power_w: number; accumulated_kwh: number; accumulated_cost_sek: number; monthly_cost_sek: number; monthly_kwh: number };
type HvacData     = {
  heat_pump: { entity_id: string; state: string; current_temp: number | null; target_temp: number | null; hvac_modes: string[] | null };
  flv: { outdoor_temp: number | null; hot_water_temp: number | null; fan_speed_pct: number | null; franluft_temp: number | null; alarm: boolean; kaminlage: boolean; more_hot_water: boolean; increased_ventilation: boolean };
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then(r => r.json());

function useHydrated() {
  const [h, set] = useState(false);
  useEffect(() => set(true), []);
  return h;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5)  return "God natt";
  if (h < 11) return "God morgon";
  if (h < 14) return "God dag";
  if (h < 18) return "God eftermiddag";
  return "God kväll";
}

function formatDate() {
  return new Date().toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "long" });
}

async function callAction(domain: string, service: string, entity_id: string | string[], service_data?: Record<string, unknown>) {
  await fetch("/api/homeassistant/action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ domain, service, entity_id, service_data }),
  });
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

/** Cross-platform press button — uses pointer events so it works on iOS Safari */
function Pressable({ children, onClick, disabled = false, className = "", style = {} }: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      className={`select-none ${className}`}
      style={{
        transform: pressed && !disabled ? "scale(0.93)" : "scale(1)",
        transition: "transform 0.08s ease, opacity 0.08s ease",
        opacity: disabled ? 0.6 : pressed ? 0.85 : 1,
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        cursor: "pointer",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl p-5 ${className}`} style={{
      backgroundColor: "var(--color-surface-container-lowest)",
      boxShadow: "0px 8px 24px rgba(56,56,51,0.06)",
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
  return <div className={`rounded-xl animate-pulse ${className}`}
    style={{ backgroundColor: "var(--color-surface-container)" }} />;
}

function StatChip({ icon, value, label, color = "var(--color-primary)", onClick }: {
  icon: string; value: string; label: string; color?: string; onClick?: () => void;
}) {
  const inner = (
    <>
      <span className="material-symbols-outlined text-[22px]" style={{ color }}>{icon}</span>
      <div className="min-w-0">
        <p className="text-lg font-black leading-tight" style={{ color: "var(--color-on-surface)" }}>{value}</p>
        <p className="text-[11px] font-medium" style={{ color: "var(--color-on-surface-variant)" }}>{label}</p>
      </div>
      {onClick && (
        <span className="material-symbols-outlined text-[16px] ml-auto shrink-0 opacity-40"
          style={{ color: "var(--color-on-surface)" }}>expand_more</span>
      )}
    </>
  );
  if (!onClick) return (
    <div className="flex items-center gap-3 p-4 rounded-xl"
      style={{ backgroundColor: "var(--color-surface-container)" }}>{inner}</div>
  );
  return (
    <Pressable onClick={onClick} className="flex items-center gap-3 p-4 rounded-xl w-full text-left"
      style={{ backgroundColor: "var(--color-surface-container)" }}>{inner}</Pressable>
  );
}

// ─── Bottom Sheet ─────────────────────────────────────────────────────────────

function BottomSheet({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      {/* Sheet */}
      <div className="relative z-10 w-full md:max-w-sm rounded-t-3xl md:rounded-2xl p-6 shadow-2xl"
        style={{ backgroundColor: "var(--color-surface-container-lowest)", border: "1px solid var(--color-outline-variant)" }}>
        {/* Drag handle (mobile) */}
        <div className="w-10 h-1 rounded-full mx-auto mb-5 md:hidden"
          style={{ backgroundColor: "var(--color-outline-variant)" }} />
        <div className="flex items-center justify-between mb-5">
          <p className="font-bold text-base" style={{ color: "var(--color-on-surface)" }}>{title}</p>
          <button onClick={onClose}
            className="material-symbols-outlined text-[20px] opacity-50 hover:opacity-100 transition-opacity"
            style={{ color: "var(--color-on-surface)" }}>close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Indoor temp modal ────────────────────────────────────────────────────────

function IndoorTempSheet({ data, onClose }: { data: SensorsData; onClose: () => void }) {
  return (
    <BottomSheet title="Temperaturer inomhus" onClose={onClose}>
      <div className="space-y-1">
        {data.areas.map(area => (
          <div key={area.area_id}
            className="flex items-center justify-between py-3 border-b"
            style={{ borderColor: "var(--color-outline-variant)" }}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--color-primary)" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--color-on-surface)" }}>{area.name}</span>
            </div>
            <div className="flex items-center gap-3">
              {area.humidity != null && (
                <span className="text-xs font-medium" style={{ color: "var(--color-on-surface-variant)" }}>
                  {area.humidity}%
                </span>
              )}
              <span className="text-sm font-black" style={{ color: "var(--color-primary)" }}>
                {area.temperature.toFixed(1)}°C
              </span>
            </div>
          </div>
        ))}
        {data.avg_indoor != null && (
          <div className="flex items-center justify-between pt-3">
            <span className="text-xs font-bold uppercase tracking-wider"
              style={{ color: "var(--color-on-surface-variant)" }}>Snitt</span>
            <span className="text-sm font-black" style={{ color: "var(--color-on-surface)" }}>
              {data.avg_indoor.toFixed(1)}°C
            </span>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

// ─── Outdoor temp modal ───────────────────────────────────────────────────────

function OutdoorTempSheet({ sensors, hvac, onClose }: {
  sensors: SensorsData; hvac: HvacData | undefined; onClose: () => void;
}) {
  const rows: { label: string; value: string | null; icon: string }[] = [
    { label: "Utomhus (Nibe BT1)", value: sensors.outdoor_temp != null ? `${sensors.outdoor_temp.toFixed(1)}°C` : null, icon: "device_thermostat" },
    { label: "Frånluft",           value: hvac?.flv.franluft_temp != null ? `${hvac.flv.franluft_temp.toFixed(1)}°C` : null, icon: "air" },
    { label: "Varmvatten",         value: hvac?.flv.hot_water_temp != null ? `${hvac.flv.hot_water_temp.toFixed(1)}°C` : null, icon: "water_drop" },
  ].filter(r => r.value != null);

  return (
    <BottomSheet title="Klimat utomhus" onClose={onClose}>
      <div className="space-y-1">
        {rows.map(row => (
          <div key={row.label}
            className="flex items-center justify-between py-3 border-b"
            style={{ borderColor: "var(--color-outline-variant)" }}>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]"
                style={{ color: "var(--color-tertiary)" }}>{row.icon}</span>
              <span className="text-sm font-semibold" style={{ color: "var(--color-on-surface)" }}>{row.label}</span>
            </div>
            <span className="text-sm font-black" style={{ color: "var(--color-tertiary)" }}>{row.value}</span>
          </div>
        ))}
      </div>
    </BottomSheet>
  );
}

// ─── Dimmer Popover ───────────────────────────────────────────────────────────

function DimmerPopover({ area, onClose, onRefresh }: {
  area: LightArea;
  onClose: () => void;
  onRefresh: () => void;
}) {
  async function handleToggle(light: LightEntry) {
    await callAction("light", light.state === "on" ? "turn_off" : "turn_on", light.entity_id);
    onRefresh();
  }

  async function handleBrightness(entity_id: string, pct: number) {
    await callAction("light", "turn_on", entity_id, { brightness_pct: pct });
    onRefresh();
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      {/* Panel */}
      <div className="fixed inset-x-4 bottom-4 z-50 rounded-2xl p-5 shadow-2xl md:inset-auto md:right-8 md:bottom-8 md:w-80"
        style={{ backgroundColor: "var(--color-surface-container-lowest)", border: "1px solid var(--color-outline-variant)" }}>
        <div className="flex items-center justify-between mb-4">
          <p className="font-bold text-sm" style={{ color: "var(--color-on-surface)" }}>{area.name}</p>
          <button onClick={onClose} className="material-symbols-outlined text-[20px] opacity-60 hover:opacity-100"
            style={{ color: "var(--color-on-surface)" }}>close</button>
        </div>
        <div className="space-y-3">
          {area.lights.map(light => (
            <div key={light.entity_id} className="flex items-center gap-3">
              <Pressable onClick={() => handleToggle(light)} className="shrink-0 p-1">
                <span className="material-symbols-outlined text-[20px]"
                  style={{
                    color: light.state === "on" ? "var(--color-secondary)" : "var(--color-outline)",
                    fontVariationSettings: light.state === "on" ? "'FILL' 1" : "'FILL' 0",
                  }}>
                  {light.state === "on" ? "light_mode" : "light_off"}
                </span>
              </Pressable>
              <span className="text-xs font-semibold flex-1 min-w-0 truncate"
                style={{ color: "var(--color-on-surface)" }}>{light.name}</span>
              {light.dimmable && light.state === "on" && (
                <div className="flex items-center gap-2 w-28 shrink-0">
                  <input
                    type="range" min={1} max={100}
                    defaultValue={light.brightness_pct ?? 100}
                    className="w-full h-1 accent-[var(--color-secondary)] cursor-pointer"
                    onMouseUp={e => handleBrightness(light.entity_id, parseInt((e.target as HTMLInputElement).value))}
                    onTouchEnd={e => handleBrightness(light.entity_id, parseInt((e.target as HTMLInputElement).value))}
                  />
                  <span className="text-[10px] w-7 text-right shrink-0"
                    style={{ color: "var(--color-outline)" }}>
                    {light.brightness_pct ?? 100}%
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Belysning ────────────────────────────────────────────────────────────────

function LightingCard({ data, onRefresh }: { data: LightsData; onRefresh: () => void }) {
  const [dimmerArea, setDimmerArea] = useState<LightArea | null>(null);

  const totalOn  = data.areas.reduce((s, a) => s + a.on_count, 0);
  const totalAll = data.areas.reduce((s, a) => s + a.total_count, 0);

  async function handleToggleArea(area: LightArea) {
    const anyOn = area.on_count > 0;
    await callAction("light", anyOn ? "turn_off" : "turn_on", area.lights.map(l => l.entity_id));
    onRefresh();
  }

  return (
    <>
      <Card>
        <SectionLabel>Belysning</SectionLabel>
        <div className="flex items-center justify-between mb-4">
          <span className="text-2xl font-black" style={{ color: "var(--color-on-surface)" }}>
            {totalOn} / {totalAll}
          </span>
          <span className="text-sm font-medium px-3 py-1 rounded-full"
            style={{ backgroundColor: "var(--color-secondary-container)", color: "var(--color-secondary)" }}>
            lampor på
          </span>
        </div>
        <div className="space-y-1.5">
          {data.areas.map(area => (
            <div key={area.area_id}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
              style={{ backgroundColor: area.on_count > 0 ? "rgba(0,116,62,0.08)" : "var(--color-surface-container)" }}>
              {/* Toggle zone */}
              <Pressable className="flex items-center gap-2 flex-1 min-w-0 text-left"
                onClick={() => handleToggleArea(area)}>
                <span className="material-symbols-outlined text-[18px] shrink-0"
                  style={{
                    color: area.on_count > 0 ? "var(--color-secondary)" : "var(--color-outline)",
                    fontVariationSettings: area.on_count > 0 ? "'FILL' 1" : "'FILL' 0",
                  }}>
                  {area.on_count > 0 ? "light_mode" : "light_off"}
                </span>
                <span className="text-xs font-semibold truncate"
                  style={{ color: "var(--color-on-surface)" }}>{area.name}</span>
                <span className="text-[10px] ml-auto shrink-0"
                  style={{ color: "var(--color-outline)" }}>
                  {area.on_count}/{area.total_count}
                </span>
              </Pressable>
              {/* Dimmer button */}
              <Pressable onClick={() => setDimmerArea(area)} className="shrink-0 p-1">
                <span className="material-symbols-outlined text-[16px]"
                  style={{ color: "var(--color-on-surface-variant)" }}>tune</span>
              </Pressable>
            </div>
          ))}
        </div>
      </Card>

      {dimmerArea && (
        <DimmerPopover
          area={dimmerArea}
          onClose={() => setDimmerArea(null)}
          onRefresh={() => { onRefresh(); setDimmerArea(null); }}
        />
      )}
    </>
  );
}

// ─── Klimat ───────────────────────────────────────────────────────────────────

function ClimateCard({ data }: { data: SensorsData }) {
  return (
    <Card>
      <SectionLabel>Klimat</SectionLabel>
      <div className="space-y-1.5">
        {data.areas.map(area => (
          <div key={area.area_id}
            className="flex items-center justify-between px-3 py-2.5 rounded-xl"
            style={{ backgroundColor: "var(--color-surface-container)" }}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: "var(--color-secondary)" }} />
              <span className="text-sm font-semibold"
                style={{ color: "var(--color-on-surface)" }}>{area.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold"
                style={{ color: "var(--color-primary)" }}>{area.temperature.toFixed(1)}°C</span>
              {area.humidity != null && (
                <span className="text-xs" style={{ color: "var(--color-outline)" }}>
                  {Math.round(area.humidity)}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Elbilar ─────────────────────────────────────────────────────────────────

function CarsCard({ data }: { data: CarsData }) {
  return (
    <Card className="md:col-span-2">
      <SectionLabel>Elbilar &amp; laddning</SectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {data.cars.map(car => (
          <div key={car.id} className="p-4 rounded-xl"
            style={{ backgroundColor: "var(--color-surface-container)" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]"
                  style={{ color: car.charging ? "var(--color-secondary)" : "var(--color-on-surface-variant)" }}>
                  electric_car
                </span>
                <span className="text-sm font-bold" style={{ color: "var(--color-on-surface)" }}>{car.name}</span>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: car.charging ? "var(--color-secondary-container)" : "var(--color-surface-container-high)",
                  color: car.charging ? "var(--color-secondary)" : "var(--color-on-surface-variant)",
                }}>
                {car.charging ? "Laddar" : car.plugged_in ? "Inkopplad" : "Klar"}
              </span>
            </div>

            {/* SOC bar */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl font-black" style={{ color: "var(--color-on-surface)" }}>{car.soc}%</span>
              <div className="flex-1">
                <div className="h-2 rounded-full overflow-hidden"
                  style={{ backgroundColor: "var(--color-surface-container-high)" }}>
                  <div className="h-full rounded-full transition-all"
                    style={{
                      width: `${car.soc}%`,
                      backgroundColor: car.charging ? "var(--color-secondary)" : car.soc < 20 ? "var(--color-error)" : "var(--color-primary)",
                    }} />
                </div>
                {car.target_soc < 100 && (
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--color-outline)" }}>
                    Mål: {car.target_soc}%
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                ["Räckvidd", `ca ${car.range_km} km`],
                ["Status", car.plugged_in ? (car.charging ? "Laddar" : "Klar") : "Ej inkopplad"],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="text-[10px] font-bold uppercase" style={{ color: "var(--color-outline)" }}>{k}</p>
                  <p className="text-xs font-bold" style={{ color: "var(--color-on-surface)" }}>{v}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Energi ───────────────────────────────────────────────────────────────────

function EnergyCard({ data }: { data: EnergyData }) {
  const spotLabel = data.spot_level === "low" ? "Lågt" : data.spot_level === "medium" ? "Medel" : data.spot_level === "high" ? "Högt" : "–";
  const spotColor = data.spot_level === "low" ? "var(--color-secondary)" : data.spot_level === "high" ? "var(--color-error)" : "var(--color-tertiary)";

  return (
    <Card>
      <SectionLabel>Energi</SectionLabel>
      <div className="space-y-3">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-4xl font-black" style={{ color: "var(--color-on-surface)" }}>
            {data.spot_price_ore != null ? data.spot_price_ore.toFixed(1) : "–"}
          </span>
          <span className="text-sm font-bold" style={{ color: "var(--color-on-surface-variant)" }}>öre/kWh</span>
          <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${spotColor}22`, color: spotColor }}>
            {spotLabel}
          </span>
        </div>

        {[
          { label: "Aktuell effekt",  value: `${data.current_power_w} W`,                        icon: "bolt" },
          { label: "Idag",            value: `${data.accumulated_kwh.toFixed(2)} kWh · ${data.accumulated_cost_sek.toFixed(2)} kr`, icon: "today" },
          { label: "Månadskostnad",   value: `${data.monthly_cost_sek.toFixed(0)} kr`,            icon: "receipt" },
          { label: "Månadsförbrukning", value: `${data.monthly_kwh.toFixed(0)} kWh`,              icon: "electric_meter" },
        ].map(({ label, value, icon }) => (
          <div key={label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]"
                style={{ color: "var(--color-outline)" }}>{icon}</span>
              <span className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>{label}</span>
            </div>
            <span className="text-sm font-bold" style={{ color: "var(--color-on-surface)" }}>{value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Värmepumpar ──────────────────────────────────────────────────────────────

const HVAC_MODE_LABELS: Record<string, string> = {
  off: "Av", heat: "Värme", cool: "Kyla",
  heat_cool: "Auto", fan_only: "Fläkt", dry: "Torr",
};
const HVAC_MODE_ICONS: Record<string, string> = {
  off: "power_settings_new", heat: "local_fire_department",
  cool: "ac_unit", heat_cool: "thermostat_auto", fan_only: "mode_fan", dry: "water_drop",
};

function HvacCard({ data, onRefresh }: { data: HvacData; onRefresh: () => void }) {
  const hp  = data.heat_pump;
  const flv = data.flv;

  async function handleHeatPumpMode(mode: string) {
    await callAction("climate", mode === "off" ? "turn_off" : "set_hvac_mode", hp.entity_id,
      mode === "off" ? undefined : { hvac_mode: mode });
    onRefresh();
  }

  async function handleMoreHotWater(current: boolean) {
    await callAction("switch", current ? "turn_off" : "turn_on", "switch.nibe_mer_varmvatten");
    onRefresh();
  }

  async function handleFan(current: boolean) {
    await callAction("switch", current ? "turn_off" : "turn_on", "switch.nibe_okad_ventilation");
    onRefresh();
  }

  async function handleKaminlage(current: boolean) {
    await callAction("switch", current ? "turn_off" : "turn_on", "switch.nibe_kaminlage");
    onRefresh();
  }

  const hpIcon  = HVAC_MODE_ICONS[hp.state] ?? "thermostat";
  const hpLabel = HVAC_MODE_LABELS[hp.state] ?? hp.state;
  const hpColor = hp.state === "off" ? "var(--color-outline)"
    : hp.state === "cool" ? "var(--color-primary)"
    : "var(--color-tertiary)";

  return (
    <Card className="md:col-span-2">
      <SectionLabel>Värmepumpar</SectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Hero — luftvärmepump */}
        <div className="p-4 rounded-xl" style={{ backgroundColor: "var(--color-surface-container)" }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-[20px]" style={{ color: hpColor }}>
              {hpIcon}
            </span>
            <span className="text-sm font-bold" style={{ color: "var(--color-on-surface)" }}>Luftvärmepump</span>
            {hp.current_temp != null && (
              <span className="ml-auto text-sm font-bold" style={{ color: "var(--color-primary)" }}>
                {hp.current_temp}°C
              </span>
            )}
          </div>
          <p className="text-xs mb-3" style={{ color: "var(--color-on-surface-variant)" }}>
            Läge: <span className="font-bold" style={{ color: "var(--color-on-surface)" }}>{hpLabel}</span>
            {hp.target_temp != null && ` · Mål ${hp.target_temp}°C`}
          </p>
          {/* Mode buttons */}
          {hp.hvac_modes && (
            <div className="flex flex-wrap gap-1.5">
              {hp.hvac_modes.map(mode => (
                <Pressable key={mode} onClick={() => handleHeatPumpMode(mode)}
                  className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg"
                  style={{
                    backgroundColor: hp.state === mode ? `${hpColor}22` : "var(--color-surface-container-high)",
                    color: hp.state === mode ? hpColor : "var(--color-on-surface-variant)",
                  }}>
                  <span className="material-symbols-outlined text-[12px]">{HVAC_MODE_ICONS[mode] ?? "thermostat"}</span>
                  {HVAC_MODE_LABELS[mode] ?? mode}
                </Pressable>
              ))}
            </div>
          )}
        </div>

        {/* Nibe S735 — frånluftsvärmepump */}
        <div className="p-4 rounded-xl" style={{ backgroundColor: "var(--color-surface-container)" }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-[20px]"
              style={{ color: flv.alarm ? "var(--color-error)" : "var(--color-tertiary)" }}>
              {flv.alarm ? "error" : "heat_pump"}
            </span>
            <span className="text-sm font-bold" style={{ color: "var(--color-on-surface)" }}>Nibe S735</span>
            {flv.outdoor_temp != null && (
              <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "var(--color-surface-container-high)", color: "var(--color-on-surface-variant)" }}>
                Ute: {flv.outdoor_temp}°C
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-3 text-xs">
            {[
              ["Varmvatten",  flv.hot_water_temp != null ? `${flv.hot_water_temp}°C` : "–"],
              ["Fläkt",       flv.fan_speed_pct  != null ? `${flv.fan_speed_pct}%`   : "–"],
              ["Frånluft",    flv.franluft_temp  != null ? `${flv.franluft_temp}°C`  : "–"],
              ["Utomhus",     flv.outdoor_temp   != null ? `${flv.outdoor_temp}°C`   : "–"],
            ].map(([k, v]) => (
              <div key={k}>
                <span style={{ color: "var(--color-outline)" }}>{k} </span>
                <span className="font-bold" style={{ color: "var(--color-on-surface)" }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Quick controls */}
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { label: "Mer varmvatten", icon: "water_drop",    active: flv.more_hot_water,        onToggle: () => handleMoreHotWater(flv.more_hot_water) },
              { label: "Ökad ventil.",   icon: "mode_fan",       active: flv.increased_ventilation, onToggle: () => handleFan(flv.increased_ventilation) },
              { label: "Kaminläge",      icon: "local_fire_department", active: flv.kaminlage,     onToggle: () => handleKaminlage(flv.kaminlage) },
            ].map(({ label, icon, active, onToggle }) => (
              <Pressable key={label} onClick={onToggle}
                className="flex flex-col items-center gap-1 text-[10px] font-bold px-2 py-2 rounded-lg"
                style={{
                  backgroundColor: active ? "rgba(71,91,194,0.15)" : "var(--color-surface-container-high)",
                  color: active ? "var(--color-primary)" : "var(--color-on-surface-variant)",
                }}>
                <span className="material-symbols-outlined text-[16px]">{icon}</span>
                {label}
              </Pressable>
            ))}
          </div>
        </div>

      </div>
    </Card>
  );
}

// ─── Favorit tile ─────────────────────────────────────────────────────────────

function FavTile({ label, icon, color, active, loading, onClick }: {
  label: string; icon: string; color: string;
  active: boolean; loading: boolean; onClick: () => void;
}) {
  return (
    <Pressable
      onClick={onClick}
      disabled={loading}
      className="flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-2xl text-center w-full"
      style={{
        backgroundColor: active ? `color-mix(in srgb, ${color} 12%, var(--color-surface-container))` : "var(--color-surface-container)",
        border: `1.5px solid ${active ? color : "transparent"}`,
      }}
    >
      {loading ? (
        <span className="material-symbols-outlined text-[26px] animate-spin" style={{ color }}>progress_activity</span>
      ) : (
        <span className="material-symbols-outlined text-[26px]"
          style={{ color, fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>{icon}</span>
      )}
      <span className="text-[11px] font-semibold leading-tight w-full truncate px-1"
        style={{ color: "var(--color-on-surface)" }}>{label}</span>
    </Pressable>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const hydrated = useHydrated();

  const { data: lights,  mutate: mLights  } = useSWR<LightsData>  ("/api/homeassistant/lights",  fetcher, { refreshInterval:  2_000 });
  const { data: sensors }                    = useSWR<SensorsData> ("/api/homeassistant/sensors", fetcher, { refreshInterval: 30_000 });
  const { data: energy }                     = useSWR<EnergyData>  ("/api/homeassistant/energy",  fetcher, { refreshInterval:  3_000 });
  const { data: cars }                       = useSWR<CarsData>    ("/api/homeassistant/cars",    fetcher, { refreshInterval: 60_000 });
  const { data: hvac,    mutate: mHvac    } = useSWR<HvacData>    ("/api/homeassistant/hvac",    fetcher, { refreshInterval: 15_000 });

  const refreshLights = useCallback(() => { void mLights(); }, [mLights]);
  const refreshHvac   = useCallback(() => { void mHvac(); },   [mHvac]);

  // Modal state
  const [showIndoor,  setShowIndoor]  = useState(false);
  const [showOutdoor, setShowOutdoor] = useState(false);

  // Action loading — tracks which key is in-flight
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const loadingRef = useRef<string | null>(null);

  const runAction = useCallback(async (key: string, fn: () => Promise<void>) => {
    if (loadingRef.current) return;
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(10);
    loadingRef.current = key;
    setLoadingKey(key);
    try { await fn(); } finally { loadingRef.current = null; setLoadingKey(null); }
  }, []);

  if (!hydrated) return null;

  // Derive live states for stateful favorites
  const hvacOk    = hvac && "heat_pump" in hvac;
  const acState   = hvacOk ? hvac.heat_pump.state : "off";
  const acOn      = acState !== "off";
  const acLabel   = acOn ? ({ heat: "Värme", cool: "Kyla", heat_cool: "Auto", fan_only: "Fläkt", dry: "Torr" }[acState] ?? acState) : "AC";
  const kaminOn   = hvacOk ? hvac.flv.kaminlage      : false;
  const boostOn   = hvacOk ? hvac.flv.more_hot_water : false;
  const sensorsOk = sensors && "areas" in sensors;

  return (
    <div className="space-y-5">

      {/* Modals */}
      {showIndoor && sensorsOk && (
        <IndoorTempSheet data={sensors} onClose={() => setShowIndoor(false)} />
      )}
      {showOutdoor && sensorsOk && (
        <OutdoorTempSheet sensors={sensors} hvac={hvacOk ? hvac : undefined} onClose={() => setShowOutdoor(false)} />
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight font-headline"
          style={{ color: "var(--color-on-surface)" }}>
          {greeting()}, Adam
        </h1>
        <p className="text-sm font-medium mt-1 capitalize"
          style={{ color: "var(--color-on-surface-variant)" }}>
          Villa Björkdalen · {formatDate()}
        </p>
      </div>

      {/* Status strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatChip
          icon="thermostat"
          value={sensors?.avg_indoor != null ? `${sensors.avg_indoor}°C` : "–"}
          label="Inomhus snitt"
          color="var(--color-primary)"
          onClick={sensorsOk ? () => setShowIndoor(true) : undefined}
        />
        <StatChip
          icon="device_thermostat"
          value={sensors?.outdoor_temp != null ? `${sensors.outdoor_temp}°C` : "–"}
          label="Utomhus"
          color="var(--color-tertiary)"
          onClick={sensorsOk ? () => setShowOutdoor(true) : undefined}
        />
        <StatChip
          icon="bolt"
          value={energy?.spot_price_ore != null ? `${energy.spot_price_ore.toFixed(1)} öre` : "–"}
          label="Spotpris"
          color="var(--color-secondary)"
        />
        <StatChip
          icon="electric_meter"
          value={energy && "current_power_w" in energy ? `${energy.current_power_w} W` : "–"}
          label="Aktuell effekt"
          color="var(--color-secondary)"
        />
      </div>

      {/* Favoriter */}
      <Card>
        <SectionLabel>Favoriter</SectionLabel>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          <FavTile
            label="Kväll" icon="partly_cloudy_night"
            color="var(--color-primary)" active={false}
            loading={loadingKey === "scene-kvall"}
            onClick={() => runAction("scene-kvall", () => callAction("scene", "turn_on", "scene.fasad"))}
          />
          <FavTile
            label="Natt" icon="bedtime"
            color="var(--color-primary)" active={false}
            loading={loadingKey === "scene-natt"}
            onClick={() => runAction("scene-natt", () => callAction("scene", "turn_on", "scene.fasad_nattlage"))}
          />
          <FavTile
            label="Alla av" icon="light_off"
            color="var(--color-on-surface-variant)" active={false}
            loading={loadingKey === "lights-off"}
            onClick={() => runAction("lights-off", async () => { await callAction("light", "turn_off", "all"); refreshLights(); })}
          />
          <FavTile
            label={acLabel} icon={acOn ? "mode_cool" : "mode_cool_off"}
            color={acOn ? "var(--color-secondary)" : "var(--color-outline)"} active={acOn}
            loading={loadingKey === "ac"}
            onClick={() => runAction("ac", async () => {
              await callAction("climate", "set_hvac_mode", "climate.vardagsrum_luftvarmepump", { hvac_mode: acOn ? "off" : "heat" });
              void mHvac();
            })}
          />
          <FavTile
            label="Boost VV" icon="water_drop"
            color={boostOn ? "var(--color-secondary)" : "var(--color-outline)"} active={boostOn}
            loading={loadingKey === "boost"}
            onClick={() => runAction("boost", async () => {
              await callAction("switch", boostOn ? "turn_off" : "turn_on", "switch.nibe_mer_varmvatten");
              refreshHvac();
            })}
          />
          <FavTile
            label="Kaminläge" icon="local_fire_department"
            color={kaminOn ? "var(--color-tertiary)" : "var(--color-outline)"} active={kaminOn}
            loading={loadingKey === "kamin"}
            onClick={() => runAction("kamin", async () => {
              await callAction("switch", kaminOn ? "turn_off" : "turn_on", "switch.nibe_kaminlage");
              refreshHvac();
            })}
          />
        </div>
      </Card>

      {/* Main grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

        {/* Belysning */}
        {lights && "areas" in lights ? (
          <LightingCard data={lights} onRefresh={refreshLights} />
        ) : (
          <Card><SectionLabel>Belysning</SectionLabel><Skeleton className="h-40" /></Card>
        )}

        {/* Klimat */}
        {sensorsOk ? (
          <ClimateCard data={sensors} />
        ) : (
          <Card><SectionLabel>Klimat</SectionLabel><Skeleton className="h-40" /></Card>
        )}

        {/* Energi */}
        {energy && "accumulated_kwh" in energy ? (
          <EnergyCard data={energy} />
        ) : (
          <Card><SectionLabel>Energi</SectionLabel><Skeleton className="h-48" /></Card>
        )}

        {/* Elbilar */}
        {cars && "cars" in cars ? (
          <CarsCard data={cars} />
        ) : (
          <Card className="md:col-span-2"><SectionLabel>Elbilar &amp; laddning</SectionLabel><Skeleton className="h-36" /></Card>
        )}

        {/* Värmepumpar */}
        {hvacOk ? (
          <HvacCard data={hvac} onRefresh={refreshHvac} />
        ) : (
          <Card className="md:col-span-2"><SectionLabel>Värmepumpar</SectionLabel><Skeleton className="h-36" /></Card>
        )}

      </div>
    </div>
  );
}

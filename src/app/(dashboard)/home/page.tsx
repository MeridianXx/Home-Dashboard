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
type SensorsData  = { areas: SensorArea[]; outdoor_temp: number | null; avg_indoor: number | null; nibe_indoor_temp: number | null };
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
function Pressable({ children, onClick, disabled = false, loading = false, className = "", style = {} }: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      className={`select-none ${className}`}
      style={{
        transform: pressed && !disabled && !loading ? "scale(0.93)" : "scale(1)",
        transition: "transform 0.08s ease, opacity 0.08s ease",
        // loading keeps full opacity so spinner is clearly visible
        opacity: loading ? 1 : disabled ? 0.6 : pressed ? 0.85 : 1,
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        cursor: loading ? "default" : "pointer",
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
      loading={loading}
      className="flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-2xl text-center w-full"
      style={{
        // No color-mix() — use border + label color for active indication (works in all browsers)
        backgroundColor: "var(--color-surface-container)",
        border: `2px solid ${active && !loading ? color : "transparent"}`,
        boxShadow: active && !loading ? `inset 0 0 0 99px ${color}14` : "none",
      }}
    >
      {loading ? (
        // Pure CSS ring spinner — always visible and clearly animated
        <div className="animate-spin rounded-full w-[26px] h-[26px] border-[2.5px] border-transparent"
          style={{ borderTopColor: color, borderRightColor: `${color}55` }} />
      ) : (
        <span className="material-symbols-outlined text-[26px]"
          style={{ color, fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>{icon}</span>
      )}
      <span className="text-[11px] font-semibold leading-tight w-full truncate px-1"
        style={{ color: active && !loading ? color : "var(--color-on-surface)" }}>{label}</span>
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

  // Awaitable refresh — waits for HA to process the command before revalidating
  const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
  const refreshLights = useCallback(async () => { await delay(600);  await mLights(); }, [mLights]);
  const refreshHvac   = useCallback(async () => { await delay(1000); await mHvac();   }, [mHvac]);

  // Expanded chip state (inline expand-from-chip)
  const [expandedChip, setExpandedChip] = useState<"indoor" | "outdoor" | null>(null);
  const toggleChip = (chip: "indoor" | "outdoor") =>
    setExpandedChip(prev => prev === chip ? null : chip);

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

  // Primary indoor temp: Nibe BT50, fallback to avg
  const indoorTemp = sensorsOk
    ? (sensors.nibe_indoor_temp ?? sensors.avg_indoor)
    : null;

  return (
    <div className="space-y-5">

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

      {/* Status strip — split into temp row (expandable) + energy row */}
      {(() => {
        // Separate växthus from indoor areas
        const indoorAreas = sensorsOk ? sensors.areas.filter(a => a.name.toLowerCase() !== "växthus") : [];
        const vaxthusArea = sensorsOk ? sensors.areas.find(a => a.name.toLowerCase() === "växthus") : null;

        const ChipRow = ({ children }: { children: React.ReactNode }) => (
          <div className="grid grid-cols-2">{children}</div>
        );

        const ExpandChip = ({ chip, icon, value, label, color }: {
          chip: "indoor" | "outdoor"; icon: string; value: string; label: string; color: string;
        }) => {
          const open = expandedChip === chip;
          return (
            <Pressable
              onClick={sensorsOk ? () => toggleChip(chip) : undefined}
              className="flex items-center gap-3 p-4 text-left"
              style={{ borderBottom: open ? `2px solid ${color}` : "2px solid transparent" }}
            >
              <span className="material-symbols-outlined text-[22px]"
                style={{ color, fontVariationSettings: open ? "'FILL' 1" : "'FILL' 0" }}>{icon}</span>
              <div className="min-w-0">
                <p className="text-lg font-black leading-tight" style={{ color: "var(--color-on-surface)" }}>{value}</p>
                <p className="text-[11px] font-medium" style={{ color: "var(--color-on-surface-variant)" }}>{label}</p>
              </div>
              {sensorsOk && (
                <span className="material-symbols-outlined text-[16px] ml-auto shrink-0 opacity-40"
                  style={{ color: "var(--color-on-surface)", transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
                  expand_more
                </span>
              )}
            </Pressable>
          );
        };

        const PrimaryBadge = ({ color }: { color: string }) => (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold shrink-0"
            style={{ border: `1px solid ${color}`, color }}>primär</span>
        );

        return (
          <div className="rounded-2xl overflow-hidden" style={{
            backgroundColor: "var(--color-surface-container)",
            boxShadow: "0px 8px 24px rgba(56,56,51,0.06)",
          }}>
            {/* Row 1: temp chips */}
            <ChipRow>
              <ExpandChip chip="indoor" icon="thermostat"
                value={indoorTemp != null ? `${indoorTemp}°C` : "–"}
                label="Inomhus" color="var(--color-primary)" />
              <ExpandChip chip="outdoor" icon="device_thermostat"
                value={sensors?.outdoor_temp != null ? `${sensors.outdoor_temp}°C` : "–"}
                label="Utomhus" color="var(--color-tertiary)" />
            </ChipRow>

            {/* Indoor expand panel */}
            {expandedChip === "indoor" && sensorsOk && (
              <div className="px-4 pb-4 pt-1 border-t" style={{ borderColor: "var(--color-outline-variant)" }}>
                {/* BT50 primary row */}
                {sensors.nibe_indoor_temp != null && (
                  <div className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="material-symbols-outlined text-[15px] shrink-0" style={{ color: "var(--color-primary)" }}>thermostat</span>
                      <span className="text-sm font-semibold truncate" style={{ color: "var(--color-on-surface)" }}>Innetemperatur</span>
                      <PrimaryBadge color="var(--color-primary)" />
                    </div>
                    <span className="text-sm font-black ml-3 shrink-0" style={{ color: "var(--color-primary)" }}>
                      {sensors.nibe_indoor_temp.toFixed(1)}°C
                    </span>
                  </div>
                )}
                {/* Per-area (excluding växthus) */}
                {indoorAreas.map(area => (
                  <div key={area.area_id} className="flex items-center justify-between py-2.5 border-t"
                    style={{ borderColor: "var(--color-outline-variant)" }}>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "var(--color-primary)" }} />
                      <span className="text-sm font-semibold" style={{ color: "var(--color-on-surface)" }}>{area.name}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      {area.humidity != null && (
                        <span className="flex items-center gap-0.5 text-xs" style={{ color: "var(--color-on-surface-variant)" }}>
                          <span className="material-symbols-outlined text-[11px]">water_drop</span>
                          {Math.round(area.humidity)}%
                        </span>
                      )}
                      <span className="text-sm font-black" style={{ color: "var(--color-on-surface)" }}>{area.temperature.toFixed(1)}°C</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Outdoor expand panel */}
            {expandedChip === "outdoor" && sensorsOk && (
              <div className="px-4 pb-4 pt-1 border-t" style={{ borderColor: "var(--color-outline-variant)" }}>
                {/* BT1 primary row */}
                {sensors.outdoor_temp != null && (
                  <div className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="material-symbols-outlined text-[15px] shrink-0" style={{ color: "var(--color-tertiary)" }}>device_thermostat</span>
                      <span className="text-sm font-semibold truncate" style={{ color: "var(--color-on-surface)" }}>Utetemperatur</span>
                      <PrimaryBadge color="var(--color-tertiary)" />
                    </div>
                    <span className="text-sm font-black ml-3 shrink-0" style={{ color: "var(--color-tertiary)" }}>
                      {sensors.outdoor_temp.toFixed(1)}°C
                    </span>
                  </div>
                )}
                {/* Frånluft */}
                {hvacOk && hvac.flv.franluft_temp != null && (
                  <div className="flex items-center justify-between py-2.5 border-t" style={{ borderColor: "var(--color-outline-variant)" }}>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[15px]" style={{ color: "var(--color-on-surface-variant)" }}>air</span>
                      <span className="text-sm font-semibold" style={{ color: "var(--color-on-surface)" }}>Frånluft</span>
                    </div>
                    <span className="text-sm font-black" style={{ color: "var(--color-on-surface-variant)" }}>{hvac.flv.franluft_temp.toFixed(1)}°C</span>
                  </div>
                )}
                {/* Växthus */}
                {vaxthusArea && (
                  <div className="flex items-center justify-between py-2.5 border-t" style={{ borderColor: "var(--color-outline-variant)" }}>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[15px]" style={{ color: "var(--color-tertiary)" }}>potted_plant</span>
                      <span className="text-sm font-semibold" style={{ color: "var(--color-on-surface)" }}>Växthus</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      {vaxthusArea.humidity != null && (
                        <span className="flex items-center gap-0.5 text-xs" style={{ color: "var(--color-on-surface-variant)" }}>
                          <span className="material-symbols-outlined text-[11px]">water_drop</span>
                          {Math.round(vaxthusArea.humidity)}%
                        </span>
                      )}
                      <span className="text-sm font-black" style={{ color: "var(--color-tertiary)" }}>{vaxthusArea.temperature.toFixed(1)}°C</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Divider between temp and energy rows */}
            <div className="h-px mx-4" style={{ backgroundColor: "var(--color-outline-variant)" }} />

            {/* Row 2: energy chips (never expandable) */}
            <ChipRow>
              <div className="flex items-center gap-3 p-4">
                <span className="material-symbols-outlined text-[22px]" style={{ color: "var(--color-secondary)" }}>bolt</span>
                <div className="min-w-0">
                  <p className="text-lg font-black leading-tight" style={{ color: "var(--color-on-surface)" }}>
                    {energy?.spot_price_ore != null ? `${energy.spot_price_ore.toFixed(1)} öre` : "–"}
                  </p>
                  <p className="text-[11px] font-medium" style={{ color: "var(--color-on-surface-variant)" }}>Spotpris</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4">
                <span className="material-symbols-outlined text-[22px]" style={{ color: "var(--color-secondary)" }}>electric_meter</span>
                <div className="min-w-0">
                  <p className="text-lg font-black leading-tight" style={{ color: "var(--color-on-surface)" }}>
                    {energy && "current_power_w" in energy ? `${energy.current_power_w} W` : "–"}
                  </p>
                  <p className="text-[11px] font-medium" style={{ color: "var(--color-on-surface-variant)" }}>Aktuell effekt</p>
                </div>
              </div>
            </ChipRow>
          </div>
        );
      })()}

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
            onClick={() => runAction("lights-off", async () => { await callAction("light", "turn_off", "all"); await refreshLights(); })}
          />
          <FavTile
            label={acOn ? `Kyla · på` : "Kyla"} icon={acOn && acState === "cool" ? "mode_cool" : "mode_cool_off"}
            color={acOn && acState === "cool" ? "var(--color-secondary)" : "var(--color-outline)"} active={acOn && acState === "cool"}
            loading={loadingKey === "ac"}
            onClick={() => runAction("ac", async () => {
              await callAction("climate", "set_hvac_mode", "climate.vardagsrum_luftvarmepump",
                { hvac_mode: acState === "cool" ? "off" : "cool" });
              await refreshHvac();
            })}
          />
          <FavTile
            label="Boost VV" icon="water_drop"
            color={boostOn ? "var(--color-secondary)" : "var(--color-outline)"} active={boostOn}
            loading={loadingKey === "boost"}
            onClick={() => runAction("boost", async () => {
              await callAction("select", "select_option", "select.villa_bjorkdalen_more_hot_water",
                { option: boostOn ? "Off" : "One-time incr." });
              await refreshHvac();
            })}
          />
          <FavTile
            label="Kaminläge" icon="local_fire_department"
            color={kaminOn ? "var(--color-tertiary)" : "var(--color-outline)"} active={kaminOn}
            loading={loadingKey === "kamin"}
            onClick={() => runAction("kamin", async () => {
              await callAction("switch", kaminOn ? "turn_off" : "turn_on", "switch.nibe_kaminlage");
              await refreshHvac();
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

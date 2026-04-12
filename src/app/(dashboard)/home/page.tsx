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
type VacuumData   = { state: string; battery_pct: number | null; status: string | null; current_room: string | null; cleaned_area: number | null; charging: boolean; cleaning: boolean; do_not_disturb: boolean };

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
      border: "1px solid var(--color-card-border)",
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



// ─── Belysning ────────────────────────────────────────────────────────────────

const AMBER = "#f59e0b";
const FAVORITE_ROOMS = new Set(["Vardagsrum", "Sovrum", "Allrum", "Kök", "Elvira", "Adrian"]);

function LightToggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button onClick={e => { e.stopPropagation(); onChange(); }} aria-label={on ? "Stäng av" : "Sätt på"}
      style={{
        position: "relative", width: 48, height: 28, borderRadius: 14, flexShrink: 0,
        backgroundColor: on ? AMBER : "var(--color-outline-variant)",
        border: "none", cursor: "pointer",
        transition: "background-color 0.18s",
      }}>
      <span style={{
        position: "absolute", top: 4, left: on ? 23 : 4, width: 20, height: 20,
        borderRadius: "50%", backgroundColor: "white",
        transition: "left 0.15s", pointerEvents: "none",
        boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
      }} />
    </button>
  );
}

function LightControlModal({ area, onClose, onToggleLight, onBrightness }: {
  area: LightArea; onClose: () => void;
  onToggleLight: (l: LightEntry) => void;
  onBrightness: (entity_id: string, pct: number) => void;
}) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.55)", padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 480, maxHeight: "80vh", overflowY: "auto",
        backgroundColor: "var(--color-surface-container-lowest)",
        borderRadius: 24, padding: 24,
        boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
      }}>
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold" style={{ color: "var(--color-on-surface)" }}>
              {area.name}
            </h2>
            <p className="text-sm mt-0.5" style={{ color: "var(--color-on-surface-variant)" }}>
              Hantera individuella lampor
            </p>
          </div>
          <button onClick={onClose} className="material-symbols-outlined"
            style={{ fontSize: 22, color: "var(--color-on-surface-variant)", opacity: 0.5, marginTop: 2 }}>
            close
          </button>
        </div>

        {/* Per-light controls */}
        <div className="space-y-5">
          {area.lights.map(light => {
            const lon = light.state === "on";
            return (
              <div key={light.entity_id}>
                <div className="flex items-center gap-3">
                  {/* Circle icon */}
                  <div style={{
                    width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                    backgroundColor: lon ? `${AMBER}22` : "var(--color-surface-container)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <span className="material-symbols-outlined"
                      style={{ fontSize: 22, color: lon ? AMBER : "var(--color-outline)", fontVariationSettings: lon ? "'FILL' 1" : "'FILL' 0" }}>
                      {lon ? "light_mode" : "light_off"}
                    </span>
                  </div>
                  <span className="flex-1 text-sm font-semibold min-w-0 truncate"
                    style={{ color: "var(--color-on-surface)" }}>{light.name}</span>
                  <LightToggle on={lon} onChange={() => onToggleLight(light)} />
                </div>
                {/* Brightness row — always visible when dimmable */}
                {light.dimmable && (
                  <div className="flex items-center gap-3 mt-2.5 pl-14">
                    <span className="material-symbols-outlined shrink-0"
                      style={{ fontSize: 14, color: "var(--color-outline)" }}>brightness_low</span>
                    <input type="range" min={1} max={100}
                      defaultValue={light.brightness_pct ?? (lon ? 100 : 0)}
                      disabled={!lon}
                      className="flex-1 cursor-pointer"
                      style={{ accentColor: AMBER, height: 4, opacity: lon ? 1 : 0.35 }}
                      onMouseUp={e => lon && onBrightness(light.entity_id, parseInt((e.target as HTMLInputElement).value))}
                      onTouchEnd={e => lon && onBrightness(light.entity_id, parseInt((e.target as HTMLInputElement).value))}
                    />
                    <span className="text-[11px] font-medium w-8 text-right shrink-0"
                      style={{ color: "var(--color-on-surface-variant)" }}>
                      {lon ? `${light.brightness_pct ?? 100}%` : "0%"}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-end mt-6">
          <button onClick={onClose}
            className="px-6 py-2.5 rounded-full text-sm font-semibold"
            style={{ backgroundColor: "var(--color-primary)", color: "var(--color-on-primary)" }}>
            Stäng
          </button>
        </div>
      </div>
    </div>
  );
}

function LightingCard({ data, onRefresh }: { data: LightsData; onRefresh: () => void }) {
  const [modalAreaId, setModalAreaId] = useState<string | null>(null);

  const totalOn  = data.areas.reduce((s, a) => s + a.on_count, 0);
  const totalAll = data.areas.reduce((s, a) => s + a.total_count, 0);
  const favorites = data.areas.filter(a => FAVORITE_ROOMS.has(a.name));
  const modalArea = data.areas.find(a => a.area_id === modalAreaId) ?? null;

  async function handleToggleArea(area: LightArea) {
    await callAction("light", area.on_count > 0 ? "turn_off" : "turn_on", area.lights.map(l => l.entity_id));
    onRefresh();
  }
  async function handleToggleLight(light: LightEntry) {
    await callAction("light", light.state === "on" ? "turn_off" : "turn_on", light.entity_id);
    onRefresh();
  }
  async function handleBrightness(entity_id: string, pct: number) {
    await callAction("light", "turn_on", entity_id, { brightness_pct: pct });
    onRefresh();
  }

  return (
    <>
      <Card className="md:col-span-2 xl:col-span-3">
        <div className="flex items-center justify-between mb-3">
          <SectionLabel>Belysning</SectionLabel>
          <span className="text-xs font-bold -mt-3" style={{ color: totalOn > 0 ? AMBER : "var(--color-outline)" }}>
            {totalOn}/{totalAll} på
          </span>
        </div>
        <div className="space-y-2">
          {favorites.map(area => {
            const on = area.on_count > 0;
            return (
              <div key={area.area_id} className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={{
                  backgroundColor: "var(--color-surface-container)",
                  border: `1.5px solid ${on ? AMBER : "transparent"}`,
                  boxShadow: on ? `inset 0 0 0 99px ${AMBER}09` : "none",
                }}>
                {/* Circle icon — tapping toggles room */}
                <Pressable onClick={() => handleToggleArea(area)} className="shrink-0">
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                    backgroundColor: on ? `${AMBER}22` : "var(--color-surface-container-high)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <span className="material-symbols-outlined"
                      style={{ fontSize: 20, color: on ? AMBER : "var(--color-outline)", fontVariationSettings: on ? "'FILL' 1" : "'FILL' 0" }}>
                      {on ? "light_mode" : "light_off"}
                    </span>
                  </div>
                </Pressable>
                {/* Name + status — tapping also toggles */}
                <Pressable onClick={() => handleToggleArea(area)} className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-bold leading-tight" style={{ color: "var(--color-on-surface)" }}>{area.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: on ? AMBER : "var(--color-outline)" }}>
                    {area.total_count > 1 ? `${area.on_count}/${area.total_count} på` : (on ? "På" : "Av")}
                  </p>
                </Pressable>
                {/* Expand → modal */}
                <button onClick={() => setModalAreaId(area.area_id)}
                  className="material-symbols-outlined shrink-0"
                  style={{ fontSize: 20, color: "var(--color-on-surface-variant)", opacity: 0.4 }}>
                  expand_more
                </button>
              </div>
            );
          })}
        </div>
        <a href="/home/lighting"
          className="flex items-center justify-center gap-1 mt-3 text-xs font-semibold"
          style={{ color: "var(--color-primary)", opacity: 0.7 }}>
          <span>Alla rum</span>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
        </a>
      </Card>

      {modalArea && (
        <LightControlModal
          area={modalArea}
          onClose={() => setModalAreaId(null)}
          onToggleLight={handleToggleLight}
          onBrightness={handleBrightness}
        />
      )}
    </>
  );
}


// ─── Elbilar ─────────────────────────────────────────────────────────────────

function CarsCard({ data }: { data: CarsData }) {
  return (
    <Card className="md:col-span-2">
      <SectionLabel>Elbilar &amp; laddning</SectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {data.cars.map(car => {
          const battColor = car.soc < 20 ? "var(--color-error)" : "var(--color-primary)";
          return (
            <div key={car.id} className="p-4 rounded-xl"
              style={{ backgroundColor: "var(--color-surface-container)" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]"
                    style={{ color: "var(--color-on-surface-variant)" }}>electric_car</span>
                  <span className="text-sm font-bold" style={{ color: "var(--color-on-surface)" }}>{car.name}</span>
                </div>
                {/* Badge: kontakt (binary_sensor.vanster/hoger_kontakt) */}
                <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: "var(--color-surface-container-high)",
                    color: car.plugged_in ? "var(--color-on-surface)" : "var(--color-outline)",
                  }}>
                  {car.plugged_in ? "Inkopplad" : "Ej inkopplad"}
                </span>
              </div>

              {/* SOC bar */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl font-black" style={{ color: battColor }}>{car.soc}%</span>
                <div className="flex-1">
                  <div className="h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: "var(--color-surface-container-high)" }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${car.soc}%`, backgroundColor: battColor }} />
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
                  ["Räckvidd",  `ca ${car.range_km} km`],
                  /* Laddning: binary_sensor.vanster/hoger_laddning */
                  ["Laddning",  car.charging ? "Aktiv" : "Inaktiv"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-[10px] font-bold uppercase" style={{ color: "var(--color-outline)" }}>{k}</p>
                    <p className="text-xs font-bold" style={{ color: "var(--color-on-surface)" }}>{v}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
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
      {/* Price hero */}
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-4xl font-black" style={{ color: "var(--color-on-surface)" }}>
          {data.spot_price_ore != null ? data.spot_price_ore.toFixed(1) : "–"}
        </span>
        <span className="text-sm font-bold" style={{ color: "var(--color-on-surface-variant)" }}>öre/kWh</span>
        <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: `${spotColor}22`, color: spotColor }}>
          {spotLabel}
        </span>
      </div>
      {/* 2×2 stat grid */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { icon: "bolt",           label: "Aktuell effekt", value: `${data.current_power_w} W`,                                                            color: "var(--color-secondary)" },
          { icon: "today",          label: "Idag",           value: `${data.accumulated_kwh.toFixed(1)} kWh · ${data.accumulated_cost_sek.toFixed(0)} kr`,   color: "var(--color-outline)" },
          { icon: "receipt",        label: "Månadskostnad",  value: `${data.monthly_cost_sek.toFixed(0)} kr`,                                                color: "var(--color-outline)" },
          { icon: "electric_meter", label: "Månadsförbrukn.",value: `${data.monthly_kwh.toFixed(0)} kWh`,                                                    color: "var(--color-outline)" },
        ].map(({ icon, label, value, color }) => (
          <div key={label} className="p-3 rounded-xl" style={{ backgroundColor: "var(--color-surface-container)" }}>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="material-symbols-outlined text-[14px]" style={{ color }}>{icon}</span>
              <span className="text-[10px] font-semibold" style={{ color: "var(--color-on-surface-variant)" }}>{label}</span>
            </div>
            <p className="text-sm font-black" style={{ color: "var(--color-on-surface)" }}>{value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Dammsugare ───────────────────────────────────────────────────────────────

function VacuumCard({ data, onRefresh }: { data: VacuumData; onRefresh: () => void }) {
  const statusLabel = data.cleaning
    ? (data.current_room ? `Städar · ${data.current_room}` : "Städar")
    : data.charging ? "Laddar"
    : data.state === "docked" ? "Hemma · Dockat"
    : data.state === "idle" ? "Vilar"
    : data.state ?? "–";

  const statusColor = data.cleaning
    ? "var(--color-secondary)"
    : data.charging
    ? "var(--color-tertiary)"
    : "var(--color-on-surface-variant)";

  return (
    <Card>
      <SectionLabel>Dammsugare</SectionLabel>
      {/* Status row */}
      <div className="flex items-center gap-3 mb-4">
        <span className="material-symbols-outlined text-[24px]" style={{ color: statusColor }}>
          {data.cleaning ? "robot_2" : "dock"}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold" style={{ color: "var(--color-on-surface)" }}>Chomper</p>
          <p className="text-xs" style={{ color: statusColor }}>{statusLabel}</p>
        </div>
        <div className="flex items-center gap-1 text-xs font-bold"
          style={{ color: data.charging ? "var(--color-tertiary)" : "var(--color-on-surface-variant)" }}>
          <span className="material-symbols-outlined text-[15px]">battery_horiz_075</span>
          {data.battery_pct != null ? `${data.battery_pct}%` : "–"}
        </div>
        {data.cleaning && data.cleaned_area != null && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: "var(--color-secondary-container)", color: "var(--color-secondary)" }}>
            {data.cleaned_area.toFixed(0)} m²
          </span>
        )}
      </div>
      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Efter maten",  icon: "restaurant",        action: () => callAction("button", "press", "button.chomper_after_meals") },
          { label: "Damm + Mopp", icon: "cleaning_services",  action: () => callAction("button", "press", "button.chomper_vac_followed_by_mop") },
          { label: "Till docka",  icon: "home",               action: () => callAction("vacuum", "return_to_base", "vacuum.chomper") },
        ].map(({ label, icon, action }) => (
          <Pressable key={label}
            onClick={async () => { await action(); onRefresh(); }}
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-center"
            style={{ backgroundColor: "var(--color-surface-container)" }}>
            <span className="material-symbols-outlined text-[20px]"
              style={{ color: "var(--color-on-surface-variant)" }}>{icon}</span>
            <span className="text-[10px] font-semibold leading-tight"
              style={{ color: "var(--color-on-surface)" }}>{label}</span>
          </Pressable>
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

// ─── Mini tile (two tiles share one grid slot) ────────────────────────────────

function MiniTile({ label, icon, color, active, loading, onClick }: {
  label: string; icon: string; color: string;
  active: boolean; loading: boolean; onClick: () => void;
}) {
  return (
    <Pressable
      onClick={onClick}
      loading={loading}
      className="flex flex-col items-center justify-center gap-1.5 py-3 px-1 rounded-xl text-center w-full"
      style={{
        backgroundColor: "var(--color-surface-container)",
        border: `2px solid ${active && !loading ? color : "transparent"}`,
        boxShadow: active && !loading ? `inset 0 0 0 99px ${color}18` : "none",
      }}
    >
      {loading ? (
        <svg className="spin-anim" viewBox="0 0 24 24" fill="none"
          style={{ color, width: 20, height: 20, flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25"/>
          <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      ) : (
        <span className="material-symbols-outlined text-[20px]"
          style={{ color, fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>{icon}</span>
      )}
      <span className="text-[10px] font-semibold leading-tight w-full truncate"
        style={{ color: active && !loading ? color : "var(--color-on-surface)" }}>{label}</span>
    </Pressable>
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
        <svg className="spin-anim" viewBox="0 0 24 24" fill="none"
          style={{ color, width: 26, height: 26, flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25"/>
          <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
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
  const [lastScene, setLastScene] = useState<"kvall" | "natt" | null>(null);

  const { data: lights,  mutate: mLights  } = useSWR<LightsData>  ("/api/homeassistant/lights",  fetcher, { refreshInterval:  2_000 });
  const { data: sensors }                    = useSWR<SensorsData> ("/api/homeassistant/sensors", fetcher, { refreshInterval: 30_000 });
  const { data: energy }                     = useSWR<EnergyData>  ("/api/homeassistant/energy",  fetcher, { refreshInterval:  3_000 });
  const { data: cars }                       = useSWR<CarsData>    ("/api/homeassistant/cars",    fetcher, { refreshInterval: 60_000 });
  const { data: hvac,    mutate: mHvac    } = useSWR<HvacData>    ("/api/homeassistant/hvac",    fetcher, { refreshInterval: 15_000 });
  const { data: vacuum,  mutate: mVacuum  } = useSWR<VacuumData>  ("/api/homeassistant/vacuum",  fetcher, { refreshInterval: 10_000 });

  // Awaitable refresh — waits for HA to process the command before revalidating
  const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
  const refreshLights  = useCallback(async () => { await delay(600);  await mLights();  }, [mLights]);
  const refreshHvac    = useCallback(async () => { await delay(1000); await mHvac();   }, [mHvac]);
  const refreshVacuum  = useCallback(async () => { await delay(800);  await mVacuum(); }, [mVacuum]);

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
  const hvacOk      = hvac && "heat_pump" in hvac;
  const acState     = hvacOk ? hvac.heat_pump.state : "off";
  const acOn        = acState !== "off";
  const acLabel     = acOn ? ({ heat: "Värme", cool: "Kyla", heat_cool: "Auto", fan_only: "Fläkt", dry: "Torr" }[acState] ?? acState) : "AC";
  const kaminOn     = hvacOk ? hvac.flv.kaminlage      : false;
  const boostOn     = hvacOk ? hvac.flv.more_hot_water : false;
  const lightsOk    = lights && "areas" in lights;
  const allLightsOff = lightsOk ? lights.areas.every(a => a.on_count === 0) : false;
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

        const PrimaryBadge = (_: { color: string }) => null;

        return (
          <div className="rounded-2xl overflow-hidden" style={{
            backgroundColor: "var(--color-surface-container)",
            boxShadow: "0px 8px 24px rgba(56,56,51,0.06)",
            border: "1px solid var(--color-card-border)",
          }}>
            {/* Row 1: temp chips */}
            <ChipRow>
              <ExpandChip chip="indoor" icon="thermostat"
                value={indoorTemp != null ? `${indoorTemp}°` : "–"}
                label="Inomhus" color="var(--color-primary)" />
              <ExpandChip chip="outdoor" icon="device_thermostat"
                value={sensors?.outdoor_temp != null ? `${sensors.outdoor_temp}°` : "–"}
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
                    <span className="flex items-center gap-1 ml-3 shrink-0">
                      <span className="material-symbols-outlined text-[13px]" style={{ color: "var(--color-primary)" }}>thermometer</span>
                      <span className="text-sm font-black" style={{ color: "var(--color-primary)" }}>{sensors.nibe_indoor_temp.toFixed(1)}°</span>
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
                        <span className="flex items-center gap-1 text-xs" style={{ color: "var(--color-on-surface-variant)" }}>
                          <span className="material-symbols-outlined text-[10px]">water_drop</span>
                          {Math.round(area.humidity)}%
                        </span>
                      )}
                      <span className="flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[12px]" style={{ color: "var(--color-on-surface-variant)" }}>thermometer</span>
                        <span className="text-sm font-black" style={{ color: "var(--color-on-surface)" }}>{area.temperature.toFixed(1)}°</span>
                      </span>
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
                    <span className="flex items-center gap-1 ml-3 shrink-0">
                      <span className="material-symbols-outlined text-[13px]" style={{ color: "var(--color-tertiary)" }}>thermometer</span>
                      <span className="text-sm font-black" style={{ color: "var(--color-tertiary)" }}>{sensors.outdoor_temp.toFixed(1)}°</span>
                    </span>
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
                        <span className="flex items-center gap-1 text-xs" style={{ color: "var(--color-on-surface-variant)" }}>
                          <span className="material-symbols-outlined text-[10px]">water_drop</span>
                          {Math.round(vaxthusArea.humidity)}%
                        </span>
                      )}
                      <span className="flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[12px]" style={{ color: "var(--color-tertiary)" }}>thermometer</span>
                        <span className="text-sm font-black" style={{ color: "var(--color-tertiary)" }}>{vaxthusArea.temperature.toFixed(1)}°</span>
                        {vaxthusArea.temperature > 30 && (
                          <span className="material-symbols-outlined text-[14px] ml-0.5" style={{ color: "#e65100" }}>warning</span>
                        )}
                      </span>
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
            color="#f59e0b" active={lastScene === "kvall"}
            loading={loadingKey === "scene-kvall"}
            onClick={() => runAction("scene-kvall", async () => {
              await callAction("scene", "turn_on", "scene.fasad");
              setLastScene("kvall");
            })}
          />
          <FavTile
            label="Natt" icon="bedtime"
            color="#1d4ed8" active={lastScene === "natt"}
            loading={loadingKey === "scene-natt"}
            onClick={() => runAction("scene-natt", async () => {
              await callAction("scene", "turn_on", "scene.fasad_nattlage");
              setLastScene("natt");
            })}
          />
          <FavTile
            label="Alla av" icon="light_off"
            color="#6b7280" active={allLightsOff}
            loading={loadingKey === "lights-off"}
            onClick={() => runAction("lights-off", async () => {
              setLastScene(null);
              await callAction("light", "turn_off", "all");
              await refreshLights();
            })}
          />
          {/* AC + Värme — two mini tiles sharing one grid slot */}
          <div className="flex gap-1.5">
            <MiniTile
              label="AC" icon={acState === "cool" ? "mode_cool" : "mode_cool_off"}
              color="#475bc2"
              active={acState === "cool"}
              loading={loadingKey === "ac"}
              onClick={() => runAction("ac", async () => {
                await callAction("climate", "set_hvac_mode", "climate.vardagsrum_luftvarmepump",
                  { hvac_mode: acState === "cool" ? "off" : "cool" });
                await refreshHvac();
              })}
            />
            <MiniTile
              label="Värme" icon={acState === "heat" ? "mode_heat" : "mode_heat_off"}
              color="#c0392b"
              active={acState === "heat"}
              loading={loadingKey === "heat"}
              onClick={() => runAction("heat", async () => {
                await callAction("climate", "set_hvac_mode", "climate.vardagsrum_luftvarmepump",
                  { hvac_mode: acState === "heat" ? "off" : "heat" });
                await refreshHvac();
              })}
            />
          </div>
          <FavTile
            label="Boost VV" icon="water_drop"
            color={boostOn ? "#0ea5e9" : "var(--color-outline)"} active={boostOn}
            loading={loadingKey === "boost"}
            onClick={() => runAction("boost", async () => {
              await callAction("select", "select_option", "select.villa_bjorkdalen_more_hot_water",
                { option: boostOn ? "Off" : "One-time incr." });
              await refreshHvac();
            })}
          />
          <FavTile
            label="Kaminläge" icon="local_fire_department"
            color={kaminOn ? "#f97316" : "var(--color-outline)"} active={kaminOn}
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

        {/* Elbilar — placeras tidigt i flödet, tar 2 kolumner på desktop */}
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

        {/* Energi — under elbilar */}
        {energy && "accumulated_kwh" in energy ? (
          <EnergyCard data={energy} />
        ) : (
          <Card><SectionLabel>Energi</SectionLabel><Skeleton className="h-48" /></Card>
        )}

        {/* Dammsugare — bredvid energi */}
        {vacuum && "state" in vacuum ? (
          <VacuumCard data={vacuum} onRefresh={refreshVacuum} />
        ) : (
          <Card><SectionLabel>Dammsugare</SectionLabel><Skeleton className="h-36" /></Card>
        )}

      </div>
    </div>
  );
}

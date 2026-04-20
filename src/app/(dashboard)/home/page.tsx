"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import useSWR from "swr";
import dynamic from "next/dynamic";
import { detectActiveScene, type ScenePayload } from "@/lib/scenes";
import { Pressable, FavTile } from "@/components/FavTile";
import { callAction } from "@/lib/actions";
import { fetcher } from "@/lib/fetcher";
import ErrorBanner from "@/components/ErrorBanner";

const SpotPriceChart   = dynamic(() => import("@/components/charts/SpotPriceChart"), { ssr: false });
const PowerChart       = dynamic(() => import("@/components/charts/PowerChart"),     { ssr: false });
const IndoorTempChart  = dynamic(() => import("@/components/charts/TempChart").then(m => ({ default: m.IndoorTempChart })), { ssr: false });
const OutdoorTempChart = dynamic(() => import("@/components/charts/TempChart").then(m => ({ default: m.OutdoorTempChart })), { ssr: false });

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
  nibe: {
    outdoor_temp: number | null; hot_water_temp: number | null; fan_speed_pct: number | null;
    alarm: boolean; kaminlage: boolean; nattsvalka: boolean;
    system_power_kw: number | null; compressor_hz: number | null; heater_kw: number | null;
    hot_water_boost: string; hot_water_boost_options: string[];
    ventilation_mode: string; ventilation_options: string[];
    indoor_setpoint: number | null;
  };
};
type VacuumData   = { state: string; battery_pct: number | null; status: string | null; current_room: string | null; cleaned_area: number | null; charging: boolean; cleaning: boolean; do_not_disturb: boolean };
type SolkylaData = {
  solar_gain_score: number | null;
  master_enabled: boolean;
  ac: { state: string; hvac_mode: string; current_temp: number | null; target_temp: number | null; fan_mode: string | null };
  room_temp: number | null;
  context: { bedroom_temp: number | null; cloud_coverage: number | null; nibe_indoor_temp: number | null; outdoor_temp: number | null; sun_elevation: number | null; uv_index: number | null };
  automations: Array<{ name: string; entity_id: string; enabled: boolean; last_triggered: string | null }>;
};
type WeatherPeriod = { period: string; label: string; date: string; temperature: number; condition: string; precipitation: number };
type WeatherData  = {
  current: { state: string; temperature: number; humidity: number; wind_speed: number; wind_bearing: number };
  periods: WeatherPeriod[];
  forecast: Array<{ datetime: string; condition: string; temperature: number; templow: number; precipitation: number; wind_speed: number }>;
};
type MediaPlayer  = {
  entity_id: string; name: string; room: string; type: "sonos" | "appletv" | "tv";
  state: string; media_title: string | null; media_artist: string | null;
  media_image_url: string | null; source: string | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

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


// ─── Shared UI ────────────────────────────────────────────────────────────────

/** Cross-platform press button — uses pointer events so it works on iOS Safari */
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

const AMBER = "#fab849";
const vibrate = () => typeof navigator !== "undefined" && navigator.vibrate?.(10);
const FAVORITE_ROOM_ORDER = ["Vardagsrum", "Kök", "Allrum", "Sovrum", "Adrian", "Elvira"];

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

function LightingCard({ data, onRefresh, loadingKey, runAction }: { data: LightsData; onRefresh: () => void; loadingKey: string | null; runAction: (key: string, fn: () => Promise<void>) => Promise<void> }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [liveBrightness, setLiveBrightness] = useState<Record<string, number>>({});

  const totalOn  = data.areas.reduce((s, a) => s + a.on_count, 0);
  const totalAll = data.areas.reduce((s, a) => s + a.total_count, 0);
  const favorites = FAVORITE_ROOM_ORDER
    .map(name => data.areas.find(a => a.name === name))
    .filter((a): a is LightArea => a != null);

  async function handleToggleArea(area: LightArea) {
    vibrate();
    await callAction("light", area.on_count > 0 ? "turn_off" : "turn_on", area.lights.map(l => l.entity_id));
    onRefresh();
  }
  async function handleToggleLight(light: LightEntry) {
    vibrate();
    await callAction("light", light.state === "on" ? "turn_off" : "turn_on", light.entity_id);
    onRefresh();
  }
  async function handleBrightness(entity_id: string, pct: number) {
    vibrate();
    await callAction("light", "turn_on", entity_id, { brightness_pct: pct });
    onRefresh();
  }

  return (
    <Card className="md:col-span-2 xl:col-span-3">
      <div className="flex items-center justify-between mb-3">
        <a href="/home/lighting" className="flex items-center gap-0.5" style={{ textDecoration: "none" }}>
          <p className="text-[11px] font-bold uppercase tracking-widest"
            style={{ color: "var(--color-on-surface-variant)" }}>Belysning</p>
          <span className="material-symbols-outlined" style={{ fontSize: 14, color: "var(--color-on-surface-variant)", opacity: 0.4 }}>chevron_right</span>
        </a>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold" style={{ color: totalOn > 0 ? "var(--color-on-surface-variant)" : "var(--color-outline)" }}>
            {totalOn}/{totalAll} på
          </span>
          {totalOn > 0 && (
            <Pressable
              loading={loadingKey === "slack"}
              onClick={() => runAction("slack", async () => { await callAction("scene", "turn_on", "scene.slack"); await onRefresh(); })}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold"
              style={{ backgroundColor: "var(--color-surface-container-high)", color: "var(--color-on-surface-variant)" }}
            >
              {loadingKey === "slack" ? (
                <svg className="spin-anim" viewBox="0 0 24 24" fill="none" style={{ width: 12, height: 12 }}>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25"/>
                  <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : (
                <span className="material-symbols-outlined" style={{ fontSize: 12 }}>light_off</span>
              )}
              Släck allt
            </Pressable>
          )}
        </div>
      </div>
      <div className="space-y-2">
        {favorites.map(area => {
          const on = area.on_count > 0;
          const open = expandedId === area.area_id;
          return (
            <div key={area.area_id} className="flex flex-col rounded-2xl overflow-hidden"
              style={{
                backgroundColor: "var(--color-surface-container)",
                border: `1.5px solid ${on ? AMBER : "transparent"}`,
                boxShadow: on ? `inset 0 0 0 99px ${AMBER}09` : "none",
              }}>
              {/* Row header */}
              <div className="flex items-center">
                {/* Left side: icon + name — tapping toggles room */}
                <Pressable onClick={() => handleToggleArea(area)} className="flex items-center gap-3 flex-1 min-w-0 text-left px-4 py-3">
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                    backgroundColor: on ? `${AMBER}22` : "var(--color-surface-container-high)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <span className="material-symbols-outlined"
                      style={{ fontSize: 20, color: on ? AMBER : "var(--color-outline)", fontVariationSettings: on ? "'FILL' 1" : "'FILL' 0" }}>
                      lightbulb
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold leading-tight" style={{ color: "var(--color-on-surface)" }}>{area.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: on ? "var(--color-on-surface-variant)" : "var(--color-outline)" }}>
                      {area.total_count > 1 ? `${area.on_count}/${area.total_count} på` : (on ? "På" : "Av")}
                    </p>
                  </div>
                </Pressable>
                {/* Right: expand — full-height touch target, short centered divider */}
                <button onClick={() => setExpandedId(open ? null : area.area_id)}
                  className="shrink-0 flex items-center justify-center self-stretch"
                  style={{ width: 44, position: "relative" }}>
                  <div style={{ position: "absolute", left: 0, top: "30%", height: "40%", width: 1, backgroundColor: "var(--color-outline-variant)", opacity: 0.3 }} />
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: "var(--color-on-surface-variant)", opacity: 0.3 }}>
                    {open ? "expand_less" : "expand_more"}
                  </span>
                </button>
              </div>

              {/* Inline expanded: per-light controls */}
              <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  style={{ overflow: "hidden" }}
                >
                <div className="pt-1 pb-2 border-t"
                  style={{ borderColor: on ? `${AMBER}22` : "var(--color-outline-variant)", backgroundColor: "var(--color-surface-container)" }}>
                  {area.lights.map(light => {
                    const lon = light.state === "on";
                    return (
                      <div key={light.entity_id} className="px-4 py-3">
                        {/* Light row */}
                        <div className="flex items-center gap-3">
                          <div style={{
                            width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                            backgroundColor: lon ? `${AMBER}18` : "rgba(255,255,255,0.05)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            <span className="material-symbols-outlined"
                              style={{ fontSize: 17, color: lon ? AMBER : "var(--color-outline)", fontVariationSettings: lon ? "'FILL' 1" : "'FILL' 0" }}>
                              lightbulb
                            </span>
                          </div>
                          <span className="flex-1 text-sm font-semibold min-w-0 truncate"
                            style={{ color: lon ? "var(--color-on-surface)" : "var(--color-outline)" }}>{light.name}</span>
                          <LightToggle on={lon} onChange={() => handleToggleLight(light)} />
                        </div>
                        {/* Brightness slider */}
                        {light.dimmable && (
                          <div className="flex items-center gap-3 mt-3 pl-1 pr-1">
                            <span className="material-symbols-outlined shrink-0"
                              style={{ fontSize: 14, color: "var(--color-outline)", opacity: lon ? 0.6 : 0.25 }}>
                              sunny
                            </span>
                            <input type="range" min={1} max={100}
                              key={`${light.entity_id}-${light.brightness_pct ?? 'x'}`}
                              defaultValue={light.brightness_pct ?? (lon ? 100 : 0)}
                              disabled={!lon}
                              className="flex-1 cursor-pointer"
                              style={{ opacity: lon ? 1 : 0.25, "--fill": `${light.brightness_pct ?? (lon ? 100 : 0)}%` } as React.CSSProperties}
                              onInput={e => { const t = e.currentTarget; const v = parseInt(t.value); t.style.setProperty("--fill", `${v}%`); setLiveBrightness(p => ({ ...p, [light.entity_id]: v })); }}
                              onMouseUp={e => lon && handleBrightness(light.entity_id, parseInt((e.target as HTMLInputElement).value))}
                              onTouchEnd={e => lon && handleBrightness(light.entity_id, parseInt((e.target as HTMLInputElement).value))}
                            />
                            <span className="text-[11px] font-medium shrink-0"
                              style={{
                                minWidth: 34, textAlign: "right",
                                color: lon ? "var(--color-on-surface-variant)" : "var(--color-outline)",
                                opacity: lon ? 1 : 0.4,
                              }}>
                              {lon ? `${liveBrightness[light.entity_id] ?? light.brightness_pct ?? 100}%` : "0%"}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                </motion.div>
              )}
              </AnimatePresence>
            </div>
          );
        })}
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
        {data.cars.map(car => {
          const green = "#22c55e";
          const barColor = car.charging ? green : car.soc < 20 ? "var(--color-error)" : "var(--color-outline)";
          return (
            <div key={car.id} className="p-4 rounded-xl"
              style={{ backgroundColor: "var(--color-surface-container)" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]"
                    style={{ color: car.charging ? green : "var(--color-on-surface-variant)" }}>electric_car</span>
                  <span className="text-sm font-bold" style={{ color: "var(--color-on-surface)" }}>{car.name}</span>
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: car.plugged_in ? `${green}18` : "var(--color-surface-container-high)",
                    color: car.plugged_in ? green : "var(--color-outline)",
                  }}>
                  {car.plugged_in ? "Inkopplad" : "Ej inkopplad"}
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
                        backgroundColor: barColor,
                        ...(car.charging ? {
                          animation: "charge-pulse 1.5s ease-in-out infinite",
                        } : {}),
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
                <div>
                  <p className="text-[10px] font-bold uppercase" style={{ color: "var(--color-outline)" }}>Räckvidd</p>
                  <p className="text-xs font-bold" style={{ color: "var(--color-on-surface)" }}>ca {car.range_km} km</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase" style={{ color: "var(--color-outline)" }}>Laddning</p>
                  <div className="flex items-center gap-1">
                    {car.charging && (
                      <span className="material-symbols-outlined text-[14px]"
                        style={{ color: green, fontVariationSettings: "'FILL' 1" }}>bolt</span>
                    )}
                    <p className="text-xs font-bold"
                      style={{ color: car.charging ? green : "var(--color-on-surface)" }}>
                      {car.charging ? "Laddar" : "Inaktiv"}
                    </p>
                  </div>
                </div>
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
  const [expanded, setExpanded] = useState<"price" | "power" | null>(null);
  const toggle = (key: "price" | "power") => setExpanded(prev => prev === key ? null : key);

  const spotLabel = data.spot_level === "low" ? "Lågt" : data.spot_level === "medium" ? "Medel" : data.spot_level === "high" ? "Högt" : "–";
  const spotColor = data.spot_level === "low" ? "var(--color-secondary)" : data.spot_level === "high" ? "var(--color-error)" : "var(--color-tertiary)";

  const StatRow = ({ icon, label, value, badge, color, expandKey }: {
    icon: string; label: string; value: string; badge?: React.ReactNode; color: string; expandKey?: "price" | "power";
  }) => {
    const open = expandKey ? expanded === expandKey : false;
    const iconEl = (
      <div style={{
        width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
        backgroundColor: `${color}18`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18, color }}>{icon}</span>
      </div>
    );
    const textEl = (
      <div className="flex-1 min-w-0 text-left">
        <p className="text-[10px] font-semibold" style={{ color: "var(--color-on-surface-variant)" }}>{label}</p>
        <div className="flex items-center gap-2">
          <p className="text-sm font-black" style={{ color: "var(--color-on-surface)" }}>{value}</p>
          {badge}
        </div>
      </div>
    );
    return (
      <div className="flex items-center gap-3 px-4 py-3">
        {expandKey ? (
          <>
            <Pressable onClick={() => toggle(expandKey)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
              {iconEl}{textEl}
            </Pressable>
            <button onClick={() => toggle(expandKey)}
              className="material-symbols-outlined shrink-0"
              style={{ fontSize: 20, color: "var(--color-on-surface-variant)", opacity: 0.4 }}>
              {open ? "expand_less" : "expand_more"}
            </button>
          </>
        ) : (
          <>{iconEl}{textEl}</>
        )}
      </div>
    );
  };

  return (
    <Card>
      <SectionLabel>Energi</SectionLabel>
      <div className="space-y-2">
        {/* Spotpris — expandable */}
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--color-surface-container)" }}>
          <StatRow icon="payments" label="Spotpris" color={spotColor} expandKey="price"
            value={data.spot_price_ore != null ? `${data.spot_price_ore.toFixed(1)} öre/kWh` : "–"}
            badge={<span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${spotColor}22`, color: spotColor }}>{spotLabel}</span>} />
          <AnimatePresence initial={false}>
            {expanded === "price" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                style={{ overflow: "hidden" }}
              >
                <div className="px-4 pb-3 pt-1 border-t" style={{ borderColor: "var(--color-outline-variant)", backgroundColor: "var(--color-surface-container)" }}>
                  <p className="text-[10px] font-semibold mb-2" style={{ color: "var(--color-on-surface-variant)" }}>Elpris senaste 24h</p>
                  <SpotPriceChart />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Aktuell effekt — expandable */}
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--color-surface-container)" }}>
          <StatRow icon="bolt" label="Effekt" value={`${data.current_power_w} W`}
            color="var(--color-secondary)" expandKey="power" />
          <AnimatePresence initial={false}>
            {expanded === "power" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                style={{ overflow: "hidden" }}
              >
                <div className="px-4 pb-3 pt-1 border-t" style={{ borderColor: "var(--color-outline-variant)", backgroundColor: "var(--color-surface-container)" }}>
                  <p className="text-[10px] font-semibold mb-2" style={{ color: "var(--color-on-surface-variant)" }}>Effekt senaste 24h</p>
                  <PowerChart avgPower={data.avg_power_w} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Idag */}
        <div className="rounded-2xl" style={{ backgroundColor: "var(--color-surface-container)" }}>
          <StatRow icon="today" label="Idag" color="var(--color-outline)"
            value={`${data.accumulated_kwh.toFixed(1)} kWh · ${data.accumulated_cost_sek.toFixed(0)} kr`} />
        </div>

        {/* Denna månad */}
        <div className="rounded-2xl" style={{ backgroundColor: "var(--color-surface-container)" }}>
          <StatRow icon="calendar_month" label="Denna månad" color="var(--color-outline)"
            value={`${data.monthly_kwh.toFixed(0)} kWh · ${data.monthly_cost_sek.toFixed(0)} kr`} />
        </div>
      </div>
    </Card>
  );
}

// ─── Dammsugare ───────────────────────────────────────────────────────────────

function VacuumCard({ data, onRefresh }: { data: VacuumData; onRefresh: () => void }) {
  const statusLabel = data.cleaning
    ? (data.current_room ? `Städar · ${data.current_room}` : "Städar")
    : data.charging ? "Laddar"
    : data.state === "docked" ? "Dockat"
    : data.state === "idle" ? "Vilar"
    : data.state ?? "–";

  const statusColor = data.cleaning
    ? "var(--color-secondary)"
    : data.charging
    ? "#22c55e"
    : "var(--color-on-surface-variant)";

  // Battery icon — stepped, green
  const battPct = data.battery_pct ?? 0;
  const battIcon = battPct >= 95 ? "battery_full" : battPct >= 75 ? "battery_5_bar" : battPct >= 50 ? "battery_4_bar" : battPct >= 25 ? "battery_2_bar" : "battery_1_bar";
  const battColor = battPct >= 25 ? "#22c55e" : "var(--color-error)";

  return (
    <Card>
      <SectionLabel>Dammsugare</SectionLabel>
      {/* Status row */}
      <div className="flex items-center gap-3 mb-4">
        <div style={{
          width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
          backgroundColor: data.cleaning ? "var(--color-secondary-container)" : "var(--color-surface-container)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 22, color: data.cleaning ? "var(--color-secondary)" : "var(--color-on-surface-variant)", fontVariationSettings: "'FILL' 1" }}>
            radio_button_checked
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold" style={{ color: "var(--color-on-surface)" }}>Chomper</p>
          <p className="text-xs" style={{ color: statusColor }}>{statusLabel}</p>
        </div>
        <div className="flex items-center gap-1">
          {data.cleaning && data.cleaned_area != null && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full mr-1"
              style={{ backgroundColor: "var(--color-secondary-container)", color: "var(--color-secondary)" }}>
              {data.cleaned_area.toFixed(0)} m²
            </span>
          )}
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: battColor, fontVariationSettings: "'FILL' 1" }}>{battIcon}</span>
          <span className="text-xs font-bold" style={{ color: battColor }}>
            {data.battery_pct != null ? `${data.battery_pct}%` : "–"}
          </span>
        </div>
      </div>
      {/* Controls — Starta + Docka */}
      <div className="flex gap-2 mb-2">
        {[
          { label: "Starta", icon: "play_arrow",  action: () => callAction("vacuum", "start", "vacuum.chomper") },
          { label: "Docka",  icon: "home",         action: () => callAction("vacuum", "return_to_base", "vacuum.chomper") },
        ].map(({ label, icon, action }) => (
          <Pressable key={label}
            onClick={async () => { vibrate(); await action(); onRefresh(); }}
            className="flex items-center justify-center gap-1.5 rounded-full flex-1"
            style={{ backgroundColor: "var(--color-surface-container)", padding: "8px 12px" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: "var(--color-on-surface-variant)" }}>{icon}</span>
            <span className="text-[11px] font-semibold"
              style={{ color: "var(--color-on-surface)" }}>{label}</span>
          </Pressable>
        ))}
      </div>
      {/* Quick programs */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "Kök & hall",   icon: "kitchen",           action: () => callAction("button", "press", "button.dammsugare_snabb_kok_hall") },
          { label: "Djup",        icon: "auto_awesome",      action: () => callAction("button", "press", "button.dammsugare_djup") },
          { label: "Efter maten", icon: "restaurant",        action: () => callAction("button", "press", "button.chomper_after_meals") },
          { label: "Damm + Mopp", icon: "water_drop",        action: () => callAction("button", "press", "button.chomper_vac_followed_by_mop") },
        ].map(({ label, icon, action }) => (
          <Pressable key={label}
            onClick={async () => { vibrate(); await action(); onRefresh(); }}
            className="flex items-center gap-1.5 rounded-full"
            style={{ backgroundColor: "var(--color-surface-container)", padding: "7px 12px" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 15, color: "var(--color-on-surface-variant)" }}>{icon}</span>
            <span className="text-[11px] font-semibold"
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

const HERO_MODES = ["off", "heat", "cool", "heat_cool", "dry", "fan_only"];
function TempSlider({ value, min, max, step = 0.5, icon = "thermostat", onSet }: {
  value: number; min: number; max: number; step?: number; icon?: string;
  onSet: (t: number) => void;
}) {
  const [live, setLive] = useState<number | null>(null);
  const displayed = live ?? value;
  const fillPct = ((displayed - min) / (max - min)) * 100;
  return (
    <div className="flex items-center gap-3">
      <span className="material-symbols-outlined shrink-0" style={{ fontSize: 16, color: "var(--color-on-surface-variant)" }}>{icon}</span>
      <input type="range" min={min} max={max} step={step}
        key={value}
        defaultValue={value}
        className="flex-1"
        style={{ "--fill": `${fillPct.toFixed(1)}%` } as React.CSSProperties}
        onInput={e => {
          const v = parseFloat(e.currentTarget.value);
          e.currentTarget.style.setProperty("--fill", `${((v - min) / (max - min) * 100).toFixed(1)}%`);
          setLive(v);
        }}
        onMouseUp={e => onSet(parseFloat((e.target as HTMLInputElement).value))}
        onTouchEnd={e => onSet(parseFloat((e.target as HTMLInputElement).value))}
      />
      <span className="text-[11px] w-10 text-right shrink-0 font-semibold"
        style={{ color: "var(--color-on-surface)" }}>{displayed}°C</span>
    </div>
  );
}

function HvacCard({ data, onRefresh, loadingKey, runAction }: { data: HvacData; onRefresh: () => void; loadingKey: string | null; runAction: (key: string, fn: () => Promise<void>) => Promise<void> }) {
  const hp   = data.heat_pump;
  const nibe = data.nibe;
  const [expandedSelect, setExpandedSelect] = useState<"hot_water" | "ventilation" | null>(null);

  async function handleHeatPumpMode(mode: string) {
    await callAction("climate", mode === "off" ? "turn_off" : "set_hvac_mode", hp.entity_id,
      mode === "off" ? undefined : { hvac_mode: mode });
  }
  async function handleHotWaterBoost(option: string) {
    vibrate();
    await callAction("select", "select_option", "select.villa_bjorkdalen_more_hot_water", { option });
    onRefresh();
  }
  async function handleVentilationMode(option: string) {
    vibrate();
    await callAction("select", "select_option", "select.villa_bjorkdalen_ventilation_mode", { option });
    onRefresh();
  }
  async function handleNibeSetpoint(value: number) {
    vibrate();
    await callAction("number", "set_value", "number.villa_bjorkdalen_rumsgivare_borvarde_inomhusklimat", { value });
    onRefresh();
  }
  async function handleNattsvalka(current: boolean) {
    await callAction("switch", current ? "turn_off" : "turn_on", "switch.nibe_nattsvalka");
  }
  async function handleKaminlage(current: boolean) {
    await callAction("switch", current ? "turn_off" : "turn_on", "switch.nibe_kaminlage");
  }
  async function handleHeroTemp(temp: number) {
    vibrate();
    await callAction("climate", "set_temperature", hp.entity_id, { temperature: temp });
    onRefresh();
  }

  const hpColor = hp.state === "off" ? "var(--color-outline)"
    : hp.state === "cool" ? "var(--color-primary)"
    : "var(--color-tertiary)";
  const modes = HERO_MODES.filter(m => !hp.hvac_modes || hp.hvac_modes.includes(m));

  return (
    <Card className="md:col-span-2">
      <SectionLabel>Värmepumpar</SectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* ── Mitsubishi Hero — luftvärmepump ── */}
        <div className="p-4 rounded-2xl space-y-4" style={{ backgroundColor: "var(--color-surface-container)" }}>
          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: "rgba(136,92,0,0.15)" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22, color: "var(--color-tertiary)" }}>heat_pump</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold leading-tight" style={{ color: "var(--color-on-surface)" }}>Mitsubishi Hero</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-on-surface-variant)" }}>
                Luftvärmepump{hp.target_temp != null ? ` · mål ${hp.target_temp}°` : ""}
              </p>
            </div>
            {hp.current_temp != null && (
              <span className="text-2xl font-black shrink-0" style={{ color: "var(--color-on-surface)" }}>{hp.current_temp}°</span>
            )}
          </div>

          {/* Mode buttons */}
          <div className="grid grid-cols-3 gap-1.5">
            {modes.map(mode => {
              const active = hp.state === mode;
              const isLoading = loadingKey === `hero-${mode}`;
              const mColor = mode === "off" ? "var(--color-outline)"
                : mode === "cool" || mode === "dry" ? "var(--color-primary)"
                : mode === "fan_only" ? "var(--color-on-surface-variant)"
                : "var(--color-tertiary)";
              return (
                <Pressable key={mode} onClick={() => runAction(`hero-${mode}`, async () => { await handleHeatPumpMode(mode); await onRefresh(); })}
                  loading={isLoading}
                  className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl"
                  style={{
                    backgroundColor: active ? (mode === "off" ? "rgba(129,129,122,0.15)" : (mode === "cool" || mode === "dry") ? "rgba(71,91,194,0.15)" : mode === "fan_only" ? "rgba(129,129,122,0.12)" : "rgba(136,92,0,0.15)") : "var(--color-surface-container-high)",
                    color: active && !isLoading ? mColor : "var(--color-on-surface-variant)",
                    transition: "background-color 0.2s, color 0.2s, box-shadow 0.2s, border-color 0.2s",
                    boxShadow: active && !isLoading ? `inset 0 0 0 99px ${mColor}08` : "none",
                    border: `2px solid ${active && !isLoading ? mColor : "transparent"}`,
                  }}>
                  {isLoading ? (
                    <svg className="spin-anim" viewBox="0 0 24 24" fill="none"
                      style={{ color: mColor, width: 18, height: 18, flexShrink: 0 }}>
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25"/>
                      <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  ) : (
                    <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>
                      {HVAC_MODE_ICONS[mode]}
                    </span>
                  )}
                  <span className="text-[10px] font-bold">{HVAC_MODE_LABELS[mode]}</span>
                </Pressable>
              );
            })}
          </div>

          {/* Temperature slider */}
          {hp.target_temp != null && (
            <TempSlider value={hp.target_temp} min={16} max={30} onSet={handleHeroTemp} />
          )}
        </div>

        {/* ── Nibe S735 — bergvärmepump ── */}
        <div className="p-4 rounded-2xl space-y-4" style={{ backgroundColor: "var(--color-surface-container)" }}>
          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: nibe.alarm ? "rgba(175,59,80,0.15)" : "rgba(136,92,0,0.15)" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22, color: nibe.alarm ? "var(--color-error)" : "var(--color-tertiary)" }}>
                {nibe.alarm ? "error" : "heat_pump"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold leading-tight" style={{ color: "var(--color-on-surface)" }}>Nibe S735</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-on-surface-variant)" }}>Frånluftsvärmepump</p>
            </div>
            {nibe.outdoor_temp != null && (
              <span className="text-2xl font-black shrink-0" style={{ color: "var(--color-on-surface)" }}>{Math.round(nibe.outdoor_temp)}°</span>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: "water_drop", label: "Varmvatten", value: nibe.hot_water_temp   != null ? `${nibe.hot_water_temp}°C`              : "–" },
              { icon: "mode_fan",   label: "Fläkt",      value: nibe.fan_speed_pct    != null ? `${nibe.fan_speed_pct}%`                : "–" },
              { icon: "power",      label: "Effekt",     value: nibe.system_power_kw  != null ? `${nibe.system_power_kw.toFixed(1)}kW`  : "–" },
            ].map(({ icon, label, value }) => (
              <div key={label} className="flex items-center justify-center gap-2 py-2.5 rounded-xl"
                style={{ backgroundColor: "var(--color-surface-container-high)" }}>
                <span className="material-symbols-outlined shrink-0" style={{ fontSize: 16, color: "var(--color-primary)" }}>{icon}</span>
                <div className="min-w-0">
                  <p className="text-[10px] leading-none mb-0.5" style={{ color: "var(--color-outline)" }}>{label}</p>
                  <p className="text-sm font-bold leading-tight" style={{ color: "var(--color-on-surface)" }}>{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Status pills */}
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { icon: "compress", label: "Kompressor", value: nibe.compressor_hz != null ? `${nibe.compressor_hz}Hz`        : "–" },
              { icon: "bolt",     label: "Elpatron",   value: nibe.heater_kw    != null ? `${nibe.heater_kw.toFixed(1)}kW` : "–" },
            ].map(({ icon, label, value }) => (
              <span key={label} className="flex items-center justify-center gap-1.5 text-[11px] font-semibold px-3 py-2 rounded-full"
                style={{
                  backgroundColor: "var(--color-surface-container-high)",
                  color: "var(--color-on-surface-variant)",
                }}>
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{icon}</span>
                {label} {value}
              </span>
            ))}
          </div>

          {/* Börvärde slider */}
          {nibe.indoor_setpoint != null && (
            <TempSlider value={nibe.indoor_setpoint} min={16} max={25} icon="thermostat" onSet={handleNibeSetpoint} />
          )}

          {/* Expandable selects */}
          <div className="space-y-1.5">
            {/* Varmvattenboost */}
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--color-surface-container-high)" }}>
              <button onClick={() => setExpandedSelect(expandedSelect === "hot_water" ? null : "hot_water")}
                className="w-full flex items-center gap-2.5 px-3 py-2.5">
                <span className="material-symbols-outlined shrink-0"
                  style={{ fontSize: 16, color: "var(--color-primary)", fontVariationSettings: nibe.hot_water_boost !== "Off" ? "'FILL' 1" : "'FILL' 0" }}>
                  water_drop
                </span>
                <span className="flex-1 text-sm font-semibold text-left" style={{ color: "var(--color-on-surface)" }}>Varmvattenboost</span>
                <span className="text-xs font-medium mr-1" style={{ color: nibe.hot_water_boost !== "Off" ? "var(--color-primary)" : "var(--color-on-surface-variant)" }}>
                  {nibe.hot_water_boost}
                </span>
                <span className="material-symbols-outlined shrink-0" style={{ fontSize: 16, color: "var(--color-on-surface-variant)" }}>
                  {expandedSelect === "hot_water" ? "expand_less" : "expand_more"}
                </span>
              </button>
              <AnimatePresence initial={false}>
              {expandedSelect === "hot_water" && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  style={{ overflow: "hidden" }}
                >
                <div className="px-3 pb-3 flex flex-wrap gap-1.5">
                  {nibe.hot_water_boost_options.map(opt => (
                    <Pressable key={opt} onClick={() => { handleHotWaterBoost(opt); setExpandedSelect(null); }}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                      style={{
                        backgroundColor: nibe.hot_water_boost === opt ? "var(--color-primary)" : "var(--color-surface-container)",
                        color: nibe.hot_water_boost === opt ? "var(--color-on-primary)" : "var(--color-on-surface-variant)",
                      }}>
                      {opt}
                    </Pressable>
                  ))}
                </div>
                </motion.div>
              )}
              </AnimatePresence>
            </div>

            {/* Ventilation */}
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--color-surface-container-high)" }}>
              <button onClick={() => setExpandedSelect(expandedSelect === "ventilation" ? null : "ventilation")}
                className="w-full flex items-center gap-2.5 px-3 py-2.5">
                <span className="material-symbols-outlined shrink-0" style={{ fontSize: 16, color: "var(--color-primary)" }}>mode_fan</span>
                <span className="flex-1 text-sm font-semibold text-left" style={{ color: "var(--color-on-surface)" }}>Ventilation</span>
                <span className="text-xs font-medium mr-1" style={{ color: "var(--color-on-surface-variant)" }}>
                  {nibe.ventilation_mode}
                </span>
                <span className="material-symbols-outlined shrink-0" style={{ fontSize: 16, color: "var(--color-on-surface-variant)" }}>
                  {expandedSelect === "ventilation" ? "expand_less" : "expand_more"}
                </span>
              </button>
              <AnimatePresence initial={false}>
              {expandedSelect === "ventilation" && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  style={{ overflow: "hidden" }}
                >
                <div className="px-3 pb-3 flex flex-wrap gap-1.5">
                  {nibe.ventilation_options.map(opt => (
                    <Pressable key={opt} onClick={() => { handleVentilationMode(opt); setExpandedSelect(null); }}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                      style={{
                        backgroundColor: nibe.ventilation_mode === opt ? "var(--color-primary)" : "var(--color-surface-container)",
                        color: nibe.ventilation_mode === opt ? "var(--color-on-primary)" : "var(--color-on-surface-variant)",
                      }}>
                      {opt}
                    </Pressable>
                  ))}
                </div>
                </motion.div>
              )}
              </AnimatePresence>
            </div>
          </div>

          {/* Toggle buttons */}
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { key: "nattsvalka", label: "Nattsvalka", icon: "nightlight", active: nibe.nattsvalka, color: "var(--color-primary)", onToggle: () => handleNattsvalka(nibe.nattsvalka) },
              { key: "kaminlage",  label: "Kaminläge",  icon: "local_fire_department", active: nibe.kaminlage, color: "var(--color-tertiary)", onToggle: () => handleKaminlage(nibe.kaminlage) },
            ].map(({ key, label, icon, active, color, onToggle }) => {
              const isLoading = loadingKey === `nibe-${key}`;
              return (
              <Pressable key={label} onClick={() => runAction(`nibe-${key}`, async () => { await onToggle(); await onRefresh(); })}
                loading={isLoading}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
                style={{
                  backgroundColor: active ? (color === "var(--color-primary)" ? "rgba(71,91,194,0.15)" : "rgba(136,92,0,0.15)") : "var(--color-surface-container-high)",
                  color: active && !isLoading ? color : "var(--color-on-surface-variant)",
                  transition: "background-color 0.2s, color 0.2s, box-shadow 0.2s",
                  boxShadow: active && !isLoading ? `inset 0 0 0 99px ${color}08` : "none",
                  border: `2px solid ${active && !isLoading ? color : "transparent"}`,
                }}>
                {isLoading ? (
                  <svg className="spin-anim" viewBox="0 0 24 24" fill="none"
                    style={{ color, width: 16, height: 16, flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25"/>
                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                ) : (
                  <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>{icon}</span>
                )}
                {label}
              </Pressable>
              );
            })}
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
        transition: "border-color 0.2s, box-shadow 0.2s",
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

// ─── Solkyla ─────────────────────────────────────────────────────────────────

const SOLKYLA_AC_LABELS: Record<string, string> = {
  off: "Av", cool: "Kyla", dry: "Torr", fan_only: "Fläkt", heat: "Värme", heat_cool: "Auto",
};

function SolarCoolingCard({ data, onRefresh, loadingKey, runAction }: {
  data: SolkylaData; onRefresh: () => void;
  loadingKey: string | null; runAction: (key: string, fn: () => Promise<void>) => Promise<void>;
}) {
  const score = data.solar_gain_score;
  const active = score != null && score > 0;
  const scoreColor = active ? "#f59e0b" : "var(--color-outline)";
  const acMode = SOLKYLA_AC_LABELS[data.ac.hvac_mode] ?? data.ac.hvac_mode;
  const acOn = data.ac.state !== "off";

  async function handleMasterToggle() {
    vibrate();
    await callAction("input_boolean", data.master_enabled ? "turn_off" : "turn_on", "input_boolean.solkyla_automation");
    onRefresh();
  }

  // Automations summary
  const enabledCount = data.automations.filter(a => a.enabled).length;
  const lastTriggered = data.automations
    .map(a => a.last_triggered)
    .filter((t): t is string => t != null)
    .sort()
    .pop();
  const triggeredLabel = lastTriggered
    ? (() => {
        const diffMs = Date.now() - new Date(lastTriggered).getTime();
        if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)} min sedan`;
        if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)} h sedan`;
        return new Date(lastTriggered).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
      })()
    : null;

  return (
    <Card>
      {/* Header — label + master toggle */}
      <div className="flex items-center justify-between mb-3">
        <SectionLabel>Solkyla</SectionLabel>
        <div className="flex items-center gap-2" style={{ marginTop: -4 }}>
          <span className="text-[10px] font-semibold" style={{ color: data.master_enabled ? "#f59e0b" : "var(--color-outline)" }}>
            {data.master_enabled ? "På" : "Av"}
          </span>
          <LightToggle on={data.master_enabled} onChange={() => runAction("solkyla-master", async () => { await handleMasterToggle(); })} />
        </div>
      </div>

      {/* Score + AC status */}
      <div className="flex items-center gap-3 mb-3">
        <div style={{
          width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
          backgroundColor: active ? "rgba(245,158,11,0.15)" : "var(--color-surface-container)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span className="material-symbols-outlined"
            style={{ fontSize: 20, color: scoreColor, fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>
            solar_power
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-lg font-black leading-tight" style={{ color: "var(--color-on-surface)" }}>
            {score != null ? `${score}%` : "–"}
            <span className="text-xs font-medium ml-1.5" style={{ color: active ? "#f59e0b" : "var(--color-outline)" }}>
              {active ? "solvärme" : "inaktiv"}
            </span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: acOn ? "rgba(71,91,194,0.15)" : "var(--color-surface-container)",
              color: acOn ? "#475bc2" : "var(--color-outline)",
            }}>
            {acMode}{acOn && data.ac.target_temp != null ? ` ${data.ac.target_temp}°` : ""}
          </span>
          {data.room_temp != null && (
            <span className="text-[11px] font-medium" style={{ color: "var(--color-on-surface-variant)" }}>
              {data.room_temp.toFixed(1)}° rum
            </span>
          )}
        </div>
      </div>

      {/* Footer — context + automations summary */}
      <div className="text-[11px]" style={{ color: "var(--color-outline)" }}>
        <span>{data.context.outdoor_temp != null ? `${Math.round(data.context.outdoor_temp)}° ute` : ""}</span>
        {data.context.cloud_coverage != null && <span> · {Math.round(data.context.cloud_coverage)}% moln</span>}
        {data.context.uv_index != null && data.context.uv_index > 0 && <span> · UV {data.context.uv_index}</span>}
        <span> · {enabledCount}/{data.automations.length} regler aktiva</span>
        {triggeredLabel && <span> · senast {triggeredLabel}</span>}
      </div>
    </Card>
  );
}

// ─── Väder-ikon mappning (HA condition → Material Symbol) ─────────────────────
const WEATHER_ICON: Record<string, string> = {
  "clear-night": "dark_mode", sunny: "light_mode", partlycloudy: "partly_cloudy_day",
  cloudy: "cloud", fog: "foggy", rainy: "rainy", pouring: "thunderstorm",
  snowy: "weather_snowy", "snowy-rainy": "weather_mix", hail: "weather_hail",
  lightning: "thunderstorm", "lightning-rainy": "thunderstorm", windy: "air",
  "windy-variant": "air", exceptional: "warning",
};
function weatherIcon(condition: string) { return WEATHER_ICON[condition] ?? "thermostat"; }

const DAY_NAMES_SV = ["sön", "mån", "tis", "ons", "tor", "fre", "lör"];

// ─── Väderrad (kompakt, ovanför favoriter) ──────────────────────────────────
function WeatherStrip({ data }: { data: WeatherData }) {
  const c = data.current;
  const periods = data.periods ?? [];
  const forecast = data.forecast ?? [];
  return (
    <div className="flex items-center justify-between">
      {/* Vänster — perioder: aktuell + 3 kommande */}
      <div className="flex items-center">
        {periods.map((p, i) => (
          <div key={`${p.date}-${p.period}`} className="flex flex-col items-center"
            style={{ width: 44 }}>
            <span className="text-[10px] font-medium uppercase"
              style={{ color: i === 0 ? "var(--color-on-surface)" : "var(--color-on-surface-variant)", opacity: i === 0 ? 0.8 : 0.55, fontWeight: i === 0 ? 700 : 500 }}>
              {p.label}
            </span>
            <span className="material-symbols-outlined"
              style={{ fontSize: 17, color: "var(--color-on-surface-variant)", fontVariationSettings: "'FILL' 1", margin: "2px 0" }}>
              {weatherIcon(i === 0 ? c.state : p.condition)}
            </span>
            <span className="text-[11px] font-semibold leading-none" style={{ color: "var(--color-on-surface)" }}>
              {i === 0 ? Math.round(c.temperature) : p.temperature}°
            </span>
          </div>
        ))}
      </div>

      {/* Höger — separator + dagsprognos */}
      {forecast.length > 0 && (
        <div className="flex items-center">
          <div className="shrink-0" style={{ width: 1, height: 28, backgroundColor: "var(--color-outline-variant)", opacity: 0.3, marginRight: 8 }} />
          {forecast.map((f) => {
            const d = new Date(f.datetime);
            const dayLabel = DAY_NAMES_SV[d.getDay()];
            return (
              <div key={f.datetime} className="flex flex-col items-center"
                style={{ width: 44 }}>
                <span className="text-[10px] font-medium uppercase"
                  style={{ color: "var(--color-on-surface-variant)", opacity: 0.55 }}>{dayLabel}</span>
                <span className="material-symbols-outlined"
                  style={{ fontSize: 17, color: "var(--color-on-surface-variant)", fontVariationSettings: "'FILL' 1", margin: "2px 0" }}>
                  {weatherIcon(f.condition)}
                </span>
                <span className="text-[11px] font-semibold leading-none" style={{ color: "var(--color-on-surface)" }}>
                  {Math.round(f.temperature)}°
                  <span style={{ fontWeight: 400, color: "var(--color-outline)", marginLeft: 1 }}>
                    {Math.round(f.templow)}°
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Nu spelas (bara Apple TV, visas bara om något spelar) ──────────────────
function NowPlayingStrip({ players }: { players: MediaPlayer[] }) {
  const playing = players.filter(p => p.type === "appletv" && (p.state === "playing" || p.state === "paused") && p.media_title);
  if (playing.length === 0) return null;
  return (
    <div className="space-y-2">
      {playing.map(p => (
        <a key={p.entity_id} href="/home/media" className="flex items-center gap-3 px-4 py-3 rounded-2xl"
          style={{ backgroundColor: "var(--color-surface-container)", textDecoration: "none" }}>
          {/* Album art */}
          {p.media_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.media_image_url} alt=""
              style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
          ) : (
            <div style={{
              width: 44, height: 44, borderRadius: 8, flexShrink: 0,
              backgroundColor: "var(--color-surface-container-high)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span className="material-symbols-outlined text-[20px]"
                style={{ color: "var(--color-on-surface-variant)" }}>music_note</span>
            </div>
          )}
          {/* Title + artist */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: "var(--color-on-surface)" }}>
              {p.media_title ?? "Spelar"}
            </p>
            <p className="text-xs truncate" style={{ color: "var(--color-on-surface-variant)" }}>
              {[p.media_artist, p.room].filter(Boolean).join(" · ")}
            </p>
          </div>
          {/* Equalizer animation icon */}
          <span className="material-symbols-outlined text-[20px] shrink-0"
            style={{ color: "var(--color-primary)", fontVariationSettings: "'FILL' 1" }}>
            graphic_eq
          </span>
        </a>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const hydrated = useHydrated();

  const { data: lights,  error: lightsError,  mutate: mLights  } = useSWR<LightsData>  ("/api/homeassistant/lights",  fetcher, { refreshInterval:  2_000 });
  const { data: scenesData } = useSWR<{ scenes: ScenePayload[] }>("/api/homeassistant/scenes", fetcher, { refreshInterval: 60_000 });

  // Active scene derived from actual light state (Apple Home-style)
  const activeScene = useMemo(() => {
    if (!lights || !("areas" in lights) || !scenesData?.scenes) return null;
    const snapshot = lights.areas.flatMap(a => a.lights.map(l => ({
      entity_id: l.entity_id, state: l.state, brightness_pct: l.brightness_pct,
    })));
    return detectActiveScene(scenesData.scenes, snapshot);
  }, [lights, scenesData]);
  const { data: sensors, error: sensorsError } = useSWR<SensorsData> ("/api/homeassistant/sensors", fetcher, { refreshInterval: 30_000 });
  const { data: energy }                       = useSWR<EnergyData>  ("/api/homeassistant/energy",  fetcher, { refreshInterval:  3_000 });
  const { data: cars }                         = useSWR<CarsData>    ("/api/homeassistant/cars",    fetcher, { refreshInterval: 60_000 });
  const { data: hvac,    mutate: mHvac    }    = useSWR<HvacData>    ("/api/homeassistant/hvac",    fetcher, { refreshInterval: 15_000 });
  const { data: vacuum,  mutate: mVacuum  }    = useSWR<VacuumData>  ("/api/homeassistant/vacuum",  fetcher, { refreshInterval: 10_000 });
  const { data: weather }                      = useSWR<WeatherData> ("/api/homeassistant/weather", fetcher, { refreshInterval: 300_000 });
  const { data: mediaData }                    = useSWR<{ players: MediaPlayer[] }>("/api/homeassistant/media", fetcher, { refreshInterval: 5_000 });
  const { data: solkyla,  mutate: mSolkyla }   = useSWR<SolkylaData>("/api/homeassistant/solkyla", fetcher, { refreshInterval: 15_000 });

  // Awaitable refresh — waits for HA to process the command before revalidating
  const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
  const refreshLights  = useCallback(async () => { await delay(600);  await mLights();  }, [mLights]);
  const refreshHvac    = useCallback(async () => { await delay(1000); await mHvac();   }, [mHvac]);
  const refreshVacuum  = useCallback(async () => { await delay(800);  await mVacuum(); }, [mVacuum]);
  const refreshSolkyla = useCallback(async () => { await delay(600);  await mSolkyla(); }, [mSolkyla]);

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
  const kaminOn     = hvacOk ? hvac.nibe.kaminlage                    : false;
  const boostOn     = hvacOk ? hvac.nibe.hot_water_boost !== "Off"    : false;
  const lightsOk    = lights && "areas" in lights;
  const allLightsOff = lightsOk ? lights.areas.every(a => a.on_count === 0) : false;
  const sensorsOk = sensors && "areas" in sensors;

  // Primary indoor temp: Nibe BT50, fallback to avg
  const indoorTemp = sensorsOk
    ? (sensors.nibe_indoor_temp ?? sensors.avg_indoor)
    : null;

  return (
    <div className="space-y-5">

      {(lightsError || sensorsError) && (
        <ErrorBanner onRetry={() => { mLights(); }} />
      )}

      {/* Header + väder */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight font-headline"
          style={{ color: "var(--color-on-surface)" }}>
          {greeting()}, Adam
        </h1>
        <p className="text-sm font-medium mt-1 capitalize"
          style={{ color: "var(--color-on-surface-variant)" }}>
          Villa Björkdalen · {formatDate()}
        </p>
        {weather && "current" in weather && (
          <div className="mt-2">
            <WeatherStrip data={weather} />
          </div>
        )}
      </div>

      {/* Status strip — split into temp row (expandable) + energy row */}
      {(() => {
        // Indoor rooms — fixed order, exclude Kök/Växthus
        const INDOOR_ORDER = ["Vardagsrum", "Sovrum", "Elvira"];
        const INDOOR_ICONS: Record<string, string> = { "Vardagsrum": "weekend", "Sovrum": "bed", "Elvira": "face" };
        const indoorAreas = sensorsOk
          ? INDOOR_ORDER.map(n => sensors.areas.find(a => a.name === n)).filter((a): a is SensorArea => a != null)
          : [];
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
              <ExpandChip chip="indoor" icon="device_thermostat"
                value={indoorTemp != null ? `${indoorTemp}°` : "–"}
                label="Inomhus" color="var(--color-primary)" />
              <ExpandChip chip="outdoor" icon="device_thermostat"
                value={sensors?.outdoor_temp != null ? `${sensors.outdoor_temp}°` : "–"}
                label="Utomhus" color="var(--color-tertiary)" />
            </ChipRow>

            {/* Indoor expand panel */}
            <AnimatePresence initial={false}>
            {expandedChip === "indoor" && sensorsOk && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                style={{ overflow: "hidden" }}
              >
              <div className="px-4 pb-4 pt-1 border-t" style={{ borderColor: "var(--color-outline-variant)" }}>
                {/* BT50 primary row */}
                {sensors.nibe_indoor_temp != null && (
                  <div className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="material-symbols-outlined text-[15px] shrink-0" style={{ color: "var(--color-on-surface-variant)" }}>device_thermostat</span>
                      <span className="text-sm font-semibold truncate" style={{ color: "var(--color-on-surface)" }}>Innetemperatur</span>
                      <PrimaryBadge color="var(--color-primary)" />
                    </div>
                    <span className="flex items-center gap-0.5 shrink-0" style={{ minWidth: "3.75rem", justifyContent: "flex-end" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: "var(--color-on-surface-variant)" }}>device_thermostat</span>
                      <span className="text-sm font-black" style={{ color: "var(--color-on-surface)", fontVariantNumeric: "tabular-nums" }}>{sensors.nibe_indoor_temp.toFixed(1)}°</span>
                    </span>
                  </div>
                )}
                {/* Per-area (excluding växthus) */}
                {indoorAreas.map(area => (
                  <div key={area.area_id} className="flex items-center justify-between py-2.5 border-t"
                    style={{ borderColor: "var(--color-outline-variant)" }}>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="material-symbols-outlined text-[15px] shrink-0" style={{ color: "var(--color-on-surface-variant)" }}>{INDOOR_ICONS[area.name] ?? "device_thermostat"}</span>
                      <span className="text-sm font-semibold" style={{ color: "var(--color-on-surface)" }}>{area.name}</span>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      {area.humidity != null && (
                        <span className="flex items-center gap-1 text-xs" style={{ color: "var(--color-on-surface-variant)" }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>water_drop</span>
                          {Math.round(area.humidity)}%
                        </span>
                      )}
                      <span className="flex items-center gap-0.5" style={{ minWidth: "3.75rem", justifyContent: "flex-end" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16, color: "var(--color-on-surface-variant)" }}>device_thermostat</span>
                        <span className="text-sm font-black" style={{ color: "var(--color-on-surface)", fontVariantNumeric: "tabular-nums" }}>{area.temperature.toFixed(1)}°</span>
                      </span>
                    </div>
                  </div>
                ))}
                {/* 24h indoor temperature chart */}
                <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--color-outline-variant)" }}>
                  <p className="text-[10px] font-semibold mb-1" style={{ color: "var(--color-on-surface-variant)" }}>Inomhus senaste 24h</p>
                  <IndoorTempChart />
                </div>
              </div>
              </motion.div>
            )}
            </AnimatePresence>

            {/* Outdoor expand panel */}
            <AnimatePresence initial={false}>
            {expandedChip === "outdoor" && sensorsOk && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                style={{ overflow: "hidden" }}
              >
              <div className="px-4 pb-4 pt-1 border-t" style={{ borderColor: "var(--color-outline-variant)" }}>
                {/* BT1 primary row */}
                {sensors.outdoor_temp != null && (
                  <div className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="material-symbols-outlined text-[15px] shrink-0" style={{ color: "var(--color-on-surface-variant)" }}>device_thermostat</span>
                      <span className="text-sm font-semibold truncate" style={{ color: "var(--color-on-surface)" }}>Utetemperatur</span>
                      <PrimaryBadge color="var(--color-tertiary)" />
                    </div>
                    <span className="flex items-center gap-0.5 shrink-0" style={{ minWidth: "3.75rem", justifyContent: "flex-end" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: "var(--color-on-surface-variant)" }}>device_thermostat</span>
                      <span className="text-sm font-black" style={{ color: "var(--color-on-surface)", fontVariantNumeric: "tabular-nums" }}>{sensors.outdoor_temp.toFixed(1)}°</span>
                    </span>
                  </div>
                )}
                {/* Växthus */}
                {vaxthusArea && (
                  <div className="flex items-center justify-between py-2.5 border-t" style={{ borderColor: "var(--color-outline-variant)" }}>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[15px]" style={{ color: "var(--color-on-surface-variant)" }}>potted_plant</span>
                      <span className="text-sm font-semibold" style={{ color: "var(--color-on-surface)" }}>Växthus</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      {vaxthusArea.humidity != null && (
                        <span className="flex items-center gap-1 text-xs" style={{ color: "var(--color-on-surface-variant)" }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>water_drop</span>
                          {Math.round(vaxthusArea.humidity)}%
                        </span>
                      )}
                      <span className="flex items-center gap-0.5" style={{ minWidth: "3.75rem", justifyContent: "flex-end" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16, color: "var(--color-on-surface-variant)" }}>device_thermostat</span>
                        <span className="text-sm font-black" style={{ color: "var(--color-on-surface)", fontVariantNumeric: "tabular-nums" }}>{vaxthusArea.temperature.toFixed(1)}°</span>
                        {vaxthusArea.temperature > 30 && (
                          <span className="material-symbols-outlined text-[14px] ml-0.5" style={{ color: "#e65100" }}>warning</span>
                        )}
                      </span>
                    </div>
                  </div>
                )}
                {/* 24h outdoor temperature chart */}
                <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--color-outline-variant)" }}>
                  <p className="text-[10px] font-semibold mb-1" style={{ color: "var(--color-on-surface-variant)" }}>Utomhus senaste 24h</p>
                  <OutdoorTempChart />
                </div>
              </div>
              </motion.div>
            )}
            </AnimatePresence>

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

      {/* Nu spelas — visas bara om minst en mediaspelare spelar */}
      {mediaData?.players && <NowPlayingStrip players={mediaData.players} />}

      {/* Favoriter */}
      <Card>
        <SectionLabel>Favoriter</SectionLabel>

        {/* Scener */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8, marginBottom: 12 }}>
          <FavTile
            label="Morgon" icon="wb_sunny"
            color="#f59e0b" active={activeScene === "god_morgon"}
            loading={loadingKey === "scene-god_morgon"}
            onClick={() => runAction("scene-god_morgon", async () => {
              await callAction("scene", "turn_on", "scene.god_morgon");
              await refreshLights();
            })}
          />
          <FavTile
            label="Hemma" icon="home"
            color="#22c55e" active={activeScene === "hemma"}
            loading={loadingKey === "scene-hemma"}
            onClick={() => runAction("scene-hemma", async () => {
              await callAction("scene", "turn_on", "scene.hemma");
              await refreshLights();
            })}
          />
          <FavTile
            label="Kväll" icon="partly_cloudy_night"
            color="#f59e0b" active={activeScene === "kvall"}
            loading={loadingKey === "scene-kvall"}
            onClick={() => runAction("scene-kvall", async () => {
              await callAction("scene", "turn_on", "scene.kvall");
              await refreshLights();
            })}
          />
          <FavTile
            label="Natt" icon="bedtime"
            color="#1d4ed8" active={activeScene === "natt"}
            loading={loadingKey === "scene-natt"}
            onClick={() => runAction("scene-natt", async () => {
              await callAction("scene", "turn_on", "scene.natt");
              await refreshLights();
            })}
          />
        </div>

        {/* Kontroller */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
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
          <LightingCard data={lights} onRefresh={refreshLights} loadingKey={loadingKey} runAction={runAction} />
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
          <HvacCard data={hvac} onRefresh={refreshHvac} loadingKey={loadingKey} runAction={runAction} />
        ) : (
          <Card className="md:col-span-2"><SectionLabel>Värmepumpar</SectionLabel><Skeleton className="h-36" /></Card>
        )}

        {/* Solkyla */}
        {solkyla && "master_enabled" in solkyla && (
          <SolarCoolingCard data={solkyla} onRefresh={refreshSolkyla} loadingKey={loadingKey} runAction={runAction} />
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

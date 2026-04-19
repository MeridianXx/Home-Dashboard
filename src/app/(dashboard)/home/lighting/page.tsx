"use client";

import { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import useSWR from "swr";
import { FavTile } from "@/components/FavTile";
import { detectActiveScene, type ScenePayload } from "@/lib/scenes";
import { callAction } from "@/lib/actions";
import { fetcher } from "@/lib/fetcher";
import ErrorBanner from "@/components/ErrorBanner";

// ─── Types ────────────────────────────────────────────────────────────────────

type LightEntry = {
  entity_id: string; name: string; state: string;
  brightness_pct: number | null; dimmable: boolean;
};
type LightArea = {
  area_id: string; name: string;
  lights: LightEntry[]; on_count: number; total_count: number;
};
type LightsData = { areas: LightArea[] };

// ─── Helpers ─────────────────────────────────────────────────────────────────

const AMBER = "#fab849";
const vibrate = () => typeof navigator !== "undefined" && navigator.vibrate?.(10);

// ─── UI Components ────────────────────────────────────────────────────────────

function LightToggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} aria-label={on ? "Stäng av" : "Sätt på"}
      style={{
        position: "relative", width: 42, height: 24, borderRadius: 12, flexShrink: 0,
        backgroundColor: on ? AMBER : "var(--color-outline-variant)",
        border: "none", cursor: "pointer",
        transition: "background-color 0.18s",
      }}>
      <span style={{
        position: "absolute", top: 3, left: on ? 20 : 3, width: 18, height: 18,
        borderRadius: "50%", backgroundColor: "white",
        transition: "left 0.15s",
        pointerEvents: "none",
      }} />
    </button>
  );
}

function RoomRow({ area, expanded, onToggleExpand, onToggleArea, onToggleLight, onBrightness }: {
  area: LightArea; expanded: boolean;
  onToggleExpand: () => void;
  onToggleArea: (a: LightArea) => void;
  onToggleLight: (l: LightEntry) => void;
  onBrightness: (entity_id: string, pct: number) => void;
}) {
  const on = area.on_count > 0;
  const [liveBrightness, setLiveBrightness] = useState<Record<string, number>>({});
  return (
    <div className="flex flex-col rounded-2xl overflow-hidden"
      style={{
        backgroundColor: "var(--color-surface-container)",
        border: `1.5px solid ${on ? AMBER : "transparent"}`,
        boxShadow: on ? `inset 0 0 0 99px ${AMBER}09` : "none",
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}>
      {/* Row header */}
      <div className="flex items-center">
        {/* Left: icon + name — tapping toggles room */}
        <button onClick={() => onToggleArea(area)} className="flex items-center gap-3 flex-1 min-w-0 text-left px-4 py-3">
          <span className="material-symbols-outlined shrink-0"
            style={{ fontSize: 22, color: on ? AMBER : "var(--color-outline)", fontVariationSettings: on ? "'FILL' 1" : "'FILL' 0" }}>
            {on ? "light_mode" : "light_off"}
          </span>
          <span className="text-sm font-semibold" style={{ color: "var(--color-on-surface)" }}>{area.name}</span>
          {area.total_count > 1 ? (
            <span className="text-xs" style={{ color: on ? "var(--color-on-surface-variant)" : "var(--color-outline)" }}>
              {area.on_count}/{area.total_count} på
            </span>
          ) : (
            <span className="text-xs" style={{ color: "var(--color-outline)" }}>
              {on ? "På" : "Av"}
            </span>
          )}
        </button>
        {/* Right: expand — full-height touch target, short centered divider */}
        <button onClick={onToggleExpand}
          className="shrink-0 flex items-center justify-center self-stretch"
          style={{ width: 44, position: "relative" }}>
          <div style={{ position: "absolute", left: 0, top: "30%", height: "40%", width: 1, backgroundColor: "var(--color-outline-variant)", opacity: 0.3 }} />
          <span className="material-symbols-outlined" style={{ fontSize: 20, color: "var(--color-on-surface-variant)", opacity: 0.3 }}>
            {expanded ? "expand_less" : "expand_more"}
          </span>
        </button>
      </div>

      {/* Expanded: per-light controls */}
      <AnimatePresence initial={false}>
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          style={{ overflow: "hidden" }}
        >
        <div className="border-t px-4 pb-4 pt-3 space-y-3"
          style={{ borderColor: on ? `${AMBER}33` : "var(--color-outline-variant)", backgroundColor: "var(--color-surface-container)" }}>
          {area.lights.map(light => {
            const lon = light.state === "on";
            return (
              <div key={light.entity_id} className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined shrink-0"
                    style={{ fontSize: 16, color: lon ? AMBER : "var(--color-outline)", fontVariationSettings: lon ? "'FILL' 1" : "'FILL' 0" }}>
                    {lon ? "light_mode" : "light_off"}
                  </span>
                  <span className="flex-1 text-sm font-medium truncate min-w-0"
                    style={{ color: "var(--color-on-surface)" }}>{light.name}</span>
                  <LightToggle on={lon} onChange={() => onToggleLight(light)} />
                </div>
                {light.dimmable && lon && (
                  <div className="flex items-center gap-3 pl-6">
                    <input type="range" min={1} max={100}
                      aria-label={`Ljusstyrka för ${light.name}`}
                      defaultValue={light.brightness_pct ?? 100}
                      className="flex-1"
                      style={{ "--fill": `${light.brightness_pct ?? 100}%` } as React.CSSProperties}
                      onInput={e => { const t = e.currentTarget; const v = parseInt(t.value); t.style.setProperty("--fill", `${v}%`); setLiveBrightness(p => ({ ...p, [light.entity_id]: v })); }}
                      onMouseUp={e => onBrightness(light.entity_id, parseInt((e.target as HTMLInputElement).value))}
                      onTouchEnd={e => onBrightness(light.entity_id, parseInt((e.target as HTMLInputElement).value))}
                    />
                    <span className="text-[11px] w-7 text-right shrink-0"
                      style={{ color: "var(--color-outline)" }}>{liveBrightness[light.entity_id] ?? light.brightness_pct ?? 100}%</span>
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
}

// ─── Floor plan ──────────────────────────────────────────────────────────────

const NEDERVANING = ["Adrian", "Entré", "Hall", "Kök", "Sovrum", "Stora badrummet", "Tvättstuga", "Vardagsrum", "Walk-in"];
const OVERVANING  = ["Allrum", "Elvira", "Kontor", "Lounge", "Lilla badrummet"];
const UTOMHUS     = ["Utomhus"];

function sortByFloor(areas: LightArea[]) {
  const byName = (a: LightArea, b: LightArea) => a.name.localeCompare(b.name, "sv");
  const neder   = areas.filter(a => NEDERVANING.includes(a.name)).sort(byName);
  const over    = areas.filter(a => OVERVANING.includes(a.name)).sort(byName);
  const utomhus = areas.filter(a => UTOMHUS.includes(a.name)).sort(byName);
  const other   = areas.filter(a => !NEDERVANING.includes(a.name) && !OVERVANING.includes(a.name) && !UTOMHUS.includes(a.name)).sort(byName);
  return { neder, over, utomhus, other };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const SCENES: Array<{ key: string; label: string; icon: string; color: string }> = [
  { key: "god_morgon", label: "Morgon",  icon: "wb_sunny",             color: "#f59e0b" },
  { key: "hemma",      label: "Hemma",   icon: "home",                 color: "#22c55e" },
  { key: "kvall",      label: "Kväll",   icon: "partly_cloudy_night",  color: "#f59e0b" },
  { key: "natt",       label: "Natt",    icon: "bedtime",              color: "#1d4ed8" },
];

export default function LightingPage() {
  const { data: lights, error: lightsError, mutate } = useSWR<LightsData>("/api/homeassistant/lights", fetcher, { refreshInterval: 2_000 });
  const { data: scenesData } = useSWR<{ scenes: ScenePayload[] }>("/api/homeassistant/scenes", fetcher, { refreshInterval: 60_000 });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [offLoading, setOffLoading] = useState<string | null>(null);
  const [loadingScene, setLoadingScene] = useState<string | null>(null);

  const activeScene = useMemo(() => {
    if (!lights || !("areas" in lights) || !scenesData?.scenes) return null;
    const snapshot = lights.areas.flatMap(a => a.lights.map(l => ({
      entity_id: l.entity_id, state: l.state, brightness_pct: l.brightness_pct,
    })));
    return detectActiveScene(scenesData.scenes, snapshot);
  }, [lights, scenesData]);

  async function handleScene(key: string) {
    if (loadingScene) return;
    vibrate();
    setLoadingScene(key);
    try {
      await callAction("scene", "turn_on", `scene.${key}`);
      await new Promise<void>(r => setTimeout(r, 600));
      await mutate();
    } finally { setLoadingScene(null); }
  }

  const areas = lights && "areas" in lights ? lights.areas : [];
  const totalOn  = areas.reduce((s, a) => s + a.on_count, 0);
  const totalAll = areas.reduce((s, a) => s + a.total_count, 0);
  const { neder, over, utomhus, other } = sortByFloor(areas);

  async function handleSectionOff(key: string, list: LightArea[]) {
    if (offLoading) return;
    vibrate();
    setOffLoading(key);
    try {
      const ids = list.flatMap(a => a.lights.map(l => l.entity_id));
      if (ids.length) await callAction("light", "turn_off", ids);
      await mutate();
    } finally { setOffLoading(null); }
  }

  async function handleAllOff() {
    setOffLoading("all");
    try {
      const ids = areas.flatMap(a => a.lights.map(l => l.entity_id));
      if (ids.length) await callAction("light", "turn_off", ids);
      await mutate();
    } finally { setOffLoading(null); }
  }

  async function handleToggleArea(area: LightArea) {
    vibrate();
    await callAction("light", area.on_count > 0 ? "turn_off" : "turn_on", area.lights.map(l => l.entity_id));
    mutate();
  }
  async function handleToggleLight(light: LightEntry) {
    vibrate();
    await callAction("light", light.state === "on" ? "turn_off" : "turn_on", light.entity_id);
    mutate();
  }
  async function handleBrightness(entity_id: string, pct: number) {
    vibrate();
    await callAction("light", "turn_on", entity_id, { brightness_pct: pct });
    mutate();
  }

  const OffPill = ({ label, loading, onClick }: { label: string; loading: boolean; onClick: () => void }) => (
    <button onClick={onClick} disabled={loading}
      className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold"
      style={{ backgroundColor: "var(--color-surface-container-high)", color: "var(--color-on-surface-variant)", opacity: loading ? 0.6 : 1, transition: "opacity 0.15s" }}>
      {loading ? (
        <svg className="spin-anim" viewBox="0 0 24 24" fill="none" style={{ width: 12, height: 12 }}>
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25"/>
          <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      ) : (
        <span className="material-symbols-outlined" style={{ fontSize: 12 }}>light_off</span>
      )}
      {label}
    </button>
  );

  const renderSection = (key: string, title: string, list: LightArea[]) => {
    if (!list.length) return null;
    const sectionOn = list.reduce((s, a) => s + a.on_count, 0);
    const sectionAll = list.reduce((s, a) => s + a.total_count, 0);
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold tracking-wide" style={{ color: "var(--color-on-surface-variant)" }}>{title}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold" style={{ color: sectionOn > 0 ? "var(--color-on-surface-variant)" : "var(--color-outline)" }}>
              {sectionOn}/{sectionAll} på
            </span>
            {sectionOn > 0 && (
              <OffPill label="Släck" loading={offLoading === key} onClick={() => handleSectionOff(key, list)} />
            )}
          </div>
        </div>
        <div className="space-y-2">
          {list.map(area => (
            <RoomRow key={area.area_id} area={area}
              expanded={expandedId === area.area_id}
              onToggleExpand={() => setExpandedId(expandedId === area.area_id ? null : area.area_id)}
              onToggleArea={handleToggleArea}
              onToggleLight={handleToggleLight}
              onBrightness={handleBrightness}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {lightsError && <ErrorBanner onRetry={() => mutate()} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold" style={{ color: "var(--color-on-surface)" }}>Belysning</h1>
        <div className="flex items-center gap-2">
          {totalAll > 0 && (
            <span className="text-sm font-bold" style={{ color: totalOn > 0 ? "var(--color-on-surface-variant)" : "var(--color-outline)" }}>
              {totalOn}/{totalAll} på
            </span>
          )}
          {totalOn > 0 && (
            <OffPill label="Släck allt" loading={offLoading === "all"} onClick={handleAllOff} />
          )}
        </div>
      </div>

      {/* Scenes */}
      <div>
        <p className="text-xs font-bold tracking-wide mb-2" style={{ color: "var(--color-on-surface-variant)" }}>SCENER</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
          {SCENES.map(s => (
            <FavTile key={s.key}
              label={s.label} icon={s.icon} color={s.color}
              active={activeScene === s.key}
              loading={loadingScene === s.key}
              onClick={() => handleScene(s.key)}
            />
          ))}
        </div>
      </div>

      {/* Room list by floor */}
      {areas.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 rounded-2xl animate-pulse"
              style={{ backgroundColor: "var(--color-surface-container)" }} />
          ))}
        </div>
      ) : (
        <>
          {renderSection("neder", "NEDERVÅNING", neder)}
          {renderSection("over", "ÖVERVÅNING", over)}
          {renderSection("ute", "UTOMHUS", utomhus)}
          {other.length > 0 && renderSection("other", "ÖVRIGT", other)}
        </>
      )}
    </div>
  );
}

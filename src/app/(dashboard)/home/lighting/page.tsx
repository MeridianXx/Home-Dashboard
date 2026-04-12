"use client";

import { useState } from "react";
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
type LightsData = { areas: LightArea[] };

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then(r => r.json());

async function callAction(domain: string, service: string, entity_id: string | string[], service_data?: Record<string, unknown>) {
  await fetch("/api/homeassistant/action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ domain, service, entity_id, service_data }),
  });
}

const AMBER = "#f59e0b";

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
  return (
    <div className="flex flex-col rounded-2xl overflow-hidden"
      style={{
        backgroundColor: "var(--color-surface-container)",
        border: `1.5px solid ${on ? AMBER : "transparent"}`,
        boxShadow: on ? `inset 0 0 0 99px ${AMBER}09` : "none",
      }}>
      {/* Row header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => onToggleArea(area)} className="shrink-0">
          <span className="material-symbols-outlined"
            style={{ fontSize: 22, color: on ? AMBER : "var(--color-outline)", fontVariationSettings: on ? "'FILL' 1" : "'FILL' 0" }}>
            {on ? "light_mode" : "light_off"}
          </span>
        </button>
        <button onClick={() => onToggleArea(area)} className="flex-1 min-w-0 text-left">
          <span className="text-sm font-semibold" style={{ color: "var(--color-on-surface)" }}>{area.name}</span>
          {area.total_count > 1 ? (
            <span className="text-xs ml-2" style={{ color: on ? AMBER : "var(--color-outline)" }}>
              {area.on_count}/{area.total_count} på
            </span>
          ) : (
            <span className="text-xs ml-2" style={{ color: "var(--color-outline)" }}>
              {on ? "På" : "Av"}
            </span>
          )}
        </button>
        <button onClick={onToggleExpand} className="material-symbols-outlined shrink-0"
          style={{ fontSize: 20, color: "var(--color-on-surface-variant)", opacity: 0.45 }}>
          {expanded ? "expand_less" : "expand_more"}
        </button>
      </div>

      {/* Expanded: per-light controls */}
      {expanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-3"
          style={{ borderColor: on ? `${AMBER}33` : "var(--color-outline-variant)" }}>
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
                      defaultValue={light.brightness_pct ?? 100}
                      className="flex-1 h-1 cursor-pointer"
                      style={{ accentColor: AMBER, background: "transparent", WebkitAppearance: "none", appearance: "none" }}
                      onMouseUp={e => onBrightness(light.entity_id, parseInt((e.target as HTMLInputElement).value))}
                      onTouchEnd={e => onBrightness(light.entity_id, parseInt((e.target as HTMLInputElement).value))}
                    />
                    <span className="text-[11px] w-7 text-right shrink-0"
                      style={{ color: "var(--color-outline)" }}>{light.brightness_pct ?? 100}%</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LightingPage() {
  const { data: lights, mutate } = useSWR<LightsData>("/api/homeassistant/lights", fetcher, { refreshInterval: 2_000 });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const areas = lights && "areas" in lights ? lights.areas : [];
  const totalOn  = areas.reduce((s, a) => s + a.on_count, 0);
  const totalAll = areas.reduce((s, a) => s + a.total_count, 0);

  async function handleToggleArea(area: LightArea) {
    await callAction("light", area.on_count > 0 ? "turn_off" : "turn_on", area.lights.map(l => l.entity_id));
    mutate();
  }
  async function handleToggleLight(light: LightEntry) {
    await callAction("light", light.state === "on" ? "turn_off" : "turn_on", light.entity_id);
    mutate();
  }
  async function handleBrightness(entity_id: string, pct: number) {
    await callAction("light", "turn_on", entity_id, { brightness_pct: pct });
    mutate();
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-lg font-bold" style={{ color: "var(--color-on-surface)" }}>Alla rum</h1>
        {totalAll > 0 && (
          <span className="text-sm font-bold" style={{ color: totalOn > 0 ? AMBER : "var(--color-outline)" }}>
            {totalOn}/{totalAll} på
          </span>
        )}
      </div>

      {/* Room list */}
      {areas.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 rounded-2xl animate-pulse"
              style={{ backgroundColor: "var(--color-surface-container)" }} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {areas.map(area => (
            <RoomRow key={area.area_id} area={area}
              expanded={expandedId === area.area_id}
              onToggleExpand={() => setExpandedId(expandedId === area.area_id ? null : area.area_id)}
              onToggleArea={handleToggleArea}
              onToggleLight={handleToggleLight}
              onBrightness={handleBrightness}
            />
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { callAction } from "@/lib/actions";
import { useWarmTheme } from "@/lib/warm/theme";
import {
  ACC,
  AMBER,
  SAGE,
  SKY,
  body,
  ital,
  lab,
  num,
  serif,
  type WarmTheme,
} from "@/lib/warm/tokens";
import { HubHeader, Pill, Tile } from "@/components/warm/primitives";
import { SceneGlyph, ThemeIcon } from "@/components/warm/icons";
import {
  BoltIcon,
  BulbIcon,
  CarIcon,
  ChevronRight,
  PlugIcon,
  ThermoIcon,
} from "@/components/warm/icons/extra";
import { weatherGlyph } from "@/lib/warm/weather";
import WarmErrorBanner from "@/components/warm/WarmErrorBanner";
import { detectActiveScene, type ScenePayload } from "@/lib/scenes";
import { HUB_FAVORITE_ROOMS, SLUG_TO_NAME } from "@/lib/warm/rooms";

// ─── Types (delade med v2) ──────────────────────────────────────────────────

type LightEntry = {
  entity_id: string;
  name: string;
  state: string;
  brightness_pct: number | null;
  dimmable: boolean;
};
type LightArea = {
  area_id: string;
  name: string;
  lights: LightEntry[];
  on_count: number;
  total_count: number;
};
type SensorArea = {
  area_id: string;
  name: string;
  temperature: number;
  humidity: number | null;
};
type SensorsData = {
  areas: SensorArea[];
  outdoor_temp: number | null;
  avg_indoor: number | null;
  nibe_indoor_temp: number | null;
};
type LightsData = { areas: LightArea[] };
type Car = {
  id: string;
  name: string;
  soc: number;
  target_soc: number;
  range_km: number;
  plugged_in: boolean;
  charging: boolean;
};
type CarsData = { cars: Car[] };
type EnergyData = {
  spot_price_ore: number | null;
  spot_level: string;
  current_power_w: number;
  accumulated_kwh: number;
  accumulated_cost_sek: number;
};
type WeatherPeriod = {
  period: string;
  label: string;
  date: string;
  temperature: number;
  condition: string;
  precipitation: number;
};
type WeatherData = {
  current: { state: string; temperature: number; humidity: number; wind_speed: number };
  periods: WeatherPeriod[];
  forecast: Array<{ datetime: string; condition: string; temperature: number; templow: number }>;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "God natt";
  if (h < 11) return "God morgon";
  if (h < 14) return "God dag";
  if (h < 18) return "God eftermiddag";
  return "God kväll";
}

function formatToday() {
  return new Date().toLocaleDateString("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

const DAY_NAMES_SV = ["sön", "mån", "tis", "ons", "tor", "fre", "lör"];

// ─── Scene-mapping (HA-scener → Warm scene-id för glyph) ────────────────────

type SceneEntry = { key: string; label: string; glyph: "morgon" | "dag" | "kvall" | "natt" | "film" | "borta" };
const SCENE_ENTRIES: SceneEntry[] = [
  { key: "god_morgon", label: "Morgon", glyph: "morgon" },
  { key: "hemma", label: "Dag", glyph: "dag" },
  { key: "kvall", label: "Kväll", glyph: "kvall" },
  { key: "natt", label: "Natt", glyph: "natt" },
];

// ─── Komponenter ─────────────────────────────────────────────────────────────

function ThemeButton({ t, dark, onClick }: { t: WarmTheme; dark: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Växla tema"
      style={{
        width: 38,
        height: 38,
        borderRadius: 999,
        border: `1px solid ${t.line}`,
        background: t.paperHi,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
    >
      <ThemeIcon dark={dark} color={t.ink} size={17} />
    </button>
  );
}

function WeatherCard({ t, data }: { t: WarmTheme; data: WeatherData }) {
  const c = data.current;
  const periods = data.periods ?? [];
  const forecast = data.forecast ?? [];
  const Now = weatherGlyph(c.state);
  return (
    <Tile t={t}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: t.tintAmber,
              border: `1px solid ${t.line}`,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Now size={26} color={t.ink} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={lab(t)}>Just nu</span>
            <span
              className="warm-tab-nums"
              style={{ ...num(t, 30), lineHeight: 1 }}
            >
              {Math.round(c.temperature)}°
            </span>
          </div>
        </div>
        <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={ital(t, 13, t.ink)}>{formatToday()}</span>
          <span style={{ fontFamily: body, fontSize: 12, color: t.mute }}>
            {Math.round(c.humidity)} % luft · {Math.round(c.wind_speed)} m/s
          </span>
        </div>
      </div>

      {(periods.length > 0 || forecast.length > 0) && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 4,
            marginTop: 14,
            paddingTop: 12,
            borderTop: `1px solid ${t.line}`,
          }}
        >
          {periods.map((p, i) => {
            const Glyph = weatherGlyph(i === 0 ? c.state : p.condition);
            return (
              <div
                key={`${p.date}-${p.period}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <span style={{ ...lab(t, { fontSize: 9 }), color: t.dim }}>{p.label}</span>
                <Glyph size={18} color={t.mute} />
                <span
                  className="warm-tab-nums"
                  style={{ fontFamily: serif, fontSize: 13, color: t.ink, lineHeight: 1 }}
                >
                  {i === 0 ? Math.round(c.temperature) : p.temperature}°
                </span>
              </div>
            );
          })}
          {forecast.length > 0 && (
            <div
              style={{
                width: 1,
                background: t.line,
                opacity: 0.7,
                margin: "0 4px",
              }}
            />
          )}
          {forecast.map((f) => {
            const d = new Date(f.datetime);
            const Glyph = weatherGlyph(f.condition);
            return (
              <div
                key={f.datetime}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <span style={{ ...lab(t, { fontSize: 9 }), color: t.dim }}>{DAY_NAMES_SV[d.getDay()]}</span>
                <Glyph size={18} color={t.mute} />
                <span
                  className="warm-tab-nums"
                  style={{ fontFamily: serif, fontSize: 13, color: t.ink, lineHeight: 1 }}
                >
                  {Math.round(f.temperature)}°
                  <span style={{ color: t.dim, marginLeft: 2 }}>{Math.round(f.templow)}°</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Tile>
  );
}

function SceneRow({
  t,
  active,
  loadingKey,
  onActivate,
}: {
  t: WarmTheme;
  active: string | null;
  loadingKey: string | null;
  onActivate: (key: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={lab(t)}>Scener</span>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${SCENE_ENTRIES.length}, minmax(0, 1fr))`,
          gap: 8,
        }}
      >
        {SCENE_ENTRIES.map((s) => {
          const isActive = active === s.key;
          const isLoading = loadingKey === s.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => onActivate(s.key)}
              aria-pressed={isActive}
              style={{
                display: "inline-flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "12px 4px",
                borderRadius: 14,
                background: isActive ? ACC : t.paper,
                border: `1px solid ${isActive ? ACC : t.line}`,
                color: isActive ? "#FFFBF0" : t.ink,
                cursor: "pointer",
                transition: "background 160ms ease, color 160ms ease, border-color 160ms ease",
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              <SceneGlyph
                scene={s.glyph}
                size={18}
                color={isActive ? "#FFFBF0" : t.mute}
              />
              <span
                style={{
                  fontFamily: body,
                  fontSize: 11,
                  fontWeight: isActive ? 600 : 500,
                  letterSpacing: "0.01em",
                }}
              >
                {s.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CompactStat({
  t,
  label,
  value,
  unit,
  icon,
  tone,
}: {
  t: WarmTheme;
  label: string;
  value: string;
  unit?: string;
  icon: ReactNode;
  tone: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: tone,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span style={lab(t)}>{label}</span>
        <span
          className="warm-tab-nums"
          style={{ ...num(t, 18), lineHeight: 1.1 }}
        >
          {value}
          {unit ? (
            <span
              style={{
                fontFamily: body,
                fontSize: 11,
                color: t.mute,
                fontWeight: 500,
                marginLeft: 4,
              }}
            >
              {unit}
            </span>
          ) : null}
        </span>
      </div>
    </div>
  );
}

function EnergyCarsCard({
  t,
  energy,
  cars,
}: {
  t: WarmTheme;
  energy: EnergyData | undefined;
  cars: CarsData | undefined;
}) {
  const carList = cars && "cars" in cars ? cars.cars : [];
  return (
    <Tile t={t}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 14,
        }}
      >
        <CompactStat
          t={t}
          label="Spotpris"
          value={energy?.spot_price_ore != null ? energy.spot_price_ore.toFixed(1) : "–"}
          unit="öre"
          icon={<BoltIcon size={18} color={t.ink} />}
          tone={t.tintSky}
        />
        <CompactStat
          t={t}
          label="Effekt"
          value={energy && "current_power_w" in energy ? `${energy.current_power_w}` : "–"}
          unit="W"
          icon={<PlugIcon size={16} color={t.ink} />}
          tone={t.tintAmber}
        />
      </div>

      {carList.length > 0 && (
        <div
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTop: `1px solid ${t.line}`,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {carList.map((car) => {
            const barColor = car.charging
              ? SAGE
              : car.soc < 20
              ? "#B0452E"
              : t.mute;
            return (
              <div key={car.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <CarIcon size={16} color={car.charging ? SAGE : t.mute} />
                    <span
                      style={{
                        fontFamily: body,
                        fontSize: 13,
                        fontWeight: 600,
                        color: t.ink,
                      }}
                    >
                      {car.name}
                    </span>
                    {car.plugged_in && (
                      <span
                        style={{
                          fontFamily: body,
                          fontSize: 10,
                          fontWeight: 600,
                          color: car.charging ? SAGE : t.mute,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {car.charging ? "Laddar" : "Inkopplad"}
                      </span>
                    )}
                  </div>
                  <span
                    className="warm-tab-nums"
                    style={{ fontFamily: serif, fontSize: 16, color: t.ink }}
                  >
                    {car.soc}%
                    <span
                      style={{
                        fontFamily: body,
                        fontSize: 11,
                        color: t.mute,
                        marginLeft: 6,
                      }}
                    >
                      · {car.range_km} km
                    </span>
                  </span>
                </div>
                <div
                  style={{
                    height: 4,
                    background: t.line,
                    borderRadius: 999,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${car.soc}%`,
                      height: "100%",
                      background: barColor,
                      borderRadius: 999,
                      transition: "width 0.3s",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Tile>
  );
}

function RoomsRow({
  t,
  lights,
  sensors,
}: {
  t: WarmTheme;
  lights: LightsData | undefined;
  sensors: SensorsData | undefined;
}) {
  const rooms = useMemo(() => {
    return HUB_FAVORITE_ROOMS.map((slug) => {
      const name = SLUG_TO_NAME[slug];
      const lightArea = lights?.areas.find((a) => a.name === name);
      const sensorArea = sensors?.areas.find((a) => a.name === name);
      return { slug, name, lightArea, sensorArea };
    });
  }, [lights, sensors]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={lab(t)}>Rum</span>
        <Link
          href="/v3/home/belysning"
          style={{
            fontFamily: body,
            fontSize: 11,
            fontWeight: 600,
            color: t.mute,
            display: "inline-flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          Belysning <ChevronRight size={12} color={t.mute} />
        </Link>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {rooms.map((r) => {
          const on = (r.lightArea?.on_count ?? 0) > 0;
          const tempStr = r.sensorArea
            ? `${r.sensorArea.temperature.toFixed(1)}°`
            : "–";
          return (
            <Link
              key={r.slug}
              href={`/v3/home/rum/${r.slug}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 14,
                background: t.paper,
                border: `1px solid ${on ? ACC : t.line}`,
                cursor: "pointer",
                color: t.ink,
                transition: "border-color 160ms",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: on ? t.tint : t.tintSky,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <BulbIcon size={16} color={on ? ACC : t.mute} fill={on ? ACC : undefined} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    fontFamily: body,
                    fontSize: 14,
                    fontWeight: 600,
                    color: t.ink,
                  }}
                >
                  {r.name}
                </span>
                <span
                  style={{
                    display: "block",
                    fontFamily: body,
                    fontSize: 11,
                    color: t.mute,
                    marginTop: 1,
                  }}
                >
                  {r.lightArea
                    ? r.lightArea.total_count > 1
                      ? `${r.lightArea.on_count}/${r.lightArea.total_count} på`
                      : on
                      ? "På"
                      : "Av"
                    : "—"}
                  {r.sensorArea ? ` · ${tempStr}` : ""}
                </span>
              </div>
              <span
                className="warm-tab-nums"
                style={{
                  fontFamily: serif,
                  fontSize: 17,
                  color: t.ink,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <ThermoIcon size={14} color={t.mute} />
                {tempStr}
              </span>
              <ChevronRight size={16} color={t.dim} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WarmHomeHub() {
  const { t, dark, toggle } = useWarmTheme();
  const [sceneLoading, setSceneLoading] = useState<string | null>(null);

  const {
    data: lights,
    error: lightsError,
    mutate: mLights,
  } = useSWR<LightsData>("/api/homeassistant/lights", fetcher, { refreshInterval: 5_000 });
  const { data: scenesData } = useSWR<{ scenes: ScenePayload[] }>(
    "/api/homeassistant/scenes",
    fetcher,
    { refreshInterval: 60_000 }
  );
  const { data: sensors } = useSWR<SensorsData>("/api/homeassistant/sensors", fetcher, {
    refreshInterval: 30_000,
  });
  const { data: weather, error: weatherError } = useSWR<WeatherData>(
    "/api/homeassistant/weather",
    fetcher,
    { refreshInterval: 300_000 }
  );
  const { data: energy } = useSWR<EnergyData>("/api/homeassistant/energy", fetcher, {
    refreshInterval: 5_000,
  });
  const { data: cars } = useSWR<CarsData>("/api/homeassistant/cars", fetcher, {
    refreshInterval: 60_000,
  });

  const activeScene = useMemo(() => {
    if (!lights || !("areas" in lights) || !scenesData?.scenes) return null;
    const snapshot = lights.areas.flatMap((a) =>
      a.lights.map((l) => ({
        entity_id: l.entity_id,
        state: l.state,
        brightness_pct: l.brightness_pct,
      }))
    );
    return detectActiveScene(scenesData.scenes, snapshot);
  }, [lights, scenesData]);

  const handleScene = async (key: string) => {
    if (sceneLoading) return;
    setSceneLoading(key);
    try {
      await callAction("scene", "turn_on", `scene.${key}`);
      await new Promise((r) => setTimeout(r, 600));
      await mLights();
    } finally {
      setSceneLoading(null);
    }
  };

  return (
    <>
      <HubHeader
        t={t}
        title={`${greeting()}, Adam`}
        subtitle="Villa Björkdalen"
        right={<ThemeButton t={t} dark={dark} onClick={toggle} />}
      />

      <div
        style={{
          padding: "4px 18px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        {(lightsError || weatherError) && (
          <WarmErrorBanner
            t={t}
            message={
              lightsError ? "Kunde inte hämta belysning." : "Kunde inte hämta väder."
            }
            onRetry={() => mLights()}
          />
        )}

        {weather && "current" in weather ? (
          <WeatherCard t={t} data={weather} />
        ) : (
          <Tile t={t}>
            <span style={{ fontFamily: body, fontSize: 12, color: t.mute }}>Hämtar väder…</span>
          </Tile>
        )}

        <SceneRow
          t={t}
          active={activeScene}
          loadingKey={sceneLoading}
          onActivate={handleScene}
        />

        <EnergyCarsCard t={t} energy={energy} cars={cars} />

        <RoomsRow t={t} lights={lights} sensors={sensors} />

        <Link
          href="/v3/home/media"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            borderRadius: 14,
            background: t.paper,
            border: `1px solid ${t.line}`,
            color: t.ink,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={lab(t)}>Media</span>
            <span style={ital(t, 14, t.ink)}>Sonos · Apple TV</span>
          </div>
          <ChevronRight size={18} color={t.mute} />
        </Link>

        <div style={{ display: "flex", gap: 8 }}>
          <Pill t={t}>
            <BulbIcon size={13} color={t.mute} fill={t.mute} /> Belysning
          </Pill>
          <Pill t={t}>{Math.round(energy?.accumulated_kwh ?? 0)} kWh idag</Pill>
        </div>
      </div>
    </>
  );
}

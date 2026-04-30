"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { callAction } from "@/lib/actions";
import { useDesktop, useHydrated, useWarmTheme } from "@/lib/warm/theme";
import {
  ACC,
  body,
  ital,
  lab,
  num,
  serif,
  type WarmTheme,
} from "@/lib/warm/tokens";
import { Tile } from "@/components/warm/primitives";
import { HubDisplay, HubThemeToggle } from "@/components/warm/fit/parts";
import { SceneGlyph } from "@/components/warm/icons";
import { ChevronRight } from "@/components/warm/icons/extra";
import { weatherGlyph } from "@/lib/warm/weather";
import { haptic } from "@/lib/warm/haptics";
import SunArc from "@/components/warm/SunArc";
import WarmErrorBanner from "@/components/warm/WarmErrorBanner";
import { activeSceneByLastChanged, type ScenePayload } from "@/lib/scenes";
import { HUB_FAVORITE_ROOMS, SLUG_TO_NAME } from "@/lib/warm/rooms";
import {
  formatHubEyebrow,
  formatTime,
  lastDarkenedAt,
  moonPhaseLabel,
  sceneLabel,
  spotLabel,
  svGreeting,
} from "@/lib/warm/format";

type LightEntry = {
  entity_id: string;
  name: string;
  state: string;
  brightness_pct: number | null;
  dimmable: boolean;
  color_temp_kelvin: number | null;
  last_changed: string | null;
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
};
type WeatherPeriod = {
  period: string;
  label: string;
  date: string;
  temperature: number;
  condition: string;
  precipitation: number;
};
type SunData = {
  state: string;
  next_rising: string | null;
  next_setting: string | null;
  next_dawn: string | null;
  next_dusk: string | null;
  elevation: number | null;
  azimuth: number | null;
  rising: boolean | null;
};
type WeatherData = {
  current: { state: string; temperature: number; humidity: number; wind_speed: number };
  periods: WeatherPeriod[];
  forecast: Array<{ datetime: string; condition: string; temperature: number; templow: number }>;
  sun: SunData | null;
  moon_phase: string | null;
};

const SCENE_ENTRIES: Array<{
  key: string;
  label: string;
  glyph: "morgon" | "dag" | "kvall" | "natt";
}> = [
  { key: "god_morgon", label: "Morgon", glyph: "morgon" },
  { key: "hemma", label: "Hemma", glyph: "dag" },
  { key: "kvall", label: "Kväll", glyph: "kvall" },
  { key: "natt", label: "Natt", glyph: "natt" },
];

// ─── Header med "HEM · HH:MM" + kursivt namn ────────────────────────────────
// Använder delad HubDisplay + HubThemeToggle så header linjerar identiskt
// över Hem/Lab/Fitness/Garden. Tick-mekaniken (klocka i eyebrow) sker här
// lokalt — andra hubbar har dag-eyebrow utan minutrytm.

function HubHeading({
  dark,
  onToggle,
}: {
  t: WarmTheme;
  dark: boolean;
  onToggle: () => void;
}) {
  const [, setTick] = useState(0);
  const isDesktop = useDesktop();
  useEffect(() => {
    // Tick var 30 min — eyebrow visar dag/vecka, inga minuter att uppdatera.
    const id = window.setInterval(() => setTick((x) => x + 1), 30 * 60_000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <HubDisplay
      eyebrow={formatHubEyebrow("HEM")}
      title={`${svGreeting()},`}
      italicTail="Adam."
      right={<HubThemeToggle dark={dark} onToggle={onToggle} isDesktop={isDesktop} />}
    />
  );
}

// ─── Väderkort (klickbart → /v3/home/klimat) ────────────────────────────────

function WeatherTile({
  t,
  data,
  outdoorBt1,
}: {
  t: WarmTheme;
  data: WeatherData | undefined;
  outdoorBt1: number | null;
}) {
  if (!data || !("current" in data)) {
    return (
      <Tile t={t}>
        <span style={{ fontFamily: body, fontSize: 12, color: t.mute }}>
          Hämtar väder…
        </span>
      </Tile>
    );
  }
  const c = data.current;
  const Glyph = weatherGlyph(c.state);
  // Ute-temp: alltid Nibe BT1 om tillgänglig (verklig sensor) — annars
  // weather-entiteten som fallback.
  const displayTemp = outdoorBt1 != null ? outdoorBt1 : c.temperature;
  const conditionSv = (() => {
    const map: Record<string, string> = {
      sunny: "klart",
      "clear-night": "klart",
      partlycloudy: "halvklart",
      cloudy: "molnigt",
      fog: "dimma",
      rainy: "regn",
      pouring: "ösregn",
      snowy: "snö",
      "snowy-rainy": "snöblandat",
      hail: "hagel",
      lightning: "åska",
      "lightning-rainy": "åskregn",
      windy: "blåsigt",
      "windy-variant": "blåsigt",
      exceptional: "extremt väder",
    };
    return map[c.state] ?? c.state;
  })();
  const lowestNight = (() => {
    const upcoming = (data.forecast ?? [])
      .map((f) => f.templow)
      .filter((n) => typeof n === "number");
    if (!upcoming.length) return null;
    return Math.round(Math.min(...upcoming));
  })();
  const sun = data.sun;
  const sunrise = sun?.next_rising ? formatTime(sun.next_rising) : null;
  const sunset = sun?.next_setting ? formatTime(sun.next_setting) : null;

  return (
    <Link
      href="/v3/home/klimat"
      style={{
        display: "block",
        textDecoration: "none",
        color: t.ink,
      }}
    >
      <div
        style={{
          background: t.paper,
          border: `1px solid ${t.line}`,
          borderRadius: 16,
          padding: 16,
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ ...lab(t), letterSpacing: "0.16em" }}>
            UTOMHUS · BORÅS
          </span>
          <ChevronRight size={14} color={t.dim} />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 12,
            marginTop: 10,
          }}
        >
          <div
            style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span
                className="warm-tab-nums"
                style={{
                  ...num(t, 44, 400),
                  lineHeight: 1,
                }}
              >
                {Math.round(displayTemp)}
              </span>
              <span
                style={{
                  fontFamily: body,
                  fontSize: 14,
                  color: t.mute,
                  fontWeight: 500,
                }}
              >
                °C,
              </span>
              <span style={ital(t, 16, t.ink)}>{conditionSv}</span>
            </div>
            {lowestNight != null && (
              <p style={ital(t, 13, t.mute)}>Kallnar till {lowestNight}° i natt.</p>
            )}
          </div>
          {sun ? (
            <SunArc
              sun={sun}
              moonPhase={data.moon_phase}
              width={130}
              height={48}
              trackColor={t.line}
              arcColor={ACC}
              dotColor={ACC}
              belowColor={t.line}
            />
          ) : (
            <Glyph size={36} color={t.mute} />
          )}
        </div>
        {(sunrise || sunset) && (() => {
          // På natten: månens fas vänster, soluppgång (nästa händelse) höger.
          // På dagen: soluppg. vänster (har varit), nedg. höger (nästa).
          // Hela raden i italic Fraunces så månfas-text + sol-tider hänger
          // ihop visuellt.
          const isNight = sun?.state === "below_horizon";
          const moonText = isNight ? moonPhaseLabel(data.moon_phase) : "";
          const left = isNight
            ? moonText
            : (sunrise ? `Soluppgång ${sunrise}` : "");
          const right = isNight
            ? (sunrise ? `Soluppgång ${sunrise}` : "")
            : (sunset ? `Solnedgång ${sunset}` : "");
          const cellStyle = { ...ital(t, 11, t.dim), letterSpacing: "0.01em" } as const;
          return (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 8,
                marginTop: 10,
                paddingTop: 10,
                borderTop: `1px solid ${t.line}`,
              }}
            >
              <span style={cellStyle}>{left}</span>
              <span style={cellStyle}>{right}</span>
            </div>
          );
        })()}
      </div>
    </Link>
  );
}

// ─── Scen-rad: 4 pills + status till höger ──────────────────────────────────

function ScenesSection({
  t,
  active,
  loading,
  activeSince,
  darkSince,
  onActivate,
}: {
  t: WarmTheme;
  active: string | null;
  loading: string | null;
  activeSince: string | null;
  darkSince: string | null; // "släckt sedan HH:MM" — visas om ingen scen aktiv
  onActivate: (key: string) => void;
}) {
  const sinceLabel = active && activeSince
    ? `${sceneLabel(active)} sedan ${formatTime(activeSince)}`
    : darkSince
    ? `släckt sedan ${formatTime(darkSince)}`
    : null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <span style={lab(t)}>SCENER</span>
        {sinceLabel && (
          <span style={ital(t, 12, t.dim)}>
            {sinceLabel}
          </span>
        )}
      </div>
      {/* Pillar fyller bredden jämnt — flex:1 per pill ger bred rad utan
          stora luckor (tidigare space-between gav för mycket dödutrymme).
          Mindre ikon + tightare gap så "Morgon" får andas på 375 px-mobil. */}
      <div
        style={{
          display: "flex",
          flexWrap: "nowrap",
          gap: 6,
          overflow: "hidden",
        }}
      >
        {SCENE_ENTRIES.map((s) => {
          const isActive = active === s.key;
          const isLoading = loading === s.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => {
                void haptic("tap");
                onActivate(s.key);
              }}
              aria-pressed={isActive}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                padding: "10px 4px",
                borderRadius: 999,
                background: isActive ? ACC : t.paper,
                border: `1px solid ${isActive ? ACC : t.line}`,
                color: isActive ? "#FFFBF0" : t.ink,
                cursor: "pointer",
                opacity: isLoading ? 0.6 : 1,
                transition: "background 160ms, border-color 160ms",
                flex: "1 1 0",
                minWidth: 0,
              }}
            >
              <SceneGlyph
                scene={s.glyph}
                size={13}
                color={isActive ? "#FFFBF0" : t.mute}
              />
              <span
                style={{
                  fontFamily: body,
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 500,
                  letterSpacing: "0.01em",
                  whiteSpace: "nowrap",
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

// ─── Tibber + Bilar — två chevron-tiles bredvid varandra ────────────────────

function TibberTile({ t, energy }: { t: WarmTheme; energy: EnergyData | undefined }) {
  const watts = energy?.current_power_w ?? null;
  // > 1 kW: visa kW med en decimal, annars W heltal. Mer naturligt än
  // alltid W (ex 4521 W) eller alltid kW (ex 0.3 kW).
  const big = watts != null && watts >= 1000;
  const value = watts == null ? null : big ? (watts / 1000).toFixed(1).replace(".", ",") : `${Math.round(watts)}`;
  const unit = big ? "kW" : "W";
  return (
    <Tile
      t={t}
      style={{ padding: 14, display: "flex", flexDirection: "column", gap: 6 }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ ...lab(t), letterSpacing: "0.16em" }}>ENERGI</span>
        <ChevronRight size={12} color={t.dim} />
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 4,
          minHeight: 24,
        }}
      >
        {value != null && (
          <>
            <span
              className="warm-tab-nums"
              style={{ ...num(t, 22, 400), lineHeight: 1.1 }}
            >
              {value}
            </span>
            <span
              style={{
                fontFamily: body,
                fontSize: 11,
                color: t.mute,
                fontWeight: 500,
              }}
            >
              {unit}
            </span>
          </>
        )}
      </div>
      <span style={{ ...ital(t, 12, t.dim), minHeight: 16 }}>
        {(() => {
          const ore = energy?.spot_price_ore;
          const lvl = energy?.spot_level ? spotLabel(energy.spot_level) : "";
          // Visa "1,42 kr · hög" — pris + nivå. Faller tillbaka på bara
          // nivå om priset saknas (Tibber-data ej hämtad).
          if (ore != null) {
            const kr = (ore / 100).toFixed(2).replace(".", ",");
            return lvl ? `${kr} kr · ${lvl}` : `${kr} kr`;
          }
          return lvl;
        })()}
      </span>
    </Tile>
  );
}

function CarsTile({ t, cars }: { t: WarmTheme; cars: CarsData | undefined }) {
  const list = cars && "cars" in cars ? cars.cars : [];
  // "Skoda Enyaq" → "Enyaq" på hubben för att korta texten — full info finns
  // på /v3/home/energi.
  const cleanName = (n: string) => n.replace(/^Skoda\s+/i, "");
  return (
    <Tile
      t={t}
      style={{ padding: 14, display: "flex", flexDirection: "column", gap: 6 }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ ...lab(t), letterSpacing: "0.16em" }}>BILAR</span>
        <ChevronRight size={12} color={t.dim} />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          minHeight: 40,
          justifyContent: "center",
        }}
      >
        {list.map((car) => (
          <div
            key={car.id}
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 6,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontFamily: serif,
                fontSize: 14,
                fontWeight: 500,
                color: t.ink,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {cleanName(car.name)}
              {car.plugged_in && (
                <span
                  aria-label={car.charging ? "laddar" : "inkopplad"}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: t.ok,
                    flexShrink: 0,
                  }}
                />
              )}
            </span>
            <span
              className="warm-tab-nums"
              style={{
                fontFamily: serif,
                fontSize: 16,
                color: car.charging ? t.ok : t.ink,
                flexShrink: 0,
              }}
            >
              {car.soc}
              <span
                style={{
                  fontFamily: body,
                  fontSize: 10,
                  color: t.mute,
                  marginLeft: 1,
                  fontWeight: 500,
                }}
              >
                %
              </span>
            </span>
          </div>
        ))}
      </div>
    </Tile>
  );
}

// ─── Rum-rader — minimalistiskt ──────────────────────────────────────────────

function RoomList({
  t,
  lights,
  sensors,
  onToggleArea,
}: {
  t: WarmTheme;
  lights: LightsData | undefined;
  sensors: SensorsData | undefined;
  onToggleArea: (area: LightArea) => Promise<void> | void;
}) {
  const rooms = useMemo(
    () =>
      HUB_FAVORITE_ROOMS.map((slug) => {
        const name = SLUG_TO_NAME[slug];
        const lightArea = lights?.areas.find((a) => a.name === name);
        const sensorArea = sensors?.areas.find((a) => a.name === name);
        return { slug, name, lightArea, sensorArea };
      }),
    [lights, sensors]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <span style={lab(t)}>RUM</span>
        <Link
          href="/v3/home/belysning"
          style={{
            ...ital(t, 12, ACC),
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
          }}
        >
          all belysning
          <ChevronRight size={11} color={ACC} />
        </Link>
      </div>
      <div
        style={{
          background: t.paper,
          border: `1px solid ${t.line}`,
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        {rooms.map((r, i) => {
          const on = (r.lightArea?.on_count ?? 0) > 0;
          const avgPct = (() => {
            if (!r.lightArea) return null;
            const onLights = r.lightArea.lights.filter(
              (l) => l.state === "on" && l.brightness_pct != null
            );
            if (onLights.length === 0) return null;
            return Math.round(
              onLights.reduce((s, l) => s + (l.brightness_pct ?? 0), 0) /
                onLights.length
            );
          })();
          const subtitleParts: string[] = [];
          // Ordning: ljus-status först, temperatur sist (visar primär kontroll
          // före kontextuellt mätvärde).
          if (r.lightArea) {
            if (on) {
              subtitleParts.push(avgPct != null ? `ljus ${avgPct}%` : "ljus på");
            } else {
              subtitleParts.push("ljus av");
            }
          }
          // Köket har en felklassad sensor (60° konstant) — visa inte temp.
          const showTemp =
            r.sensorArea && r.name.toLowerCase() !== "kök" && r.name.toLowerCase() !== "köket";
          if (showTemp) {
            subtitleParts.push(`${r.sensorArea!.temperature.toFixed(1)}°`);
          }
          const subtitle = subtitleParts.join(" · ");
          return (
            <div
              key={r.slug}
              style={{
                display: "flex",
                alignItems: "center",
                borderTop: i === 0 ? "none" : `1px solid ${t.line}`,
              }}
            >
              {/* Dot-knappen — togglar rummets lampor på/av */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void haptic("tap");
                  if (r.lightArea) onToggleArea(r.lightArea);
                }}
                disabled={!r.lightArea}
                aria-label={
                  r.lightArea
                    ? on
                      ? `Släck ${r.name}`
                      : `Tänd ${r.name}`
                    : `${r.name} har inga lampor`
                }
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "12px 0 12px 16px",
                  cursor: r.lightArea ? "pointer" : "default",
                  flexShrink: 0,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: on ? ACC : "transparent",
                    border: `1.5px solid ${on ? ACC : t.dim}`,
                    transition: "background-color 160ms, border-color 160ms",
                  }}
                />
              </button>
              {/* Resten av raden = Link till rum-detalj */}
              <Link
                href={`/v3/home/rum/${r.slug}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "12px 16px 12px 14px",
                  color: t.ink,
                  textDecoration: "none",
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontFamily: serif,
                      fontSize: 16,
                      fontWeight: 500,
                      color: t.ink,
                      letterSpacing: "-0.01em",
                      lineHeight: 1.15,
                    }}
                  >
                    {r.name}
                  </p>
                  {subtitle && (
                    <p
                      style={{
                        ...ital(t, 12, t.mute),
                        marginTop: 2,
                      }}
                    >
                      {subtitle}
                    </p>
                  )}
                </div>
                <ChevronRight size={16} color={t.dim} />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WarmHomeHub() {
  const { t, dark, toggle } = useWarmTheme();
  const hydrated = useHydrated();
  const [sceneLoading, setSceneLoading] = useState<string | null>(null);

  // Skjut upp SWR tills hydration är klar — server och client första-pass
  // får då samma DOM (alla `data` är undefined). Annars klagar React på
  // hydration-mismatch eftersom in-memory SWR-cachen kan ha värden vid
  // client-mount.
  const {
    data: lights,
    error: lightsError,
    mutate: mLights,
  } = useSWR<LightsData>(hydrated ? "/api/homeassistant/lights" : null, fetcher, {
    refreshInterval: 5_000,
  });
  const { data: scenesData, mutate: mScenes } = useSWR<{ scenes: ScenePayload[] }>(
    hydrated ? "/api/homeassistant/scenes" : null,
    fetcher,
    { refreshInterval: 60_000 }
  );
  const { data: sensors } = useSWR<SensorsData>(
    hydrated ? "/api/homeassistant/sensors" : null,
    fetcher,
    { refreshInterval: 30_000 }
  );
  const { data: weather, error: weatherError } = useSWR<WeatherData>(
    hydrated ? "/api/homeassistant/weather" : null,
    fetcher,
    { refreshInterval: 300_000 }
  );
  const { data: energy } = useSWR<EnergyData>(
    hydrated ? "/api/homeassistant/energy" : null,
    fetcher,
    { refreshInterval: 5_000 }
  );
  const { data: cars } = useSWR<CarsData>(
    hydrated ? "/api/homeassistant/cars" : null,
    fetcher,
    { refreshInterval: 60_000 }
  );

  const sceneActive = useMemo(() => {
    const snapshot = lights?.areas?.flatMap((a) =>
      a.lights.map((l) => ({
        entity_id: l.entity_id,
        state: l.state,
        brightness_pct: l.brightness_pct,
      }))
    );
    return activeSceneByLastChanged(scenesData?.scenes, snapshot);
  }, [scenesData, lights]);
  const activeScene = sceneActive?.key ?? null;
  const activeSince = sceneActive?.lastChanged ?? null;

  const handleScene = async (key: string) => {
    if (sceneLoading) return;
    setSceneLoading(key);
    try {
      await callAction("scene", "turn_on", `scene.${key}`);
      await new Promise((r) => setTimeout(r, 500));
      // Refresh BÅDA — lights uppdaterar UI-status, scenes uppdaterar
      // last_changed så pillen tänds direkt efter klick.
      await Promise.all([mLights(), mScenes()]);
    } finally {
      setSceneLoading(null);
    }
  };

  const handleToggleArea = async (area: LightArea) => {
    const ids = area.lights.map((l) => l.entity_id);
    if (ids.length === 0) return;
    await callAction("light", area.on_count > 0 ? "turn_off" : "turn_on", ids);
    await new Promise((r) => setTimeout(r, 400));
    await mLights();
  };

  return (
    <>
      <HubHeading t={t} dark={dark} onToggle={toggle} />

      <div
        style={{
          padding: "0 22px 24px",
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

        <WeatherTile
          t={t}
          data={weather}
          outdoorBt1={sensors?.outdoor_temp ?? null}
        />

        <ScenesSection
          t={t}
          active={activeScene}
          loading={sceneLoading}
          activeSince={activeSince}
          darkSince={
            !activeScene && lights && "areas" in lights
              ? lastDarkenedAt(lights.areas.flatMap((a) => a.lights))
              : null
          }
          onActivate={handleScene}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          <Link
            href="/v3/home/energi"
            style={{ textDecoration: "none", color: "inherit", display: "block" }}
          >
            <TibberTile t={t} energy={energy} />
          </Link>
          <Link
            href="/v3/home/energi"
            style={{ textDecoration: "none", color: "inherit", display: "block" }}
          >
            <CarsTile t={t} cars={cars} />
          </Link>
        </div>

        <RoomList
          t={t}
          lights={lights}
          sensors={sensors}
          onToggleArea={handleToggleArea}
        />
      </div>
    </>
  );
}

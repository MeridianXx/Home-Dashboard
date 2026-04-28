"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { callAction } from "@/lib/actions";
import { useHydrated, useWarmTheme } from "@/lib/warm/theme";
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
import { SceneGlyph, ThemeIcon } from "@/components/warm/icons";
import { ChevronRight } from "@/components/warm/icons/extra";
import { weatherGlyph } from "@/lib/warm/weather";
import WarmErrorBanner from "@/components/warm/WarmErrorBanner";
import { detectActiveScene, type ScenePayload } from "@/lib/scenes";
import { HUB_FAVORITE_ROOMS, SLUG_TO_NAME } from "@/lib/warm/rooms";
import { formatTime, sceneLabel, spotLabel, svGreeting } from "@/lib/warm/format";

type LightEntry = {
  entity_id: string;
  name: string;
  state: string;
  brightness_pct: number | null;
  dimmable: boolean;
  color_temp_kelvin: number | null;
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
type WeatherData = {
  current: { state: string; temperature: number; humidity: number; wind_speed: number };
  periods: WeatherPeriod[];
  forecast: Array<{ datetime: string; condition: string; temperature: number; templow: number }>;
};

const SCENE_ENTRIES: Array<{
  key: string;
  label: string;
  glyph: "morgon" | "dag" | "kvall" | "natt";
}> = [
  { key: "god_morgon", label: "Morgon", glyph: "morgon" },
  { key: "hemma", label: "Dag", glyph: "dag" },
  { key: "kvall", label: "Kväll", glyph: "kvall" },
  { key: "natt", label: "Natt", glyph: "natt" },
];

// ─── Header med "HEM · HH:MM" + kursivt namn ────────────────────────────────

function HubHeading({
  t,
  dark,
  onToggle,
}: {
  t: WarmTheme;
  dark: boolean;
  onToggle: () => void;
}) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((x) => x + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);
  void tick;
  return (
    <header
      style={{
        padding: "20px 22px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            ...lab(t),
            color: ACC,
            letterSpacing: "0.18em",
          }}
          className="warm-tab-nums"
        >
          HEM · {formatTime(new Date())}
        </span>
        <button
          type="button"
          onClick={onToggle}
          aria-label="Växla tema"
          style={{
            width: 34,
            height: 34,
            borderRadius: 999,
            background: t.paperHi,
            border: `1px solid ${t.line}`,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <ThemeIcon dark={dark} color={t.ink} size={15} />
        </button>
      </div>
      <h1
        style={{
          ...num(t, 32, 400),
          lineHeight: 1.05,
          letterSpacing: "-0.02em",
        }}
      >
        {svGreeting()},{" "}
        <span style={{ ...ital(t, 32, t.dim), fontWeight: 400 }}>Adam.</span>
      </h1>
    </header>
  );
}

// ─── Väderkort (klickbart → /v3/home/klimat) ────────────────────────────────

function WeatherTile({ t, data }: { t: WarmTheme; data: WeatherData | undefined }) {
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
  const sunrise = "06:00";
  const sunset = "20:30";

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
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span
              className="warm-tab-nums"
              style={{
                ...num(t, 44, 400),
                lineHeight: 1,
              }}
            >
              {Math.round(c.temperature)}
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
          <Glyph size={36} color={t.mute} />
        </div>
        {lowestNight != null && (
          <p
            style={{
              ...ital(t, 13, t.mute),
              marginTop: 4,
            }}
          >
            Kallnar till {lowestNight}° i natt.
          </p>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 10,
            paddingTop: 10,
            borderTop: `1px solid ${t.line}`,
          }}
        >
          <span
            style={{ ...lab(t, { fontSize: 10 }), color: t.dim }}
            className="warm-tab-nums"
          >
            SOLUPPG. {sunrise}
          </span>
          <span
            style={{ ...lab(t, { fontSize: 10 }), color: t.dim }}
            className="warm-tab-nums"
          >
            NEDG. {sunset}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Scen-rad: 4 pills + "kvällsläge sedan HH:MM" till höger ────────────────

function ScenesSection({
  t,
  active,
  loading,
  activeSince,
  onActivate,
}: {
  t: WarmTheme;
  active: string | null;
  loading: string | null;
  activeSince: string | null;
  onActivate: (key: string) => void;
}) {
  const sinceLabel =
    active && activeSince
      ? `${sceneLabel(active)} sedan ${formatTime(activeSince)}`
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
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 8,
        }}
      >
        {SCENE_ENTRIES.map((s) => {
          const isActive = active === s.key;
          const isLoading = loading === s.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => onActivate(s.key)}
              aria-pressed={isActive}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "10px 8px",
                borderRadius: 999,
                background: isActive ? ACC : t.paper,
                border: `1px solid ${isActive ? ACC : t.line}`,
                color: isActive ? "#FFFBF0" : t.ink,
                cursor: "pointer",
                opacity: isLoading ? 0.6 : 1,
                transition: "background 160ms, border-color 160ms",
              }}
            >
              <SceneGlyph
                scene={s.glyph}
                size={14}
                color={isActive ? "#FFFBF0" : t.mute}
              />
              <span
                style={{
                  fontFamily: body,
                  fontSize: 13,
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

// ─── Tibber + Bilar — två chevron-tiles bredvid varandra ────────────────────

function TibberTile({ t, energy }: { t: WarmTheme; energy: EnergyData | undefined }) {
  const krPerKwh =
    energy?.spot_price_ore != null ? energy.spot_price_ore / 100 : null;
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
        <span style={{ ...lab(t), letterSpacing: "0.16em" }}>TIBBER · NU</span>
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
        {krPerKwh != null && (
          <>
            <span
              className="warm-tab-nums"
              style={{ ...num(t, 22, 400), lineHeight: 1.1 }}
            >
              {krPerKwh.toFixed(2).replace(".", ",")}
            </span>
            <span
              style={{
                fontFamily: body,
                fontSize: 11,
                color: t.mute,
                fontWeight: 500,
              }}
            >
              kr/kWh
            </span>
          </>
        )}
      </div>
      <span style={{ ...ital(t, 12, t.dim), minHeight: 16 }}>
        {energy?.spot_level ? spotLabel(energy.spot_level) : ""}
      </span>
    </Tile>
  );
}

function CarsTile({ t, cars }: { t: WarmTheme; cars: CarsData | undefined }) {
  const list = cars && "cars" in cars ? cars.cars : [];
  const charging = list.find((c) => c.charging);
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
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {list.map((car) => (
          <div
            key={car.id}
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontFamily: serif,
                fontSize: 15,
                fontWeight: 500,
                color: t.ink,
              }}
            >
              {car.name}
            </span>
            <span
              className="warm-tab-nums"
              style={{ fontFamily: serif, fontSize: 16, color: t.ink }}
            >
              {car.soc}
              <span
                style={{
                  fontFamily: body,
                  fontSize: 10,
                  color: t.mute,
                  marginLeft: 1,
                }}
              >
                %
              </span>
            </span>
          </div>
        ))}
      </div>
      {charging ? (
        <span style={{ ...ital(t, 12), color: ACC }}>laddar nu</span>
      ) : list.some((c) => c.plugged_in) ? (
        <span style={ital(t, 12, t.dim)}>inkopplad, ej aktiv</span>
      ) : (
        <span style={ital(t, 12, t.dim)}>ej inkopplade</span>
      )}
    </Tile>
  );
}

// ─── Rum-rader — minimalistiskt ──────────────────────────────────────────────

function RoomList({
  t,
  lights,
  sensors,
}: {
  t: WarmTheme;
  lights: LightsData | undefined;
  sensors: SensorsData | undefined;
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
        <span style={ital(t, 12, t.dim)}>tryck för att styra</span>
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
          if (r.sensorArea) {
            subtitleParts.push(`${r.sensorArea.temperature.toFixed(1)}°`);
          }
          if (r.lightArea) {
            if (on) {
              subtitleParts.push(avgPct != null ? `ljus ${avgPct}%` : "ljus på");
            } else {
              subtitleParts.push("ljus av");
            }
          }
          const subtitle = subtitleParts.join(" · ");
          return (
            <Link
              key={r.slug}
              href={`/v3/home/rum/${r.slug}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "12px 16px",
                color: t.ink,
                borderTop: i === 0 ? "none" : `1px solid ${t.line}`,
                textDecoration: "none",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: on ? ACC : "transparent",
                  border: `1.5px solid ${on ? ACC : t.dim}`,
                  flexShrink: 0,
                }}
              />
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
          );
        })}
      </div>
      <Link
        href="/v3/home/belysning"
        style={{
          alignSelf: "flex-end",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontFamily: body,
          fontStyle: "italic",
          fontSize: 13,
          color: t.mute,
          textDecoration: "none",
        }}
      >
        Alla rum & belysning
        <ChevronRight size={12} color={t.mute} />
      </Link>
    </div>
  );
}

// ─── Hook: aktiv scen från API:s last_changed ────────────────────────────────

function useActiveSceneSince(
  scenes: ScenePayload[] | undefined,
  activeKey: string | null
): string | null {
  if (!scenes || !activeKey) return null;
  return scenes.find((s) => s.key === activeKey)?.last_changed ?? null;
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
  const { data: scenesData } = useSWR<{ scenes: ScenePayload[] }>(
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

  const activeSince = useActiveSceneSince(scenesData?.scenes, activeScene);

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

        <WeatherTile t={t} data={weather} />

        <ScenesSection
          t={t}
          active={activeScene}
          loading={sceneLoading}
          activeSince={activeSince}
          onActivate={handleScene}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          <TibberTile t={t} energy={energy} />
          <CarsTile t={t} cars={cars} />
        </div>

        <RoomList t={t} lights={lights} sensors={sensors} />
      </div>
    </>
  );
}

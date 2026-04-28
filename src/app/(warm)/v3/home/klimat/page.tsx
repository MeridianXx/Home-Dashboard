"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useHydrated, useWarmTheme } from "@/lib/warm/theme";
import {
  ACC,
  SAGE,
  body,
  ital,
  lab,
  num,
  serif,
  type WarmTheme,
} from "@/lib/warm/tokens";
import { ChevronLeft, DropletIcon, ThermoIcon } from "@/components/warm/icons/extra";
import { weatherGlyph } from "@/lib/warm/weather";
import WarmErrorBanner from "@/components/warm/WarmErrorBanner";
import TempGraph from "@/components/warm/TempGraph";
import { formatTime, periodLabel } from "@/lib/warm/format";

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
  forecast: Array<{
    datetime: string;
    condition: string;
    temperature: number;
    templow: number;
  }>;
};

type HvacData = {
  heat_pump: {
    entity_id: string;
    state: string;
    current_temp: number | null;
    target_temp: number | null;
    fan_mode: string | null;
  };
  nibe: {
    outdoor_temp: number | null;
    hot_water_temp: number | null;
    fan_speed_pct: number | null;
    alarm: boolean;
    system_power_kw: number | null;
    compressor_hz: number | null;
    indoor_setpoint: number | null;
  };
};

type VacuumData = {
  state: string;
  battery_pct: number | null;
  status: string | null;
  current_room: string | null;
  cleaned_area: number | null;
  charging: boolean;
  cleaning: boolean;
};

const DAY_NAMES_SV = ["sön", "mån", "tis", "ons", "tor", "fre", "lör"];

function PageHeading({
  t,
  back,
  title,
  italicTail,
}: {
  t: WarmTheme;
  back: () => void;
  title: string;
  italicTail: string;
}) {
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => forceTick((x) => x + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <header
      style={{
        padding: "16px 22px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <button
        type="button"
        onClick={back}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontFamily: body,
          fontSize: 14,
          color: t.mute,
          cursor: "pointer",
          alignSelf: "flex-start",
        }}
      >
        <ChevronLeft size={14} color={t.mute} />
        Hem
      </button>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span
          style={{
            ...lab(t),
            color: "var(--warm-acc, #C96F4A)",
            letterSpacing: "0.18em",
          }}
          className="warm-tab-nums"
        >
          KLIMAT · {formatTime(new Date())}
        </span>
        <h1
          style={{
            ...num(t, 30, 400),
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
          }}
        >
          {title},{" "}
          <span style={{ ...ital(t, 30, t.dim) }}>{italicTail}</span>
        </h1>
      </div>
    </header>
  );
}

export default function WarmKlimatPage() {
  const router = useRouter();
  const { t } = useWarmTheme();
  const hydrated = useHydrated();
  const { data: sensors, error: sensorsError, mutate: mSensors } = useSWR<SensorsData>(
    hydrated ? "/api/homeassistant/sensors" : null,
    fetcher,
    { refreshInterval: 30_000 }
  );
  const { data: weather, error: weatherError } = useSWR<WeatherData>(
    hydrated ? "/api/homeassistant/weather" : null,
    fetcher,
    { refreshInterval: 300_000 }
  );
  const { data: hvac } = useSWR<HvacData>(
    hydrated ? "/api/homeassistant/hvac" : null,
    fetcher,
    { refreshInterval: 15_000 }
  );
  const { data: vacuum } = useSWR<VacuumData>(
    hydrated ? "/api/homeassistant/vacuum" : null,
    fetcher,
    { refreshInterval: 10_000 }
  );

  const conditionSv = (state: string | undefined) => {
    if (!state) return "—";
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
    return map[state] ?? state;
  };

  const current = weather && "current" in weather ? weather.current : null;
  const Glyph = current ? weatherGlyph(current.state) : null;

  return (
    <>
      <PageHeading
        t={t}
        back={() => router.push("/v3/home")}
        title="Utomhus"
        italicTail={`${conditionSv(current?.state)}.`}
      />

      <div
        style={{
          padding: "0 22px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        {(sensorsError || weatherError) && (
          <WarmErrorBanner t={t} onRetry={() => mSensors()} />
        )}

        {/* Stora utomhus-tile */}
        {current && Glyph ? (
          <div
            style={{
              background: t.paper,
              border: `1px solid ${t.line}`,
              borderRadius: 16,
              padding: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span
                  className="warm-tab-nums"
                  style={{ ...num(t, 56, 400), lineHeight: 1 }}
                >
                  {Math.round(current.temperature)}
                </span>
                <span
                  style={{
                    fontFamily: body,
                    fontSize: 16,
                    color: t.mute,
                    fontWeight: 500,
                  }}
                >
                  °C
                </span>
              </div>
              <Glyph size={48} color={t.mute} />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 12,
                marginTop: 14,
                paddingTop: 12,
                borderTop: `1px solid ${t.line}`,
              }}
            >
              <ClimateStat
                t={t}
                label="LUFTFUKT"
                value={`${Math.round(current.humidity)}`}
                unit="%"
              />
              <ClimateStat
                t={t}
                label="VIND"
                value={`${Math.round(current.wind_speed)}`}
                unit="m/s"
              />
              <ClimateStat
                t={t}
                label="VILLA"
                value={
                  sensors?.outdoor_temp != null
                    ? sensors.outdoor_temp.toFixed(1)
                    : "—"
                }
                unit="°"
              />
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: 18,
              borderRadius: 16,
              background: t.paper,
              border: `1px solid ${t.line}`,
            }}
          >
            <span style={{ fontFamily: body, fontSize: 12, color: t.mute }}>
              Hämtar väder…
            </span>
          </div>
        )}

        {/* Periodprognos */}
        {weather && weather.periods?.length > 0 && (
          <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={lab(t)}>KOMMANDE PERIODER</span>
            <div
              style={{
                background: t.paper,
                border: `1px solid ${t.line}`,
                borderRadius: 14,
                padding: 12,
                display: "grid",
                gridTemplateColumns: `repeat(${weather.periods.length}, minmax(0, 1fr))`,
                gap: 4,
              }}
            >
              {weather.periods.map((p, i) => {
                const G = weatherGlyph(i === 0 && current ? current.state : p.condition);
                return (
                  <div
                    key={`${p.date}-${p.period}`}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span
                      style={{ ...lab(t, { fontSize: 9 }), color: t.dim }}
                    >
                      {periodLabel(p.period)}
                    </span>
                    <G size={20} color={t.mute} />
                    <span
                      className="warm-tab-nums"
                      style={{
                        fontFamily: serif,
                        fontSize: 15,
                        color: t.ink,
                      }}
                    >
                      {i === 0 && current
                        ? Math.round(current.temperature)
                        : p.temperature}
                      °
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Dagsprognos */}
        {weather && weather.forecast?.length > 0 && (
          <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={lab(t)}>KOMMANDE DAGAR</span>
            <div
              style={{
                background: t.paper,
                border: `1px solid ${t.line}`,
                borderRadius: 14,
                overflow: "hidden",
              }}
            >
              {weather.forecast.map((f, i) => {
                const d = new Date(f.datetime);
                const G = weatherGlyph(f.condition);
                return (
                  <div
                    key={f.datetime}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto auto",
                      alignItems: "center",
                      gap: 14,
                      padding: "12px 16px",
                      borderTop: i === 0 ? "none" : `1px solid ${t.line}`,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: serif,
                        fontSize: 16,
                        fontWeight: 500,
                        color: t.ink,
                        textTransform: "capitalize",
                      }}
                    >
                      {DAY_NAMES_SV[d.getDay()]}.
                    </span>
                    <G size={20} color={t.mute} />
                    <span
                      className="warm-tab-nums"
                      style={{
                        fontFamily: serif,
                        fontSize: 16,
                        color: t.ink,
                      }}
                    >
                      {Math.round(f.temperature)}°
                      <span style={{ color: t.dim, marginLeft: 6 }}>
                        {Math.round(f.templow)}°
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Inomhus per rum */}
        {sensors && "areas" in sensors && sensors.areas.length > 0 && (
          <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={lab(t)}>INOMHUS</span>
            <div
              style={{
                background: t.paper,
                border: `1px solid ${t.line}`,
                borderRadius: 14,
                overflow: "hidden",
              }}
            >
              {sensors.areas.map((a, i) => (
                <div
                  key={a.area_id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto",
                    alignItems: "center",
                    gap: 14,
                    padding: "12px 16px",
                    borderTop: i === 0 ? "none" : `1px solid ${t.line}`,
                  }}
                >
                  <span
                    style={{
                      fontFamily: serif,
                      fontSize: 16,
                      fontWeight: 500,
                      color: t.ink,
                    }}
                  >
                    {a.name}
                  </span>
                  {a.humidity != null ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontFamily: body,
                        fontSize: 12,
                        color: t.mute,
                      }}
                    >
                      <DropletIcon size={12} color={t.mute} />
                      <span className="warm-tab-nums">
                        {Math.round(a.humidity)}%
                      </span>
                    </span>
                  ) : (
                    <span />
                  )}
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <ThermoIcon size={14} color={t.mute} />
                    <span
                      className="warm-tab-nums"
                      style={{
                        fontFamily: serif,
                        fontSize: 16,
                        color: t.ink,
                      }}
                    >
                      {a.temperature.toFixed(1)}°
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Temp-graf 24h */}
        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={lab(t)}>SENASTE 24 TIMMAR</span>
          <TempGraph t={t} hours={24} height={140} />
        </section>

        {/* Värmepumpar */}
        {hvac && "heat_pump" in hvac && (
          <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={lab(t)}>VÄRMEPUMPAR</span>
            <div
              style={{
                background: t.paper,
                border: `1px solid ${t.line}`,
                borderRadius: 14,
                overflow: "hidden",
              }}
            >
              {/* NIBE S735 */}
              <div
                style={{
                  padding: "14px 16px",
                  borderBottom: `1px solid ${t.line}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      fontFamily: serif,
                      fontSize: 16,
                      fontWeight: 500,
                      color: t.ink,
                    }}
                  >
                    Nibe S735
                  </span>
                  <span style={ital(t, 12, hvac.nibe.alarm ? "#B0452E" : t.mute)}>
                    {hvac.nibe.alarm
                      ? "larm"
                      : hvac.nibe.compressor_hz != null && hvac.nibe.compressor_hz > 0
                      ? "kompressor aktiv"
                      : "i viloläge"}
                  </span>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: 12,
                    marginTop: 10,
                  }}
                >
                  {hvac.nibe.indoor_setpoint != null && (
                    <ClimateStat
                      t={t}
                      label="BÖRVÄRDE"
                      value={`${hvac.nibe.indoor_setpoint}`}
                      unit="°"
                    />
                  )}
                  {hvac.nibe.hot_water_temp != null && (
                    <ClimateStat
                      t={t}
                      label="VARMVATTEN"
                      value={`${hvac.nibe.hot_water_temp}`}
                      unit="°"
                    />
                  )}
                  {hvac.nibe.fan_speed_pct != null && (
                    <ClimateStat
                      t={t}
                      label="FLÄKT"
                      value={`${hvac.nibe.fan_speed_pct}`}
                      unit="%"
                    />
                  )}
                  {hvac.nibe.compressor_hz != null && (
                    <ClimateStat
                      t={t}
                      label="KOMPR."
                      value={`${hvac.nibe.compressor_hz}`}
                      unit="Hz"
                    />
                  )}
                  {hvac.nibe.system_power_kw != null && (
                    <ClimateStat
                      t={t}
                      label="EFFEKT"
                      value={hvac.nibe.system_power_kw.toFixed(1)}
                      unit="kW"
                    />
                  )}
                </div>
              </div>
              {/* Hero / luftvärmepump */}
              <div style={{ padding: "14px 16px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      fontFamily: serif,
                      fontSize: 16,
                      fontWeight: 500,
                      color: t.ink,
                    }}
                  >
                    Mitsubishi Hero
                  </span>
                  <span style={ital(t, 12, t.mute)}>
                    {hvac.heat_pump.state === "off"
                      ? "av"
                      : hvac.heat_pump.state === "cool"
                      ? "kyler"
                      : hvac.heat_pump.state === "heat"
                      ? "värmer"
                      : hvac.heat_pump.state}
                  </span>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: 12,
                    marginTop: 10,
                  }}
                >
                  {hvac.heat_pump.current_temp != null && (
                    <ClimateStat
                      t={t}
                      label="RUMSTEMP"
                      value={hvac.heat_pump.current_temp.toFixed(1)}
                      unit="°"
                    />
                  )}
                  {hvac.heat_pump.target_temp != null && (
                    <ClimateStat
                      t={t}
                      label="MÅL"
                      value={`${hvac.heat_pump.target_temp}`}
                      unit="°"
                    />
                  )}
                  {hvac.heat_pump.fan_mode && (
                    <ClimateStat
                      t={t}
                      label="FLÄKT"
                      value={hvac.heat_pump.fan_mode}
                      unit=""
                    />
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Dammsugare-strip */}
        {vacuum && "state" in vacuum && (
          <section
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 16px",
              borderRadius: 14,
              background: t.paper,
              border: `1px solid ${
                vacuum.cleaning ? ACC : vacuum.charging ? SAGE : t.line
              }`,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: vacuum.cleaning
                  ? t.tint
                  : vacuum.charging
                  ? t.tintSage
                  : t.tintSky,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle
                  cx="12"
                  cy="12"
                  r="8"
                  stroke={
                    vacuum.cleaning ? ACC : vacuum.charging ? SAGE : t.mute
                  }
                  strokeWidth={1.6}
                />
                <circle
                  cx="12"
                  cy="12"
                  r="3.5"
                  fill={vacuum.cleaning ? ACC : vacuum.charging ? SAGE : t.mute}
                />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontFamily: serif,
                  fontSize: 15,
                  fontWeight: 500,
                  color: t.ink,
                  letterSpacing: "-0.01em",
                  lineHeight: 1.1,
                }}
              >
                Dammsugare
              </p>
              <p style={ital(t, 12, t.mute)}>
                {vacuum.cleaning
                  ? vacuum.current_room
                    ? `städar · ${vacuum.current_room}`
                    : "städar"
                  : vacuum.charging
                  ? "laddar"
                  : vacuum.state === "docked"
                  ? "dockad"
                  : vacuum.state === "idle"
                  ? "vilar"
                  : vacuum.state}
                {vacuum.cleaned_area != null && vacuum.cleaning
                  ? ` · ${vacuum.cleaned_area.toFixed(0)} m²`
                  : ""}
              </p>
            </div>
            {vacuum.battery_pct != null && (
              <span
                className="warm-tab-nums"
                style={{
                  fontFamily: serif,
                  fontSize: 17,
                  color: vacuum.battery_pct < 25 ? "#B0452E" : t.ink,
                }}
              >
                {vacuum.battery_pct}
                <span
                  style={{
                    fontFamily: body,
                    fontSize: 11,
                    color: t.mute,
                    marginLeft: 1,
                    fontWeight: 500,
                  }}
                >
                  %
                </span>
              </span>
            )}
          </section>
        )}
      </div>
    </>
  );
}

function ClimateStat({
  t,
  label,
  value,
  unit,
}: {
  t: WarmTheme;
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ ...lab(t, { fontSize: 9 }), color: t.dim }}>{label}</span>
      <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
        <span
          className="warm-tab-nums"
          style={{ ...num(t, 18, 400), lineHeight: 1.1 }}
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
      </div>
    </div>
  );
}

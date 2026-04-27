"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useWarmTheme } from "@/lib/warm/theme";
import {
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
  const { data: sensors, error: sensorsError, mutate: mSensors } = useSWR<SensorsData>(
    "/api/homeassistant/sensors",
    fetcher,
    { refreshInterval: 30_000 }
  );
  const { data: weather, error: weatherError } = useSWR<WeatherData>(
    "/api/homeassistant/weather",
    fetcher,
    { refreshInterval: 300_000 }
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

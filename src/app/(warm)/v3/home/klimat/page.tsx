"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { callAction } from "@/lib/actions";
import { useHydrated, useWarmTheme } from "@/lib/warm/theme";
import WarmSwitch from "@/components/warm/Switch";
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
import WarmPress from "@/components/warm/WarmPress";
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
    hvac_modes: string[] | null;
    fan_mode: string | null;
    fan_modes: string[] | null;
  };
  nibe: {
    outdoor_temp: number | null;
    hot_water_temp: number | null;
    fan_speed_pct: number | null;
    alarm: boolean;
    kaminlage: boolean;
    nattsvalka: boolean;
    system_power_kw: number | null;
    compressor_hz: number | null;
    heater_kw: number | null;
    hot_water_boost: string;
    hot_water_boost_options: string[];
    indoor_setpoint: number | null;
  };
};

// Generisk sensorrad — används av RoomTempList för att kunna
// prependa syntetiska rader (BT50 / BT1) utan att förorena SensorArea.
type SensorRow = {
  key: string;
  label: string;
  temperature: number;
  humidity: number | null;
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

type SolkylaData = {
  solar_gain_score: number | null;
  master_enabled: boolean;
  ac: {
    state: string;
    hvac_mode: string;
    current_temp: number | null;
    target_temp: number | null;
    fan_mode: string | null;
  };
  room_temp: number | null;
  context: {
    bedroom_temp: number | null;
    clouds_used: number | null;
    nibe_indoor_temp: number | null;
    outdoor_temp: number | null;
    sun_elevation: number | null;
  };
  automations: Array<{
    name: string;
    entity_id: string;
    enabled: boolean;
    last_triggered: string | null;
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
  const { data: hvac, mutate: mHvac } = useSWR<HvacData>(
    hydrated ? "/api/homeassistant/hvac" : null,
    fetcher,
    { refreshInterval: 15_000 }
  );
  const { data: vacuum, mutate: mVacuum } = useSWR<VacuumData>(
    hydrated ? "/api/homeassistant/vacuum" : null,
    fetcher,
    { refreshInterval: 10_000 }
  );
  const { data: solkyla, mutate: mSolkyla } = useSWR<SolkylaData>(
    hydrated ? "/api/homeassistant/solkyla" : null,
    fetcher,
    { refreshInterval: 15_000 }
  );

  // Action-handlers (alla anropar /api/homeassistant/action — orörda routes)
  const refresh = (m: () => void, ms = 700) => () => setTimeout(m, ms);
  const handleNibeBoost = async () => {
    await callAction(
      "select",
      "select_option",
      "select.villa_bjorkdalen_more_hot_water",
      { option: "One-time incr." }
    );
    refresh(mHvac)();
  };
  const handleNibeNattsvalka = async (on: boolean) => {
    await callAction(
      "switch",
      on ? "turn_off" : "turn_on",
      "switch.nibe_nattsvalka"
    );
    refresh(mHvac)();
  };
  const handleNibeKaminlage = async (on: boolean) => {
    await callAction(
      "switch",
      on ? "turn_off" : "turn_on",
      "switch.nibe_kaminlage"
    );
    refresh(mHvac)();
  };
  const handleHeroMode = async (mode: string, currentlyActive: boolean) => {
    if (!hvac?.heat_pump.entity_id) return;
    await callAction(
      "climate",
      currentlyActive ? "turn_off" : "set_hvac_mode",
      hvac.heat_pump.entity_id,
      currentlyActive ? undefined : { hvac_mode: mode }
    );
    refresh(mHvac)();
  };
  const handleHeroTemp = async (temp: number) => {
    if (!hvac?.heat_pump.entity_id) return;
    await callAction(
      "climate",
      "set_temperature",
      hvac.heat_pump.entity_id,
      { temperature: temp }
    );
    refresh(mHvac)();
  };
  const handleHeroFan = async (mode: string) => {
    if (!hvac?.heat_pump.entity_id) return;
    await callAction(
      "climate",
      "set_fan_mode",
      hvac.heat_pump.entity_id,
      { fan_mode: mode }
    );
    refresh(mHvac)();
  };
  const handleSolkylaToggle = async () => {
    if (!solkyla) return;
    await callAction(
      "input_boolean",
      solkyla.master_enabled ? "turn_off" : "turn_on",
      "input_boolean.solkyla_automation"
    );
    refresh(mSolkyla)();
  };
  const handleVacuumAction = async (
    domain: string,
    service: string,
    entity_id: string
  ) => {
    await callAction(domain, service, entity_id);
    refresh(mVacuum)();
  };

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
                  {sensors?.outdoor_temp != null
                    ? sensors.outdoor_temp.toFixed(1)
                    : Math.round(current.temperature)}
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
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
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

        {/* Inomhus + utomhus per rum */}
        {sensors && "areas" in sensors && (() => {
          // Kök filtreras bort — sensor.kok_jalusi är felklassad som
          // device_class: temperature i HA och rapporterar 60° konstant.
          const isKitchen = (n: string) => {
            const l = n.toLowerCase();
            return l === "kök" || l === "köket";
          };
          const isGreenhouse = (n: string) => {
            const l = n.toLowerCase();
            return l.includes("växthus") || l.includes("vaxthus");
          };

          // Önskad ordning för inomhusrum
          const INDOOR_ORDER = ["Vardagsrum", "Sovrum", "Allrum"];

          const indoorAreas = sensors.areas
            .filter((a) => !isKitchen(a.name) && !isGreenhouse(a.name))
            .sort((a, b) => {
              const ai = INDOOR_ORDER.indexOf(a.name);
              const bi = INDOOR_ORDER.indexOf(b.name);
              if (ai !== -1 && bi !== -1) return ai - bi;
              if (ai !== -1) return -1;
              if (bi !== -1) return 1;
              return a.name.localeCompare(b.name, "sv");
            });

          const greens = sensors.areas.filter((a) => isGreenhouse(a.name));

          // INOMHUS: BT50 överst, sedan rum i specificerad ordning
          const indoorRows: SensorRow[] = [
            ...(sensors.nibe_indoor_temp != null
              ? [{ key: "nibe-bt50", label: "Inomhustemperatur", temperature: sensors.nibe_indoor_temp, humidity: null }]
              : []),
            ...indoorAreas.map((a) => ({
              key: a.area_id,
              label: a.name,
              temperature: a.temperature,
              humidity: a.humidity,
            })),
          ];

          // UTOMHUS: BT1 överst, sedan Växthus
          const nibeOutdoor = hvac?.nibe?.outdoor_temp ?? null;
          const outdoorRows: SensorRow[] = [
            ...(nibeOutdoor != null
              ? [{ key: "nibe-bt1", label: "Utomhustemperatur", temperature: nibeOutdoor, humidity: null }]
              : []),
            ...greens.map((a) => ({
              key: a.area_id,
              label: a.name,
              temperature: a.temperature,
              humidity: a.humidity,
            })),
          ];

          return (
            <>
              {indoorRows.length > 0 && (
                <RoomTempList t={t} title="INOMHUS" rows={indoorRows} />
              )}
              {outdoorRows.length > 0 && (
                <RoomTempList t={t} title="UTOMHUS" rows={outdoorRows} />
              )}
            </>
          );
        })()}

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
                  {hvac.nibe.heater_kw != null && (
                    <ClimateStat
                      t={t}
                      label="ELPATRON"
                      value={hvac.nibe.heater_kw.toFixed(1)}
                      unit="kW"
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
                {/* Toggle-pillar för Nibe — varmvattenboost / nattsvalka / kaminläge */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    marginTop: 14,
                  }}
                >
                  <NibePill
                    t={t}
                    label="Boost VV"
                    active={hvac.nibe.hot_water_boost !== "Off"}
                    onClick={handleNibeBoost}
                    note={
                      hvac.nibe.hot_water_boost !== "Off"
                        ? hvac.nibe.hot_water_boost
                        : null
                    }
                  />
                  <NibePill
                    t={t}
                    label="Nattsvalka"
                    active={hvac.nibe.nattsvalka}
                    onClick={() => handleNibeNattsvalka(hvac.nibe.nattsvalka)}
                  />
                  <NibePill
                    t={t}
                    label="Kaminläge"
                    active={hvac.nibe.kaminlage}
                    onClick={() => handleNibeKaminlage(hvac.nibe.kaminlage)}
                  />
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
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
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
                </div>

                {/* Hero-läge: Kyla / Värme / Av */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: 6,
                    marginTop: 14,
                  }}
                >
                  {(["cool", "heat", "off"] as const).map((mode) => {
                    const labels: Record<typeof mode, string> = {
                      cool: "Kyla",
                      heat: "Värme",
                      off: "Av",
                    };
                    const active = hvac.heat_pump.state === mode;
                    return (
                      <WarmPress
                        key={mode}
                        onClick={() => handleHeroMode(mode, active)}
                        ariaPressed={active}
                        spinnerColor={active ? "#FFFBF0" : ACC}
                        style={{
                          padding: "8px 6px",
                          borderRadius: 999,
                          background: active ? ACC : t.paperHi,
                          border: `1px solid ${active ? ACC : t.line}`,
                          color: active ? "#FFFBF0" : t.ink,
                          fontFamily: body,
                          fontSize: 12,
                          fontWeight: active ? 600 : 500,
                          transition: "background 160ms",
                        }}
                      >
                        {labels[mode]}
                      </WarmPress>
                    );
                  })}
                </div>

                {/* Temperatur-slider — bara om läget är aktivt */}
                {hvac.heat_pump.state !== "off" && hvac.heat_pump.target_temp != null && (
                  <HeroTempSlider
                    t={t}
                    value={hvac.heat_pump.target_temp}
                    onSet={handleHeroTemp}
                  />
                )}

                {/* Fläktstyrka — synlig när AC är på */}
                {hvac.heat_pump.state !== "off" &&
                  hvac.heat_pump.fan_modes &&
                  hvac.heat_pump.fan_modes.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        marginTop: 12,
                      }}
                    >
                      <span
                        style={{
                          ...lab(t, { fontSize: 9 }),
                          color: t.dim,
                        }}
                      >
                        FLÄKTSTYRKA
                      </span>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: `repeat(${hvac.heat_pump.fan_modes.length}, minmax(0, 1fr))`,
                          gap: 4,
                        }}
                      >
                        {hvac.heat_pump.fan_modes.map((m) => {
                          const active = hvac.heat_pump.fan_mode === m;
                          const label = m === "auto" ? "Auto" : m;
                          return (
                            <WarmPress
                              key={m}
                              onClick={() => handleHeroFan(m)}
                              ariaPressed={active}
                              spinnerColor={active ? "#FFFBF0" : ACC}
                              style={{
                                padding: "6px 0",
                                borderRadius: 999,
                                background: active ? ACC : t.paperHi,
                                border: `1px solid ${active ? ACC : t.line}`,
                                color: active ? "#FFFBF0" : t.ink,
                                fontFamily: body,
                                fontSize: 11,
                                fontWeight: active ? 600 : 500,
                                transition: "background 160ms",
                              }}
                            >
                              {label}
                            </WarmPress>
                          );
                        })}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </section>
        )}

        {/* Solkyla */}
        {solkyla && "master_enabled" in solkyla && (
          <SolkylaCard
            t={t}
            data={solkyla}
            onToggle={handleSolkylaToggle}
          />
        )}

        {/* Dammsugare */}
        {vacuum && "state" in vacuum && (
          <VacuumCard t={t} data={vacuum} onAction={handleVacuumAction} />
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

// ─── Delad rum-temp-lista (INOMHUS / UTOMHUS) ───────────────────────────────

function RoomTempList({
  t,
  title,
  rows,
}: {
  t: WarmTheme;
  title: string;
  rows: SensorRow[];
}) {
  if (rows.length === 0) return null;
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={lab(t)}>{title}</span>
      <div
        style={{
          background: t.paper,
          border: `1px solid ${t.line}`,
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        {rows.map((r, i) => (
          <div
            key={r.key}
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
              {r.label}
            </span>
            {r.humidity != null ? (
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
                  {Math.round(r.humidity)}%
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
                {r.temperature.toFixed(1)}°
              </span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── NibePill: kompakt knapp med ACC-fyllning vid active ────────────────────

function NibePill({
  t,
  label,
  active,
  onClick,
  note,
}: {
  t: WarmTheme;
  label: string;
  active: boolean;
  onClick: () => void | Promise<void>;
  note?: string | null;
}) {
  return (
    <WarmPress
      onClick={onClick}
      ariaPressed={active}
      spinnerColor={active ? "#FFFBF0" : ACC}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "7px 12px",
        borderRadius: 999,
        background: active ? ACC : t.paperHi,
        border: `1px solid ${active ? ACC : t.line}`,
        color: active ? "#FFFBF0" : t.ink,
        fontFamily: body,
        fontSize: 12,
        fontWeight: active ? 600 : 500,
        transition: "background 160ms",
      }}
    >
      <span>{label}</span>
      {note && (
        <span
          style={{
            fontFamily: body,
            fontStyle: "italic",
            fontSize: 11,
            opacity: 0.85,
          }}
        >
          · {note}
        </span>
      )}
    </WarmPress>
  );
}

// ─── Hero temp-slider ────────────────────────────────────────────────────────

function HeroTempSlider({
  t,
  value,
  onSet,
}: {
  t: WarmTheme;
  value: number;
  onSet: (v: number) => void;
}) {
  const [live, setLive] = useState<number | null>(null);
  const display = live ?? value;
  const fillPct = ((display - 16) / (30 - 16)) * 100;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginTop: 12,
      }}
    >
      <span
        className="warm-tab-nums"
        style={{ fontFamily: body, fontSize: 11, color: t.dim, minWidth: 22 }}
      >
        16°
      </span>
      <input
        type="range"
        min={16}
        max={30}
        step={0.5}
        aria-label="Mål-temperatur"
        key={value}
        defaultValue={value}
        style={
          {
            flex: 1,
            "--fill": `${fillPct.toFixed(1)}%`,
          } as React.CSSProperties
        }
        onInput={(e) => {
          const el = e.currentTarget;
          const v = parseFloat(el.value);
          el.style.setProperty(
            "--fill",
            `${(((v - 16) / (30 - 16)) * 100).toFixed(1)}%`
          );
          setLive(v);
        }}
        onMouseUp={(e) => onSet(parseFloat((e.target as HTMLInputElement).value))}
        onTouchEnd={(e) => onSet(parseFloat((e.target as HTMLInputElement).value))}
      />
      <span
        className="warm-tab-nums"
        style={{
          fontFamily: serif,
          fontSize: 15,
          color: t.ink,
          minWidth: 44,
          textAlign: "right",
        }}
      >
        {display}°
      </span>
    </div>
  );
}

// ─── Solkyla-kort ────────────────────────────────────────────────────────────

const SOLKYLA_AC_LABELS: Record<string, string> = {
  off: "av",
  cool: "kyla",
  dry: "torr",
  fan_only: "fläkt",
  heat: "värme",
  heat_cool: "auto",
};

function SolkylaCard({
  t,
  data,
  onToggle,
}: {
  t: WarmTheme;
  data: SolkylaData;
  onToggle: () => void;
}) {
  const score = data.solar_gain_score;
  const acOn = data.ac.state !== "off";
  const acMode = SOLKYLA_AC_LABELS[data.ac.hvac_mode] ?? data.ac.hvac_mode;
  const lastTriggered = data.automations
    .map((a) => a.last_triggered)
    .filter((x): x is string => x != null)
    .sort()
    .pop();
  const triggeredLabel = lastTriggered
    ? (() => {
        const diffMs = Date.now() - new Date(lastTriggered).getTime();
        if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)} min sedan`;
        if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)} h sedan`;
        return new Date(lastTriggered).toLocaleDateString("sv-SE", {
          day: "numeric",
          month: "short",
        });
      })()
    : null;

  const ctxParts: string[] = [];
  if (data.room_temp != null) ctxParts.push(`${data.room_temp.toFixed(1)}° inne`);
  if (data.context.outdoor_temp != null)
    ctxParts.push(`${Math.round(data.context.outdoor_temp)}° ute`);
  if (data.context.clouds_used != null)
    ctxParts.push(`${Math.round(data.context.clouds_used)}% moln`);
  if (data.context.sun_elevation != null && data.context.sun_elevation > 0)
    ctxParts.push(`elev ${data.context.sun_elevation.toFixed(1)}°`);

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={lab(t)}>SOLKYLA</span>
      <div
        style={{
          background: t.paper,
          border: `1px solid ${t.line}`,
          borderRadius: 14,
          padding: "14px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span
              className="warm-tab-nums"
              style={{ ...num(t, 22, 400), lineHeight: 1.1 }}
            >
              {score != null ? score : "—"}
              <span
                style={{
                  fontFamily: body,
                  fontSize: 11,
                  color: t.mute,
                  fontWeight: 500,
                  marginLeft: 2,
                }}
              >
                %
              </span>
            </span>
            {acOn && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "3px 9px",
                  borderRadius: 999,
                  background: t.tintSky,
                  color: t.ink,
                  fontFamily: body,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {acMode}
                {data.ac.target_temp != null ? ` ${data.ac.target_temp}°` : ""}
              </span>
            )}
          </div>
          <WarmSwitch
            on={data.master_enabled}
            onChange={onToggle}
            t={t}
            ariaLabel="Solkyla-automation"
          />
        </div>
        {ctxParts.length > 0 && (
          <span style={ital(t, 12, t.mute)}>{ctxParts.join(" · ")}</span>
        )}
        {triggeredLabel && (
          <span style={ital(t, 11, t.dim)}>
            senast triggad {triggeredLabel}
          </span>
        )}
      </div>
    </section>
  );
}

// ─── Dammsugare-kort med v2:s kontroller ─────────────────────────────────────

function VacuumCard({
  t,
  data,
  onAction,
}: {
  t: WarmTheme;
  data: VacuumData;
  onAction: (domain: string, service: string, entity_id: string) => Promise<void>;
}) {
  // Använd samma neutrala border som övriga kort. Status (cleaning/charging)
  // signaleras subtilt via ikon-tinten + ital "laddar"/"städar"-texten.
  const accentBg = data.cleaning
    ? t.tint
    : data.charging
    ? t.tintSage
    : t.tintSky;

  const StatusLabel = data.cleaning
    ? data.current_room
      ? `städar · ${data.current_room}`
      : "städar"
    : data.charging
    ? "laddar"
    : data.state === "docked"
    ? "dockad"
    : data.state === "idle"
    ? "vilar"
    : data.state;

  // Två primär-actions (Starta / Docka) följt av fyra program-knappar.
  // Samma entity_id:n som v2:s VacuumCard.
  const primaryActions: Array<{ label: string; action: () => Promise<void> }> = [
    {
      label: "Starta",
      action: () => onAction("vacuum", "start", "vacuum.chomper"),
    },
    {
      label: "Docka",
      action: () => onAction("vacuum", "return_to_base", "vacuum.chomper"),
    },
  ];
  const programActions: Array<{ label: string; action: () => Promise<void> }> = [
    {
      label: "Kök & hall",
      action: () =>
        onAction("button", "press", "button.dammsugare_snabb_kok_hall"),
    },
    {
      label: "Djup",
      action: () => onAction("button", "press", "button.dammsugare_djup"),
    },
    {
      label: "Efter maten",
      action: () => onAction("button", "press", "button.chomper_after_meals"),
    },
    {
      label: "Damm + mopp",
      action: () =>
        onAction("button", "press", "button.chomper_vac_followed_by_mop"),
    },
  ];

  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <span style={lab(t)}>DAMMSUGARE</span>
      <div
        style={{
          background: t.paper,
          border: `1px solid ${t.line}`,
          borderRadius: 14,
          padding: "14px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {/* Status-rad */}
        <div
          style={{ display: "flex", alignItems: "center", gap: 12 }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: accentBg,
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
                  data.cleaning ? ACC : data.charging ? SAGE : t.mute
                }
                strokeWidth={1.6}
              />
              <circle
                cx="12"
                cy="12"
                r="3.5"
                fill={
                  data.cleaning ? ACC : data.charging ? SAGE : t.mute
                }
              />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontFamily: serif,
                fontSize: 16,
                fontWeight: 500,
                color: t.ink,
                letterSpacing: "-0.01em",
                lineHeight: 1.1,
              }}
            >
              Chomper
            </p>
            <p style={ital(t, 12, t.mute)}>
              {StatusLabel}
              {data.cleaned_area != null && data.cleaning
                ? ` · ${data.cleaned_area.toFixed(0)} m²`
                : ""}
            </p>
          </div>
          {data.battery_pct != null && (
            <span
              className="warm-tab-nums"
              style={{
                fontFamily: serif,
                fontSize: 17,
                color: data.battery_pct < 25 ? "#B0452E" : t.ink,
              }}
            >
              {data.battery_pct}
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
        </div>

        {/* Primärknappar */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 8,
          }}
        >
          {primaryActions.map(({ label, action }) => (
            <WarmPress
              key={label}
              onClick={action}
              spinnerColor={ACC}
              style={{
                padding: "9px 0",
                borderRadius: 999,
                background: t.paperHi,
                border: `1px solid ${t.line}`,
                color: t.ink,
                fontFamily: body,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {label}
            </WarmPress>
          ))}
        </div>

        {/* Programknappar — alla fyra på samma rad */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 4,
          }}
        >
          {programActions.map(({ label, action }) => (
            <WarmPress
              key={label}
              onClick={action}
              spinnerColor={ACC}
              style={{
                padding: "6px 4px",
                borderRadius: 999,
                background: "transparent",
                border: `1px solid ${t.line}`,
                color: t.mute,
                fontFamily: body,
                fontSize: 10,
                fontWeight: 500,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {label}
            </WarmPress>
          ))}
        </div>
      </div>
    </section>
  );
}

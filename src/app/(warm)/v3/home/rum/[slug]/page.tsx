"use client";

import { useState } from "react";
import { useParams, useRouter, notFound } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { callAction } from "@/lib/actions";
import { useWarmTheme } from "@/lib/warm/theme";
import {
  ACC,
  body,
  ital,
  lab,
  num,
  serif,
  type WarmTheme,
} from "@/lib/warm/tokens";
import { DetailHeader, Tile } from "@/components/warm/primitives";
import { BulbIcon, DropletIcon, ThermoIcon } from "@/components/warm/icons/extra";
import WarmErrorBanner from "@/components/warm/WarmErrorBanner";
import WarmSwitch from "@/components/warm/Switch";
import { slugToName } from "@/lib/warm/rooms";

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
type LightsData = { areas: LightArea[] };
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

function MasterDimmer({
  t,
  area,
  onAllOff,
  onAllOn,
  onSetAll,
  loadingAll,
}: {
  t: WarmTheme;
  area: LightArea;
  onAllOff: () => void;
  onAllOn: () => void;
  onSetAll: (pct: number) => void;
  loadingAll: boolean;
}) {
  const dimmableLights = area.lights.filter((l) => l.dimmable);
  const avgPct = (() => {
    const onLights = area.lights.filter((l) => l.state === "on" && l.brightness_pct != null);
    if (onLights.length === 0) return null;
    return Math.round(
      onLights.reduce((s, l) => s + (l.brightness_pct ?? 0), 0) / onLights.length
    );
  })();
  const [live, setLive] = useState<number | null>(null);
  const display = live ?? avgPct ?? (area.on_count > 0 ? 100 : 0);
  const allOn = area.on_count > 0;

  return (
    <Tile t={t} style={{ border: `1px solid ${allOn ? ACC : t.line}` }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: allOn ? t.tint : t.tintSky,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BulbIcon size={22} color={allOn ? ACC : t.mute} fill={allOn ? ACC : undefined} />
          </div>
          <div>
            <span style={lab(t)}>Belysning</span>
            <p
              className="warm-tab-nums"
              style={{ ...num(t, 22, 400), lineHeight: 1.1 }}
            >
              {area.on_count}/{area.total_count} på
              {allOn && avgPct != null ? (
                <span
                  style={{
                    fontFamily: body,
                    fontSize: 12,
                    color: t.mute,
                    fontWeight: 500,
                    marginLeft: 8,
                  }}
                >
                  ~{avgPct}%
                </span>
              ) : null}
            </p>
          </div>
        </div>
        <WarmSwitch
          on={allOn}
          onChange={() => (allOn ? onAllOff() : onAllOn())}
          t={t}
          ariaLabel="Alla lampor"
        />
      </div>

      {dimmableLights.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginTop: 12,
            paddingTop: 10,
            borderTop: `1px solid ${t.line}`,
            opacity: allOn ? 1 : 0.5,
          }}
        >
          <span style={{ fontFamily: serif, fontSize: 11, color: t.mute, width: 24 }}>0</span>
          <input
            type="range"
            min={1}
            max={100}
            aria-label="Master-dimmer"
            disabled={!allOn || loadingAll}
            key={`master-${area.area_id}-${avgPct ?? "x"}`}
            defaultValue={avgPct ?? 50}
            style={
              {
                flex: 1,
                "--fill": `${avgPct ?? 50}%`,
              } as React.CSSProperties
            }
            onInput={(e) => {
              const el = e.currentTarget;
              const v = parseInt(el.value);
              el.style.setProperty("--fill", `${v}%`);
              setLive(v);
            }}
            onMouseUp={(e) =>
              onSetAll(parseInt((e.target as HTMLInputElement).value))
            }
            onTouchEnd={(e) =>
              onSetAll(parseInt((e.target as HTMLInputElement).value))
            }
          />
          <span
            className="warm-tab-nums"
            style={{
              fontFamily: body,
              fontSize: 12,
              color: t.ink,
              minWidth: 36,
              textAlign: "right",
            }}
          >
            {display}%
          </span>
        </div>
      )}
    </Tile>
  );
}

function ClimateStrip({
  t,
  sensor,
  outdoorTemp,
}: {
  t: WarmTheme;
  sensor: SensorArea | undefined;
  outdoorTemp: number | null;
}) {
  return (
    <Tile t={t}>
      <span style={lab(t)}>Klimat</span>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 12,
          marginTop: 8,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span
            style={{
              ...lab(t, { fontSize: 9 }),
              color: t.dim,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <ThermoIcon size={12} color={t.dim} /> Inne
          </span>
          <span
            className="warm-tab-nums"
            style={{ ...num(t, 22), lineHeight: 1.1 }}
          >
            {sensor ? `${sensor.temperature.toFixed(1)}°` : "–"}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span
            style={{
              ...lab(t, { fontSize: 9 }),
              color: t.dim,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <DropletIcon size={12} color={t.dim} /> Fukt
          </span>
          <span
            className="warm-tab-nums"
            style={{ ...num(t, 22), lineHeight: 1.1 }}
          >
            {sensor?.humidity != null ? `${Math.round(sensor.humidity)}%` : "–"}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span
            style={{
              ...lab(t, { fontSize: 9 }),
              color: t.dim,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <ThermoIcon size={12} color={t.dim} /> Ute
          </span>
          <span
            className="warm-tab-nums"
            style={{ ...num(t, 22), lineHeight: 1.1 }}
          >
            {outdoorTemp != null ? `${outdoorTemp.toFixed(1)}°` : "–"}
          </span>
        </div>
      </div>
    </Tile>
  );
}

export default function WarmRoomDetail() {
  const router = useRouter();
  const { t } = useWarmTheme();
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const roomName = slugToName(slug);
  if (!roomName) notFound();

  const { data: lights, mutate, error } = useSWR<LightsData>(
    "/api/homeassistant/lights",
    fetcher,
    { refreshInterval: 3_000 }
  );
  const { data: sensors } = useSWR<SensorsData>(
    "/api/homeassistant/sensors",
    fetcher,
    { refreshInterval: 30_000 }
  );

  const area = lights?.areas.find((a) => a.name === roomName);
  const sensor = sensors?.areas.find((a) => a.name === roomName);
  const [liveBrightness, setLiveBrightness] = useState<Record<string, number>>({});
  const [loadingAll, setLoadingAll] = useState(false);

  async function handleAllOff() {
    if (!area) return;
    setLoadingAll(true);
    try {
      await callAction(
        "light",
        "turn_off",
        area.lights.map((l) => l.entity_id)
      );
      await mutate();
    } finally {
      setLoadingAll(false);
    }
  }
  async function handleAllOn() {
    if (!area) return;
    setLoadingAll(true);
    try {
      await callAction(
        "light",
        "turn_on",
        area.lights.map((l) => l.entity_id)
      );
      await mutate();
    } finally {
      setLoadingAll(false);
    }
  }
  async function handleSetAll(pct: number) {
    if (!area) return;
    setLoadingAll(true);
    try {
      const dimmable = area.lights.filter((l) => l.dimmable).map((l) => l.entity_id);
      if (dimmable.length) {
        await callAction("light", "turn_on", dimmable, { brightness_pct: pct });
      }
      await mutate();
    } finally {
      setLoadingAll(false);
    }
  }
  async function handleToggleLight(light: LightEntry) {
    await callAction(
      "light",
      light.state === "on" ? "turn_off" : "turn_on",
      light.entity_id
    );
    mutate();
  }
  async function handleBrightness(entity_id: string, pct: number) {
    await callAction("light", "turn_on", entity_id, { brightness_pct: pct });
    mutate();
  }

  return (
    <>
      <DetailHeader
        t={t}
        back={() => router.push("/v3/home")}
        backLabel="Hem"
        title={roomName ?? "Rum"}
      />

      <div
        style={{
          padding: "8px 18px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {error && <WarmErrorBanner t={t} onRetry={() => mutate()} />}

        {!lights ? (
          <Tile t={t}>
            <span style={{ fontFamily: body, fontSize: 12, color: t.mute }}>
              Hämtar belysning…
            </span>
          </Tile>
        ) : !area ? (
          <Tile t={t}>
            <span style={ital(t, 14, t.ink)}>
              Inga lampor registrerade i {roomName}.
            </span>
          </Tile>
        ) : (
          <>
            <MasterDimmer
              t={t}
              area={area}
              onAllOff={handleAllOff}
              onAllOn={handleAllOn}
              onSetAll={handleSetAll}
              loadingAll={loadingAll}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={lab(t)}>Lampor</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {area.lights.map((light) => {
                  const lon = light.state === "on";
                  const live = liveBrightness[light.entity_id];
                  return (
                    <div
                      key={light.entity_id}
                      style={{
                        background: t.paper,
                        border: `1px solid ${lon ? ACC : t.line}`,
                        borderRadius: 14,
                        padding: "12px 14px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        transition: "border-color 200ms",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <BulbIcon
                          size={16}
                          color={lon ? ACC : t.dim}
                          fill={lon ? ACC : undefined}
                        />
                        <span
                          style={{
                            flex: 1,
                            fontFamily: body,
                            fontSize: 13,
                            fontWeight: 500,
                            color: t.ink,
                            minWidth: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {light.name}
                        </span>
                        <WarmSwitch
                          on={lon}
                          onChange={() => handleToggleLight(light)}
                          t={t}
                          ariaLabel={`Slå ${lon ? "av" : "på"} ${light.name}`}
                        />
                      </div>
                      {light.dimmable && lon && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            paddingLeft: 28,
                          }}
                        >
                          <input
                            type="range"
                            min={1}
                            max={100}
                            aria-label={`Ljusstyrka för ${light.name}`}
                            defaultValue={light.brightness_pct ?? 100}
                            style={
                              {
                                flex: 1,
                                "--fill": `${light.brightness_pct ?? 100}%`,
                              } as React.CSSProperties
                            }
                            onInput={(e) => {
                              const el = e.currentTarget;
                              const v = parseInt(el.value);
                              el.style.setProperty("--fill", `${v}%`);
                              setLiveBrightness((p) => ({
                                ...p,
                                [light.entity_id]: v,
                              }));
                            }}
                            onMouseUp={(e) =>
                              handleBrightness(
                                light.entity_id,
                                parseInt((e.target as HTMLInputElement).value)
                              )
                            }
                            onTouchEnd={(e) =>
                              handleBrightness(
                                light.entity_id,
                                parseInt((e.target as HTMLInputElement).value)
                              )
                            }
                          />
                          <span
                            className="warm-tab-nums"
                            style={{
                              fontFamily: body,
                              fontSize: 11,
                              color: t.mute,
                              minWidth: 32,
                              textAlign: "right",
                            }}
                          >
                            {live ?? light.brightness_pct ?? 100}%
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        <ClimateStrip t={t} sensor={sensor} outdoorTemp={sensors?.outdoor_temp ?? null} />
      </div>
    </>
  );
}

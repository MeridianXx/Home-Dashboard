"use client";

import { useEffect, useMemo, useState } from "react";
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
import { ChevronLeft } from "@/components/warm/icons/extra";
import WarmErrorBanner from "@/components/warm/WarmErrorBanner";
import ArcGauge from "@/components/warm/ArcGauge";
import { detectActiveScene, type ScenePayload } from "@/lib/scenes";
import { slugToName } from "@/lib/warm/rooms";
import { formatTime, kelvinLabel, sceneLabel } from "@/lib/warm/format";

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

// ─── Header ──────────────────────────────────────────────────────────────────

function RumHeading({
  t,
  back,
  title,
  italicTail,
  subtitle,
}: {
  t: WarmTheme;
  back: () => void;
  title: string;
  italicTail: string | null;
  subtitle: string;
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
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span
          style={{
            ...lab(t),
            color: ACC,
            letterSpacing: "0.18em",
          }}
          className="warm-tab-nums"
        >
          RUM · {formatTime(new Date())}
        </span>
        <h1
          style={{
            ...num(t, 30, 400),
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
          {italicTail ? (
            <>
              ,{" "}
              <span style={{ ...ital(t, 30, t.dim) }}>{italicTail}.</span>
            </>
          ) : (
            "."
          )}
        </h1>
        <span style={ital(t, 14, t.mute)}>{subtitle}</span>
      </div>
    </header>
  );
}

// ─── Master-tile (terracotta-tinted bg + ArcGauge + på/auto/av) ─────────────

function MasterTile({
  t,
  area,
  onAllOff,
  onAllOn,
  onAuto,
  loadingKey,
}: {
  t: WarmTheme;
  area: LightArea;
  onAllOff: () => void;
  onAllOn: () => void;
  onAuto: () => void;
  loadingKey: "off" | "on" | "auto" | null;
}) {
  const onLights = area.lights.filter((l) => l.state === "on");
  const avgPct =
    onLights.length > 0
      ? Math.round(
          onLights
            .filter((l) => l.brightness_pct != null)
            .reduce((s, l) => s + (l.brightness_pct ?? 0), 0) /
            Math.max(1, onLights.filter((l) => l.brightness_pct != null).length)
        )
      : 0;
  const avgKelvin = (() => {
    const k = onLights
      .map((l) => l.color_temp_kelvin)
      .filter((x): x is number => x != null);
    if (k.length === 0) return null;
    return Math.round(k.reduce((s, x) => s + x, 0) / k.length / 50) * 50;
  })();
  const allOn = area.on_count > 0;

  type Mode = "off" | "on" | "auto";
  const activeMode: Mode = allOn ? "on" : "off";

  const PillBtn = ({
    mode,
    label,
    onClick,
  }: {
    mode: Mode;
    label: string;
    onClick: () => void;
  }) => {
    const isActive = activeMode === mode;
    const isLoading = loadingKey === mode;
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={isActive}
        style={{
          padding: "6px 16px",
          borderRadius: 999,
          background: isActive ? t.paperHi : "transparent",
          border: `1px solid ${isActive ? t.paperHi : "rgba(255,251,240,0.18)"}`,
          color: isActive ? t.ink : "#FFFBF0",
          fontFamily: body,
          fontSize: 13,
          fontWeight: isActive ? 600 : 500,
          opacity: isLoading ? 0.5 : 1,
          cursor: "pointer",
          transition: "background 160ms",
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div
      style={{
        background: ACC,
        borderRadius: 18,
        padding: 18,
        color: "#FFFBF0",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <ArcGauge
          value={allOn ? avgPct || 100 : 0}
          size={108}
          stroke={9}
          trackColor="rgba(255,251,240,0.18)"
          color="#FFFBF0"
        />
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          <span
            style={{
              ...lab(t, { color: "rgba(255,251,240,0.7)" }),
              letterSpacing: "0.18em",
            }}
          >
            MASTER
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span
              className="warm-tab-nums"
              style={{
                fontFamily: serif,
                fontSize: 38,
                fontWeight: 400,
                lineHeight: 1,
                letterSpacing: "-0.02em",
              }}
            >
              {allOn ? avgPct : 0}
            </span>
            <span
              style={{
                fontFamily: body,
                fontSize: 13,
                fontWeight: 500,
                color: "rgba(255,251,240,0.78)",
              }}
            >
              %
            </span>
          </div>
          <span
            style={{
              fontFamily: serif,
              fontStyle: "italic",
              fontSize: 13,
              color: "rgba(255,251,240,0.85)",
              fontWeight: 400,
            }}
          >
            {avgKelvin != null
              ? `${avgKelvin} K, ${kelvinLabel(avgKelvin)}.`
              : allOn
              ? "av varierande färg."
              : "släckt."}
          </span>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          gap: 6,
          marginTop: 14,
          paddingTop: 12,
          borderTop: "1px solid rgba(255,251,240,0.18)",
        }}
      >
        <PillBtn mode="on" label="på" onClick={onAllOn} />
        <PillBtn mode="auto" label="auto" onClick={onAuto} />
        <PillBtn mode="off" label="av" onClick={onAllOff} />
      </div>
    </div>
  );
}

// ─── Lamp-row — slavisk mot designen ─────────────────────────────────────────

function LampRow({
  t,
  light,
  liveBrightness,
  onLiveBrightness,
  onToggle,
  onCommit,
  isLast,
}: {
  t: WarmTheme;
  light: LightEntry;
  liveBrightness: number | undefined;
  onLiveBrightness: (id: string, v: number) => void;
  onToggle: (l: LightEntry) => void;
  onCommit: (id: string, pct: number) => void;
  isLast: boolean;
}) {
  const lon = light.state === "on";
  const display = liveBrightness ?? light.brightness_pct ?? (lon ? 100 : 0);
  return (
    <div
      style={{
        padding: "14px 16px",
        borderBottom: isLast ? "none" : `1px solid ${t.line}`,
        display: "flex",
        flexDirection: "column",
        gap: 6,
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
        <button
          type="button"
          onClick={() => onToggle(light)}
          aria-label={`Slå ${lon ? "av" : "på"} ${light.name}`}
          style={{
            flex: 1,
            minWidth: 0,
            textAlign: "left",
            color: t.ink,
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <span
            style={{
              fontFamily: serif,
              fontSize: 17,
              fontWeight: 500,
              color: t.ink,
              letterSpacing: "-0.01em",
              lineHeight: 1.1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {light.name}
          </span>
          <span
            style={{
              fontFamily: body,
              fontSize: 12,
              color: t.dim,
            }}
            className="warm-tab-nums"
          >
            {lon && light.color_temp_kelvin
              ? `${light.color_temp_kelvin} K`
              : "—"}
          </span>
        </button>
        <span
          style={{
            display: "inline-flex",
            alignItems: "baseline",
            gap: 4,
            fontFamily: serif,
            fontSize: 17,
            color: t.ink,
            flexShrink: 0,
          }}
        >
          {lon ? (
            <>
              <span
                style={{
                  ...ital(t, 13, ACC),
                  fontWeight: 500,
                }}
              >
                på
              </span>
              <span className="warm-tab-nums" style={{ fontFamily: serif }}>
                {display}
                <span
                  style={{
                    fontFamily: body,
                    fontSize: 11,
                    color: t.mute,
                    marginLeft: 1,
                  }}
                >
                  %
                </span>
              </span>
            </>
          ) : (
            <span style={ital(t, 13, t.dim)}>av</span>
          )}
        </span>
      </div>
      {lon && light.dimmable && (
        <input
          type="range"
          min={1}
          max={100}
          aria-label={`Ljusstyrka för ${light.name}`}
          defaultValue={light.brightness_pct ?? 100}
          style={
            {
              width: "100%",
              "--fill": `${light.brightness_pct ?? 100}%`,
            } as React.CSSProperties
          }
          onInput={(e) => {
            const el = e.currentTarget;
            const v = parseInt(el.value);
            el.style.setProperty("--fill", `${v}%`);
            onLiveBrightness(light.entity_id, v);
          }}
          onMouseUp={(e) =>
            onCommit(light.entity_id, parseInt((e.target as HTMLInputElement).value))
          }
          onTouchEnd={(e) =>
            onCommit(light.entity_id, parseInt((e.target as HTMLInputElement).value))
          }
        />
      )}
    </div>
  );
}

// ─── Klimat 3-col ────────────────────────────────────────────────────────────

function ClimateTriplet({
  t,
  sensor,
  outdoorTemp,
}: {
  t: WarmTheme;
  sensor: SensorArea | undefined;
  outdoorTemp: number | null;
}) {
  return (
    <div
      style={{
        background: t.paper,
        border: `1px solid ${t.line}`,
        borderRadius: 14,
        padding: 16,
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 12,
      }}
    >
      <Stat
        t={t}
        label="TEMP"
        value={sensor ? sensor.temperature.toFixed(1) : "—"}
        unit="°C"
      />
      <Stat
        t={t}
        label="LUFTFUKT"
        value={sensor?.humidity != null ? `${Math.round(sensor.humidity)}` : "—"}
        unit="%"
      />
      <Stat
        t={t}
        label="UTE"
        value={outdoorTemp != null ? outdoorTemp.toFixed(1) : "—"}
        unit="°"
      />
    </div>
  );
}

function Stat({
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
      </div>
    </div>
  );
}

// ─── Senaste-strip (bottom-of-content) ───────────────────────────────────────

function ActivityStrip({
  t,
  activeScene,
  activeSince,
}: {
  t: WarmTheme;
  activeScene: string | null;
  activeSince: string | null;
}) {
  if (!activeScene || !activeSince) return null;
  const time = formatTime(activeSince);
  const sceneLab = sceneLabel(activeScene);
  return (
    <div
      style={{
        marginTop: 8,
        padding: "10px 16px",
        borderTop: `1px solid ${t.line}`,
        borderBottom: `1px solid ${t.line}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <span
        className="warm-tab-nums"
        style={{ ...lab(t, { fontSize: 10 }), color: t.dim }}
      >
        {time}
      </span>
      <span style={ital(t, 13, t.mute)}>
        Scen <span style={{ color: t.ink, fontWeight: 500 }}>{sceneLab}</span>{" "}
        aktiverad
      </span>
      <span style={{ ...lab(t, { fontSize: 10 }), color: t.dim }}>auto</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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
  const { data: scenesData } = useSWR<{ scenes: ScenePayload[] }>(
    "/api/homeassistant/scenes",
    fetcher,
    { refreshInterval: 60_000 }
  );

  const area = lights?.areas.find((a) => a.name === roomName);
  const sensor = sensors?.areas.find((a) => a.name === roomName);
  const [liveBrightness, setLiveBrightness] = useState<Record<string, number>>({});
  const [masterLoading, setMasterLoading] = useState<"off" | "on" | "auto" | null>(null);

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
  const activeSince =
    activeScene && scenesData?.scenes
      ? scenesData.scenes.find((s) => s.key === activeScene)?.last_changed ?? null
      : null;

  async function handleAllOff() {
    if (!area) return;
    setMasterLoading("off");
    try {
      await callAction(
        "light",
        "turn_off",
        area.lights.map((l) => l.entity_id)
      );
      await mutate();
    } finally {
      setMasterLoading(null);
    }
  }
  async function handleAllOn() {
    if (!area) return;
    setMasterLoading("on");
    try {
      await callAction(
        "light",
        "turn_on",
        area.lights.map((l) => l.entity_id)
      );
      await mutate();
    } finally {
      setMasterLoading(null);
    }
  }
  async function handleAuto() {
    // Auto = aktivera lämplig scen för rummet (i detta läge: aktivera senast
    // detekterade scen). I praktiken är detta en stub som vi kan utöka i W6.
    if (!activeScene) return;
    setMasterLoading("auto");
    try {
      await callAction("scene", "turn_on", `scene.${activeScene}`);
      await new Promise((r) => setTimeout(r, 600));
      await mutate();
    } finally {
      setMasterLoading(null);
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

  const subtitle = (() => {
    const lampor = area
      ? area.on_count === 0
        ? "alla släckta"
        : area.on_count === area.total_count
        ? `alla ${area.total_count} på`
        : `${area.on_count} av ${area.total_count} på`
      : null;
    const temp = sensor ? `${sensor.temperature.toFixed(1)}°` : null;
    const fukt = sensor?.humidity != null ? `luftfukt ${Math.round(sensor.humidity)}%` : null;
    return [lampor, temp, fukt].filter(Boolean).join(" · ");
  })();

  return (
    <>
      <RumHeading
        t={t}
        back={() => router.push("/v3/home")}
        title={roomName}
        italicTail={activeScene ? sceneLabel(activeScene) : null}
        subtitle={subtitle}
      />

      <div
        style={{
          padding: "0 22px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        {error && <WarmErrorBanner t={t} onRetry={() => mutate()} />}

        {!lights ? (
          <span style={{ fontFamily: body, fontSize: 12, color: t.mute }}>
            Hämtar belysning…
          </span>
        ) : !area ? (
          <span style={ital(t, 14, t.ink)}>
            Inga lampor registrerade i {roomName}.
          </span>
        ) : (
          <>
            <MasterTile
              t={t}
              area={area}
              onAllOff={handleAllOff}
              onAllOn={handleAllOn}
              onAuto={handleAuto}
              loadingKey={masterLoading}
            />

            <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={lab(t)}>LAMPOR</span>
              <div
                style={{
                  background: t.paper,
                  border: `1px solid ${t.line}`,
                  borderRadius: 14,
                  overflow: "hidden",
                }}
              >
                {area.lights.map((light, i) => (
                  <LampRow
                    key={light.entity_id}
                    t={t}
                    light={light}
                    liveBrightness={liveBrightness[light.entity_id]}
                    onLiveBrightness={(id, v) =>
                      setLiveBrightness((p) => ({ ...p, [id]: v }))
                    }
                    onToggle={handleToggleLight}
                    onCommit={handleBrightness}
                    isLast={i === area.lights.length - 1}
                  />
                ))}
              </div>
            </section>
          </>
        )}

        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={lab(t)}>KLIMAT</span>
          <ClimateTriplet
            t={t}
            sensor={sensor}
            outdoorTemp={sensors?.outdoor_temp ?? null}
          />
        </section>

        <ActivityStrip t={t} activeScene={activeScene} activeSince={activeSince} />
      </div>
    </>
  );
}

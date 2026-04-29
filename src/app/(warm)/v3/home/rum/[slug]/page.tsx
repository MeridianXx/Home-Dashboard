"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, notFound } from "next/navigation";
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
import {
  ChevronLeft,
  PauseIcon,
  PlayIcon,
  SkipNextIcon,
  SkipPrevIcon,
  SpeakerIcon,
  TvIcon,
} from "@/components/warm/icons/extra";
import WarmErrorBanner from "@/components/warm/WarmErrorBanner";
import ArcGauge from "@/components/warm/ArcGauge";
import LightEditSheet from "@/components/warm/LightEditSheet";
import WarmPress from "@/components/warm/WarmPress";
import { activeSceneByLastChanged, type ScenePayload } from "@/lib/scenes";
import { slugToName } from "@/lib/warm/rooms";
import { hasAdaptiveLighting } from "@/lib/warm/al-lights";
import { formatTime, kelvinLabel, sceneLabel } from "@/lib/warm/format";
import {
  formatEvents,
  sceneEventsFromScenes,
  type RawEvent,
} from "@/lib/warm/events";

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
  onSetAll,
  loadingKey,
  effectiveKelvin,
}: {
  t: WarmTheme;
  area: LightArea;
  onAllOff: () => void;
  onAllOn: () => void;
  onSetAll: (pct: number) => void;
  loadingKey: "off" | "on" | null;
  /** Override K per lampa när AL är primärkälla — så Master-tile speglar
   *  samma värde som lamp-rad-pillen och sheet:en. */
  effectiveKelvin: (l: LightEntry) => number | null;
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
      .map((l) => effectiveKelvin(l))
      .filter((x): x is number => x != null);
    if (k.length === 0) return null;
    return Math.round(k.reduce((s, x) => s + x, 0) / k.length / 50) * 50;
  })();
  const allOn = area.on_count > 0;

  type Mode = "off" | "on";
  const activeMode: Mode = allOn ? "on" : "off";

  const PillBtn = ({
    mode,
    label,
    onClick,
  }: {
    mode: Mode;
    label: string;
    onClick: () => void | Promise<void>;
  }) => {
    const isActive = activeMode === mode;
    const isLoading = loadingKey === mode;
    return (
      <WarmPress
        onClick={onClick}
        loading={isLoading}
        ariaPressed={isActive}
        spinnerColor={isActive ? t.ink : "#FFFBF0"}
        style={{
          padding: "6px 16px",
          borderRadius: 999,
          background: isActive ? t.paperHi : "transparent",
          border: `1px solid ${isActive ? t.paperHi : "rgba(255,251,240,0.18)"}`,
          color: isActive ? t.ink : "#FFFBF0",
          fontFamily: body,
          fontSize: 13,
          fontWeight: isActive ? 600 : 500,
          transition: "background 160ms",
        }}
      >
        {label}
      </WarmPress>
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
          thumbColor="#FFFBF0"
          onChange={(v) => {
            // Live preview — uppdaterar bara visningen i ArcGauge,
            // skickar inte action förrän release.
            void v;
          }}
          onCommit={(v) => onSetAll(v)}
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
        <PillBtn mode="off" label="av" onClick={onAllOff} />
        <span
          style={{
            marginLeft: "auto",
            alignSelf: "center",
            fontFamily: "var(--font-fraunces), Georgia, serif",
            fontStyle: "italic",
            fontSize: 12,
            color: "rgba(255,251,240,0.65)",
          }}
        >
          dra på cirkeln för att dimra
        </span>
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
  onOpenEdit,
  isLast,
  effectiveKelvin,
}: {
  t: WarmTheme;
  light: LightEntry;
  liveBrightness: number | undefined;
  onLiveBrightness: (id: string, v: number) => void;
  onToggle: (l: LightEntry) => void;
  onCommit: (id: string, pct: number) => void;
  onOpenEdit: (l: LightEntry) => void;
  isLast: boolean;
  /** AL-styrt K om AL är primärkälla — annars lampans state-K. Bygger
   *  konsekvens med Master-tile + sheet:en. */
  effectiveKelvin: number | null;
}) {
  const lon = light.state === "on";
  const display = liveBrightness ?? light.brightness_pct ?? (lon ? 100 : 0);
  const displayK = effectiveKelvin ?? light.color_temp_kelvin;
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
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            alignItems: "center",
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
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontFamily: serif,
              fontSize: 17,
              fontWeight: 500,
              letterSpacing: "-0.01em",
              lineHeight: 1.1,
              overflow: "hidden",
              whiteSpace: "nowrap",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: lon ? ACC : "transparent",
                border: `1.5px solid ${lon ? ACC : t.dim}`,
                flexShrink: 0,
                transition: "background-color 160ms, border-color 160ms",
              }}
            />
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                minWidth: 0,
              }}
            >
              {light.name}
            </span>
          </button>
          {lon && displayK != null && hasAdaptiveLighting(light.entity_id) && (
            <button
              type="button"
              onClick={() => onOpenEdit(light)}
              aria-label={`Redigera färgtemperatur för ${light.name}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "2px 8px",
                borderRadius: 999,
                background: t.tint,
                border: `1px solid ${t.line}`,
                color: t.mute,
                fontFamily: body,
                fontSize: 11,
                fontWeight: 500,
                cursor: "pointer",
                flexShrink: 0,
              }}
              className="warm-tab-nums"
            >
              {displayK} K
            </button>
          )}
        </div>
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

// ─── Klimat — individuella kort ──────────────────────────────────────────────

type ClimateCard = {
  key: string;
  label: string;
  sub: string | null;
  value: string;
  unit: string;
};

function ClimateCards({
  t,
  sensor,
  outdoorTemp,
}: {
  t: WarmTheme;
  sensor: SensorArea | undefined;
  outdoorTemp: number | null;
}) {
  const cards: ClimateCard[] = [];

  if (sensor) {
    cards.push({
      key: "temp",
      label: "TEMP",
      sub: "inomhus",
      value: sensor.temperature.toFixed(1),
      unit: "°C",
    });
    if (sensor.humidity != null) {
      cards.push({
        key: "hum",
        label: "LUFTFUKT",
        sub: "inomhus",
        value: `${Math.round(sensor.humidity)}`,
        unit: "%",
      });
    }
  }

  if (outdoorTemp != null) {
    cards.push({
      key: "ute",
      label: "UTE",
      sub: null,
      value: outdoorTemp.toFixed(1),
      unit: "°C",
    });
  }

  if (cards.length === 0) return null;

  return (
    <div style={{ display: "flex", gap: 10 }}>
      {cards.map((c) => (
        <div
          key={c.key}
          style={{
            flex: 1,
            background: t.paper,
            border: `1px solid ${t.line}`,
            borderRadius: 14,
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <span style={{ ...lab(t, { fontSize: 9 }), color: t.dim }}>{c.label}</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginTop: 4 }}>
            <span
              className="warm-tab-nums"
              style={{ ...num(t, 26, 400), lineHeight: 1 }}
            >
              {c.value}
            </span>
            <span
              style={{
                fontFamily: body,
                fontSize: 13,
                color: t.mute,
                fontWeight: 500,
              }}
            >
              {c.unit}
            </span>
          </div>
          {c.sub && (
            <span
              style={{
                fontFamily: body,
                fontStyle: "italic",
                fontSize: 11,
                color: t.dim,
                marginTop: 2,
              }}
            >
              {c.sub}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Mediaspelare i rummet ───────────────────────────────────────────────────

type RoomMediaPlayer = {
  entity_id: string;
  name: string;
  room: string;
  type: "sonos" | "appletv" | "tv";
  state: string;
  volume_level: number | null;
  is_volume_muted: boolean;
  media_title: string | null;
  media_artist: string | null;
  media_image_url: string | null;
  source: string | null;
  power_state: "on" | "off" | null;
};

function MediaPlayerRow({
  t,
  player,
  onAction,
  isFirst,
}: {
  t: WarmTheme;
  player: RoomMediaPlayer;
  onAction: () => void;
  isFirst: boolean;
}) {
  const playing = player.state === "playing";
  const idle = player.state === "off" || player.state === "idle" || player.state === "standby" || player.state === "unavailable";
  const subtitle = (() => {
    if (player.media_title && player.media_artist) return `${player.media_artist} · ${player.name}`;
    if (player.media_title) return player.source ?? player.name;
    if (player.source) return player.source;
    return idle ? "tyst" : player.name;
  })();

  const TypeIcon = player.type === "appletv" || player.type === "tv" ? TvIcon : SpeakerIcon;

  async function call(service: string, data?: Record<string, unknown>) {
    await callAction("media_player", service, player.entity_id, data);
    onAction();
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        borderTop: isFirst ? "none" : `1px solid ${t.line}`,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          overflow: "hidden",
          flexShrink: 0,
          background: t.tintAmber,
          border: `1px solid ${t.line}`,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {player.media_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={player.media_image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <TypeIcon size={22} color={playing ? ACC : t.mute} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontFamily: serif,
            fontSize: 15,
            fontWeight: 500,
            color: t.ink,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            lineHeight: 1.3,
          }}
        >
          {player.media_title ?? player.name}
        </p>
        <p
          style={{
            fontFamily: body,
            fontSize: 11,
            color: t.mute,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            marginTop: 2,
          }}
        >
          {subtitle}
        </p>
      </div>
      {!idle && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <button
            type="button"
            aria-label="Föregående"
            onClick={() => call("media_previous_track")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 30,
              height: 30,
              borderRadius: 999,
              background: t.paperHi,
              border: `1px solid ${t.line}`,
              cursor: "pointer",
            }}
          >
            <SkipPrevIcon size={12} color={t.ink} />
          </button>
          <button
            type="button"
            aria-label={playing ? "Pausa" : "Spela"}
            onClick={() => call(playing ? "media_pause" : "media_play")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 34,
              height: 34,
              borderRadius: 999,
              background: playing ? ACC : t.paperHi,
              border: `1px solid ${playing ? ACC : t.line}`,
              cursor: "pointer",
            }}
          >
            {playing ? (
              <PauseIcon size={14} color="#FFFBF0" fill="#FFFBF0" />
            ) : (
              <PlayIcon size={14} color={t.ink} fill={t.ink} />
            )}
          </button>
          <button
            type="button"
            aria-label="Nästa"
            onClick={() => call("media_next_track")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 30,
              height: 30,
              borderRadius: 999,
              background: t.paperHi,
              border: `1px solid ${t.line}`,
              cursor: "pointer",
            }}
          >
            <SkipNextIcon size={12} color={t.ink} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Senaste-händelser-lista ─────────────────────────────────────────────────

type FormattedEvent = {
  entity_id: string;
  time: string;
  description: string;
  source: string;
};

function RecentEvents({
  t,
  events,
}: {
  t: WarmTheme;
  events: FormattedEvent[];
}) {
  if (events.length === 0) return null;
  const top = events.slice(0, 4);

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={lab(t)}>SENASTE</span>
      <div
        style={{
          background: t.paper,
          border: `1px solid ${t.line}`,
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        {top.map((r, i) => (
          <div
            key={`${r.time}-${i}`}
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              alignItems: "center",
              gap: 14,
              padding: "12px 16px",
              borderTop: i === 0 ? "none" : `1px solid ${t.line}`,
            }}
          >
            <span
              className="warm-tab-nums"
              style={{
                ...lab(t, { fontSize: 11 }),
                color: t.dim,
                letterSpacing: "0.06em",
              }}
            >
              {formatTime(r.time)}
            </span>
            <span
              style={{
                fontFamily: serif,
                fontSize: 15,
                fontWeight: 500,
                color: t.ink,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {r.description}
            </span>
            <span
              style={{
                ...ital(t, 12, t.mute),
                whiteSpace: "nowrap",
              }}
            >
              {r.source}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WarmRoomDetail() {
  const router = useRouter();
  const { t } = useWarmTheme();
  const hydrated = useHydrated();
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const roomName = slugToName(slug);
  if (!roomName) notFound();

  const { data: lights, mutate, error } = useSWR<LightsData>(
    hydrated ? "/api/homeassistant/lights" : null,
    fetcher,
    { refreshInterval: 3_000 }
  );
  const { data: sensors } = useSWR<SensorsData>(
    hydrated ? "/api/homeassistant/sensors" : null,
    fetcher,
    { refreshInterval: 30_000 }
  );
  const { data: scenesData, mutate: mScenes } = useSWR<{ scenes: ScenePayload[] }>(
    hydrated ? "/api/homeassistant/scenes" : null,
    fetcher,
    { refreshInterval: 60_000 }
  );
  const { data: mediaData, mutate: mMedia } = useSWR<{ players: RoomMediaPlayer[] }>(
    hydrated ? "/api/homeassistant/media" : null,
    fetcher,
    { refreshInterval: 5_000 }
  );
  const { data: alData, mutate: mAdaptive } = useSWR<{
    instances: Array<{
      entity_id: string;
      configuration_id: string;
      enabled: boolean;
      manual_control: string[];
      color_temp_kelvin: number | null;
      brightness_pct: number | null;
    }>;
  }>(hydrated ? "/api/homeassistant/adaptive-lighting" : null, fetcher, {
    // 30 s — AL ramppar i intervaller, så snabbare poll än 60 s ger
    // mindre lag mellan AL:s ändring och dashboard-display.
    refreshInterval: 30_000,
  });

  const area = lights?.areas.find((a) => a.name === roomName);

  // Hämta alla relevanta entiteter för rummet (lampor + media + climate +
  // motion-sensorer) via dedikerad endpoint så SENASTE-listan kan visa
  // Sonos/Apple TV-events, värmepump-byten och rörelse-detektioner.
  const { data: roomEntities } = useSWR<{
    entities: string[];
    lights: string[];
    media: string[];
    climate: string[];
    motion: string[];
  }>(
    hydrated && roomName
      ? `/api/homeassistant/room-entities?room=${encodeURIComponent(roomName)}`
      : null,
    fetcher,
    { refreshInterval: 300_000 }
  );

  const eventEntities = useMemo(() => {
    if (roomEntities?.entities && roomEntities.entities.length > 0) {
      return roomEntities.entities.join(",");
    }
    if (!area) return null;
    // Fallback till bara rummets lampor om room-entities inte är klar än.
    return area.lights.map((l) => l.entity_id).join(",");
  }, [roomEntities, area]);

  const { data: eventsData, mutate: mEvents } = useSWR<{ events: RawEvent[] }>(
    hydrated && eventEntities
      ? `/api/homeassistant/events?entities=${eventEntities}&hours=24`
      : null,
    fetcher,
    { refreshInterval: 60_000 }
  );
  const recentEvents = useMemo(() => {
    // Lampor / media / climate / motion-events från history (deduperade
    // mot scen-aktiveringar inom ±3 s).
    const fromHistory = formatEvents(
      eventsData?.events ?? [],
      scenesData?.scenes,
      10
    );
    // Scen-aktiveringar inom 24 h som egna rader. Deras "tändes"-events
    // är redan filtrerade bort av formatEvents-deduperingen.
    const fromScenes = sceneEventsFromScenes(scenesData?.scenes);
    const merged = [...fromHistory, ...fromScenes];
    merged.sort((a, b) => b.time.localeCompare(a.time));
    return merged;
  }, [eventsData, scenesData]);
  // Kök har en felklassad sensor (60° konstant) — visa ingen sensor-data
  // för rummet förrän bug:en är fixad i sensors-route.
  const isKitchen = roomName?.toLowerCase() === "kök" || roomName?.toLowerCase() === "köket";
  const sensor = isKitchen ? undefined : sensors?.areas.find((a) => a.name === roomName);
  const [liveBrightness, setLiveBrightness] = useState<Record<string, number>>({});
  const [masterLoading, setMasterLoading] = useState<"off" | "on" | null>(null);
  const [editingLight, setEditingLight] = useState<LightEntry | null>(null);

  // AL-instans för denna lampa: matcha på manual_control eller via konfig-id
  // som råkar matcha rummets slug. Notion-AL har vanligtvis en instans per
  // rum som heter samma som rummet.
  const adaptiveForLight = (l: LightEntry) => {
    if (!alData?.instances) return null;
    const direct = alData.instances.find((i) =>
      i.manual_control.includes(l.entity_id)
    );
    if (direct) return direct;
    const bySlug = alData.instances.find(
      (i) => i.configuration_id.toLowerCase() === slug.toLowerCase()
    );
    return bySlug ?? alData.instances[0] ?? null;
  };

  /** Effektiv K för en lampa: AL:s sol-K om lampan har AL-stöd och AL är
   *  på + ingen manuell override, annars lampans cached state-K. Används
   *  för K-pillar och Master-tile så rumssidan + sheet:en visar samma
   *  värde för AL-lampor. AL_LIGHTS-listan i `@/lib/warm/al-lights`
   *  bestämmer vilka entity_ids som faktiskt styrs av AL. */
  const effectiveKelvin = (l: LightEntry): number | null => {
    if (!hasAdaptiveLighting(l.entity_id)) return l.color_temp_kelvin;
    const al = adaptiveForLight(l);
    if (!al) return l.color_temp_kelvin;
    const overridden = al.manual_control.includes(l.entity_id);
    if (al.enabled && !overridden && al.color_temp_kelvin != null) {
      return al.color_temp_kelvin;
    }
    return l.color_temp_kelvin;
  };

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
  async function handleSetAll(pct: number) {
    if (!area) return;
    const dimmable = area.lights.filter((l) => l.dimmable).map((l) => l.entity_id);
    if (dimmable.length === 0) return;
    await callAction("light", "turn_on", dimmable, { brightness_pct: pct });
    mutate();
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
  async function handleSetKelvin(entity_id: string, kelvin: number) {
    await callAction("light", "turn_on", entity_id, {
      color_temp_kelvin: kelvin,
    });
    mutate();
  }
  async function handleToggleAdaptive(instance: {
    entity_id: string;
    enabled: boolean;
  }) {
    await callAction(
      "switch",
      instance.enabled ? "turn_off" : "turn_on",
      instance.entity_id
    );
    mAdaptive();
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
              onSetAll={handleSetAll}
              loadingKey={masterLoading}
              effectiveKelvin={effectiveKelvin}
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
                    onOpenEdit={(l) => setEditingLight(l)}
                    isLast={i === area.lights.length - 1}
                    effectiveKelvin={effectiveKelvin(light)}
                  />
                ))}
              </div>
            </section>
          </>
        )}

        {(sensor || sensors?.outdoor_temp != null) && (
          <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={lab(t)}>KLIMAT</span>
            <ClimateCards
              t={t}
              sensor={sensor}
              outdoorTemp={sensors?.outdoor_temp ?? null}
            />
          </section>
        )}

        {(() => {
          const players = (mediaData?.players ?? []).filter(
            (p) => p.room === roomName && p.state !== "unavailable"
          );
          if (players.length === 0) return null;
          return (
            <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={lab(t)}>MEDIA</span>
              <div
                style={{
                  background: t.paper,
                  border: `1px solid ${t.line}`,
                  borderRadius: 14,
                  overflow: "hidden",
                }}
              >
                {players.map((p, i) => (
                  <MediaPlayerRow
                    key={p.entity_id}
                    t={t}
                    player={p}
                    onAction={() => mMedia()}
                    isFirst={i === 0}
                  />
                ))}
              </div>
            </section>
          );
        })()}

        <RecentEvents t={t} events={recentEvents} />
      </div>

      <LightEditSheet
        t={t}
        light={editingLight}
        open={editingLight != null}
        onClose={() => setEditingLight(null)}
        adaptive={editingLight ? adaptiveForLight(editingLight) : null}
        onSetKelvin={handleSetKelvin}
        onToggleAdaptive={handleToggleAdaptive}
      />
    </>
  );
}

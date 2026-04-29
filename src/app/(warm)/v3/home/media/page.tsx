"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { callAction } from "@/lib/actions";
import { useHydrated, useWarmTheme } from "@/lib/warm/theme";
import { ACC, body, ital, lab, num, type WarmTheme } from "@/lib/warm/tokens";
import { DetailHeader, Tile } from "@/components/warm/primitives";
import {
  PauseIcon,
  PlayIcon,
  PowerIcon,
  SkipNextIcon,
  SkipPrevIcon,
  SpeakerIcon,
  TvIcon,
  VolumeIcon,
} from "@/components/warm/icons/extra";
import WarmErrorBanner from "@/components/warm/WarmErrorBanner";

type MediaPlayer = {
  entity_id: string;
  name: string;
  room: string;
  type: "sonos" | "appletv" | "tv";
  state: string;
  volume_level: number | null;
  is_volume_muted: boolean;
  media_title: string | null;
  media_artist: string | null;
  media_album: string | null;
  media_channel: string | null;
  media_image_url: string | null;
  source: string | null;
  media_position: number | null;
  media_duration: number | null;
  media_position_updated_at: string | null;
  power_entity_id: string | null;
  power_state: "on" | "off" | null;
};
type MediaData = { players: MediaPlayer[] };

const callMedia = (service: string, entity_id: string, data?: Record<string, unknown>) =>
  callAction("media_player", service, entity_id, data);
const callRemote = (service: "turn_on" | "turn_off", entity_id: string) =>
  callAction("remote", service, entity_id);

const isPlaying = (s: string) => s === "playing";

function formatTime(sec: number | null): string {
  if (sec == null || !isFinite(sec) || sec < 0) return "0:00";
  const s = Math.floor(sec);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

function useLivePosition(base: number | null, updatedAt: string | null, playing: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!playing || base == null || !updatedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [playing, base, updatedAt]);
  if (base == null || !updatedAt) return base;
  if (!playing) return base;
  return Math.max(0, base + (now - new Date(updatedAt).getTime()) / 1000);
}

function TransportButton({
  t,
  icon,
  label,
  primary = false,
  size = 36,
  onClick,
  disabled = false,
}: {
  t: WarmTheme;
  icon: React.ReactNode;
  label: string;
  primary?: boolean;
  size?: number;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: primary ? ACC : t.paperHi,
        border: `1px solid ${primary ? ACC : t.line}`,
        color: primary ? "#FFFBF0" : t.ink,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.4 : 1,
        flexShrink: 0,
      }}
    >
      {icon}
    </button>
  );
}

function SonosTile({
  player,
  t,
  onRefresh,
}: {
  player: MediaPlayer;
  t: WarmTheme;
  onRefresh: () => void;
}) {
  const playing = isPlaying(player.state);
  const [liveVol, setLiveVol] = useState<number | null>(null);
  const volPct = Math.round(((liveVol ?? player.volume_level ?? 0) as number) * 100);
  const subtitle =
    player.media_artist ||
    player.media_channel ||
    player.source ||
    (playing ? "Spelar" : "Pausad");
  const livePos = useLivePosition(
    player.media_position,
    player.media_position_updated_at,
    playing
  );
  const hasProgress =
    player.media_duration != null && player.media_duration > 0 && livePos != null;

  const volIcon =
    volPct === 0 ? (
      <VolumeIcon level={0} size={16} color={t.mute} />
    ) : volPct < 50 ? (
      <VolumeIcon level={1} size={16} color={t.mute} />
    ) : (
      <VolumeIcon level={2} size={16} color={t.mute} />
    );

  return (
    <Tile
      t={t}
      style={{
        border: `1px solid ${playing ? ACC : t.line}`,
        padding: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: 12,
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
            <img
              src={player.media_image_url}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <SpeakerIcon size={28} color={playing ? ACC : t.mute} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={lab(t)}>{player.room}</span>
          <p
            style={{
              fontFamily: body,
              fontSize: 13,
              fontWeight: 600,
              color: t.ink,
              marginTop: 2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {player.media_title ?? player.name}
          </p>
          <p
            style={{
              fontFamily: body,
              fontSize: 11,
              color: t.mute,
              marginTop: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {hasProgress
              ? `${formatTime(livePos)} / ${formatTime(player.media_duration)}`
              : subtitle}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <TransportButton
            t={t}
            icon={<SkipPrevIcon size={14} color={t.ink} />}
            label="Föregående"
            size={32}
            onClick={async () => {
              await callMedia("media_previous_track", player.entity_id);
              onRefresh();
            }}
          />
          <TransportButton
            t={t}
            icon={
              playing ? (
                <PauseIcon size={16} color="#FFFBF0" fill="#FFFBF0" />
              ) : (
                <PlayIcon size={16} color={t.ink} fill={t.ink} />
              )
            }
            label={playing ? "Pausa" : "Spela"}
            primary={playing}
            onClick={async () => {
              await callMedia("media_play_pause", player.entity_id);
              onRefresh();
            }}
          />
          <TransportButton
            t={t}
            icon={<SkipNextIcon size={14} color={t.ink} />}
            label="Nästa"
            size={32}
            onClick={async () => {
              await callMedia("media_next_track", player.entity_id);
              onRefresh();
            }}
          />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginTop: 12,
          paddingTop: 10,
          borderTop: `1px solid ${t.line}`,
        }}
      >
        {volIcon}
        <input
          type="range"
          min={0}
          max={100}
          aria-label={`Volym för ${player.name}`}
          key={`${player.entity_id}-${player.volume_level ?? "x"}`}
          defaultValue={Math.round((player.volume_level ?? 0) * 100)}
          style={
            {
              flex: 1,
              "--fill": `${Math.round((player.volume_level ?? 0) * 100)}%`,
            } as React.CSSProperties
          }
          onInput={(e) => {
            const el = e.currentTarget;
            const v = parseInt(el.value);
            el.style.setProperty("--fill", `${v}%`);
            setLiveVol(v / 100);
          }}
          onMouseUp={async (e) => {
            const v = parseInt((e.target as HTMLInputElement).value) / 100;
            await callMedia("volume_set", player.entity_id, { volume_level: v });
            onRefresh();
          }}
          onTouchEnd={async (e) => {
            const v = parseInt((e.target as HTMLInputElement).value) / 100;
            await callMedia("volume_set", player.entity_id, { volume_level: v });
            onRefresh();
          }}
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
          {volPct}%
        </span>
      </div>
    </Tile>
  );
}

function AppleTvTile({
  player,
  t,
  onRefresh,
}: {
  player: MediaPlayer;
  t: WarmTheme;
  onRefresh: () => void;
}) {
  const playing = isPlaying(player.state);
  const isOff =
    player.power_state != null
      ? player.power_state === "off"
      : player.state === "off" || player.state === "standby";
  const livePos = useLivePosition(
    player.media_position,
    player.media_position_updated_at,
    playing
  );
  const hasProgress =
    player.media_duration != null && player.media_duration > 0 && livePos != null;
  const progressPct =
    hasProgress && player.media_duration
      ? Math.max(0, Math.min(100, (livePos! / player.media_duration) * 100))
      : 0;

  const togglePlay = async () => {
    await callMedia(playing ? "media_pause" : "media_play", player.entity_id);
    onRefresh();
  };
  const togglePower = async () => {
    if (player.power_entity_id) {
      await callRemote(isOff ? "turn_on" : "turn_off", player.power_entity_id);
    } else {
      await callMedia(isOff ? "turn_on" : "turn_off", player.entity_id);
    }
    onRefresh();
  };

  const subtitle = player.source ?? (isOff ? "Av" : "Inaktiv");

  return (
    <Tile
      t={t}
      style={{
        border: `1px solid ${playing ? ACC : t.line}`,
        padding: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: 12,
            overflow: "hidden",
            flexShrink: 0,
            background: t.tintSky,
            border: `1px solid ${t.line}`,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {player.media_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={player.media_image_url}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <TvIcon size={28} color={playing ? ACC : t.mute} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={lab(t)}>{player.room}</span>
          <p
            style={{
              fontFamily: body,
              fontSize: 13,
              fontWeight: 600,
              color: t.ink,
              marginTop: 2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {player.media_title ?? player.name}
          </p>
          <p
            style={{
              fontFamily: body,
              fontSize: 11,
              color: t.mute,
              marginTop: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {subtitle}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <TransportButton
            t={t}
            icon={<SkipPrevIcon size={14} color={t.ink} />}
            label="Föregående"
            size={32}
            onClick={async () => {
              await callMedia("media_previous_track", player.entity_id);
              onRefresh();
            }}
            disabled={isOff}
          />
          <TransportButton
            t={t}
            icon={
              playing ? (
                <PauseIcon size={16} color="#FFFBF0" fill="#FFFBF0" />
              ) : (
                <PlayIcon size={16} color={t.ink} fill={t.ink} />
              )
            }
            label={playing ? "Pausa" : "Spela"}
            primary={playing}
            onClick={togglePlay}
            disabled={isOff}
          />
          <TransportButton
            t={t}
            icon={<SkipNextIcon size={14} color={t.ink} />}
            label="Nästa"
            size={32}
            onClick={async () => {
              await callMedia("media_next_track", player.entity_id);
              onRefresh();
            }}
            disabled={isOff}
          />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginTop: 12,
          paddingTop: 10,
          borderTop: `1px solid ${t.line}`,
        }}
      >
        <button
          type="button"
          onClick={togglePower}
          aria-label={isOff ? "Slå på" : "Stäng av"}
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            border: `1px solid ${t.line}`,
            background: isOff ? t.paper : t.tint,
            color: isOff ? t.mute : ACC,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <PowerIcon size={14} color={isOff ? t.mute : ACC} />
        </button>
        <span
          className="warm-tab-nums"
          style={{
            fontFamily: body,
            fontSize: 11,
            color: t.mute,
            minWidth: 32,
          }}
        >
          {hasProgress ? formatTime(livePos) : "–:––"}
        </span>
        <div
          style={{
            flex: 1,
            height: 4,
            background: t.line,
            borderRadius: 999,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progressPct}%`,
              height: "100%",
              background: playing ? ACC : t.mute,
              transition: "width 0.3s linear",
            }}
          />
        </div>
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
          {hasProgress ? formatTime(player.media_duration) : "–:––"}
        </span>
      </div>
    </Tile>
  );
}

export default function WarmMediaPage() {
  const router = useRouter();
  const { t } = useWarmTheme();
  const hydrated = useHydrated();
  const { data, error, mutate } = useSWR<MediaData>(
    hydrated ? "/api/homeassistant/media" : null,
    fetcher,
    { refreshInterval: 3_000 }
  );
  const players = data && "players" in data ? data.players : [];
  const sonos = players.filter((p) => p.type === "sonos");
  const appletv = players.filter((p) => p.type === "appletv");
  const onRefresh = () => {
    setTimeout(() => mutate(), 500);
  };

  return (
    <>
      <DetailHeader
        t={t}
        back={() => router.push("/v3/home")}
        backLabel="Hem"
        title="Media"
      />

      <div
        style={{
          padding: "8px 18px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        {error && <WarmErrorBanner t={t} onRetry={() => mutate()} />}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={ital(t, 14, t.mute)}>
            {players.filter((p) => isPlaying(p.state)).length} spelar just nu
          </span>
          <span
            className="warm-tab-nums"
            style={{ ...num(t, 18, 500), color: t.ink }}
          >
            {players.filter((p) => isPlaying(p.state)).length}/{players.length}
          </span>
        </div>

        {!data ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 96,
                  borderRadius: 14,
                  background: t.paper,
                  border: `1px solid ${t.line}`,
                  opacity: 0.5,
                }}
              />
            ))}
          </div>
        ) : (
          <>
            {sonos.length > 0 && (
              <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <span style={lab(t)}>Högtalare</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {sonos.map((p) => (
                    <SonosTile
                      key={p.entity_id}
                      player={p}
                      t={t}
                      onRefresh={onRefresh}
                    />
                  ))}
                </div>
              </section>
            )}
            {appletv.length > 0 && (
              <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <span style={lab(t)}>Apple TV</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {appletv.map((p) => (
                    <AppleTvTile
                      key={p.entity_id}
                      player={p}
                      t={t}
                      onRefresh={onRefresh}
                    />
                  ))}
                </div>
              </section>
            )}
            {players.length === 0 && (
              <p
                style={{
                  fontFamily: body,
                  fontSize: 13,
                  color: t.mute,
                  textAlign: "center",
                  padding: "20px 0",
                }}
              >
                Inga tillgängliga media-spelare.
              </p>
            )}
          </>
        )}
      </div>
    </>
  );
}

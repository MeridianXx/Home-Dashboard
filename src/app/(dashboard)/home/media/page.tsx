"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { Pressable } from "@/components/FavTile";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then(r => r.json());
const AMBER = "#fab849";
const vibrate = () => typeof navigator !== "undefined" && navigator.vibrate?.(10);

async function callAction(service: string, entity_id: string, service_data?: Record<string, unknown>) {
  await fetch("/api/homeassistant/action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ domain: "media_player", service, entity_id, service_data }),
  });
}

// Apple TV: media_player.* services accept calls but don't do anything.
// Power via remote.turn_on / remote.turn_off (works — changes state).
// Transport via remote.send_command with specific command names
// (play/pause/next/previous — verified via pyatv integration).
async function callRemote(service: "turn_on" | "turn_off", entity_id: string) {
  await fetch("/api/homeassistant/action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ domain: "remote", service, entity_id }),
  });
}

async function callRemoteCommand(entity_id: string, command: string) {
  await fetch("/api/homeassistant/action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      domain: "remote", service: "send_command", entity_id,
      service_data: { command },
    }),
  });
}

function isPlaying(state: string) { return state === "playing"; }

function formatTime(sec: number | null): string {
  if (sec == null || !isFinite(sec) || sec < 0) return "0:00";
  const s = Math.floor(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

// ─── Transport button (prev / play / next etc) ───────────────────────────────
// Uses Pressable so every tap has a visible scale+opacity squeeze. A brief
// flash on mouseup confirms the click registered even if the action produces
// no visible state change (e.g. Apple TV in idle).

function TransportButton({ icon, label, size = 40, primary = false, onClick, disabled = false }: {
  icon: string; label: string; size?: number; primary?: boolean;
  onClick: () => void; disabled?: boolean;
}) {
  const [flash, setFlash] = useState(false);
  return (
    <Pressable
      onClick={() => {
        if (disabled) return;
        vibrate();
        setFlash(true);
        window.setTimeout(() => setFlash(false), 220);
        onClick();
      }}
      disabled={disabled}
      className="flex items-center justify-center"
      style={{
        width: size, height: size, borderRadius: "50%", flexShrink: 0, border: "none",
        backgroundColor: flash
          ? (primary ? "var(--color-on-surface)" : AMBER)
          : (primary ? AMBER : "var(--color-surface-container-high)"),
        transition: "background-color 0.22s",
      }}
    >
      <span aria-label={label} className="material-symbols-outlined"
        style={{
          fontSize: Math.round(size * 0.5),
          color: flash
            ? (primary ? AMBER : "var(--color-surface-container)")
            : (primary ? "var(--color-surface-container)" : "var(--color-on-surface)"),
          fontVariationSettings: "'FILL' 1",
          transition: "color 0.22s",
        }}>
        {icon}
      </span>
    </Pressable>
  );
}

// Live-ticking position for playing Sonos tracks. Interpolates from the
// position HA reported at `updatedAt` based on elapsed wall-clock time.
function useLivePosition(base: number | null, updatedAt: string | null, playing: boolean): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!playing || base == null || !updatedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [playing, base, updatedAt]);
  if (base == null || !updatedAt) return base;
  if (!playing) return base;
  const delta = (now - new Date(updatedAt).getTime()) / 1000;
  return Math.max(0, base + delta);
}

// ─── Sonos tile ────────────────────────────────────────────────────────────────

function SonosTile({ player, onRefresh }: { player: MediaPlayer; onRefresh: () => void }) {
  const playing = isPlaying(player.state);
  const [liveVol, setLiveVol] = useState<number | null>(null);
  const volPct = Math.round(((liveVol ?? player.volume_level ?? 0)) * 100);

  const subtitle = player.media_artist || player.media_channel || player.source || (playing ? "Spelar" : "Pausad");
  const livePos = useLivePosition(player.media_position, player.media_position_updated_at, playing);
  const hasProgress = player.media_duration != null && player.media_duration > 0 && livePos != null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl px-4 py-4"
      style={{
        backgroundColor: "var(--color-surface-container)",
        border: `1.5px solid ${playing ? AMBER : "transparent"}`,
        boxShadow: playing ? `inset 0 0 0 99px ${AMBER}09` : "none",
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}>
      {/* Header row — art + text + time + transport */}
      <div className="flex items-center gap-3">
        <div style={{
          width: 68, height: 68, borderRadius: 12, flexShrink: 0, overflow: "hidden",
          backgroundColor: playing ? `${AMBER}18` : "var(--color-surface-container-high)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {player.media_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={player.media_image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span className="material-symbols-outlined"
              style={{ fontSize: 32, color: playing ? AMBER : "var(--color-outline)", fontVariationSettings: playing ? "'FILL' 1" : "'FILL' 0" }}>
              speaker
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 flex flex-col gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-bold tracking-wide uppercase truncate" style={{ color: "var(--color-on-surface-variant)" }}>{player.room}</p>
            <p className="text-sm font-bold truncate" style={{ color: "var(--color-on-surface)" }}>
              {player.media_title ?? player.name}
            </p>
            <div className="flex items-baseline gap-2 min-w-0">
              <p className="text-xs truncate flex-1" style={{ color: "var(--color-on-surface-variant)" }}>{subtitle}</p>
              {hasProgress && (
                <span className="text-[10px] tabular-nums shrink-0"
                  style={{ color: "var(--color-on-surface-variant)" }}>
                  {formatTime(livePos)} / {formatTime(player.media_duration)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <TransportButton icon="skip_previous" label="Föregående" size={36}
              onClick={async () => { await callAction("media_previous_track", player.entity_id); onRefresh(); }} />
            <TransportButton icon={playing ? "pause" : "play_arrow"} label={playing ? "Pausa" : "Spela"} size={40} primary={playing}
              onClick={async () => { await callAction("media_play_pause", player.entity_id); onRefresh(); }} />
            <TransportButton icon="skip_next" label="Nästa" size={36}
              onClick={async () => { await callAction("media_next_track", player.entity_id); onRefresh(); }} />
          </div>
        </div>
      </div>

      {/* Volume row — full card width */}
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined shrink-0"
          style={{ fontSize: 18, color: "var(--color-on-surface-variant)" }}>
          {volPct === 0 ? "volume_mute" : volPct < 50 ? "volume_down" : "volume_up"}
        </span>
        <input type="range" min={0} max={100}
          key={`${player.entity_id}-${player.volume_level ?? "x"}`}
          defaultValue={Math.round((player.volume_level ?? 0) * 100)}
          className="flex-1 cursor-pointer min-w-0"
          style={{ "--fill": `${Math.round((player.volume_level ?? 0) * 100)}%` } as React.CSSProperties}
          onInput={e => {
            const t = e.currentTarget;
            const v = parseInt(t.value);
            t.style.setProperty("--fill", `${v}%`);
            setLiveVol(v / 100);
          }}
          onMouseUp={async e => { const v = parseInt((e.target as HTMLInputElement).value) / 100; await callAction("volume_set", player.entity_id, { volume_level: v }); onRefresh(); }}
          onTouchEnd={async e => { const v = parseInt((e.target as HTMLInputElement).value) / 100; await callAction("volume_set", player.entity_id, { volume_level: v }); onRefresh(); }}
        />
        <span className="text-[11px] font-medium tabular-nums shrink-0"
          style={{ minWidth: 34, textAlign: "right", color: "var(--color-on-surface-variant)" }}>
          {volPct}%
        </span>
      </div>
    </div>
  );
}

// ─── Apple TV tile ─────────────────────────────────────────────────────────────

function AppleTvTile({ player, onRefresh }: { player: MediaPlayer; onRefresh: () => void }) {
  const playing = isPlaying(player.state);
  const isOff = player.state === "off" || player.state === "standby";

  // Apple TV: use media_player.* with SPECIFIC services (media_pause/media_play).
  // The toggle service media_play_pause is broken on the pyatv integration —
  // returns 200 but never changes state. media_pause and media_play work.
  const togglePlay = async () => {
    await callAction(playing ? "media_pause" : "media_play", player.entity_id);
    onRefresh();
  };
  const next = async () => {
    await callAction("media_next_track", player.entity_id);
    onRefresh();
  };
  const prev = async () => {
    await callAction("media_previous_track", player.entity_id);
    onRefresh();
  };
  const togglePower = async () => {
    await callAction(isOff ? "turn_on" : "turn_off", player.entity_id);
    onRefresh();
  };

  const livePos = useLivePosition(player.media_position, player.media_position_updated_at, playing);
  const hasProgress = player.media_duration != null && player.media_duration > 0 && livePos != null;
  const progressPct = hasProgress && player.media_duration
    ? Math.max(0, Math.min(100, (livePos! / player.media_duration) * 100))
    : 0;

  const subtitle = player.source ?? (isOff ? "Av" : "Inaktiv");

  return (
    <div className="relative flex flex-col gap-3 rounded-2xl px-4 py-4"
      style={{
        backgroundColor: "var(--color-surface-container)",
        border: `1.5px solid ${playing ? AMBER : "transparent"}`,
        boxShadow: playing ? `inset 0 0 0 99px ${AMBER}09` : "none",
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}>
      {/* Power — small icon in top-right corner */}
      <button onClick={() => { vibrate(); togglePower(); }}
        aria-label={isOff ? "Slå på" : "Stäng av"}
        style={{
          position: "absolute", top: 10, right: 10,
          width: 28, height: 28, borderRadius: "50%",
          border: "none", cursor: "pointer",
          backgroundColor: isOff ? "var(--color-surface-container-high)" : `${AMBER}22`,
          color: isOff ? "var(--color-on-surface-variant)" : AMBER,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background-color 0.18s, color 0.18s",
        }}>
        <span className="material-symbols-outlined"
          style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>
          power_settings_new
        </span>
      </button>

      {/* Header row — art + text(+ transport stacked) */}
      <div className="flex items-center gap-3" style={{ paddingRight: 32 /* clear of power button */ }}>
        <div style={{
          width: 68, height: 68, borderRadius: 12, flexShrink: 0, overflow: "hidden",
          backgroundColor: playing ? `${AMBER}18` : "var(--color-surface-container-high)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {player.media_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={player.media_image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span className="material-symbols-outlined"
              style={{ fontSize: 32, color: playing ? AMBER : "var(--color-outline)", fontVariationSettings: "'FILL' 1" }}>
              tv
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 flex flex-col gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-bold tracking-wide uppercase truncate" style={{ color: "var(--color-on-surface-variant)" }}>{player.room}</p>
            <p className="text-sm font-bold truncate" style={{ color: "var(--color-on-surface)" }}>
              {player.media_title ?? player.name}
            </p>
            <div className="flex items-baseline gap-2 min-w-0">
              <p className="text-xs truncate flex-1" style={{ color: "var(--color-on-surface-variant)" }}>{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <TransportButton icon="skip_previous" label="Föregående" size={36} disabled={isOff}
              onClick={prev} />
            <TransportButton icon={playing ? "pause" : "play_arrow"} label={playing ? "Pausa" : "Spela"} size={40} primary={playing} disabled={isOff}
              onClick={togglePlay} />
            <TransportButton icon="skip_next" label="Nästa" size={36} disabled={isOff}
              onClick={next} />
          </div>
        </div>
      </div>

      {/* Progress bar — row 2, mirrors Sonos volume slider layout */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] tabular-nums shrink-0"
          style={{ minWidth: 32, color: "var(--color-on-surface-variant)" }}>
          {hasProgress ? formatTime(livePos) : "–:––"}
        </span>
        <div className="flex-1 h-1.5 rounded-full overflow-hidden"
          style={{ backgroundColor: "var(--color-surface-container-high)" }}>
          <div className="h-full rounded-full"
            style={{
              width: `${progressPct}%`,
              backgroundColor: playing ? AMBER : "var(--color-outline)",
              transition: "width 0.3s linear",
            }} />
        </div>
        <span className="text-[10px] tabular-nums shrink-0"
          style={{ minWidth: 32, textAlign: "right", color: "var(--color-on-surface-variant)" }}>
          {hasProgress ? formatTime(player.media_duration) : "–:––"}
        </span>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function MediaPage() {
  const { data, mutate } = useSWR<MediaData>("/api/homeassistant/media", fetcher, { refreshInterval: 3_000 });
  const players = data && "players" in data ? data.players : [];

  const sonos   = players.filter(p => p.type === "sonos");
  const appletv = players.filter(p => p.type === "appletv");

  const onRefresh = () => { setTimeout(() => mutate(), 500); };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold" style={{ color: "var(--color-on-surface)" }}>Media</h1>
        {players.length > 0 && (
          <span className="text-sm font-bold" style={{ color: "var(--color-on-surface-variant)" }}>
            {players.filter(p => isPlaying(p.state)).length}/{players.length} spelar
          </span>
        )}
      </div>

      {!data ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl animate-pulse"
              style={{ backgroundColor: "var(--color-surface-container)" }} />
          ))}
        </div>
      ) : (
        <>
          {sonos.length > 0 && (
            <div>
              <p className="text-xs font-bold tracking-wide mb-2" style={{ color: "var(--color-on-surface-variant)" }}>HÖGTALARE</p>
              <div className="space-y-2">
                {sonos.map(p => <SonosTile key={p.entity_id} player={p} onRefresh={onRefresh} />)}
              </div>
            </div>
          )}

          {appletv.length > 0 && (
            <div>
              <p className="text-xs font-bold tracking-wide mb-2" style={{ color: "var(--color-on-surface-variant)" }}>APPLE TV</p>
              <div className="space-y-2">
                {appletv.map(p => <AppleTvTile key={p.entity_id} player={p} onRefresh={onRefresh} />)}
              </div>
            </div>
          )}

          {players.length === 0 && (
            <p className="text-sm text-center py-8" style={{ color: "var(--color-on-surface-variant)" }}>
              Inga tillgängliga media-spelare.
            </p>
          )}
        </>
      )}
    </div>
  );
}

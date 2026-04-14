"use client";

import { useState } from "react";
import useSWR from "swr";

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

function isPlaying(state: string) { return state === "playing"; }

// ─── Transport button (prev / play / next etc) ───────────────────────────────

function TransportButton({ icon, label, size = 40, primary = false, onClick, disabled = false }: {
  icon: string; label: string; size?: number; primary?: boolean;
  onClick: () => void; disabled?: boolean;
}) {
  return (
    <button onClick={() => { vibrate(); onClick(); }} aria-label={label} disabled={disabled}
      style={{
        width: size, height: size, borderRadius: "50%", flexShrink: 0, border: "none",
        cursor: disabled ? "default" : "pointer",
        backgroundColor: primary ? AMBER : "var(--color-surface-container-high)",
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: disabled ? 0.35 : 1,
        transition: "background-color 0.18s, opacity 0.18s",
      }}>
      <span className="material-symbols-outlined"
        style={{
          fontSize: Math.round(size * 0.5),
          color: primary ? "var(--color-surface-container)" : "var(--color-on-surface)",
          fontVariationSettings: "'FILL' 1",
        }}>
        {icon}
      </span>
    </button>
  );
}

// ─── Sonos tile ────────────────────────────────────────────────────────────────

function SonosTile({ player, onRefresh }: { player: MediaPlayer; onRefresh: () => void }) {
  const playing = isPlaying(player.state);
  const [liveVol, setLiveVol] = useState<number | null>(null);
  const volPct = Math.round(((liveVol ?? player.volume_level ?? 0)) * 100);

  const subtitle = player.media_artist || player.media_channel || player.source || (playing ? "Spelar" : "Pausad");

  return (
    <div className="flex flex-col rounded-2xl overflow-hidden"
      style={{
        backgroundColor: "var(--color-surface-container)",
        border: `1.5px solid ${playing ? AMBER : "transparent"}`,
        boxShadow: playing ? `inset 0 0 0 99px ${AMBER}09` : "none",
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}>
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        {/* Album art / icon */}
        <div style={{
          width: 52, height: 52, borderRadius: 10, flexShrink: 0, overflow: "hidden",
          backgroundColor: playing ? `${AMBER}18` : "var(--color-surface-container-high)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {player.media_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={player.media_image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span className="material-symbols-outlined"
              style={{ fontSize: 26, color: playing ? AMBER : "var(--color-outline)", fontVariationSettings: playing ? "'FILL' 1" : "'FILL' 0" }}>
              speaker
            </span>
          )}
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold tracking-wide uppercase" style={{ color: "var(--color-on-surface-variant)" }}>{player.room}</p>
          <p className="text-sm font-bold truncate" style={{ color: "var(--color-on-surface)" }}>
            {player.media_title ?? player.name}
          </p>
          <p className="text-xs truncate" style={{ color: "var(--color-on-surface-variant)" }}>{subtitle}</p>
        </div>

        {/* Transport: prev / play-pause / next */}
        <div className="flex items-center gap-1.5">
          <TransportButton icon="skip_previous" label="Föregående" size={36}
            onClick={async () => { await callAction("media_previous_track", player.entity_id); onRefresh(); }} />
          <TransportButton icon={playing ? "pause" : "play_arrow"} label={playing ? "Pausa" : "Spela"} size={44} primary={playing}
            onClick={async () => { await callAction("media_play_pause", player.entity_id); onRefresh(); }} />
          <TransportButton icon="skip_next" label="Nästa" size={36}
            onClick={async () => { await callAction("media_next_track", player.entity_id); onRefresh(); }} />
        </div>
      </div>

      {/* Volume row */}
      <div className="flex items-center gap-3 px-4 pb-3 pt-1">
        <button onClick={async () => { vibrate(); await callAction("volume_mute", player.entity_id, { is_volume_muted: !player.is_volume_muted }); onRefresh(); }}
          aria-label={player.is_volume_muted ? "Unmuta" : "Muta"}
          style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4 }}>
          <span className="material-symbols-outlined"
            style={{ fontSize: 18, color: player.is_volume_muted ? "var(--color-error)" : "var(--color-on-surface-variant)" }}>
            {player.is_volume_muted ? "volume_off" : volPct === 0 ? "volume_mute" : volPct < 50 ? "volume_down" : "volume_up"}
          </span>
        </button>
        <input type="range" min={0} max={100}
          key={`${player.entity_id}-${player.volume_level ?? "x"}`}
          defaultValue={Math.round((player.volume_level ?? 0) * 100)}
          className="flex-1 cursor-pointer"
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
        <span className="text-[11px] font-medium shrink-0"
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

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl"
      style={{
        backgroundColor: "var(--color-surface-container)",
        border: `1.5px solid ${playing ? AMBER : "transparent"}`,
        boxShadow: playing ? `inset 0 0 0 99px ${AMBER}09` : "none",
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}>
      <div style={{
        width: 52, height: 52, borderRadius: 10, flexShrink: 0,
        backgroundColor: playing ? `${AMBER}18` : "var(--color-surface-container-high)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span className="material-symbols-outlined"
          style={{ fontSize: 26, color: playing ? AMBER : "var(--color-outline)", fontVariationSettings: "'FILL' 1" }}>
          tv
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold tracking-wide uppercase" style={{ color: "var(--color-on-surface-variant)" }}>{player.room}</p>
        <p className="text-sm font-bold truncate" style={{ color: "var(--color-on-surface)" }}>
          {player.media_title ?? player.name}
        </p>
        <p className="text-xs truncate" style={{ color: "var(--color-on-surface-variant)" }}>
          {player.source ? `${player.source} · ${player.state}` : player.state}
        </p>
      </div>
      {/* Transport + power */}
      <div className="flex items-center gap-1.5">
        <TransportButton icon="skip_previous" label="Föregående" size={36} disabled={isOff}
          onClick={async () => { await callAction("media_previous_track", player.entity_id); onRefresh(); }} />
        <TransportButton icon={playing ? "pause" : "play_arrow"} label={playing ? "Pausa" : "Spela"} size={44} primary={playing} disabled={isOff}
          onClick={async () => { await callAction("media_play_pause", player.entity_id); onRefresh(); }} />
        <TransportButton icon="skip_next" label="Nästa" size={36} disabled={isOff}
          onClick={async () => { await callAction("media_next_track", player.entity_id); onRefresh(); }} />
        <TransportButton icon="power_settings_new" label={isOff ? "Slå på" : "Stäng av"} size={36} primary={!isOff}
          onClick={async () => { await callAction(isOff ? "turn_on" : "turn_off", player.entity_id); onRefresh(); }} />
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

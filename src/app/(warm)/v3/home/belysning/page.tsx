"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { callAction } from "@/lib/actions";
import { useHydrated, useWarmTheme } from "@/lib/warm/theme";
import { haptic } from "@/lib/warm/haptics";
import {
  ACC,
  body,
  ital,
  lab,
  num,
  type WarmTheme,
} from "@/lib/warm/tokens";
import { DetailHeader, Pill } from "@/components/warm/primitives";
import { SceneGlyph } from "@/components/warm/icons";
import WarmErrorBanner from "@/components/warm/WarmErrorBanner";
import WarmSwitch from "@/components/warm/Switch";
import { activeSceneByLastChanged, type ScenePayload } from "@/lib/scenes";
import { RoomLightRow, type LightArea, type LightEntry } from "@/components/warm/RoomLights";
import { NEDERVANING, OVERVANING, UTOMHUS } from "@/lib/warm/rooms";
import { formatTime, lastDarkenedAt, sceneLabel } from "@/lib/warm/format";
import { mergeTransition, useTapFeedback } from "@/lib/warm/use-tap-feedback";
import type { AwayPayload } from "@/app/api/homeassistant/away/route";

type LightsData = { areas: LightArea[] };

const SCENE_ENTRIES: Array<{ key: string; label: string; glyph: "morgon" | "dag" | "kvall" | "natt" }> = [
  { key: "god_morgon", label: "Morgon", glyph: "morgon" },
  { key: "hemma", label: "Hemma", glyph: "dag" },
  { key: "kvall", label: "Kväll", glyph: "kvall" },
  { key: "natt", label: "Natt", glyph: "natt" },
];

function sortByFloor(areas: LightArea[]) {
  const byName = (a: LightArea, b: LightArea) => a.name.localeCompare(b.name, "sv");
  const neder = areas.filter((a) => NEDERVANING.includes(a.name)).sort(byName);
  const over = areas.filter((a) => OVERVANING.includes(a.name)).sort(byName);
  const utomhus = areas.filter((a) => UTOMHUS.includes(a.name)).sort(byName);
  const other = areas
    .filter(
      (a) => !NEDERVANING.includes(a.name) && !OVERVANING.includes(a.name) && !UTOMHUS.includes(a.name)
    )
    .sort(byName);
  return { neder, over, utomhus, other };
}

function ScenePill({
  t,
  entry,
  isActive,
  isLoading,
  onActivate,
}: {
  t: WarmTheme;
  entry: (typeof SCENE_ENTRIES)[number];
  isActive: boolean;
  isLoading: boolean;
  onActivate: (key: string) => void;
}) {
  const tap = useTapFeedback({
    ringColor: isActive ? "rgba(255, 251, 240, 0.45)" : undefined,
  });
  return (
    <button
      type="button"
      {...tap.handlers}
      onClick={() => {
        void haptic("tap");
        onActivate(entry.key);
      }}
      aria-pressed={isActive}
      style={{
        ...tap.style,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        padding: "10px 4px",
        borderRadius: 999,
        background: isActive ? ACC : t.paper,
        border: `1px solid ${isActive ? ACC : t.line}`,
        color: isActive ? "#FFFBF0" : t.ink,
        cursor: "pointer",
        opacity: isLoading ? 0.6 : 1,
        transition: mergeTransition(
          tap.style.transition as string,
          "background 160ms, border-color 160ms"
        ),
        flex: "1 1 0",
        minWidth: 0,
      }}
    >
      {tap.ring}
      <SceneGlyph
        scene={entry.glyph}
        size={13}
        color={isActive ? "#FFFBF0" : t.mute}
      />
      <span
        style={{
          fontFamily: body,
          fontSize: 12,
          fontWeight: isActive ? 600 : 500,
          whiteSpace: "nowrap",
        }}
      >
        {entry.label}
      </span>
    </button>
  );
}

function SceneRow({
  t,
  active,
  activeSince,
  darkSince,
  loading,
  onActivate,
}: {
  t: WarmTheme;
  active: string | null;
  activeSince: string | null;
  darkSince: string | null;
  loading: string | null;
  onActivate: (key: string) => void;
}) {
  const sinceLabel = active && activeSince
    ? `${sceneLabel(active)} sedan ${formatTime(activeSince)}`
    : darkSince
    ? `släckt sedan ${formatTime(darkSince)}`
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
        {sinceLabel && <span style={ital(t, 12, t.dim)}>{sinceLabel}</span>}
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "nowrap",
          gap: 6,
          overflow: "hidden",
        }}
      >
        {SCENE_ENTRIES.map((s) => (
          <ScenePill
            key={s.key}
            t={t}
            entry={s}
            isActive={active === s.key}
            isLoading={loading === s.key}
            onActivate={onActivate}
          />
        ))}
      </div>
    </div>
  );
}

function FloorSection({
  t,
  title,
  list,
  expandedId,
  onToggleExpand,
  onToggleArea,
  onToggleLight,
  onBrightness,
  onSectionOff,
  offLoading,
  sectionKey,
}: {
  t: WarmTheme;
  title: string;
  list: LightArea[];
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  onToggleArea: (a: LightArea) => void;
  onToggleLight: (l: LightEntry) => void;
  onBrightness: (id: string, pct: number) => void;
  onSectionOff: (key: string, list: LightArea[]) => void;
  offLoading: string | null;
  sectionKey: string;
}) {
  if (list.length === 0) return null;
  const sectionOn = list.reduce((s, a) => s + a.on_count, 0);
  const sectionAll = list.reduce((s, a) => s + a.total_count, 0);
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={lab(t)}>{title}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontFamily: body,
              fontSize: 11,
              fontWeight: 600,
              color: sectionOn > 0 ? t.ink : t.dim,
            }}
            className="warm-tab-nums"
          >
            {sectionOn}/{sectionAll} på
          </span>
          {sectionOn > 0 && (
            <button
              type="button"
              onClick={() => {
                void haptic("tap");
                onSectionOff(sectionKey, list);
              }}
              disabled={offLoading === sectionKey}
              style={{
                fontFamily: body,
                fontSize: 11,
                fontWeight: 600,
                color: t.mute,
                padding: "4px 10px",
                borderRadius: 999,
                background: t.tint,
                border: `1px solid ${t.line}`,
                opacity: offLoading === sectionKey ? 0.5 : 1,
                cursor: "pointer",
              }}
            >
              Släck
            </button>
          )}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {list.map((area) => (
          <RoomLightRow
            key={area.area_id}
            area={area}
            t={t}
            expanded={expandedId === area.area_id}
            onToggleExpand={() => onToggleExpand(area.area_id)}
            onToggleArea={onToggleArea}
            onToggleLight={onToggleLight}
            onBrightness={onBrightness}
          />
        ))}
      </div>
    </section>
  );
}

function SuitcaseIcon({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M3 12h18" />
    </svg>
  );
}

function AwayModeTile({ t }: { t: WarmTheme }) {
  const hydrated = useHydrated();
  const tap = useTapFeedback();
  const { data, mutate, error } = useSWR<AwayPayload>(
    hydrated ? "/api/homeassistant/away" : null,
    fetcher,
    { refreshInterval: 10_000 }
  );
  const [pending, setPending] = useState(false);
  const active = data?.active ?? false;
  const disabled = !data && !error;

  async function toggle() {
    if (pending) return;
    setPending(true);
    const next = !active;
    // Optimistic update så pillens visuella state svarar omedelbart.
    void mutate(
      data ? { ...data, active: next } : { active: next, lastChanged: null },
      { revalidate: false }
    );
    try {
      await fetch("/api/homeassistant/away", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: next }),
      });
      await new Promise((r) => setTimeout(r, 400));
      await mutate();
    } finally {
      setPending(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={lab(t)}>FRÅNVARO</span>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-pressed={active}
        {...tap.handlers}
        onClick={() => {
          if (disabled || pending) return;
          void haptic("tap");
          void toggle();
        }}
        onKeyDown={(e) => {
          if (disabled || pending) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            void haptic("tap");
            void toggle();
          }
        }}
        style={{
          ...tap.style,
          display: "flex",
          alignItems: "center",
          gap: 14,
          width: "100%",
          padding: "14px 16px",
          borderRadius: 14,
          background: active ? t.tint : t.paper,
          border: `1px solid ${active ? ACC : t.line}`,
          color: t.ink,
          cursor: disabled ? "default" : "pointer",
          opacity: pending ? 0.7 : 1,
          transition: mergeTransition(
            tap.style.transition as string,
            "background 160ms, border-color 160ms"
          ),
        }}
      >
        {tap.ring}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 38,
            height: 38,
            borderRadius: 999,
            background: active ? ACC : t.paperHi,
            border: `1px solid ${active ? ACC : t.line}`,
            flexShrink: 0,
          }}
        >
          <SuitcaseIcon color={active ? "#FFFBF0" : t.mute} size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: body,
              fontSize: 14,
              fontWeight: 600,
              color: t.ink,
              lineHeight: 1.2,
            }}
          >
            Semesterläge
          </div>
          <div
            style={{
              ...ital(t, 12, active ? t.mute : t.dim),
              lineHeight: 1.3,
              marginTop: 2,
            }}
          >
            {active
              ? "simulering aktiv · släcks 23:00"
              : "slumpat läge när ingen är hemma"}
          </div>
        </div>
        <WarmSwitch
          on={active}
          onChange={() => {
            void haptic("tap");
            void toggle();
          }}
          t={t}
          ariaLabel="Semesterläge"
        />
      </div>
    </div>
  );
}

export default function WarmLightingPage() {
  const router = useRouter();
  const { t } = useWarmTheme();
  const hydrated = useHydrated();
  const { data: lights, error, mutate } = useSWR<LightsData>(
    hydrated ? "/api/homeassistant/lights" : null,
    fetcher,
    { refreshInterval: 3_000 }
  );
  const { data: scenesData, mutate: mScenes } = useSWR<{ scenes: ScenePayload[] }>(
    hydrated ? "/api/homeassistant/scenes" : null,
    fetcher,
    { refreshInterval: 60_000 }
  );

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [offLoading, setOffLoading] = useState<string | null>(null);
  const [sceneLoading, setSceneLoading] = useState<string | null>(null);

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

  const areas = lights && "areas" in lights ? lights.areas : [];
  const totalOn = areas.reduce((s, a) => s + a.on_count, 0);
  const totalAll = areas.reduce((s, a) => s + a.total_count, 0);
  const { neder, over, utomhus, other } = sortByFloor(areas);

  async function handleScene(key: string) {
    if (sceneLoading) return;
    setSceneLoading(key);
    try {
      await callAction("scene", "turn_on", `scene.${key}`);
      await new Promise((r) => setTimeout(r, 500));
      await Promise.all([mutate(), mScenes()]);
    } finally {
      setSceneLoading(null);
    }
  }
  async function handleSectionOff(key: string, list: LightArea[]) {
    if (offLoading) return;
    setOffLoading(key);
    try {
      const ids = list.flatMap((a) => a.lights.map((l) => l.entity_id));
      if (ids.length) await callAction("light", "turn_off", ids);
      await mutate();
    } finally {
      setOffLoading(null);
    }
  }
  async function handleAllOff() {
    setOffLoading("all");
    try {
      const ids = areas.flatMap((a) => a.lights.map((l) => l.entity_id));
      if (ids.length) await callAction("light", "turn_off", ids);
      await mutate();
    } finally {
      setOffLoading(null);
    }
  }
  async function handleToggleArea(area: LightArea) {
    await callAction(
      "light",
      area.on_count > 0 ? "turn_off" : "turn_on",
      area.lights.map((l) => l.entity_id)
    );
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

  return (
    <>
      <DetailHeader
        t={t}
        back={() => router.push("/v3/home")}
        backLabel="Hem"
        title="Belysning"
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

        {/* Stat-rad: poetisk text + räknare + Släck allt */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <span style={ital(t, 14, t.mute)}>
            {(() => {
              if (totalAll === 0) return "inga lampor";
              if (totalOn === 0) return "huset i mörker";
              if (totalOn === totalAll) return "fullt belyst";
              const ratio = totalOn / totalAll;
              if (ratio < 0.3) return "ett dämpat sken";
              if (ratio < 0.7) return "huset i ljus";
              return "nästan allt på";
            })()}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              className="warm-tab-nums"
              style={{ ...num(t, 22, 400), color: t.ink, lineHeight: 1 }}
            >
              {totalOn}
              <span style={{ color: t.dim }}>/{totalAll}</span>
            </span>
            {totalOn > 0 && (
              <button
                type="button"
                onClick={() => {
                  void haptic("tap");
                  handleAllOff();
                }}
                disabled={offLoading === "all"}
                style={{
                  fontFamily: body,
                  fontSize: 12,
                  fontWeight: 600,
                  color: t.ink,
                  padding: "6px 12px",
                  borderRadius: 999,
                  background: t.tint,
                  border: `1px solid ${t.line}`,
                  opacity: offLoading === "all" ? 0.5 : 1,
                  cursor: "pointer",
                }}
              >
                Släck allt
              </button>
            )}
          </div>
        </div>

        <SceneRow
          t={t}
          active={activeScene}
          activeSince={activeSince}
          darkSince={
            !activeScene && areas.length > 0
              ? lastDarkenedAt(areas.flatMap((a) => a.lights))
              : null
          }
          loading={sceneLoading}
          onActivate={handleScene}
        />

        <AwayModeTile t={t} />

        {areas.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 56,
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
            <FloorSection
              t={t}
              title="Nedervåning"
              list={neder}
              sectionKey="neder"
              expandedId={expandedId}
              onToggleExpand={(id) => setExpandedId(expandedId === id ? null : id)}
              onToggleArea={handleToggleArea}
              onToggleLight={handleToggleLight}
              onBrightness={handleBrightness}
              onSectionOff={handleSectionOff}
              offLoading={offLoading}
            />
            <FloorSection
              t={t}
              title="Övervåning"
              list={over}
              sectionKey="over"
              expandedId={expandedId}
              onToggleExpand={(id) => setExpandedId(expandedId === id ? null : id)}
              onToggleArea={handleToggleArea}
              onToggleLight={handleToggleLight}
              onBrightness={handleBrightness}
              onSectionOff={handleSectionOff}
              offLoading={offLoading}
            />
            <FloorSection
              t={t}
              title="Utomhus"
              list={utomhus}
              sectionKey="ute"
              expandedId={expandedId}
              onToggleExpand={(id) => setExpandedId(expandedId === id ? null : id)}
              onToggleArea={handleToggleArea}
              onToggleLight={handleToggleLight}
              onBrightness={handleBrightness}
              onSectionOff={handleSectionOff}
              offLoading={offLoading}
            />
            {other.length > 0 && (
              <FloorSection
                t={t}
                title="Övrigt"
                list={other}
                sectionKey="other"
                expandedId={expandedId}
                onToggleExpand={(id) => setExpandedId(expandedId === id ? null : id)}
                onToggleArea={handleToggleArea}
                onToggleLight={handleToggleLight}
                onBrightness={handleBrightness}
                onSectionOff={handleSectionOff}
                offLoading={offLoading}
              />
            )}
          </>
        )}

        {/* Avslutande pill-rad: status-snabbsummering */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <Pill t={t} tone="neutral">
            {neder.reduce((s, a) => s + a.on_count, 0)} på nedervåning
          </Pill>
          <Pill t={t} tone="neutral">
            {over.reduce((s, a) => s + a.on_count, 0)} på övervåning
          </Pill>
          <Pill t={t} tone="neutral">
            {utomhus.reduce((s, a) => s + a.on_count, 0)} ute
          </Pill>
        </div>
      </div>
    </>
  );
}

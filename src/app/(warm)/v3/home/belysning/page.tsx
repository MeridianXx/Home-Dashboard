"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  type WarmTheme,
} from "@/lib/warm/tokens";
import { DetailHeader, Pill } from "@/components/warm/primitives";
import { SceneGlyph } from "@/components/warm/icons";
import WarmErrorBanner from "@/components/warm/WarmErrorBanner";
import { detectActiveScene, type ScenePayload } from "@/lib/scenes";
import { RoomLightRow, type LightArea, type LightEntry } from "@/components/warm/RoomLights";
import { NEDERVANING, OVERVANING, UTOMHUS } from "@/lib/warm/rooms";

type LightsData = { areas: LightArea[] };

const SCENE_ENTRIES: Array<{ key: string; label: string; glyph: "morgon" | "dag" | "kvall" | "natt" }> = [
  { key: "god_morgon", label: "Morgon", glyph: "morgon" },
  { key: "hemma", label: "Dag", glyph: "dag" },
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

function SceneRow({
  t,
  active,
  loading,
  onActivate,
}: {
  t: WarmTheme;
  active: string | null;
  loading: string | null;
  onActivate: (key: string) => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${SCENE_ENTRIES.length}, minmax(0, 1fr))`,
        gap: 8,
      }}
    >
      {SCENE_ENTRIES.map((s) => {
        const isActive = active === s.key;
        const isLoading = loading === s.key;
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => onActivate(s.key)}
            aria-pressed={isActive}
            style={{
              display: "inline-flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              padding: "12px 4px",
              borderRadius: 14,
              background: isActive ? ACC : t.paper,
              border: `1px solid ${isActive ? ACC : t.line}`,
              color: isActive ? "#FFFBF0" : t.ink,
              cursor: "pointer",
              opacity: isLoading ? 0.6 : 1,
              transition: "background 160ms, border-color 160ms",
            }}
          >
            <SceneGlyph scene={s.glyph} size={18} color={isActive ? "#FFFBF0" : t.mute} />
            <span
              style={{
                fontFamily: body,
                fontSize: 11,
                fontWeight: isActive ? 600 : 500,
              }}
            >
              {s.label}
            </span>
          </button>
        );
      })}
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
              onClick={() => onSectionOff(sectionKey, list)}
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

export default function WarmLightingPage() {
  const router = useRouter();
  const { t } = useWarmTheme();
  const { data: lights, error, mutate } = useSWR<LightsData>(
    "/api/homeassistant/lights",
    fetcher,
    { refreshInterval: 3_000 }
  );
  const { data: scenesData } = useSWR<{ scenes: ScenePayload[] }>(
    "/api/homeassistant/scenes",
    fetcher,
    { refreshInterval: 60_000 }
  );

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [offLoading, setOffLoading] = useState<string | null>(null);
  const [sceneLoading, setSceneLoading] = useState<string | null>(null);

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

  const areas = lights && "areas" in lights ? lights.areas : [];
  const totalOn = areas.reduce((s, a) => s + a.on_count, 0);
  const totalAll = areas.reduce((s, a) => s + a.total_count, 0);
  const { neder, over, utomhus, other } = sortByFloor(areas);

  async function handleScene(key: string) {
    if (sceneLoading) return;
    setSceneLoading(key);
    try {
      await callAction("scene", "turn_on", `scene.${key}`);
      await new Promise((r) => setTimeout(r, 600));
      await mutate();
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
        right={
          totalOn > 0 ? (
            <button
              type="button"
              onClick={handleAllOff}
              disabled={offLoading === "all"}
              style={{
                fontFamily: body,
                fontSize: 11,
                fontWeight: 600,
                color: t.mute,
                padding: "4px 10px",
                borderRadius: 999,
                background: t.tint,
                border: `1px solid ${t.line}`,
                opacity: offLoading === "all" ? 0.5 : 1,
                cursor: "pointer",
              }}
            >
              Släck allt
            </button>
          ) : null
        }
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
            {totalOn > 0 ? `${totalOn} av ${totalAll} lampor på` : "Allt är släckt"}
          </span>
          <span
            className="warm-tab-nums"
            style={{ ...num(t, 18, 500), color: t.ink }}
          >
            {totalOn}/{totalAll}
          </span>
        </div>

        <SceneRow
          t={t}
          active={activeScene}
          loading={sceneLoading}
          onActivate={handleScene}
        />

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

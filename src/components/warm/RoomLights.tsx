"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import WarmSwitch from "@/components/warm/Switch";
import { BulbIcon, ChevronDown, ChevronUp } from "@/components/warm/icons/extra";
import { ACC, body, type WarmTheme } from "@/lib/warm/tokens";
import { haptic } from "@/lib/warm/haptics";

type LightEntry = {
  entity_id: string;
  name: string;
  state: string;
  brightness_pct: number | null;
  dimmable: boolean;
  color_temp_kelvin?: number | null;
  last_changed?: string | null;
};
type LightArea = {
  area_id: string;
  name: string;
  lights: LightEntry[];
  on_count: number;
  total_count: number;
};

export function RoomLightRow({
  area,
  expanded,
  onToggleExpand,
  onToggleArea,
  onToggleLight,
  onBrightness,
  t,
}: {
  area: LightArea;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleArea: (a: LightArea) => void;
  onToggleLight: (l: LightEntry) => void;
  onBrightness: (entity_id: string, pct: number) => void;
  t: WarmTheme;
}) {
  const on = area.on_count > 0;
  const [liveBrightness, setLiveBrightness] = useState<Record<string, number>>({});
  // Senast hapticade 10%-steg per lampa — så vi inte fyrar haptic på varje pixel-rörelse.
  const lastStep = useRef<Record<string, number>>({});
  return (
    <div
      style={{
        background: t.paper,
        border: `1px solid ${on ? ACC : t.line}`,
        borderRadius: 14,
        overflow: "hidden",
        transition: "border-color 200ms",
      }}
    >
      <div style={{ display: "flex", alignItems: "stretch" }}>
        <button
          type="button"
          onClick={() => {
            void haptic("tap");
            onToggleArea(area);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flex: 1,
            minWidth: 0,
            padding: "12px 14px",
            textAlign: "left",
            cursor: "pointer",
            color: t.ink,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: on ? t.tint : t.tintSky,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <BulbIcon size={16} color={on ? ACC : t.mute} fill={on ? ACC : undefined} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <span
              style={{
                fontFamily: body,
                fontSize: 14,
                fontWeight: 600,
                color: t.ink,
                display: "block",
                // lineHeight 1.4 ger plats åt descenders (g/y/p) — utan det
                // klipps de av default-lineHeight + button-overflow.
                lineHeight: 1.4,
              }}
            >
              {area.name}
            </span>
            <span
              style={{
                fontFamily: body,
                fontSize: 11,
                color: t.mute,
                lineHeight: 1.4,
              }}
            >
              {area.total_count > 1
                ? `${area.on_count}/${area.total_count} på`
                : on
                ? "På"
                : "Av"}
            </span>
          </div>
        </button>
        <button
          type="button"
          onClick={() => {
            void haptic("tap");
            onToggleExpand();
          }}
          aria-label={expanded ? "Dölj lampor" : "Visa lampor"}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 44,
            borderLeft: `1px solid ${t.line}`,
            cursor: "pointer",
            color: t.mute,
          }}
        >
          {expanded ? (
            <ChevronUp size={16} color={t.mute} />
          ) : (
            <ChevronDown size={16} color={t.mute} />
          )}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ overflow: "hidden" }}
          >
            <div
              style={{
                borderTop: `1px solid ${t.line}`,
                padding: "12px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                background: t.paperHi,
              }}
            >
              {area.lights.map((light) => {
                const lon = light.state === "on";
                const live = liveBrightness[light.entity_id];
                return (
                  <div
                    key={light.entity_id}
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <BulbIcon
                        size={14}
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
                          // lineHeight 1.5 ger plats åt descenders (g/y/p)
                          // som annars klipps av overflow:hidden + nowrap.
                          lineHeight: 1.5,
                        }}
                      >
                        {light.name}
                      </span>
                      <WarmSwitch
                        on={lon}
                        onChange={() => onToggleLight(light)}
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
                          paddingLeft: 26,
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
                            setLiveBrightness((p) => ({ ...p, [light.entity_id]: v }));
                            const step = Math.round(v / 10) * 10;
                            if (lastStep.current[light.entity_id] !== step) {
                              lastStep.current[light.entity_id] = step;
                              void haptic("select");
                            }
                          }}
                          onMouseUp={(e) =>
                            onBrightness(
                              light.entity_id,
                              parseInt((e.target as HTMLInputElement).value)
                            )
                          }
                          onTouchEnd={(e) =>
                            onBrightness(
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export type { LightArea, LightEntry };

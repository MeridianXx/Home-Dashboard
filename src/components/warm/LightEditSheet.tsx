"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ACC, body, ital, lab, num, serif, type WarmTheme } from "@/lib/warm/tokens";
import { kelvinLabel } from "@/lib/warm/format";
import { CheckIcon } from "@/components/warm/icons/extra";
import { SunIcon } from "@/components/warm/icons/extra";
import { haptic } from "@/lib/warm/haptics";

type LightEntry = {
  entity_id: string;
  name: string;
  state: string;
  brightness_pct: number | null;
  dimmable: boolean;
  color_temp_kelvin: number | null;
};

type AdaptiveInstance = {
  entity_id: string;
  configuration_id: string;
  enabled: boolean;
  manual_control: string[];
  /** AL:s aktuella sol-baserade K. Om AL är på + ingen manual override
   *  är detta den verkliga "borde-vara"-temperaturen, vilket ofta skiljer
   *  sig från lampans state.color_temp_kelvin (som halkar efter mellan
   *  AL:s skriv-cykler). */
  color_temp_kelvin?: number | null;
  brightness_pct?: number | null;
};

const KELVIN_PRESETS: Array<{ value: number; label: string }> = [
  { value: 2200, label: "Stearin" },
  { value: 2700, label: "Varm" },
  { value: 3500, label: "Neutral" },
  { value: 4500, label: "Dagsljus" },
  { value: 5500, label: "Kall" },
];

const KELVIN_MIN = 2000;
const KELVIN_MAX = 6500;

export default function LightEditSheet({
  t,
  light,
  open,
  onClose,
  adaptive,
  onSetKelvin,
  onToggleAdaptive,
}: {
  t: WarmTheme;
  light: LightEntry | null;
  open: boolean;
  onClose: () => void;
  adaptive: AdaptiveInstance | null; // den AL-instans som styr denna lampa, om någon
  onSetKelvin: (entity_id: string, kelvin: number) => Promise<void> | void;
  onToggleAdaptive: (instance: AdaptiveInstance) => Promise<void> | void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [liveKelvin, setLiveKelvin] = useState<number | null>(null);
  // Senast hapticade 10%-steg på K-slidern.
  const lastKelvinStep = useRef<number>(-1);

  useEffect(() => {
    if (open) setLiveKelvin(null);
  }, [open, light?.entity_id]);

  if (!mounted || !open || !light) return null;

  const adaptiveOn = adaptive?.enabled ?? false;
  const manualOverride = adaptive?.manual_control.includes(light.entity_id) ?? false;
  // När AL är primärkälla (på + ingen manual override) speglar vi AL:s
  // beräknade sol-K, inte lampans cached state. Lampans state halkar ofta
  // efter AL:s ramp-cykler — användaren skulle då se 2000K mitt på dagen
  // även om AL kör 4500K. Live-drag override:ar alltid båda.
  const alK = adaptive?.color_temp_kelvin ?? null;
  const useAlK = adaptiveOn && !manualOverride && alK != null;
  const currentK = liveKelvin ?? (useAlK ? alK : light.color_temp_kelvin ?? 2700);
  // Slider-fyllning clampas mellan 0-100% — AL kan rapportera värden utanför
  // KELVIN_MIN/MAX-intervallet (sleep mode = 1000K), och slidern ska då bara
  // visas tom/full, inte gå negativt.
  const fillPct = Math.max(0, Math.min(100, ((currentK - KELVIN_MIN) / (KELVIN_MAX - KELVIN_MIN)) * 100));

  const sheet = (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        background: "rgba(20,14,8,0.55)",
        backdropFilter: "blur(6px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: t.paper,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          borderTop: `1px solid ${t.line}`,
          padding: "20px 22px 28px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        {/* Drag-handle */}
        <div
          style={{
            alignSelf: "center",
            width: 36,
            height: 4,
            borderRadius: 999,
            background: t.line,
            marginBottom: 4,
          }}
        />

        {/* Header */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ ...lab(t), color: ACC, letterSpacing: "0.18em" }}>
            FÄRGTEMPERATUR
          </span>
          <h2
            style={{
              ...num(t, 24, 400),
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            {light.name},{" "}
            <span style={{ ...ital(t, 24, t.dim) }}>
              {kelvinLabel(currentK)}.
            </span>
          </h2>
        </div>

        {/* Aktuellt K-värde */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
          }}
        >
          <span style={ital(t, 13, t.mute)}>nuvarande inställning</span>
          <span
            className="warm-tab-nums"
            style={{ fontFamily: serif, fontSize: 28, color: t.ink }}
          >
            {currentK}
            <span
              style={{
                fontFamily: body,
                fontSize: 12,
                color: t.mute,
                marginLeft: 3,
                fontWeight: 500,
              }}
            >
              K
            </span>
          </span>
        </div>

        {/* Slider */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <input
            type="range"
            min={KELVIN_MIN}
            max={KELVIN_MAX}
            step={50}
            aria-label="Färgtemperatur i Kelvin"
            defaultValue={currentK}
            style={
              {
                width: "100%",
                "--fill": `${fillPct}%`,
              } as React.CSSProperties
            }
            onInput={(e) => {
              const el = e.currentTarget;
              const v = parseInt(el.value);
              const fp = ((v - KELVIN_MIN) / (KELVIN_MAX - KELVIN_MIN)) * 100;
              el.style.setProperty("--fill", `${fp}%`);
              setLiveKelvin(v);
              const step = Math.round(fp / 10) * 10;
              if (lastKelvinStep.current !== step) {
                lastKelvinStep.current = step;
                void haptic("select");
              }
            }}
            onMouseUp={async (e) => {
              const v = parseInt((e.target as HTMLInputElement).value);
              await onSetKelvin(light.entity_id, v);
            }}
            onTouchEnd={async (e) => {
              const v = parseInt((e.target as HTMLInputElement).value);
              await onSetKelvin(light.entity_id, v);
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontFamily: body,
              fontSize: 10,
              color: t.dim,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <span>{KELVIN_MIN}K</span>
            <span>{KELVIN_MAX}K</span>
          </div>
        </div>

        {/* Presets */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ ...lab(t, { fontSize: 9 }), color: t.dim }}>
            FÖRINSTÄLLNINGAR
          </span>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${KELVIN_PRESETS.length}, minmax(0, 1fr))`,
              gap: 6,
            }}
          >
            {KELVIN_PRESETS.map((p) => {
              const active = Math.abs(currentK - p.value) <= 100;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={async () => {
                    setLiveKelvin(p.value);
                    await onSetKelvin(light.entity_id, p.value);
                  }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 2,
                    padding: "10px 4px",
                    borderRadius: 12,
                    background: active ? ACC : t.paperHi,
                    border: `1px solid ${active ? ACC : t.line}`,
                    color: active ? "#FFFBF0" : t.ink,
                    cursor: "pointer",
                  }}
                >
                  <span
                    className="warm-tab-nums"
                    style={{
                      fontFamily: serif,
                      fontSize: 14,
                    }}
                  >
                    {p.value}
                  </span>
                  <span
                    style={{
                      fontFamily: body,
                      fontSize: 10,
                      fontWeight: 500,
                      opacity: active ? 1 : 0.7,
                    }}
                  >
                    {p.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Följ solen — adaptive lighting */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "14px 14px",
            borderRadius: 12,
            background: t.paperHi,
            border: `1px solid ${t.line}`,
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}
          >
            <SunIcon size={20} color={adaptiveOn ? ACC : t.mute} />
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span
                style={{
                  fontFamily: serif,
                  fontSize: 16,
                  fontWeight: 500,
                  color: t.ink,
                }}
              >
                Följ solen
              </span>
              <span style={ital(t, 12, t.mute)}>
                {!adaptive
                  ? "ingen Adaptive Lighting-instans hittad"
                  : adaptiveOn
                  ? manualOverride
                    ? "manuell override aktiv"
                    : "automatisk färgtemperatur"
                  : "av — manuell styrning"}
              </span>
            </div>
          </div>
          {adaptive && (
            <button
              type="button"
              onClick={() => onToggleAdaptive(adaptive)}
              aria-label={adaptiveOn ? "Stäng av Följ solen" : "Slå på Följ solen"}
              style={{
                position: "relative",
                width: 44,
                height: 26,
                borderRadius: 13,
                flexShrink: 0,
                background: adaptiveOn ? ACC : t.line,
                border: `1px solid ${adaptiveOn ? ACC : t.line}`,
                cursor: "pointer",
                transition: "background-color 0.18s",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 2,
                  left: adaptiveOn ? 20 : 2,
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: t.paperHi,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  transition: "left 0.15s",
                }}
              />
            </button>
          )}
        </div>

        {/* Stäng */}
        <button
          type="button"
          onClick={onClose}
          style={{
            alignSelf: "center",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 20px",
            borderRadius: 999,
            background: ACC,
            border: `1px solid ${ACC}`,
            color: "#FFFBF0",
            fontFamily: body,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <CheckIcon size={14} color="#FFFBF0" />
          Klart
        </button>
      </div>
    </div>
  );

  return createPortal(sheet, document.body);
}

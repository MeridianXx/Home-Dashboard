"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useHydrated, useWarmTheme } from "@/lib/warm/theme";
import {
  ACC,
  SAGE,
  body,
  ital,
  lab,
  num,
  serif,
  type WarmTheme,
} from "@/lib/warm/tokens";
import { ChevronLeft } from "@/components/warm/icons/extra";
import { haptic } from "@/lib/warm/haptics";
import WarmErrorBanner from "@/components/warm/WarmErrorBanner";
import { formatTime, spotLabel } from "@/lib/warm/format";

type EnergyData = {
  spot_price_ore: number | null;
  spot_level: string;
  current_power_w: number;
  avg_power_w: number;
  min_power_w: number;
  max_power_w: number;
  accumulated_kwh: number;
  accumulated_cost_sek: number;
  monthly_cost_sek: number;
  monthly_kwh: number;
};
type Car = {
  id: string;
  name: string;
  soc: number;
  target_soc: number;
  range_km: number;
  plugged_in: boolean;
  charging: boolean;
};
type CarsData = { cars: Car[] };

function PageHeading({
  t,
  back,
  title,
  italicTail,
}: {
  t: WarmTheme;
  back: () => void;
  title: string;
  italicTail: string | null;
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
        onClick={() => { void haptic("tap"); back(); }}
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
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span
          style={{
            ...lab(t),
            color: ACC,
            letterSpacing: "0.18em",
          }}
          className="warm-tab-nums"
        >
          ENERGI · {formatTime(new Date())}
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
      </div>
    </header>
  );
}

function StatRow({
  t,
  label,
  primary,
  secondary,
  isLast,
}: {
  t: WarmTheme;
  label: string;
  primary: string;
  secondary?: string;
  isLast?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 12,
        padding: "12px 16px",
        borderBottom: isLast ? "none" : `1px solid ${t.line}`,
      }}
    >
      <span style={{ fontFamily: serif, fontSize: 16, color: t.ink }}>
        {label}
      </span>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span
          className="warm-tab-nums"
          style={{ fontFamily: serif, fontSize: 17, color: t.ink }}
        >
          {primary}
        </span>
        {secondary && (
          <span style={ital(t, 12, t.mute)}>· {secondary}</span>
        )}
      </div>
    </div>
  );
}

export default function WarmEnergiPage() {
  const router = useRouter();
  const { t } = useWarmTheme();
  const hydrated = useHydrated();
  const { data: energy, error: energyError, mutate: mEnergy } = useSWR<EnergyData>(
    hydrated ? "/api/homeassistant/energy" : null,
    fetcher,
    { refreshInterval: 5_000 }
  );
  const { data: cars, error: carsError } = useSWR<CarsData>(
    hydrated ? "/api/homeassistant/cars" : null,
    fetcher,
    { refreshInterval: 60_000 }
  );

  const krPerKwh =
    energy?.spot_price_ore != null ? energy.spot_price_ore / 100 : null;
  const carList = cars && "cars" in cars ? cars.cars : [];
  const charging = carList.filter((c) => c.charging);
  const headerTail = charging.length > 0 ? "laddar" : null;

  return (
    <>
      <PageHeading
        t={t}
        back={() => router.push("/v3/home")}
        title="Energi"
        italicTail={headerTail}
      />

      <div
        style={{
          padding: "0 22px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        {(energyError || carsError) && (
          <WarmErrorBanner t={t} onRetry={() => mEnergy()} />
        )}

        {/* Stort spotpris-tile */}
        <div
          style={{
            background: t.paper,
            border: `1px solid ${t.line}`,
            borderRadius: 16,
            padding: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ ...lab(t), letterSpacing: "0.16em" }}>
              SPOTPRIS · NU
            </span>
            {energy?.spot_level && (
              <span style={ital(t, 12, t.dim)}>{spotLabel(energy.spot_level)}</span>
            )}
          </div>
          {krPerKwh != null && (
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 6,
                marginTop: 10,
              }}
            >
              <span
                className="warm-tab-nums"
                style={{ ...num(t, 44, 400), lineHeight: 1 }}
              >
                {krPerKwh.toFixed(2).replace(".", ",")}
              </span>
              <span
                style={{
                  fontFamily: body,
                  fontSize: 14,
                  color: t.mute,
                  fontWeight: 500,
                }}
              >
                kr/kWh
              </span>
            </div>
          )}
        </div>

        {/* Förbrukning + effekt */}
        {energy && (
          <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={lab(t)}>FÖRBRUKNING</span>
            <div
              style={{
                background: t.paper,
                border: `1px solid ${t.line}`,
                borderRadius: 14,
                overflow: "hidden",
              }}
            >
              <StatRow
                t={t}
                label="Just nu"
                primary={`${Math.round(energy.current_power_w)} W`}
                secondary={
                  energy.avg_power_w
                    ? `snitt ${Math.round(energy.avg_power_w)} W`
                    : undefined
                }
              />
              <StatRow
                t={t}
                label="Idag"
                primary={`${energy.accumulated_kwh.toFixed(1)} kWh`}
                secondary={
                  energy.accumulated_cost_sek
                    ? `${energy.accumulated_cost_sek.toFixed(0)} kr`
                    : undefined
                }
              />
              <StatRow
                t={t}
                label="Denna månad"
                primary={`${Math.round(energy.monthly_kwh)} kWh`}
                secondary={
                  energy.monthly_cost_sek
                    ? `${Math.round(energy.monthly_cost_sek)} kr`
                    : undefined
                }
                isLast
              />
            </div>
          </section>
        )}

        {/* Effekt-extremer (min/max) */}
        {energy && energy.min_power_w !== 0 && (
          <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={lab(t)}>EFFEKT IDAG</span>
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
              <Stat t={t} label="MIN" value={`${Math.round(energy.min_power_w)}`} unit="W" />
              <Stat t={t} label="SNITT" value={`${Math.round(energy.avg_power_w)}`} unit="W" />
              <Stat t={t} label="MAX" value={`${Math.round(energy.max_power_w)}`} unit="W" />
            </div>
          </section>
        )}

        {/* Bilar */}
        {carList.length > 0 && (
          <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={lab(t)}>BILAR</span>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {carList.map((car) => {
                const barColor = car.charging
                  ? SAGE
                  : car.soc < 20
                  ? "#B0452E"
                  : t.mute;
                return (
                  <div
                    key={car.id}
                    style={{
                      background: t.paper,
                      border: `1px solid ${car.charging ? SAGE : t.line}`,
                      borderRadius: 14,
                      padding: 14,
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
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
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span
                          style={{
                            fontFamily: serif,
                            fontSize: 18,
                            fontWeight: 500,
                            color: t.ink,
                            letterSpacing: "-0.01em",
                          }}
                        >
                          {car.name}
                        </span>
                        <span style={ital(t, 12, t.mute)}>
                          {car.charging
                            ? "laddar nu"
                            : car.plugged_in
                            ? "inkopplad, ej aktiv"
                            : "ej inkopplad"}
                        </span>
                      </div>
                      <span
                        className="warm-tab-nums"
                        style={{
                          fontFamily: serif,
                          fontSize: 26,
                          fontWeight: 400,
                          color: t.ink,
                        }}
                      >
                        {car.soc}
                        <span
                          style={{
                            fontFamily: body,
                            fontSize: 12,
                            color: t.mute,
                            marginLeft: 2,
                          }}
                        >
                          %
                        </span>
                      </span>
                    </div>
                    <div
                      style={{
                        height: 4,
                        background: t.line,
                        borderRadius: 999,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${car.soc}%`,
                          height: "100%",
                          background: barColor,
                          borderRadius: 999,
                          transition: "width 0.3s",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <span
                        className="warm-tab-nums"
                        style={{ ...lab(t, { fontSize: 10 }), color: t.dim }}
                      >
                        {car.range_km} KM
                      </span>
                      <span
                        className="warm-tab-nums"
                        style={{ ...lab(t, { fontSize: 10 }), color: t.dim }}
                      >
                        MÅL {car.target_soc}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </>
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
          style={{ ...num(t, 18, 400), lineHeight: 1.1 }}
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

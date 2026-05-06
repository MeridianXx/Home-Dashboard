"use client";

import { useEffect, useMemo, useState } from "react";
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

type BreakdownSource = {
  id: string;
  name: string;
  watts: number | null;
  active: boolean | null;
  status: string | null;
};
type BreakdownData = {
  total_w: number;
  sources: BreakdownSource[];
  other_w: number;
};

type EffektPoint = { t: string; v: number };
type EffektHistoryData = {
  entities: Record<string, EffektPoint[]>;
};

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

function KwhStat({
  t,
  label,
  kwh,
  sek,
}: {
  t: WarmTheme;
  label: string;
  kwh: number;
  sek: number;
}) {
  const big = kwh >= 100;
  const value = big ? Math.round(kwh).toString() : kwh.toFixed(1).replace(".", ",");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ ...lab(t, { fontSize: 9 }), color: t.dim }}>{label}</span>
      <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
        <span
          className="warm-tab-nums"
          style={{ ...num(t, 17, 400), lineHeight: 1.1 }}
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
          kWh
        </span>
      </div>
      {sek > 0 && (
        <span style={ital(t, 11, t.dim)}>{Math.round(sek)} kr</span>
      )}
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
  const { data: breakdown } = useSWR<BreakdownData>(
    hydrated ? "/api/energy/breakdown" : null,
    fetcher,
    { refreshInterval: 10_000 }
  );
  const { data: effektHistory } = useSWR<EffektHistoryData>(
    hydrated
      ? "/api/homeassistant/history?entities=sensor.tibber_pulse_villa_bjorkdalen_effekt&hours=24"
      : null,
    fetcher,
    { refreshInterval: 5 * 60 * 1000, revalidateOnFocus: false }
  );

  const krPerKwh =
    energy?.spot_price_ore != null ? energy.spot_price_ore / 100 : null;
  const carList = cars && "cars" in cars ? cars.cars : [];
  const charging = carList.filter((c) => c.charging);
  const headerTail = charging.length > 0 ? "laddar" : null;

  // 24h-statistik från effekt-historiken: peak/lägsta + tidsstämpel.
  const effektStats = useMemo(() => {
    const points = effektHistory?.entities?.["sensor.tibber_pulse_villa_bjorkdalen_effekt"] ?? [];
    if (points.length < 4) return null;
    let peak = points[0];
    let low = points[0];
    let sum = 0;
    for (const p of points) {
      if (p.v > peak.v) peak = p;
      if (p.v < low.v) low = p;
      sum += p.v;
    }
    return { points, peak, low, avg: sum / points.length };
  }, [effektHistory]);

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

        {/* Stora dragare nu */}
        {breakdown && (
          <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
              }}
            >
              <span style={lab(t)}>STORA DRAGARE NU</span>
              <span style={ital(t, 12, t.dim)}>{breakdown.total_w} W totalt</span>
            </div>
            <div
              style={{
                background: t.paper,
                border: `1px solid ${t.line}`,
                borderRadius: 14,
                overflow: "hidden",
              }}
            >
              {breakdown.sources.map((src, i) => {
                const isLast = i === breakdown.sources.length - 1 && breakdown.other_w === 0;
                return (
                  <DragareRow
                    key={src.id}
                    t={t}
                    name={src.name}
                    watts={src.watts}
                    status={src.status}
                    active={src.active}
                    isLast={isLast}
                  />
                );
              })}
              {breakdown.other_w > 0 && (
                <DragareRow
                  t={t}
                  name="Övrigt"
                  watts={breakdown.other_w}
                  status={
                    breakdown.total_w > 0
                      ? `ca ${Math.round((breakdown.other_w / breakdown.total_w) * 100)} %`
                      : null
                  }
                  active={null}
                  isLast
                  muted
                />
              )}
            </div>
            <span style={ital(t, 11, t.dim)}>
              Bara enheter med egen mätare visar W. Övrigt = totalt minus kända.
            </span>
          </section>
        )}

        {/* Förbrukning — sammanslagen vy: 24h-spark + topp/lägst/snitt/just nu
            överst, kWh idag/månad nederst. */}
        {energy && (
          <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={lab(t)}>FÖRBRUKNING</span>
            <div
              style={{
                background: t.paper,
                border: `1px solid ${t.line}`,
                borderRadius: 14,
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {effektStats && <Effekt24hSpark t={t} points={effektStats.points} />}
              {effektStats && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 10,
                    paddingTop: 10,
                    borderTop: `1px solid ${t.line}`,
                  }}
                >
                  <PeakRow
                    t={t}
                    label="TOPP"
                    watts={effektStats.peak.v}
                    iso={effektStats.peak.t}
                    color={ACC}
                  />
                  <PeakRow
                    t={t}
                    label="LÄGST"
                    watts={effektStats.low.v}
                    iso={effektStats.low.t}
                    color={SAGE}
                  />
                  <PeakRow
                    t={t}
                    label="SNITT"
                    watts={effektStats.avg}
                    iso={null}
                    color={t.mute}
                  />
                  <PeakRow
                    t={t}
                    label="JUST NU"
                    watts={energy.current_power_w}
                    iso={null}
                    color={t.ink}
                  />
                </div>
              )}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 10,
                  paddingTop: 10,
                  borderTop: `1px solid ${t.line}`,
                }}
              >
                <KwhStat
                  t={t}
                  label="IDAG"
                  kwh={energy.accumulated_kwh}
                  sek={energy.accumulated_cost_sek}
                />
                <KwhStat
                  t={t}
                  label="DENNA MÅNAD"
                  kwh={energy.monthly_kwh}
                  sek={energy.monthly_cost_sek}
                />
              </div>
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

// ─── Stora dragare nu ──────────────────────────────────────────────────────

function DragareRow({
  t,
  name,
  watts,
  status,
  active,
  isLast,
  muted,
}: {
  t: WarmTheme;
  name: string;
  watts: number | null;
  status: string | null;
  active: boolean | null;
  isLast?: boolean;
  muted?: boolean;
}) {
  const dot = active === true ? ACC : active === false ? null : null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "12px 16px",
        borderBottom: isLast ? "none" : `1px solid ${t.line}`,
        opacity: muted ? 0.7 : 1,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          minWidth: 0,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: dot ?? "transparent",
            border: dot ? "none" : `1.5px solid ${t.dim}`,
            flexShrink: 0,
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <span
            style={{
              fontFamily: serif,
              fontSize: 15,
              color: t.ink,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {name}
          </span>
          {status && (
            <span style={ital(t, 11, t.dim)}>{status}</span>
          )}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, flexShrink: 0 }}>
        {watts != null ? (
          <>
            <span
              className="warm-tab-nums"
              style={{ fontFamily: serif, fontSize: 16, color: t.ink }}
            >
              {watts >= 1000 ? (watts / 1000).toFixed(1).replace(".", ",") : watts}
            </span>
            <span
              style={{
                fontFamily: body,
                fontSize: 11,
                color: t.mute,
                fontWeight: 500,
              }}
            >
              {watts >= 1000 ? "kW" : "W"}
            </span>
          </>
        ) : (
          <span style={ital(t, 12, t.dim)}>—</span>
        )}
      </div>
    </div>
  );
}

// ─── Senaste 24h ───────────────────────────────────────────────────────────

/** Avrunda till en "snäll" siffra för y-max — nästa hela kW eller 100 W. */
function niceCeiling(maxW: number): number {
  if (maxW < 100) return 100;
  if (maxW < 500) return Math.ceil(maxW / 100) * 100;
  if (maxW < 1000) return Math.ceil(maxW / 250) * 250;
  if (maxW < 5000) return Math.ceil(maxW / 500) * 500;
  return Math.ceil(maxW / 1000) * 1000;
}

function formatPower(w: number): string {
  if (w >= 1000) {
    const kw = w / 1000;
    return `${kw >= 10 ? Math.round(kw) : kw.toFixed(1).replace(".", ",")} kW`;
  }
  return `${Math.round(w)} W`;
}

function Effekt24hSpark({
  t,
  points,
}: {
  t: WarmTheme;
  points: EffektPoint[];
}) {
  // Downsampla till ca 60 punkter (24h × 2.5/h ≈ 24 min) för en lugn linje
  // som ändå behåller spikar.
  const sampled = useMemo(() => {
    if (points.length <= 60) return points;
    const step = Math.ceil(points.length / 60);
    return points.filter((_, i) => i % step === 0 || i === points.length - 1);
  }, [points]);

  if (sampled.length < 2) return null;
  const values = sampled.map((p) => p.v);
  const max = Math.max(...values);
  // Anchora y-axeln vid 0 så referenslinjerna blir ärliga (5 W vs 12 kW
  // får faktiskt synas som långt under topp). Y-max rundas upp till en
  // snäll siffra så etikettexten blir läsbar.
  const yMax = niceCeiling(max);
  const yMid = yMax / 2;
  const W = 100;
  const H = 80;
  const xOf = (i: number) => (i / (sampled.length - 1)) * W;
  const yOf = (v: number) => H - (v / yMax) * (H - 4) - 2;
  const lineP = sampled.map((p, i) => `${xOf(i).toFixed(2)},${yOf(p.v).toFixed(2)}`).join(" ");
  const areaP = `0,${H} ${lineP} ${W},${H}`;

  // X-axel: tidsstämplar för start/mitten/slut. Datat sträcker sig 24h
  // bakåt så vi kan visa "24h sedan", "12h sedan", "nu" som relativa
  // referenser — enklare att läsa än absoluta klockslag.
  const startT = new Date(sampled[0].t);
  const endT = new Date(sampled[sampled.length - 1].t);
  const xLabels = (() => {
    const fmt = (d: Date) =>
      `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
    const midMs = (startT.getTime() + endT.getTime()) / 2;
    return {
      start: fmt(startT),
      mid: fmt(new Date(midMs)),
      end: fmt(endT),
    };
  })();

  const yAxisLabel: React.CSSProperties = {
    ...lab(t, { fontSize: 9 }),
    color: t.dim,
    lineHeight: 1,
  };
  const xAxisLabel: React.CSSProperties = {
    ...ital(t, 11, t.dim),
    lineHeight: 1,
  };
  const gridLine: React.CSSProperties = {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    background: t.line,
  };

  return (
    <div style={{ display: "flex", gap: 8 }}>
      {/* Y-axel — etiketter höger-justerade så de hamnar nära linjen */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "flex-end",
          paddingTop: 0,
          paddingBottom: 18,
          minWidth: 32,
        }}
      >
        <span style={yAxisLabel}>{formatPower(yMax)}</span>
        <span style={yAxisLabel}>{formatPower(yMid)}</span>
        <span style={yAxisLabel}>0 W</span>
      </div>

      {/* Chart-kolumn: graf med horisontella referenslinjer + x-axel under */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ position: "relative", height: H }}>
          {/* Referenslinjer — top/mid/bottom */}
          <div style={{ ...gridLine, top: 0, opacity: 0.6 }} />
          <div style={{ ...gridLine, top: "50%", opacity: 0.4 }} />
          <div style={{ ...gridLine, bottom: 0, opacity: 0.8 }} />
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            width="100%"
            height={H}
            style={{ display: "block", position: "relative" }}
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="effekt-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ACC} stopOpacity={0.18} />
                <stop offset="100%" stopColor={ACC} stopOpacity={0} />
              </linearGradient>
            </defs>
            <polyline points={areaP} fill="url(#effekt-fill)" stroke="none" />
            <polyline
              points={lineP}
              fill="none"
              stroke={ACC}
              strokeWidth={1.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
        {/* X-axel: tre tidstämplar (start, mitten, nu) i klockformat */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 6,
          }}
        >
          <span style={xAxisLabel}>{xLabels.start}</span>
          <span style={xAxisLabel}>{xLabels.mid}</span>
          <span style={xAxisLabel}>{xLabels.end}</span>
        </div>
      </div>
    </div>
  );
}

function PeakRow({
  t,
  label,
  watts,
  iso,
  color,
}: {
  t: WarmTheme;
  label: string;
  watts: number | null;
  iso: string | null;
  color: string;
}) {
  if (watts == null) return null;
  const big = watts >= 1000;
  const value = big
    ? (watts / 1000).toFixed(big && watts >= 10_000 ? 0 : 1).replace(".", ",")
    : `${Math.round(watts)}`;
  const unit = big ? "kW" : "W";
  let timeLabel: string | null = null;
  if (iso) {
    try {
      const d = new Date(iso);
      const hh = d.getHours().toString().padStart(2, "0");
      const mm = d.getMinutes().toString().padStart(2, "0");
      timeLabel = `kl ${hh}:${mm}`;
    } catch {
      timeLabel = null;
    }
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ ...lab(t, { fontSize: 9 }), color }}>{label}</span>
      <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
        <span
          className="warm-tab-nums"
          style={{ ...num(t, 17, 400), lineHeight: 1.1 }}
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
      {timeLabel && (
        <span style={ital(t, 11, t.dim)}>{timeLabel}</span>
      )}
    </div>
  );
}

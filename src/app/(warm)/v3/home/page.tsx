"use client";

import { useState } from "react";
import { useWarmTheme } from "@/lib/warm/theme";
import {
  ACC,
  AMBER,
  LINGON,
  SAGE,
  SKY,
  body,
  darkT,
  ital,
  lab,
  lightT,
  num,
  serif,
  type WarmTheme,
} from "@/lib/warm/tokens";
import {
  Bar,
  HubHeader,
  Pill,
  Ring,
  Spark,
  Stat,
  TabBar,
  Tile,
  type TabKey,
} from "@/components/warm/primitives";
import {
  FitIcon,
  GardIcon,
  HemIcon,
  LabIcon,
  SceneGlyph,
  ThemeIcon,
} from "@/components/warm/icons";

const ACCENTS: { name: string; hex: string }[] = [
  { name: "ACC (terracotta)", hex: ACC },
  { name: "SAGE", hex: SAGE },
  { name: "LINGON", hex: LINGON },
  { name: "AMBER", hex: AMBER },
  { name: "SKY", hex: SKY },
];

const SCENES: { id: "morgon" | "dag" | "kvall" | "natt" | "film" | "borta"; label: string }[] = [
  { id: "morgon", label: "Morgon" },
  { id: "dag", label: "Dag" },
  { id: "kvall", label: "Kväll" },
  { id: "natt", label: "Natt" },
  { id: "film", label: "Film" },
  { id: "borta", label: "Borta" },
];

const TAB_LABELS: Record<TabKey, string> = {
  hem: "Hem",
  lab: "Lab",
  fit: "Fitness",
  gard: "Trädgård",
};

function tabIcon(key: TabKey, color: string) {
  const props = { size: 20, color };
  if (key === "hem") return <HemIcon {...props} />;
  if (key === "lab") return <LabIcon {...props} />;
  if (key === "fit") return <FitIcon {...props} />;
  return <GardIcon {...props} />;
}

function Section({
  t,
  title,
  children,
}: {
  t: WarmTheme;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 style={{ ...num(t, 14, 500), ...lab(t), color: t.dim }}>{title}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>
    </section>
  );
}

function ThemePanel({ t, dark }: { t: WarmTheme; dark: boolean }) {
  return (
    <Tile t={t}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={lab(t)}>{dark ? "Dark theme" : "Light theme"}</span>
        <span style={{ ...ital(t, 12), color: t.dim }}>{dark ? "darkT" : "lightT"}</span>
      </div>
      <div
        style={{
          marginTop: 10,
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 8,
        }}
      >
        {(
          [
            ["bg", t.bg],
            ["paper", t.paper],
            ["paperHi", t.paperHi],
            ["line", t.line],
            ["ink", t.ink],
            ["mute", t.mute],
            ["dim", t.dim],
            ["ok", t.ok],
            ["bad", t.bad],
            ["warn", t.warn],
            ["tint", t.tint],
            ["tintSage", t.tintSage],
          ] as const
        ).map(([name, hex]) => (
          <div
            key={name}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              alignItems: "stretch",
            }}
          >
            <div
              style={{
                height: 40,
                background: hex,
                border: `1px solid ${t.line}`,
                borderRadius: 8,
              }}
            />
            <span
              style={{
                fontFamily: body,
                fontSize: 10,
                color: t.mute,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {name}
            </span>
          </div>
        ))}
      </div>
    </Tile>
  );
}

export default function WarmHomeTokenProof() {
  const { t, dark, toggle } = useWarmTheme();
  const [tab, setTab] = useState<TabKey>("hem");
  const [activeScene, setActiveScene] = useState("kvall");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: t.bg,
        color: t.ink,
        paddingBottom: 120,
      }}
    >
      <HubHeader
        t={t}
        title="Warm Home"
        subtitle="W0 — token-prov, fonter, primitiver"
        right={
          <button
            type="button"
            onClick={toggle}
            aria-label="Växla tema"
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              border: `1px solid ${t.line}`,
              background: t.paperHi,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <ThemeIcon dark={dark} color={t.ink} />
          </button>
        }
      />

      <div
        style={{
          padding: "8px 18px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <Section t={t} title="Accents">
          <Tile t={t}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                gap: 8,
              }}
            >
              {ACCENTS.map((a) => (
                <div
                  key={a.name}
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  <div
                    style={{
                      height: 56,
                      background: a.hex,
                      borderRadius: 10,
                      border: `1px solid ${t.line}`,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: body,
                      fontSize: 10,
                      color: t.mute,
                      lineHeight: 1.2,
                    }}
                  >
                    {a.name}
                  </span>
                  <span
                    style={{
                      fontFamily: body,
                      fontSize: 10,
                      color: t.dim,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {a.hex}
                  </span>
                </div>
              ))}
            </div>
          </Tile>
        </Section>

        <Section t={t} title="Themes (live + spegling)">
          <ThemePanel t={t} dark={dark} />
          <ThemePanel t={dark ? lightT : darkT} dark={!dark} />
        </Section>

        <Section t={t} title="Typografi">
          <Tile t={t}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <span style={lab(t)}>Display · Fraunces 32</span>
                <h1 style={{ ...num(t, 32), lineHeight: 1.05, marginTop: 4 }}>
                  Villa Björkdalen
                </h1>
              </div>
              <div>
                <span style={lab(t)}>Headline · Fraunces 22 italic</span>
                <p style={{ ...ital(t, 22, t.ink), marginTop: 4 }}>
                  En lugn helg hemma.
                </p>
              </div>
              <div>
                <span style={lab(t)}>Body · DM Sans 14</span>
                <p
                  style={{
                    fontFamily: body,
                    fontSize: 14,
                    color: t.ink,
                    marginTop: 4,
                    lineHeight: 1.5,
                  }}
                >
                  Det varma uttrycket ska kännas som papper och trä — inte plast och glas.
                  Siffror är{" "}
                  <span className="warm-tab-nums" style={{ fontFamily: serif }}>
                    21,3°
                  </span>{" "}
                  inomhus.
                </p>
              </div>
              <div>
                <span style={lab(t)}>Lab · DM Sans 10 caps</span>
                <p style={{ ...lab(t), marginTop: 4 }}>kök · 21,4° · alla lampor släckta</p>
              </div>
              <div>
                <span style={lab(t)}>Tabular num · Fraunces</span>
                <p
                  className="warm-tab-nums"
                  style={{ ...num(t, 28), marginTop: 4 }}
                >
                  21,4° · 0,82 SEK · 412 W
                </p>
              </div>
            </div>
          </Tile>
        </Section>

        <Section t={t} title="Primitiver">
          <Tile t={t}>
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
              <Stat t={t} label="Inomhus" value="21,4" unit="°" tagline="lugnt." />
              <Stat t={t} label="El just nu" value="412" unit="W" tagline="låg last" />
              <Stat t={t} label="Spotpris" value="0,82" unit="SEK" tagline="dipp 14:00" />
            </div>
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <Bar t={t} value={62} />
              <Bar t={t} value={88} color={SAGE} />
              <Bar t={t} value={34} color={AMBER} />
            </div>
          </Tile>

          <Tile t={t}>
            <span style={lab(t)}>Pills</span>
            <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
              <Pill t={t}>Neutral</Pill>
              <Pill t={t} tone="acc" active>
                Aktiv
              </Pill>
              <Pill t={t} tone="sage">
                Sage
              </Pill>
              <Pill t={t} tone="amber">
                Amber
              </Pill>
              <Pill t={t} tone="sky">
                Sky
              </Pill>
            </div>
          </Tile>

          <Tile t={t}>
            <span style={lab(t)}>Scener</span>
            <div
              style={{
                marginTop: 10,
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              {SCENES.map((s) => (
                <Pill
                  key={s.id}
                  t={t}
                  active={activeScene === s.id}
                  onClick={() => setActiveScene(s.id)}
                >
                  <SceneGlyph
                    scene={s.id}
                    size={14}
                    color={activeScene === s.id ? "#FFFBF0" : t.mute}
                  />
                  <span>{s.label}</span>
                </Pill>
              ))}
            </div>
          </Tile>

          <Tile t={t}>
            <span style={lab(t)}>Ring</span>
            <div
              style={{
                marginTop: 12,
                display: "flex",
                alignItems: "center",
                gap: 18,
              }}
            >
              <Ring value={72} trackColor={t.line} color={ACC} size={84} stroke={7}>
                <span style={{ color: t.ink }}>72</span>
              </Ring>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                <span style={lab(t)}>Dagsform</span>
                <span style={{ ...ital(t, 18, t.ink), lineHeight: 1.1 }}>
                  återhämtad
                </span>
                <span style={{ fontFamily: body, fontSize: 12, color: t.mute }}>
                  HRV +14% mot 7d-snitt
                </span>
              </div>
            </div>
          </Tile>

          <Tile t={t}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <span style={lab(t)}>Spark · 7d trend</span>
              <span
                className="warm-tab-nums"
                style={{
                  fontFamily: body,
                  fontSize: 13,
                  fontWeight: 600,
                  color: SAGE,
                }}
              >
                +18%
              </span>
            </div>
            <div style={{ marginTop: 14, width: "100%" }}>
              <Spark
                data={[0.2, 0.35, 0.3, 0.55, 0.5, 0.62, 0.55, 0.7, 0.62, 0.78, 0.74, 0.86]}
                color={ACC}
                width={320}
                height={48}
                strokeWidth={1.8}
                fluid
              />
            </div>
          </Tile>
        </Section>

        <Section t={t} title="Tab-ikoner (preview)">
          <Tile t={t}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              {(["hem", "lab", "fit", "gard"] as TabKey[]).map((k) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    padding: 10,
                    border: `1px solid ${t.line}`,
                    borderRadius: 12,
                    background: t.paperHi,
                  }}
                >
                  {tabIcon(k, t.ink)}
                  <span
                    style={{
                      fontFamily: body,
                      fontSize: 11,
                      color: t.mute,
                      fontWeight: 600,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    {TAB_LABELS[k]}
                  </span>
                </div>
              ))}
            </div>
          </Tile>
        </Section>
      </div>

      <TabBar
        t={t}
        active={tab}
        onChange={setTab}
        labelFor={(k) => TAB_LABELS[k]}
        iconFor={(k, isActive) => tabIcon(k, isActive ? "#FFFBF0" : t.mute)}
      />
    </div>
  );
}

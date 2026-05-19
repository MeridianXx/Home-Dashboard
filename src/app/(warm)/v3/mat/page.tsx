"use client";

// ─── Mat — hub-sida (M0 skelett) ─────────────────────────────────────────────
// Tre dörr-tiles enligt Warm-princip 1 ("Hub = dörrar"). Stats är placeholder
// nollvärden tills /api/mat/recipes + /api/mat/plan implementeras (M1+M2).
// AI-briefing-hero plats reserverad — renderas i M3 när /api/mat/briefing
// finns. 501-banner visas när NOTION_MAT_*-env saknas i prod.

import Link from "next/link";
import useSWR from "swr";
import { HubDisplay, HubThemeToggle } from "@/components/warm/fit/parts";
import { ChevronRight } from "@/components/warm/icons/extra";
import { Tile } from "@/components/warm/primitives";
import { fetcher } from "@/lib/fetcher";
import { useDesktop, useWarmTheme } from "@/lib/warm/theme";
import { formatHubEyebrow } from "@/lib/warm/format";
import { AMBER, body, lab, num } from "@/lib/warm/tokens";
import type { MatReadyResponse } from "@/lib/mat/types";

export default function MatHubPage() {
  const { t } = useWarmTheme();
  const isDesktop = useDesktop();

  const readySwr = useSWR<MatReadyResponse>("/api/mat/ready", fetcher, {
    refreshInterval: 5 * 60 * 1000,
    revalidateOnFocus: false,
  });

  const notReady = readySwr.data && !readySwr.data.matReady;
  const missing = readySwr.data?.missing ?? [];

  return (
    <div style={{ paddingBottom: 24 }}>
      <HubDisplay
        eyebrow={formatHubEyebrow("MAT")}
        eyebrowColor={AMBER}
        title="Vad äter vi"
        italicTail="ikväll?"
        right={<HubThemeToggle isDesktop={isDesktop} />}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 18, padding: "0 18px" }}>
        {notReady ? (
          <Tile t={t}>
            <div style={{ ...lab(t, { color: AMBER, marginBottom: 6 }) }}>NOTION INTE KONFIGURERAT</div>
            <p style={{ fontFamily: body, fontSize: 13, color: t.mute, lineHeight: 1.55, marginBottom: 8 }}>
              Mat-DB:erna är inte konfigurerade än. Skapa en föräldra-sida i Notion
              (t.ex. <em>🥘 Mat &amp; Recept</em>), dela den med integrationen och
              kör <code>scripts/create-mat-notion-dbs.mjs</code>.
            </p>
            <p style={{ fontFamily: body, fontSize: 12, color: t.dim, lineHeight: 1.55, margin: 0 }}>
              Saknade env-vars:
              {missingEnvLabels(missing).map((label, i) => (
                <span key={label} style={{ color: t.mute }}>
                  {i === 0 ? " " : ", "}
                  <code>{label}</code>
                </span>
              ))}
            </p>
          </Tile>
        ) : null}

        {/* AI-briefing-hero — plats reserverad. Renderas i M3 när
            /api/mat/briefing finns. Tills dess: ingen synlig hero. */}

        {/* Dörr-tiles — grupperade i ett kort, samma mönster som garden-hubben. */}
        <div
          style={{
            background: t.paper,
            border: `1px solid ${t.line}`,
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          <DoorTile
            href="/v3/mat/bibliotek"
            eyebrow="BIBLIOTEK"
            title="Recepten,"
            tail="alla samlade."
            stat="0 recept · importera ditt första"
            first
          />
          <DoorTile
            href="/v3/mat/planering"
            eyebrow="PLANERING"
            title="Veckan,"
            tail="lunch och middag."
            stat="0 av 14 slottar planerade"
          />
          <DoorTile
            href="/v3/mat/laga"
            eyebrow="LAGA"
            title="Kökschefen,"
            tail="hjälper dig hitta på."
            stat="fråga kökschefen"
          />
        </div>
      </div>
    </div>
  );
}

function missingEnvLabels(missing: MatReadyResponse["missing"]): string[] {
  const map: Record<MatReadyResponse["missing"][number], string> = {
    recipes: "NOTION_MAT_RECIPES_DB",
    plan: "NOTION_MAT_PLAN_DB",
    coach: "NOTION_MAT_COACH_PAGE",
  };
  return missing.map((m) => map[m]);
}

function DoorTile({
  href,
  eyebrow,
  title,
  tail,
  stat,
  first,
}: {
  href: string;
  eyebrow: string;
  title: string;
  tail: string;
  stat: string;
  first?: boolean;
}) {
  const { t } = useWarmTheme();
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: 14,
        borderTop: first ? "none" : `1px solid ${t.line}`,
        textDecoration: "none",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...lab(t), color: AMBER, marginBottom: 4 }}>{eyebrow}</div>
        <div style={{ ...num(t, 18, 500), lineHeight: 1.15, marginBottom: 4 }}>
          {title}
          <span style={{ fontStyle: "italic", color: t.dim }}> {tail}</span>
        </div>
        <div style={{ fontFamily: body, fontSize: 12, color: t.mute, lineHeight: 1.35 }}>{stat}</div>
      </div>
      <ChevronRight size={16} color={t.dim} />
    </Link>
  );
}

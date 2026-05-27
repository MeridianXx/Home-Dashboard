"use client";

// ─── Warm Home · Fitness · Plan-detalj (icke-genomfört planerat pass) ────────
// Visar hela passets innehåll (syfte, detaljer, pulszoner, tempo, underlag)
// utan att rusa rakt in i edit-läget. "Redigera"-CTA i header länkar till
// /v3/fitness/coach/plan?edit=<id> som öppnar befintlig redigeringsmodal.
// Är passet redan genomfört → redirect till workout-detaljen i stället.

import { use, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useWarmTheme } from "@/lib/warm/theme";
import { ACC, body, ital, lab } from "@/lib/warm/tokens";
import { DetailHero, SectionLabel } from "@/components/warm/fit/parts";
import { sportIcon } from "@/components/warm/icons/fit";
import { sportColor, shortDateSv } from "@/lib/warm/fit";
import { Tile } from "@/components/warm/primitives";
import WarmErrorBanner from "@/components/warm/WarmErrorBanner";
import { workoutSlug } from "@/lib/fitness/slug";
import type {
  PlannedWorkout,
  PlansResponse,
  Workout,
  WorkoutsResponse,
} from "@/lib/fitness/types";
import { matchWorkoutsToPlans } from "@/lib/fitness/match";
import { unescapeNewlines } from "@/lib/fitness/text";
import { ChevronRight } from "@/components/warm/icons/extra";
import Link from "next/link";

function StatRow({
  t,
  label,
  value,
  first = false,
}: {
  t: import("@/lib/warm/tokens").WarmTheme;
  label: string;
  value: string;
  first?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 16,
        padding: "10px 0",
        borderTop: first ? "none" : `1px solid ${t.line}`,
      }}
    >
      <span style={lab(t)}>{label}</span>
      <span
        style={{
          fontFamily: body,
          fontSize: 14,
          fontWeight: 500,
          color: t.ink,
          textAlign: "right",
          flex: 1,
          minWidth: 0,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function fmtPlanDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d
    .toLocaleDateString("sv-SE", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
    .replace(/\.$/, "");
}

export default function WarmPlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { t } = useWarmTheme();

  const { data: plansData, error: plansErr } = useSWR<PlansResponse>(
    "/api/fitness/plans",
    fetcher
  );
  const { data: workoutsData } = useSWR<WorkoutsResponse>(
    "/api/fitness/workouts?limit=60",
    fetcher
  );

  const plan = useMemo<PlannedWorkout | null>(
    () => plansData?.plans.find((p) => p.id === id) ?? null,
    [plansData, id]
  );

  // Om planen redan har en matchad genomförd-workout → skicka användaren till
  // workout-detaljen direkt. Detail-sidan här är specifikt för icke-genomförda
  // pass; matchade pass har redan en rikare sida med karta/HR/AI-analys.
  const linkedWorkout = useMemo<Workout | null>(() => {
    if (!plan || !workoutsData || !plansData) return null;
    const match = matchWorkoutsToPlans(workoutsData.workouts, plansData.plans);
    return match.planToWorkout.get(plan.id) ?? null;
  }, [plan, plansData, workoutsData]);

  useEffect(() => {
    if (linkedWorkout) {
      router.replace(`/v3/fitness/pass/${workoutSlug(linkedWorkout)}`);
    }
  }, [linkedWorkout, router]);

  if (plansErr) {
    return (
      <WarmErrorBanner
        t={t}
        message={`Kunde inte läsa planerade pass: ${String(plansErr)}`}
      />
    );
  }

  if (!plansData) {
    return (
      <div style={{ padding: 16, fontFamily: body, fontSize: 13, color: t.mute }}>
        Läser…
      </div>
    );
  }

  if (!plan) {
    return (
      <div style={{ padding: 16 }}>
        <DetailHero
          backHref="/v3/fitness"
          backLabel="Fitness"
          eyebrow="PLANERAT PASS"
          title="Hittades inte"
        />
        <Tile t={t}>
          <p style={{ fontFamily: body, fontSize: 13, color: t.mute }}>
            Passet finns inte längre. Det kan ha tagits bort eller flyttats.
          </p>
        </Tile>
      </div>
    );
  }

  const sport = plan.typ || plan.passnamn || "";
  const eyebrow = `PLANERAT · ${shortDateSv(plan.datum).toUpperCase()}`;
  const subtitleParts = [
    plan.tid,
    plan.tempo,
    plan.pulsintervall ? `puls ${plan.pulsintervall}` : null,
    plan.underlag,
  ].filter((s): s is string => Boolean(s));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <DetailHero
        backHref="/v3/fitness"
        backLabel="Fitness"
        eyebrow={eyebrow}
        title={plan.passnamn || sport || "Planerat pass"}
        // Svansen ska komplettera titeln, inte dubbla den. Skippa om typ-ordet
        // redan finns i passnamnet (t.ex. "Core — bål och höfter" + typ "Core").
        italicTail={
          plan.typ &&
          plan.passnamn &&
          !plan.passnamn.toLowerCase().includes(plan.typ.toLowerCase())
            ? plan.typ.toLowerCase()
            : undefined
        }
        italicColor={ACC}
        subtitle={subtitleParts.join(" · ") || undefined}
        right={<EditPlanButton id={plan.id} />}
      />

      {/* Datum + status + typ-ikon — kompakt meta-rad */}
      <div style={{ padding: "0 18px" }}>
        <Tile t={t}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 40,
                height: 40,
                borderRadius: 999,
                background: t.paperHi,
                border: `1px solid ${t.line}`,
                flexShrink: 0,
              }}
            >
              {sportIcon(sport, 20, sportColor(sport))}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: body, fontSize: 14, fontWeight: 600, color: t.ink }}>
                {fmtPlanDate(plan.datum)}
              </div>
              {plan.status ? (
                <div style={{ ...ital(t, 12, t.mute), marginTop: 2 }}>{plan.status}</div>
              ) : null}
            </div>
          </div>
        </Tile>
      </div>

      {/* Stat-list — label vänster, värde höger. Stack-format eftersom plan-
          värden ofta är beskrivande ("7:20–7:45/km eller långsammare") och
          inte numeriska, så 3-grid clip:ar och blir trångt på mobil. */}
      {(plan.tid || plan.tempo || plan.pulsintervall) ? (
        <div style={{ padding: "0 18px" }}>
          <Tile t={t}>
            {plan.tid ? <StatRow t={t} label="Tid" value={plan.tid} first /> : null}
            {plan.tempo ? <StatRow t={t} label="Tempo" value={plan.tempo} first={!plan.tid} /> : null}
            {plan.pulsintervall ? (
              <StatRow t={t} label="Puls" value={plan.pulsintervall} first={!plan.tid && !plan.tempo} />
            ) : null}
          </Tile>
        </div>
      ) : null}

      {/* Syfte (vad ska passet uppnå) */}
      {plan.syfte ? (
        <div style={{ padding: "0 18px" }}>
          <SectionLabel>Syfte</SectionLabel>
          <Tile t={t}>
            <p
              style={{
                fontFamily: body,
                fontSize: 14,
                lineHeight: 1.55,
                color: t.ink,
                whiteSpace: "pre-wrap",
              }}
            >
              {unescapeNewlines(plan.syfte)}
            </p>
          </Tile>
        </div>
      ) : null}

      {/* Passdetaljer (intervaller, set, etc.) */}
      {plan.passdetaljer ? (
        <div style={{ padding: "0 18px" }}>
          <SectionLabel>Passdetaljer</SectionLabel>
          <Tile t={t}>
            <p
              style={{
                fontFamily: body,
                fontSize: 14,
                lineHeight: 1.55,
                color: t.ink,
                whiteSpace: "pre-wrap",
              }}
            >
              {unescapeNewlines(plan.passdetaljer)}
            </p>
          </Tile>
        </div>
      ) : null}

      {/* Underlag — visas separat om det inte redan finns i subtitle */}
      {plan.underlag ? (
        <div style={{ padding: "0 18px" }}>
          <SectionLabel>Underlag</SectionLabel>
          <Tile t={t}>
            <p style={{ fontFamily: body, fontSize: 14, color: t.ink }}>
              {plan.underlag}
            </p>
          </Tile>
        </div>
      ) : null}

      {/* Bottenraden — markera-som-genomförd-hint + edit-CTA */}
      <div style={{ padding: "8px 18px 24px" }}>
        <Link
          href={`/v3/fitness/coach/plan?edit=${plan.id}`}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: t.tint,
            border: `1px solid ${t.line}`,
            borderRadius: 14,
            padding: "14px 16px",
            color: t.ink,
            textDecoration: "none",
          }}
        >
          <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontFamily: body, fontSize: 14, fontWeight: 600 }}>
              Redigera passet
            </span>
            <span style={ital(t, 12, t.mute)}>
              ändra datum, syfte, detaljer eller ta bort
            </span>
          </span>
          <ChevronRight size={18} color={t.dim} />
        </Link>
      </div>

    </div>
  );
}

function EditPlanButton({ id }: { id: string }) {
  const { t } = useWarmTheme();
  return (
    <Link
      href={`/v3/fitness/coach/plan?edit=${id}`}
      aria-label="Redigera passet"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        height: 32,
        padding: "0 12px",
        borderRadius: 999,
        background: ACC,
        color: "#FFFBF0",
        fontFamily: body,
        fontSize: 12,
        fontWeight: 600,
        textDecoration: "none",
      }}
    >
      Redigera
    </Link>
  );
}

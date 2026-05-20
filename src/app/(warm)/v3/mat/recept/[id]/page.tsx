"use client";

// ─── Mat — Recept-detalj ────────────────────────────────────────────────────
// DetailHero (TAG · min) + villkorad hero-bild + källa-rad + lede +
// PortionStepper 1–8 som skalar ingredienser live + ingredienslista i Tile
// (mängd i ACC mono / namn) + steg-kort med ACC-tint cirkel + valfri vintips
// (LINGON) + sticky bottom-bar.

import { use, useState } from "react";
import useSWR from "swr";
import { DetailHero } from "@/components/warm/fit/parts";
import { Tile } from "@/components/warm/primitives";
import { fetcher } from "@/lib/fetcher";
import { useWarmTheme } from "@/lib/warm/theme";
import { ACC, LINGON, body, ital, lab, num, serif } from "@/lib/warm/tokens";
import { haptic } from "@/lib/warm/haptics";
import type { Ingredient, Recipe } from "@/lib/mat/types";

interface RecipeResponse {
  recipe: Recipe;
}

export default function ReceptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useWarmTheme();

  const swr = useSWR<RecipeResponse>(`/api/mat/recipes/${id}`, fetcher, {
    revalidateOnFocus: false,
  });
  const recipe = swr.data?.recipe;

  if (swr.error) {
    return (
      <div style={{ padding: "0 18px" }}>
        <DetailHero backHref="/v3/mat/bibliotek" backLabel="Bibliotek" eyebrow="RECEPT" title="Hittades inte" />
        <p style={{ ...ital(t, 13), padding: 4 }}>Kunde inte ladda receptet.</p>
      </div>
    );
  }
  if (!recipe) {
    return (
      <div style={{ padding: "0 18px" }}>
        <DetailHero backHref="/v3/mat/bibliotek" backLabel="Bibliotek" eyebrow="RECEPT" title="Laddar…" />
      </div>
    );
  }

  // `key={recipe.id}` remountar RecipeView när användaren navigerar mellan
  // recept — så `useState(recipe.basPortioner)` initieras färskt utan en
  // setState-i-effect-loop.
  return <RecipeView key={recipe.id} recipe={recipe} />;
}

function RecipeView({ recipe }: { recipe: Recipe }) {
  const { t } = useWarmTheme();
  const basePortions = recipe.basPortioner;
  const [portions, setPortions] = useState<number>(basePortions);
  const scale = portions / Math.max(1, basePortions);

  const eyebrowParts: string[] = [];
  if (recipe.taggar.length > 0) eyebrowParts.push(String(recipe.taggar[0]).toUpperCase());
  if (recipe.minTotal) eyebrowParts.push(`${recipe.minTotal} MIN`);
  const eyebrow = eyebrowParts.length > 0 ? eyebrowParts.join(" · ") : "RECEPT";

  return (
    <div style={{ paddingBottom: 120 }}>
      <DetailHero
        backHref="/v3/mat/bibliotek"
        backLabel="Bibliotek"
        eyebrow={eyebrow}
        title={recipe.namn}
        compactTitle="Recept"
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 18px" }}>
        {/* Villkorad hero-bild. Ingen platshållare när bild saknas. */}
        {recipe.bildUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={recipe.bildUrl}
            alt={recipe.namn}
            style={{
              width: "100%",
              height: 200,
              objectFit: "cover",
              borderRadius: 14,
              border: `1px solid ${t.line}`,
            }}
          />
        ) : null}

        {/* Källa-rad — bara om kallaUrl finns */}
        {recipe.kallaUrl ? (
          <a
            href={recipe.kallaUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              ...ital(t, 12),
              textDecoration: "none",
              alignSelf: "flex-start",
            }}
          >
            från {recipe.kallaLabel || "källa"} →
          </a>
        ) : null}

        {/* Lede */}
        {recipe.lede ? (
          <p style={{ ...ital(t, 14), lineHeight: 1.5, color: t.mute }}>{recipe.lede}</p>
        ) : null}

        {/* PortionStepper 1–8 */}
        <PortionStepper
          value={portions}
          onChange={(v) => setPortions(v)}
          basePortions={basePortions}
        />

        {/* Ingredienslista */}
        {recipe.ingredienser.length > 0 ? (
          <Tile t={t}>
            <div style={{ ...lab(t, { color: ACC, marginBottom: 10 }) }}>INGREDIENSER</div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column" }}>
              {recipe.ingredienser.map((ing, idx) => (
                <IngredientRow key={idx} ing={ing} scale={scale} isLast={idx === recipe.ingredienser.length - 1} />
              ))}
            </ul>
          </Tile>
        ) : null}

        {/* Steg-kort */}
        {recipe.steg.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={lab(t, { paddingLeft: 4 })}>GÖR SÅ HÄR</div>
            {recipe.steg.map((step, i) => (
              <StepCard key={i} index={i + 1} text={step} />
            ))}
          </div>
        ) : null}

        {/* Vintips i LINGON-tonad tile */}
        {recipe.vintips ? (
          <div
            style={{
              background: `${LINGON}14`,
              border: `1px solid ${LINGON}40`,
              borderRadius: 14,
              padding: 14,
            }}
          >
            <div style={{ ...lab(t, { color: LINGON, marginBottom: 6 }) }}>VINTIPS</div>
            <p style={{ fontFamily: serif, fontStyle: "italic", fontSize: 14, color: t.ink, lineHeight: 1.5 }}>
              {recipe.vintips}
            </p>
          </div>
        ) : null}
      </div>

      {/* Sticky bottom-bar */}
      <StickyBottom recipeId={recipe.id} hasSteps={recipe.steg.length > 0} />
    </div>
  );
}

// ── PortionStepper ──────────────────────────────────────────────────────────

function PortionStepper({
  value,
  onChange,
  basePortions,
}: {
  value: number;
  onChange: (v: number) => void;
  basePortions: number;
}) {
  const { t } = useWarmTheme();
  const dec = () => {
    if (value > 1) {
      void haptic("tap");
      onChange(value - 1);
    }
  };
  const inc = () => {
    if (value < 8) {
      void haptic("tap");
      onChange(value + 1);
    }
  };
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 14px",
        background: t.paperHi,
        border: `1px solid ${t.line}`,
        borderRadius: 14,
      }}
    >
      <div>
        <div style={lab(t)}>PORTIONER</div>
        <div style={{ ...num(t, 22, 500), lineHeight: 1.1, marginTop: 2 }} className="warm-tab-nums">
          {value} <span style={{ fontFamily: body, fontSize: 11, color: t.mute, fontWeight: 500 }}>st</span>
        </div>
        <span style={{ ...ital(t, 11), display: "block", marginTop: 2 }}>
          receptet skrivet för {basePortions}
        </span>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <StepBtn label="−" onClick={dec} disabled={value <= 1} />
        <StepBtn label="+" onClick={inc} disabled={value >= 8} />
      </div>
    </div>
  );
}

function StepBtn({ label, onClick, disabled }: { label: string; onClick: () => void; disabled: boolean }) {
  const { t } = useWarmTheme();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label === "+" ? "Öka portioner" : "Minska portioner"}
      style={{
        width: 40,
        height: 40,
        borderRadius: 999,
        background: disabled ? t.paper : ACC,
        color: disabled ? t.dim : "#FFFBF0",
        border: disabled ? `1px solid ${t.line}` : "none",
        fontFamily: body,
        fontSize: 18,
        fontWeight: 500,
        cursor: disabled ? "default" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {label}
    </button>
  );
}

// ── Ingrediens-rad ─────────────────────────────────────────────────────────

function IngredientRow({
  ing,
  scale,
  isLast,
}: {
  ing: Ingredient;
  scale: number;
  isLast: boolean;
}) {
  const { t } = useWarmTheme();
  const scaledVal = ing.v != null ? ing.v * scale : null;
  const amount = scaledVal != null ? fmt(scaledVal, ing.u) : "";
  return (
    <li
      style={{
        display: "flex",
        gap: 12,
        alignItems: "baseline",
        padding: "8px 0",
        borderBottom: isLast ? "none" : `1px solid ${t.line}`,
      }}
    >
      <span
        className="warm-tab-nums"
        style={{
          fontFamily: serif,
          fontSize: 14,
          color: ACC,
          minWidth: 64,
          flexShrink: 0,
          letterSpacing: "-0.01em",
        }}
      >
        {amount && ing.u ? `${amount} ${ing.u}` : amount ? amount : ing.u}
      </span>
      <span style={{ fontFamily: body, fontSize: 14, color: t.ink, lineHeight: 1.4 }}>{ing.n}</span>
    </li>
  );
}

/**
 * Smart-rounding för skalade mängder. Heltal stannar heltal vid integer-skalor;
 * decimal-värden rundas till en eller två decimaler beroende på storlek.
 */
function fmt(v: number, unit: string): string {
  if (v === 0) return "0";
  // Stora mängder (>= 10): runda till heltal
  if (v >= 10) return String(Math.round(v));
  // Medel (1–9.99): en decimal
  if (v >= 1) {
    const r = Math.round(v * 10) / 10;
    return Number.isInteger(r) ? String(r) : r.toString().replace(".", ",");
  }
  // Små (< 1): för enheter som tsk/msk runda till 1/2-stegen
  if (unit === "tsk" || unit === "msk") {
    const r = Math.round(v * 2) / 2;
    return Number.isInteger(r) ? String(r) : r.toString().replace(".", ",");
  }
  // Annars två decimaler
  const r = Math.round(v * 100) / 100;
  return r.toString().replace(/\.?0+$/, "").replace(".", ",");
}

// ── Steg-kort ──────────────────────────────────────────────────────────────

function StepCard({ index, text }: { index: number; text: string }) {
  const { t } = useWarmTheme();
  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        padding: 14,
        background: t.paper,
        border: `1px solid ${t.line}`,
        borderRadius: 14,
        alignItems: "flex-start",
      }}
    >
      <span
        style={{
          width: 32,
          height: 32,
          borderRadius: 999,
          background: t.tint, // ACC-tint
          color: ACC,
          fontFamily: serif,
          fontStyle: "italic",
          fontSize: 16,
          fontWeight: 500,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          letterSpacing: "-0.02em",
        }}
      >
        {index}
      </span>
      <p style={{ fontFamily: body, fontSize: 14, color: t.ink, lineHeight: 1.55, margin: 0 }}>{text}</p>
    </div>
  );
}

// ── Sticky bottom-bar ──────────────────────────────────────────────────────

function StickyBottom({ recipeId, hasSteps }: { recipeId: string; hasSteps: boolean }) {
  const { t } = useWarmTheme();
  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 88, // ovan TabBar-pillen
        display: "flex",
        justifyContent: "center",
        zIndex: 40,
        pointerEvents: "none",
        padding: "0 12px",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          gap: 8,
          padding: 8,
          background: t.paperHi,
          border: `1px solid ${t.line}`,
          borderRadius: 18,
          boxShadow: "0 12px 32px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)",
          backdropFilter: "blur(12px)",
          pointerEvents: "auto",
          maxWidth: "100%",
        }}
      >
        <button
          type="button"
          aria-disabled
          title="Tillgängligt i M2 (Planering)"
          style={{
            padding: "10px 14px",
            background: t.paper,
            color: t.dim,
            border: `1px solid ${t.line}`,
            borderRadius: 12,
            fontFamily: body,
            fontSize: 13,
            fontWeight: 500,
            cursor: "not-allowed",
            opacity: 0.7,
          }}
        >
          Lägg på veckan
        </button>
        {hasSteps ? (
          <a
            href={`/v3/mat/recept/${recipeId}?step=0`}
            onClick={() => void haptic("tap")}
            style={{
              padding: "10px 16px",
              background: ACC,
              color: "#FFFBF0",
              borderRadius: 12,
              fontFamily: body,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            Börja laga
          </a>
        ) : null}
      </div>
    </div>
  );
}

"use client";

// ─── Mat — Bibliotek ────────────────────────────────────────────────────────
// Chip-filter (Alla + tag-pills som finns i biblioteket), Importera-knapp,
// magazine-grid (1 col mobil / 2 col tablet+). Recept-kort: villkorad bild,
// namn (Fraunces 18), kursiv lede, meta (min + svårighet-dots + tag-pills).
// Två modaler: Importera (URL → review) och Manuellt (tom RecipeForm).

import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR, { mutate } from "swr";
import { AnimatePresence } from "framer-motion";
import { HubDisplay, HubThemeToggle } from "@/components/warm/fit/parts";
import { Pill, Tile } from "@/components/warm/primitives";
import { WarmModal } from "@/components/warm/Modal";
import { fetcher } from "@/lib/fetcher";
import { haptic } from "@/lib/warm/haptics";
import { useDesktop, useWarmTheme } from "@/lib/warm/theme";
import { ACC, body, ital, lab, num } from "@/lib/warm/tokens";
import type {
  ImportedRecipe,
  Ingredient,
  MatReadyResponse,
  Recipe,
  RecipeInput,
  RecipesResponse,
} from "@/lib/mat/types";

export default function BibliotekPage() {
  const { t } = useWarmTheme();
  const isDesktop = useDesktop();
  const [tag, setTag] = useState<string>("");
  const [importOpen, setImportOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  // Gate-fetch på matReady så vi inte hammar /api/mat/recipes med 501-svar
  // i lokal dev (där MAT-secrets saknas i .env.local).
  const readySwr = useSWR<MatReadyResponse>("/api/mat/ready", fetcher, {
    revalidateOnFocus: false,
  });
  const ready = readySwr.data?.matReady ?? false;

  const swr = useSWR<RecipesResponse>(ready ? "/api/mat/recipes" : null, fetcher, {
    revalidateOnFocus: false,
  });

  const recipes = useMemo(() => swr.data?.recipes ?? [], [swr.data?.recipes]);
  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const r of recipes) for (const tg of r.taggar) set.add(tg);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "sv"));
  }, [recipes]);

  const filtered = tag
    ? recipes.filter((r) => (r.taggar as string[]).includes(tag))
    : recipes;
  const total = recipes.length;

  return (
    <div style={{ paddingBottom: 24 }}>
      <HubDisplay
        eyebrow="BIBLIOTEK"
        title="Recepten,"
        italicTail="alla samlade."
        right={<HubThemeToggle isDesktop={isDesktop} />}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "0 18px" }}>
        {/* Importera + Manuellt-rad */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => {
              void haptic("tap");
              setImportOpen(true);
            }}
            style={{
              flex: 1,
              padding: "10px 14px",
              background: ACC,
              color: "#FFFBF0",
              border: "none",
              borderRadius: 12,
              fontFamily: body,
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.01em",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <ImportIcon size={16} color="#FFFBF0" /> Importera från länk
          </button>
          <button
            type="button"
            onClick={() => {
              void haptic("tap");
              setManualOpen(true);
            }}
            style={{
              padding: "10px 14px",
              background: t.paperHi,
              color: t.ink,
              border: `1px solid ${t.line}`,
              borderRadius: 12,
              fontFamily: body,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            + Manuellt
          </button>
        </div>

        {/* Chip-filter */}
        {allTags.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <Pill t={t} active={tag === ""} onClick={() => setTag("")}>
              Alla
            </Pill>
            {allTags.map((tg) => (
              <Pill key={tg} t={t} active={tag === tg} onClick={() => setTag(tg)}>
                {tg}
              </Pill>
            ))}
          </div>
        ) : null}

        {/* Tom state */}
        {readySwr.data && !ready ? (
          <Tile t={t}>
            <div style={{ ...lab(t, { color: ACC, marginBottom: 6 }) }}>NOTION INTE KONFIGURERAT</div>
            <p style={{ fontFamily: body, fontSize: 13, color: t.mute, lineHeight: 1.55 }}>
              Sätt <code>NOTION_MAT_RECIPES_DB</code>, <code>NOTION_MAT_PLAN_DB</code> och{" "}
              <code>NOTION_MAT_COACH_PAGE</code> innan biblioteket kan användas.
            </p>
          </Tile>
        ) : !swr.data ? (
          <p style={{ ...ital(t, 13), padding: "20px 4px" }}>Laddar recept…</p>
        ) : total === 0 ? (
          <Tile t={t} style={{ padding: 24, textAlign: "center" }}>
            <div style={{ ...num(t, 22, 400), color: t.ink, marginBottom: 6 }}>
              Inget recept ännu.
            </div>
            <p style={{ ...ital(t, 13), marginBottom: 14 }}>
              Importera ditt första — klistra in en länk till ett recept du gillar.
            </p>
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              style={{
                padding: "10px 16px",
                background: ACC,
                color: "#FFFBF0",
                border: "none",
                borderRadius: 12,
                fontFamily: body,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Importera från länk
            </button>
          </Tile>
        ) : filtered.length === 0 ? (
          <p style={{ ...ital(t, 13), padding: "20px 4px" }}>Inga recept matchar filtret.</p>
        ) : (
          <RecipeGrid recipes={filtered} />
        )}
      </div>

      <AnimatePresence>
        {importOpen ? (
          <ImportModal
            onClose={() => setImportOpen(false)}
            onSaved={() => {
              setImportOpen(false);
              void mutate("/api/mat/recipes");
            }}
          />
        ) : null}
        {manualOpen ? (
          <ManualCreateModal
            onClose={() => setManualOpen(false)}
            onSaved={() => {
              setManualOpen(false);
              void mutate("/api/mat/recipes");
            }}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

// ── Grid + Kort ─────────────────────────────────────────────────────────────

function RecipeGrid({ recipes }: { recipes: Recipe[] }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))",
        gap: 12,
      }}
    >
      {recipes.map((r) => (
        <RecipeCard key={r.id} recipe={r} />
      ))}
    </div>
  );
}

function RecipeCard({ recipe }: { recipe: Recipe }) {
  const { t } = useWarmTheme();
  return (
    <Link
      href={`/v3/mat/recept/${recipe.id}`}
      style={{
        display: "flex",
        flexDirection: "column",
        background: t.paper,
        border: `1px solid ${t.line}`,
        borderRadius: 14,
        overflow: "hidden",
        textDecoration: "none",
        color: t.ink,
      }}
    >
      {recipe.bildUrl ? (
        // Villkorad bild — ingen emoji-fallback, ingen glyph-bg per M1-bullet.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={recipe.bildUrl}
          alt={recipe.namn}
          loading="lazy"
          style={{
            width: "100%",
            aspectRatio: "16 / 10",
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : null}
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 6 }}>
        <h3 style={{ ...num(t, 18, 500), lineHeight: 1.2 }}>{recipe.namn}</h3>
        {recipe.lede ? (
          <p
            style={{
              ...ital(t, 12),
              lineHeight: 1.4,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {recipe.lede}
          </p>
        ) : null}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 4,
            fontFamily: body,
            fontSize: 11,
            color: t.mute,
          }}
        >
          {recipe.minTotal ? (
            <span className="warm-tab-nums">{recipe.minTotal} min</span>
          ) : null}
          {recipe.minTotal && recipe.svarighet ? (
            <span style={{ color: t.dim }}>·</span>
          ) : null}
          {recipe.svarighet ? <DifficultyDots level={recipe.svarighet} /> : null}
          {recipe.taggar.length > 0 ? (
            <div style={{ display: "flex", gap: 4, marginLeft: "auto", flexWrap: "wrap", justifyContent: "flex-end" }}>
              {recipe.taggar.slice(0, 2).map((tg) => (
                <span
                  key={tg}
                  style={{
                    background: t.tint,
                    color: ACC,
                    padding: "2px 8px",
                    borderRadius: 999,
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                  }}
                >
                  {tg}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function DifficultyDots({ level }: { level: number | null }) {
  const { t } = useWarmTheme();
  const n = Math.max(0, Math.min(3, Math.round(level ?? 0)));
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          aria-hidden
          style={{
            width: 5,
            height: 5,
            borderRadius: 999,
            background: i < n ? ACC : t.line,
            display: "inline-block",
          }}
        />
      ))}
    </span>
  );
}

// ── Modaler ─────────────────────────────────────────────────────────────────

function ImportModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { t } = useWarmTheme();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState<ImportedRecipe | null>(null);

  async function runImport() {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mat/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `Fel ${res.status}`);
        return;
      }
      setImported(data.imported as ImportedRecipe);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  if (imported) {
    return (
      <WarmModal
        title="Granska & spara"
        onClose={onClose}
        footer={null}
      >
        <RecipeForm
          initial={importedToInput(imported)}
          aiSkapad
          onSaved={onSaved}
          onCancel={onClose}
          submitLabel="Spara recept"
        />
      </WarmModal>
    );
  }

  return (
    <WarmModal
      title="Importera från länk"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={secondaryBtn(t)}
          >
            Avbryt
          </button>
          <button
            type="button"
            onClick={() => void runImport()}
            disabled={loading || url.trim().length === 0}
            style={primaryBtn(loading || url.trim().length === 0)}
          >
            {loading ? "Hämtar…" : "Hämta recept"}
          </button>
        </>
      }
    >
      <p style={{ fontFamily: body, fontSize: 13, color: t.mute, marginBottom: 14, lineHeight: 1.55 }}>
        Klistra in en länk till ett recept (ICA, Köket, Coop, Mathem, Tasteline m.fl.).
        Claude extraherar ingredienser, steg och bild — du granskar innan du sparar.
      </p>
      <input
        type="url"
        autoFocus
        placeholder="https://www.ica.se/recept/…"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void runImport();
        }}
        style={textInput(t)}
      />
      {error ? (
        <p
          style={{
            fontFamily: body,
            fontSize: 12,
            color: t.bad,
            marginTop: 10,
            lineHeight: 1.45,
          }}
        >
          {error}
        </p>
      ) : null}
    </WarmModal>
  );
}

function ManualCreateModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  return (
    <WarmModal title="Nytt recept" onClose={onClose} footer={null}>
      <RecipeForm
        initial={{
          namn: "",
          lede: "",
          ingredienser: [],
          steg: [],
          minTotal: null,
          svarighet: null,
          basPortioner: 4,
          taggar: [],
          vintips: "",
          bildUrl: null,
          kallaUrl: null,
          kallaLabel: "",
        }}
        aiSkapad={false}
        onSaved={onSaved}
        onCancel={onClose}
        submitLabel="Skapa recept"
      />
    </WarmModal>
  );
}

// ── Recept-formulär (delas av Importera + Manuellt) ────────────────────────

interface FormState {
  namn: string;
  lede: string;
  ingredienser: string; // textarea: en rad per ingrediens "v u n"
  steg: string;         // textarea: en rad per steg
  minTotal: string;
  svarighet: number | null;
  basPortioner: number;
  taggar: string[];
  vintips: string;
  bildUrl: string;
  kallaUrl: string;
  kallaLabel: string;
}

function importedToInput(r: ImportedRecipe): RecipeInput & { kallaUrl: string | null; kallaLabel: string } {
  return {
    namn: r.namn,
    lede: r.lede,
    ingredienser: r.ingredienser,
    steg: r.steg,
    minTotal: r.minTotal,
    svarighet: r.svarighet,
    basPortioner: r.basPortioner,
    taggar: r.taggar,
    vintips: r.vintips,
    bildUrl: r.bildUrl,
    kallaUrl: r.kallaUrl || null,
    kallaLabel: r.kallaLabel,
  };
}

function RecipeForm({
  initial,
  aiSkapad,
  onSaved,
  onCancel,
  submitLabel,
}: {
  initial: RecipeInput & { kallaUrl?: string | null; kallaLabel?: string };
  aiSkapad: boolean;
  onSaved: () => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  const { t } = useWarmTheme();
  const [state, setState] = useState<FormState>(() => ({
    namn: initial.namn ?? "",
    lede: initial.lede ?? "",
    ingredienser: (initial.ingredienser ?? []).map(ingredientToLine).join("\n"),
    steg: (initial.steg ?? []).join("\n"),
    minTotal: initial.minTotal != null ? String(initial.minTotal) : "",
    svarighet: (initial.svarighet ?? null) as number | null,
    basPortioner: initial.basPortioner ?? 4,
    taggar: initial.taggar ?? [],
    vintips: initial.vintips ?? "",
    bildUrl: initial.bildUrl ?? "",
    kallaUrl: initial.kallaUrl ?? "",
    kallaLabel: initial.kallaLabel ?? "",
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setState((s) => ({ ...s, [k]: v }));

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload: RecipeInput = {
        namn: state.namn.trim(),
        lede: state.lede.trim(),
        ingredienser: parseIngredientLines(state.ingredienser),
        steg: state.steg.split(/\r?\n/).map((s) => s.trim()).filter(Boolean),
        minTotal: state.minTotal.trim() === "" ? null : Number(state.minTotal) || null,
        svarighet: state.svarighet,
        basPortioner: Number.isFinite(state.basPortioner) && state.basPortioner > 0
          ? Math.round(state.basPortioner)
          : 4,
        taggar: state.taggar,
        vintips: state.vintips.trim(),
        bildUrl: state.bildUrl.trim() || null,
        kallaUrl: state.kallaUrl.trim() || null,
        kallaLabel: state.kallaLabel.trim(),
        aiSkapad,
      };
      if (!payload.namn) {
        setError("Namn krävs.");
        setSaving(false);
        return;
      }
      const res = await fetch("/api/mat/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `Fel ${res.status}`);
        setSaving(false);
        return;
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Field t={t} label="Namn">
        <input
          type="text"
          value={state.namn}
          onChange={(e) => set("namn", e.target.value)}
          placeholder="Tomatpasta med basilika"
          style={textInput(t)}
        />
      </Field>
      <Field t={t} label="Lede (kort ingress)">
        <textarea
          value={state.lede}
          onChange={(e) => set("lede", e.target.value)}
          rows={2}
          placeholder="En enkel vardagspasta som kommer snabbt på bordet."
          style={textArea(t)}
        />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Field t={t} label="Tid (min)">
          <input
            type="number"
            inputMode="numeric"
            value={state.minTotal}
            onChange={(e) => set("minTotal", e.target.value)}
            placeholder="30"
            style={textInput(t)}
          />
        </Field>
        <Field t={t} label="Portioner">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={12}
            value={state.basPortioner}
            onChange={(e) => set("basPortioner", Number(e.target.value) || 4)}
            style={textInput(t)}
          />
        </Field>
      </div>
      <Field t={t} label="Svårighet">
        <div style={{ display: "flex", gap: 6 }}>
          {[1, 2, 3].map((lv) => (
            <Pill
              key={lv}
              t={t}
              active={state.svarighet === lv}
              onClick={() => set("svarighet", state.svarighet === lv ? null : lv)}
            >
              {lv === 1 ? "Lätt" : lv === 2 ? "Medel" : "Svår"}
            </Pill>
          ))}
        </div>
      </Field>
      <Field
        t={t}
        label="Ingredienser"
        help="En per rad — format: 'mängd enhet namn' (t.ex. '300 g pasta', '1 klyfta vitlök', '1 nypa salt')."
      >
        <textarea
          value={state.ingredienser}
          onChange={(e) => set("ingredienser", e.target.value)}
          rows={6}
          style={textArea(t)}
        />
      </Field>
      <Field t={t} label="Steg" help="En per rad. Slå Enter för nytt steg.">
        <textarea
          value={state.steg}
          onChange={(e) => set("steg", e.target.value)}
          rows={6}
          style={textArea(t)}
        />
      </Field>
      <Field t={t} label="Taggar" help="Komma-separerat eller en per rad.">
        <input
          type="text"
          value={state.taggar.join(", ")}
          onChange={(e) =>
            set(
              "taggar",
              e.target.value
                .split(/[,\n]/)
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
          placeholder="Vegetariskt, Snabbt, Pasta"
          style={textInput(t)}
        />
      </Field>
      <Field t={t} label="Vintips (valfritt)">
        <input
          type="text"
          value={state.vintips}
          onChange={(e) => set("vintips", e.target.value)}
          placeholder="En medelfyllig rödvin med syra"
          style={textInput(t)}
        />
      </Field>
      <Field t={t} label="Bild-URL (valfritt)">
        <input
          type="url"
          value={state.bildUrl}
          onChange={(e) => set("bildUrl", e.target.value)}
          placeholder="https://…"
          style={textInput(t)}
        />
      </Field>
      <Field t={t} label="Källa-URL (valfritt)">
        <input
          type="url"
          value={state.kallaUrl}
          onChange={(e) => {
            const v = e.target.value;
            set("kallaUrl", v);
            // Auto-fyll Källa-label från domän om tomt
            if (!state.kallaLabel) {
              try {
                const u = new URL(v);
                set("kallaLabel", u.hostname.replace(/^www\./, ""));
              } catch {
                /* ignore */
              }
            }
          }}
          placeholder="https://www.ica.se/recept/…"
          style={textInput(t)}
        />
      </Field>

      {error ? (
        <p style={{ fontFamily: body, fontSize: 12, color: t.bad, lineHeight: 1.45 }}>{error}</p>
      ) : null}

      <div
        style={{
          display: "flex",
          gap: 8,
          paddingTop: 12,
          borderTop: `1px solid ${t.line}`,
          marginTop: 4,
        }}
      >
        <button type="button" onClick={onCancel} disabled={saving} style={secondaryBtn(t)}>
          Avbryt
        </button>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          style={primaryBtn(saving)}
        >
          {saving ? "Sparar…" : submitLabel}
        </button>
      </div>
    </div>
  );
}

function Field({
  t,
  label,
  help,
  children,
}: {
  t: ReturnType<typeof useWarmTheme>["t"];
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={lab(t)}>{label}</span>
      {children}
      {help ? (
        <span style={{ fontFamily: body, fontSize: 11, color: t.dim, lineHeight: 1.45 }}>
          {help}
        </span>
      ) : null}
    </label>
  );
}

// ── Ingrediens-parsing (textarea → Ingredient[]) ───────────────────────────

function ingredientToLine(i: Ingredient): string {
  const parts: string[] = [];
  if (i.v != null) parts.push(formatNumber(i.v));
  if (i.u) parts.push(i.u);
  if (i.n) parts.push(i.n);
  return parts.join(" ");
}

function formatNumber(v: number): string {
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(2).replace(/\.?0+$/, "").replace(".", ",");
}

const KNOWN_UNITS = new Set([
  "g", "kg", "hg", "ml", "cl", "dl", "l",
  "msk", "tsk", "krm", "kkp", "kopp", "koppar",
  "st", "stk", "stycken",
  "klyfta", "klyftor", "skiva", "skivor", "burk", "burkar", "påse", "påsar",
  "nypa", "nypor", "skvätt", "skvättar",
]);

function parseIngredientLines(raw: string): Ingredient[] {
  const out: Ingredient[] = [];
  for (const lineRaw of raw.split(/\r?\n/)) {
    const line = lineRaw.trim();
    if (!line) continue;
    const tokens = line.split(/\s+/);

    let v: number | null = null;
    let u = "";
    let nameStartIdx = 0;

    // Token 0: försök tolka som tal (med komma eller bråkstreck).
    const first = tokens[0];
    const parsed = parseAmount(first);
    if (parsed != null) {
      v = parsed;
      nameStartIdx = 1;
      // Token 1: enhet om känd
      if (tokens[1] && KNOWN_UNITS.has(tokens[1].toLowerCase())) {
        u = tokens[1].toLowerCase();
        nameStartIdx = 2;
      }
    } else if (KNOWN_UNITS.has(first.toLowerCase())) {
      // "nypa salt" — enhet utan mängd
      u = first.toLowerCase();
      nameStartIdx = 1;
    }

    const n = tokens.slice(nameStartIdx).join(" ").trim();
    if (!n) continue;
    out.push({ v, u, n });
  }
  return out;
}

function parseAmount(s: string): number | null {
  // Hantera bråk "1/2", "1/4"
  if (/^\d+\/\d+$/.test(s)) {
    const [a, b] = s.split("/").map(Number);
    return b !== 0 ? a / b : null;
  }
  // Komma som decimal-separator
  const norm = s.replace(",", ".");
  const v = Number(norm);
  return Number.isFinite(v) && norm.length > 0 ? v : null;
}

// ── UI-styles ──────────────────────────────────────────────────────────────

function textInput(t: ReturnType<typeof useWarmTheme>["t"]): React.CSSProperties {
  return {
    width: "100%",
    padding: "10px 12px",
    background: t.paper,
    border: `1px solid ${t.line}`,
    borderRadius: 10,
    fontFamily: body,
    fontSize: 13,
    color: t.ink,
    outline: "none",
  };
}

function textArea(t: ReturnType<typeof useWarmTheme>["t"]): React.CSSProperties {
  return {
    width: "100%",
    padding: "10px 12px",
    background: t.paper,
    border: `1px solid ${t.line}`,
    borderRadius: 10,
    fontFamily: body,
    fontSize: 13,
    color: t.ink,
    outline: "none",
    resize: "vertical",
    lineHeight: 1.45,
  };
}

function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: "10px 16px",
    background: ACC,
    color: "#FFFBF0",
    border: "none",
    borderRadius: 10,
    fontFamily: body,
    fontSize: 13,
    fontWeight: 600,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.5 : 1,
    marginLeft: "auto",
  };
}

function secondaryBtn(t: ReturnType<typeof useWarmTheme>["t"]): React.CSSProperties {
  return {
    padding: "10px 16px",
    background: t.paperHi,
    color: t.ink,
    border: `1px solid ${t.line}`,
    borderRadius: 10,
    fontFamily: body,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  };
}

// ── Ikon ────────────────────────────────────────────────────────────────────

function ImportIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
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
      aria-hidden
      style={{ flexShrink: 0 }}
    >
      <path d="M12 4v11" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 20h14" />
    </svg>
  );
}

"use client";

// ─── Mat — Planering ────────────────────────────────────────────────────────
// Vecka-grid (Mån–Sön × Lunch + Middag, ingen frukost). Period-nav.
// ACC border + tint på dagens dag. Slot-tiles: fyllda visar recept-namn +
// min, tomma visar "lägg till" med dashed border. Slot-väljar-modal med
// två-läges-toggle: "Välj recept" eller "Fritext". CRUD mot /api/mat/plan.
//
// Under vecka-grid: inköpslista som expand-panel. Aggregerar ingredienser
// från veckans planerade recept via `aggregateShoppingList`, normaliserar
// enheter, grupperar per butikskategori. "Kopiera lista"-knapp i ACC.

import { Suspense, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import useSWR, { mutate as globalMutate } from "swr";
import { useSearchParams, useRouter } from "next/navigation";
import { HubDisplay, HubThemeToggle } from "@/components/warm/fit/parts";
import { ChevronLeft, ChevronRight } from "@/components/warm/icons/extra";
import { Pill, Tile } from "@/components/warm/primitives";
import { WarmModal } from "@/components/warm/Modal";
import { fetcher } from "@/lib/fetcher";
import { haptic } from "@/lib/warm/haptics";
import { useDesktop, useWarmTheme } from "@/lib/warm/theme";
import { ACC, body, ital, lab, num } from "@/lib/warm/tokens";
import {
  CATEGORY_ORDER,
  aggregateShoppingList,
  formatItemAmount,
  formatShoppingListPlaintext,
} from "@/lib/mat/shopping";
import type {
  MatReadyResponse,
  MealPlanResponse,
  MealPlanSlot,
  MealSlot,
  Recipe,
  RecipesResponse,
  ShoppingCategory,
  ShoppingItem,
} from "@/lib/mat/types";

const SLOTS: MealSlot[] = ["Lunch", "Middag"];
const DAY_NAMES = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function mondayOf(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}
function formatWeekRange(monday: Date): string {
  const sun = addDays(monday, 6);
  const sameMonth = monday.getMonth() === sun.getMonth();
  const monStr = monday.toLocaleDateString("sv-SE", { day: "numeric", month: sameMonth ? undefined : "short" });
  const sunStr = sun.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
  return `${monStr} – ${sunStr}`;
}
function isoWeekNumber(d: Date): number {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  // Torsdagen ger ISO-veckan
  dt.setDate(dt.getDate() + 3 - ((dt.getDay() + 6) % 7));
  const firstThursday = new Date(dt.getFullYear(), 0, 4);
  const diff = (dt.getTime() - firstThursday.getTime()) / 86400000;
  return 1 + Math.round((diff - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
}

export default function MatPlaneringPage() {
  return (
    <Suspense fallback={null}>
      <PlaneringInner />
    </Suspense>
  );
}

function PlaneringInner() {
  const { t } = useWarmTheme();
  const isDesktop = useDesktop();
  const searchParams = useSearchParams();
  const router = useRouter();
  const addParam = searchParams?.get("add") ?? null;

  const [anchor, setAnchor] = useState<Date>(() => mondayOf(new Date()));
  const [editing, setEditing] = useState<SlotDraft | null>(null);
  const [shoppingOpen, setShoppingOpen] = useState(false);

  const weekStart = isoDate(anchor);

  // Gate på matReady — undvik 501-hammer i lokal dev
  const readySwr = useSWR<MatReadyResponse>("/api/mat/ready", fetcher, {
    revalidateOnFocus: false,
  });
  const ready = readySwr.data?.matReady ?? false;

  const planSwr = useSWR<MealPlanResponse>(
    ready ? `/api/mat/plan?weekStart=${weekStart}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );
  const recipesSwr = useSWR<RecipesResponse>(
    ready ? "/api/mat/recipes" : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  const slots = planSwr.data?.slots ?? [];
  const recipes = recipesSwr.data?.recipes ?? [];
  const recipesById = useMemo(() => {
    const m = new Map<string, Recipe>();
    for (const r of recipes) m.set(r.id, r);
    return m;
  }, [recipes]);

  const slotsByKey = useMemo(() => {
    const m = new Map<string, MealPlanSlot>();
    for (const s of slots) m.set(`${s.datum}|${s.slot}`, s);
    return m;
  }, [slots]);

  const today = isoDate(new Date());

  // Hantera `?add=YYYY-MM-DD|SLOT|recipeId` från recept-detalj
  useEffect(() => {
    if (!addParam || !ready) return;
    const parts = addParam.split("|");
    const dateArg = parts[0] ?? "";
    const slotArg = (parts[1] as MealSlot) ?? "Middag";
    const recipeArg = parts[2] ?? "";
    const targetDate = /^\d{4}-\d{2}-\d{2}$/.test(dateArg) ? dateArg : today;
    setAnchor(mondayOf(new Date(`${targetDate}T00:00:00`)));
    setEditing({
      datum: targetDate,
      slot: SLOTS.includes(slotArg) ? slotArg : "Middag",
      receptIds: recipeArg ? [recipeArg] : [],
      egetNamn: "",
      tidMin: null,
      id: undefined,
    });
    router.replace("/v3/mat/planering", { scroll: false });
  }, [addParam, ready, router, today]);

  const shiftWeek = (delta: number) => setAnchor((a) => addDays(a, delta * 7));
  const goToday = () => setAnchor(mondayOf(new Date()));

  async function handleSave(draft: SlotDraft) {
    const payload = {
      datum: draft.datum,
      slot: draft.slot,
      receptIds: draft.receptIds,
      egetNamn: draft.egetNamn,
      tidMin: draft.tidMin,
    };
    if (draft.id) {
      await fetch(`/api/mat/plan/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/mat/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    await globalMutate(`/api/mat/plan?weekStart=${weekStart}`);
    setEditing(null);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/mat/plan/${id}`, { method: "DELETE" });
    await globalMutate(`/api/mat/plan?weekStart=${weekStart}`);
    setEditing(null);
  }

  const filledCount = slots.length;
  const weekNumber = isoWeekNumber(anchor);

  return (
    <div style={{ paddingBottom: 24 }}>
      <HubDisplay
        eyebrow={`PLANERING · V.${weekNumber}`}
        title="Veckan,"
        italicTail="framför."
        right={<HubThemeToggle isDesktop={isDesktop} />}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "0 18px" }}>
        {/* Period-nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            type="button"
            onClick={() => {
              void haptic("tap");
              shiftWeek(-1);
            }}
            aria-label="Föregående vecka"
            style={iconBtn(t)}
          >
            <ChevronLeft size={16} color={t.mute} />
          </button>
          <button
            type="button"
            onClick={() => {
              void haptic("tap");
              goToday();
            }}
            title="Gå till denna vecka"
            style={{
              flex: 1,
              minWidth: 0,
              fontFamily: body,
              fontSize: 13,
              fontWeight: 600,
              color: t.ink,
              background: t.paper,
              border: `1px solid ${t.line}`,
              borderRadius: 999,
              padding: "8px 12px",
              cursor: "pointer",
              textAlign: "center",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            className="warm-tab-nums"
          >
            {formatWeekRange(anchor)}
          </button>
          <button
            type="button"
            onClick={() => {
              void haptic("tap");
              shiftWeek(1);
            }}
            aria-label="Nästa vecka"
            style={iconBtn(t)}
          >
            <ChevronRight size={16} color={t.mute} />
          </button>
        </div>

        {/* Not-ready tom-state */}
        {readySwr.data && !ready ? (
          <Tile t={t}>
            <div style={{ ...lab(t, { color: ACC, marginBottom: 6 }) }}>NOTION INTE KONFIGURERAT</div>
            <p style={{ fontFamily: body, fontSize: 13, color: t.mute, lineHeight: 1.55 }}>
              Sätt <code>NOTION_MAT_RECIPES_DB</code>, <code>NOTION_MAT_PLAN_DB</code> och{" "}
              <code>NOTION_MAT_COACH_PAGE</code> innan planeringen kan användas.
            </p>
          </Tile>
        ) : !planSwr.data && ready ? (
          <p style={{ ...ital(t, 13), padding: "20px 4px" }}>Läser planen…</p>
        ) : (
          <WeekGrid
            monday={anchor}
            today={today}
            slotsByKey={slotsByKey}
            recipesById={recipesById}
            onOpen={(datum, slot) => {
              const existing = slotsByKey.get(`${datum}|${slot}`);
              setEditing(
                existing
                  ? {
                      id: existing.id,
                      datum: existing.datum,
                      slot: existing.slot as MealSlot,
                      receptIds: existing.receptIds,
                      egetNamn: existing.egetNamn,
                      tidMin: existing.tidMin,
                    }
                  : {
                      datum,
                      slot,
                      receptIds: [],
                      egetNamn: "",
                      tidMin: null,
                    },
              );
            }}
          />
        )}

        {/* Inköpslista-panel */}
        {ready ? (
          <ShoppingListPanel
            open={shoppingOpen}
            onToggle={() => {
              void haptic("tap");
              setShoppingOpen((o) => !o);
            }}
            slots={slots}
            recipesById={recipesById}
            weekNumber={weekNumber}
            weekLabel={formatWeekRange(anchor)}
            filledCount={filledCount}
          />
        ) : null}
      </div>

      <AnimatePresence>
        {editing ? (
          <SlotEditorModal
            draft={editing}
            recipes={recipes}
            onClose={() => setEditing(null)}
            onSave={handleSave}
            onDelete={editing.id ? () => handleDelete(editing.id!) : undefined}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

interface SlotDraft {
  id?: string;
  datum: string;
  slot: MealSlot;
  receptIds: string[];
  egetNamn: string;
  tidMin: number | null;
}

// ── Vecka-grid ──────────────────────────────────────────────────────────────

function WeekGrid({
  monday,
  today,
  slotsByKey,
  recipesById,
  onOpen,
}: {
  monday: Date;
  today: string;
  slotsByKey: Map<string, MealPlanSlot>;
  recipesById: Map<string, Recipe>;
  onOpen: (datum: string, slot: MealSlot) => void;
}) {
  const { t } = useWarmTheme();
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {days.map((d, i) => {
        const iso = isoDate(d);
        const isToday = iso === today;
        return (
          <div
            key={iso}
            style={{
              border: `1px solid ${isToday ? ACC : t.line}`,
              background: isToday ? t.tint : t.paper,
              borderRadius: 14,
              padding: 10,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "0 2px" }}>
              <span
                style={{
                  fontFamily: body,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  color: isToday ? ACC : t.mute,
                  textTransform: "uppercase",
                }}
              >
                {DAY_NAMES[i]}
              </span>
              <span
                className="warm-tab-nums"
                style={{
                  fontFamily: body,
                  fontSize: 12,
                  color: isToday ? ACC : t.dim,
                  fontWeight: 500,
                }}
              >
                {d.toLocaleDateString("sv-SE", { day: "numeric", month: "short" })}
              </span>
              {isToday ? (
                <span
                  style={{
                    ...ital(t, 11),
                    color: ACC,
                    marginLeft: "auto",
                  }}
                >
                  idag
                </span>
              ) : null}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
              {SLOTS.map((slot) => {
                const existing = slotsByKey.get(`${iso}|${slot}`);
                return (
                  <SlotTile
                    key={slot}
                    slot={slot}
                    existing={existing}
                    recipesById={recipesById}
                    onClick={() => onOpen(iso, slot)}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SlotTile({
  slot,
  existing,
  recipesById,
  onClick,
}: {
  slot: MealSlot;
  existing: MealPlanSlot | undefined;
  recipesById: Map<string, Recipe>;
  onClick: () => void;
}) {
  const { t } = useWarmTheme();
  const firstRecipe = existing?.receptIds[0] ? recipesById.get(existing.receptIds[0]) : null;
  const isFilled = existing !== undefined;
  const title = firstRecipe?.namn ?? existing?.egetNamn ?? "";
  const minutes = firstRecipe?.minTotal ?? existing?.tidMin ?? null;

  return (
    <button
      type="button"
      onClick={() => {
        void haptic("tap");
        onClick();
      }}
      style={{
        textAlign: "left",
        background: isFilled ? t.paperHi : "transparent",
        border: isFilled
          ? `1px solid ${t.line}`
          : `1px dashed ${t.dim}`,
        borderRadius: 12,
        padding: "10px 12px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        minHeight: 64,
        width: "100%",
        color: t.ink,
      }}
    >
      <span
        style={{
          fontFamily: body,
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.08em",
          color: ACC,
          textTransform: "uppercase",
        }}
      >
        {slot}
      </span>
      {isFilled ? (
        <>
          <span
            style={{
              fontFamily: body,
              fontSize: 13,
              fontWeight: 500,
              lineHeight: 1.25,
              color: t.ink,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {title || "(utan namn)"}
          </span>
          {minutes ? (
            <span
              className="warm-tab-nums"
              style={{ fontFamily: body, fontSize: 11, color: t.mute }}
            >
              {minutes} min
            </span>
          ) : null}
        </>
      ) : (
        <span style={{ ...ital(t, 12), color: t.dim }}>lägg till</span>
      )}
    </button>
  );
}

// ── Slot-väljar-modal ─────────────────────────────────────────────────────

function SlotEditorModal({
  draft,
  recipes,
  onClose,
  onSave,
  onDelete,
}: {
  draft: SlotDraft;
  recipes: Recipe[];
  onClose: () => void;
  onSave: (draft: SlotDraft) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const { t } = useWarmTheme();
  const [mode, setMode] = useState<"recept" | "fritext">(
    draft.receptIds.length > 0 ? "recept" : draft.egetNamn ? "fritext" : "recept",
  );
  const [datum, setDatum] = useState(draft.datum);
  const [slot, setSlot] = useState<MealSlot>(draft.slot);
  const [search, setSearch] = useState("");
  const [pickedRecipeId, setPickedRecipeId] = useState<string | null>(
    draft.receptIds[0] ?? null,
  );
  const [egetNamn, setEgetNamn] = useState(draft.egetNamn);
  const [tidMin, setTidMin] = useState<string>(
    draft.tidMin != null ? String(draft.tidMin) : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter((r) => r.namn.toLowerCase().includes(q));
  }, [search, recipes]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload: SlotDraft = {
        id: draft.id,
        datum,
        slot,
        receptIds: mode === "recept" && pickedRecipeId ? [pickedRecipeId] : [],
        egetNamn: mode === "fritext" ? egetNamn.trim() : "",
        tidMin:
          mode === "fritext" && tidMin.trim().length > 0
            ? Number(tidMin) || null
            : null,
      };
      if (mode === "recept" && !pickedRecipeId) {
        setError("Välj ett recept eller byt till fritext.");
        setSaving(false);
        return;
      }
      if (mode === "fritext" && !payload.egetNamn) {
        setError("Skriv ett namn eller välj ett recept.");
        setSaving(false);
        return;
      }
      await onSave(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  }

  return (
    <WarmModal
      title={draft.id ? "Ändra slot" : "Lägg till slot"}
      onClose={onClose}
      footer={
        <>
          {onDelete ? (
            <button
              type="button"
              onClick={() => {
                void haptic("tap");
                void onDelete();
              }}
              disabled={saving}
              style={dangerBtn(t)}
            >
              Ta bort
            </button>
          ) : null}
          <button type="button" onClick={onClose} disabled={saving} style={secondaryBtn(t)}>
            Avbryt
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            style={primaryBtn(saving)}
          >
            {saving ? "Sparar…" : "Spara"}
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Datum + slot */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={lab(t)}>Datum</span>
            <input
              type="date"
              value={datum}
              onChange={(e) => setDatum(e.target.value)}
              style={textInput(t)}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={lab(t)}>Slot</span>
            <div style={{ display: "flex", gap: 4 }}>
              {SLOTS.map((s) => (
                <Pill key={s} t={t} active={slot === s} onClick={() => setSlot(s)}>
                  {s}
                </Pill>
              ))}
            </div>
          </label>
        </div>

        {/* Läges-toggle */}
        <div
          style={{
            display: "inline-flex",
            gap: 2,
            padding: 3,
            background: t.paper,
            border: `1px solid ${t.line}`,
            borderRadius: 999,
            alignSelf: "flex-start",
          }}
        >
          {(["recept", "fritext"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                void haptic("tap");
                setMode(m);
              }}
              style={{
                fontFamily: body,
                fontSize: 12,
                fontWeight: 600,
                background: mode === m ? ACC : "transparent",
                color: mode === m ? "#FFFBF0" : t.mute,
                border: "none",
                padding: "6px 14px",
                borderRadius: 999,
                cursor: "pointer",
              }}
            >
              {m === "recept" ? "Välj recept" : "Fritext"}
            </button>
          ))}
        </div>

        {mode === "recept" ? (
          <>
            <input
              type="text"
              placeholder="Sök i biblioteket…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={textInput(t)}
            />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                maxHeight: 260,
                overflowY: "auto",
                border: `1px solid ${t.line}`,
                borderRadius: 10,
                background: t.paper,
              }}
            >
              {filtered.length === 0 ? (
                <p style={{ ...ital(t, 12), padding: 14 }}>
                  Inga recept matchar — försök med fritext istället.
                </p>
              ) : (
                filtered.map((r, idx) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      void haptic("tap");
                      setPickedRecipeId(r.id);
                    }}
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      background:
                        pickedRecipeId === r.id ? t.tint : "transparent",
                      border: "none",
                      borderTop: idx === 0 ? "none" : `1px solid ${t.line}`,
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      color: t.ink,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: body,
                        fontSize: 13,
                        fontWeight: pickedRecipeId === r.id ? 600 : 500,
                        color: pickedRecipeId === r.id ? ACC : t.ink,
                      }}
                    >
                      {r.namn}
                    </span>
                    <span
                      className="warm-tab-nums"
                      style={{ fontFamily: body, fontSize: 11, color: t.mute }}
                    >
                      {r.minTotal ? `${r.minTotal} min` : "—"}
                      {r.taggar.length > 0 ? ` · ${r.taggar.slice(0, 2).join(" · ")}` : ""}
                    </span>
                  </button>
                ))
              )}
            </div>
          </>
        ) : (
          <>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={lab(t)}>Namn</span>
              <input
                type="text"
                value={egetNamn}
                onChange={(e) => setEgetNamn(e.target.value)}
                placeholder="Rester från igår"
                style={textInput(t)}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={lab(t)}>Tid (min, valfri)</span>
              <input
                type="number"
                inputMode="numeric"
                value={tidMin}
                onChange={(e) => setTidMin(e.target.value)}
                placeholder="20"
                style={textInput(t)}
              />
            </label>
          </>
        )}

        {error ? (
          <p style={{ fontFamily: body, fontSize: 12, color: t.bad, lineHeight: 1.45 }}>{error}</p>
        ) : null}
      </div>
    </WarmModal>
  );
}

// ── Inköpslista-panel ───────────────────────────────────────────────────────

function ShoppingListPanel({
  open,
  onToggle,
  slots,
  recipesById,
  weekNumber,
  weekLabel,
  filledCount,
}: {
  open: boolean;
  onToggle: () => void;
  slots: MealPlanSlot[];
  recipesById: Map<string, Recipe>;
  weekNumber: number;
  weekLabel: string;
  filledCount: number;
}) {
  const { t } = useWarmTheme();
  const [copied, setCopied] = useState(false);

  const { groups, freeItems } = useMemo(
    () => aggregateShoppingList(slots, recipesById),
    [slots, recipesById],
  );

  const totalRows = useMemo(() => {
    let n = 0;
    for (const arr of groups.values()) n += arr.length;
    return n;
  }, [groups]);

  async function copy() {
    const header = `Inköpslista (v.${weekNumber}, ${weekLabel})`;
    const text = formatShoppingListPlaintext(groups, header);
    try {
      await navigator.clipboard.writeText(text);
      void haptic("tap");
      setCopied(true);
      setTimeout(() => setCopied(false), 800);
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      style={{
        background: t.paper,
        border: `1px solid ${t.line}`,
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%",
          background: "transparent",
          border: "none",
          padding: 14,
          display: "flex",
          alignItems: "center",
          gap: 12,
          cursor: "pointer",
          color: t.ink,
          textAlign: "left",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...lab(t, { color: ACC, marginBottom: 4 }) }}>INKÖPSLISTA</div>
          <div style={{ ...num(t, 17, 500), lineHeight: 1.2 }}>
            {totalRows === 0 ? (
              <>Tomt än — <span style={{ fontStyle: "italic", color: t.dim }}>lägg till recept.</span></>
            ) : (
              <>{totalRows} rader, <span style={{ fontStyle: "italic", color: t.dim }}>aggregerat.</span></>
            )}
          </div>
          <div style={{ fontFamily: body, fontSize: 12, color: t.mute, marginTop: 4 }}>
            {filledCount} planerade slot{filledCount === 1 ? "" : "tar"} denna vecka
          </div>
        </div>
        <span
          style={{
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease-out",
            color: t.dim,
            display: "inline-flex",
          }}
        >
          <ChevronRight size={18} color={t.dim} />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ overflow: "hidden", background: "var(--color-surface-container)" }}
          >
            <div
              style={{
                padding: 14,
                borderTop: `1px solid ${t.line}`,
                display: "flex",
                flexDirection: "column",
                gap: 14,
                background: t.paperHi,
              }}
            >
              {totalRows === 0 && freeItems.length === 0 ? (
                <p style={{ ...ital(t, 13) }}>
                  Inga ingredienser ännu — välj recept i veckans slottar så aggregeras
                  listan här.
                </p>
              ) : (
                <>
                  {CATEGORY_ORDER.map((cat) => {
                    const items = groups.get(cat);
                    if (!items || items.length === 0) return null;
                    return <CategoryBlock key={cat} cat={cat} items={items} />;
                  })}
                  {freeItems.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={lab(t)}>FRITEXT-MÅLTIDER</div>
                      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                        {freeItems.map((line) => (
                          <li
                            key={line}
                            style={{
                              ...ital(t, 12),
                              padding: "2px 0",
                            }}
                          >
                            {line}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              )}

              <button
                type="button"
                onClick={() => void copy()}
                disabled={totalRows === 0}
                style={{
                  ...primaryBtn(totalRows === 0),
                  marginLeft: 0,
                  alignSelf: "flex-start",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {copied ? "Kopierat ✓" : "Kopiera lista"}
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function CategoryBlock({
  cat,
  items,
}: {
  cat: ShoppingCategory;
  items: ShoppingItem[];
}) {
  const { t } = useWarmTheme();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ ...lab(t, { color: ACC }) }}>{cat.toUpperCase()}</div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {items.map((item) => {
          const amount = formatItemAmount(item);
          return (
            <li
              key={item.namn}
              style={{
                display: "flex",
                gap: 8,
                alignItems: "baseline",
                padding: "4px 0",
                borderBottom: `1px solid ${t.line}`,
              }}
            >
              <span
                className="warm-tab-nums"
                style={{
                  fontFamily: body,
                  fontSize: 13,
                  color: ACC,
                  minWidth: 78,
                  fontWeight: 500,
                }}
              >
                {amount || "—"}
              </span>
              <span style={{ fontFamily: body, fontSize: 13, color: t.ink, lineHeight: 1.4 }}>
                {item.namn}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── UI-styles ──────────────────────────────────────────────────────────────

function iconBtn(t: ReturnType<typeof useWarmTheme>["t"]): React.CSSProperties {
  return {
    width: 36,
    height: 36,
    borderRadius: 999,
    background: t.paper,
    color: t.mute,
    border: `1px solid ${t.line}`,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  };
}

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

function dangerBtn(t: ReturnType<typeof useWarmTheme>["t"]): React.CSSProperties {
  return {
    padding: "10px 14px",
    background: "transparent",
    color: t.bad,
    border: `1px solid ${t.line}`,
    borderRadius: 10,
    fontFamily: body,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  };
}


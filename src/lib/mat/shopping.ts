// ─── Mat — Inköpslista-aggregation (computed, ingen persistens) ─────────────
// Tar veckans planerade slottar + recept-bibliotek och returnerar en
// butikskategoriserad lista. Ingredienser med samma normaliserade namn slås
// ihop per enhet — `1 dl + 2 dl → 3 dl`. Blandade enheter på samma namn
// listas som separata sub-värden i `belopp` (t.ex. `{ dl: 5, msk: 2 }`).
//
// Skala-mönster: varje slot kan ha sina egna recept (`receptIds[]`). För
// varje recept skalas ingredienserna med `slotPortioner / basPortioner`.
// Slot-portioner är inte ett fält i M2-schemat — vi använder recept-basen
// rakt av (skala 1.0). Fritext-slottar (`egetNamn`) bidrar inte med
// ingredienser, men listas som "egen" i `freeItems` så användaren kan
// notera dem manuellt.

import type {
  Ingredient,
  MealPlanSlot,
  Recipe,
  ShoppingCategory,
  ShoppingItem,
} from "./types";

// ── Butikskategori-heuristik ──────────────────────────────────────────────
// Keyword-lista per kategori. Lowercased substring-match mot ingrediens-
// namnet. Första träffen vinner. Faller tillbaka till "Övrigt".

const CATEGORY_KEYWORDS: Array<{ cat: ShoppingCategory; words: string[] }> = [
  {
    cat: "Grönt",
    words: [
      "tomat", "lök", "vitlök", "morot", "purjo", "schalotten", "rödlök",
      "potatis", "sötpotatis", "broccoli", "blomkål", "spenat", "ruccola",
      "sallad", "gurka", "paprika", "chili", "ingefära", "äpple", "äpplen",
      "päron", "citron", "lime", "apelsin", "banan", "bär", "blåbär",
      "hallon", "jordgubbar", "avokado", "zucchini", "aubergine", "squash",
      "majs", "ärt", "sockerärt", "böna", "bönor", "rödbeta", "palsternacka",
      "rotselleri", "rättika", "fänkål", "champinjon", "svamp", "kantarell",
      "persilja", "basilika", "koriander", "dill", "mynta", "rosmarin",
      "timjan", "salvia", "oregano", "gräslök",
    ],
  },
  {
    cat: "Mejeri",
    words: [
      "mjölk", "grädde", "crème fraiche", "creme fraiche", "smör", "yoghurt",
      "kvarg", "kesella", "kesam", "ost", "parmesan", "feta", "halloumi",
      "mozzarella", "cheddar", "ägg", "äggula", "äggvita", "filmjölk",
      "kefir", "ricotta", "mascarpone",
    ],
  },
  {
    cat: "Kött & fisk",
    words: [
      "kyckling", "kycklinglår", "kycklingfilé", "fläsk", "fläskfilé",
      "fläskkarré", "fläskkött", "bacon", "skinka", "korv", "köttfärs",
      "färs", "biff", "entrecote", "ryggbiff", "filé", "oxfilé", "lamm",
      "kalv", "anka", "kalkon", "lax", "torsk", "räka", "räkor", "tonfisk",
      "sill", "makrill", "musslor", "scampi", "krabba", "hummer",
    ],
  },
  {
    cat: "Skafferi",
    words: [
      "pasta", "spaghetti", "penne", "ris", "basmati", "couscous", "bulgur",
      "quinoa", "linser", "kikärt", "kikärter", "bröd", "mjöl", "vetemjöl",
      "rågmjöl", "havregryn", "müsli", "socker", "salt", "peppar", "olja",
      "olivolja", "rapsolja", "smörolja", "vinäger", "soja", "sojasås",
      "buljong", "fond", "krossade tomater", "passerade tomater",
      "tomatpuré", "tomatkonserv", "kokosmjölk", "honung", "sirap",
      "jäst", "bakpulver", "vaniljsocker", "vanilj", "kakao", "choklad",
      "russin", "nötter", "mandel", "valnöt", "cashew", "pistage",
      "kanel", "kardemumma", "kummin", "spiskummin", "paprikapulver",
      "currypulver", "curry", "saffran", "lagerblad", "muskot",
    ],
  },
];

/**
 * Hitta butikskategori för en ingrediens. Lowercased substring-match.
 */
export function categorize(name: string): ShoppingCategory {
  const lower = name.toLowerCase();
  for (const { cat, words } of CATEGORY_KEYWORDS) {
    for (const w of words) {
      if (lower.includes(w)) return cat;
    }
  }
  return "Övrigt";
}

// ── Enhets-normalisering ──────────────────────────────────────────────────
// Volymsystem: l/dl/cl/ml — slå ihop till en gemensam basenhet och välj
// "läsbar" enhet vid presentation. Vikt: kg/hg/g. Andra enheter (msk/tsk/
// st/klyfta osv) hålls separata.

const VOLUME_TO_ML: Record<string, number> = {
  l: 1000,
  dl: 100,
  cl: 10,
  ml: 1,
};
const WEIGHT_TO_G: Record<string, number> = {
  kg: 1000,
  hg: 100,
  g: 1,
};

function isVolume(u: string): boolean {
  return u in VOLUME_TO_ML;
}
function isWeight(u: string): boolean {
  return u in WEIGHT_TO_G;
}

/** Normalisera namn för aggregering: lowercase, ta bort extra mellanslag. */
function normName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Välj presenterad enhet för en mängd ml — `1200 ml → "1,2 l"`,
 * `500 ml → "5 dl"`, `30 ml → "30 ml"`. Tröskel: ≥1000 ml ger liter,
 * ≥100 ml ger dl, annars ml.
 */
function pickVolumeUnit(ml: number): { v: number; u: string } {
  if (ml >= 1000) return { v: ml / 1000, u: "l" };
  if (ml >= 100) return { v: ml / 100, u: "dl" };
  if (ml >= 10) return { v: ml / 10, u: "cl" };
  return { v: ml, u: "ml" };
}
function pickWeightUnit(g: number): { v: number; u: string } {
  if (g >= 1000) return { v: g / 1000, u: "kg" };
  return { v: g, u: "g" };
}

// ── Aggregation ────────────────────────────────────────────────────────────

/**
 * Aggregera ingredienser från veckans planerade recept till en
 * butikskategoriserad inköpslista. `slotPortioner` skalar varje recept
 * via `slotPortioner / basPortioner` — om null används recept-basen rakt av.
 */
export function aggregateShoppingList(
  slots: MealPlanSlot[],
  recipesById: Map<string, Recipe>,
): {
  groups: Map<ShoppingCategory, ShoppingItem[]>;
  freeItems: string[];
} {
  // namn → enhets-summor (volym i ml, vikt i g, övriga som de står)
  const acc = new Map<
    string,
    {
      displayName: string;
      cat: ShoppingCategory;
      mlSum: number;
      gSum: number;
      otherUnits: Map<string, number>;
      unitless: number;
    }
  >();

  const freeItems: string[] = [];

  for (const slot of slots) {
    const slotName = slot.egetNamn.trim();
    if (slot.receptIds.length === 0) {
      if (slotName) freeItems.push(`${slot.datum} ${slot.slot}: ${slotName}`);
      continue;
    }
    for (const rid of slot.receptIds) {
      const recipe = recipesById.get(rid);
      if (!recipe) continue;
      const scale = 1; // se modulkommentar — slot-portioner finns inte i M2-schemat
      for (const ing of recipe.ingredienser) {
        accumulate(acc, ing, scale);
      }
    }
  }

  // Bygg ShoppingItem per ackumulerad rad
  const groups = new Map<ShoppingCategory, ShoppingItem[]>();
  for (const row of acc.values()) {
    const belopp: Record<string, number> = {};
    if (row.mlSum > 0) {
      const v = pickVolumeUnit(row.mlSum);
      belopp[v.u] = round(v.v);
    }
    if (row.gSum > 0) {
      const w = pickWeightUnit(row.gSum);
      belopp[w.u] = round(w.v);
    }
    for (const [u, v] of row.otherUnits) {
      belopp[u] = round(v);
    }
    if (row.unitless > 0 && Object.keys(belopp).length === 0) {
      belopp[""] = round(row.unitless);
    }
    const item: ShoppingItem = {
      namn: row.displayName,
      belopp,
      kategori: row.cat,
    };
    const arr = groups.get(row.cat) ?? [];
    arr.push(item);
    groups.set(row.cat, arr);
  }

  // Sortera varje grupp alfabetiskt
  for (const arr of groups.values()) {
    arr.sort((a, b) => a.namn.localeCompare(b.namn, "sv"));
  }

  return { groups, freeItems };
}

function accumulate(
  acc: Map<
    string,
    {
      displayName: string;
      cat: ShoppingCategory;
      mlSum: number;
      gSum: number;
      otherUnits: Map<string, number>;
      unitless: number;
    }
  >,
  ing: Ingredient,
  scale: number,
): void {
  const key = normName(ing.n);
  if (!key) return;
  let row = acc.get(key);
  if (!row) {
    row = {
      displayName: ing.n.trim(),
      cat: categorize(ing.n),
      mlSum: 0,
      gSum: 0,
      otherUnits: new Map(),
      unitless: 0,
    };
    acc.set(key, row);
  }

  const v = (ing.v ?? 0) * scale;
  const u = ing.u.toLowerCase().trim();

  if (v === 0 && u === "") {
    // "salt", "peppar efter smak" — vi adderar inget kvantitativt
    return;
  }

  if (u && isVolume(u)) {
    row.mlSum += v * VOLUME_TO_ML[u];
  } else if (u && isWeight(u)) {
    row.gSum += v * WEIGHT_TO_G[u];
  } else if (u) {
    row.otherUnits.set(u, (row.otherUnits.get(u) ?? 0) + v);
  } else {
    row.unitless += v;
  }
}

function round(v: number): number {
  if (v === 0) return 0;
  if (v >= 100) return Math.round(v);
  if (v >= 10) return Math.round(v * 10) / 10;
  return Math.round(v * 100) / 100;
}

// ── Format-helpers ─────────────────────────────────────────────────────────

/**
 * Formattera en mängd för en specifik enhet — `0.5 → "0,5"`,
 * `3 → "3"`, `1.25 → "1,25"`. Tomma enheter ("") skrivs utan suffix.
 */
export function formatAmount(v: number, unit: string): string {
  const s = formatNumber(v);
  if (!unit) return s;
  return `${s} ${unit}`;
}

function formatNumber(v: number): string {
  if (Number.isInteger(v)) return String(v);
  return String(v).replace(".", ",");
}

/**
 * Bygg den läsbara mängd-strängen för en ShoppingItem — `"2 dl + 1 msk"`
 * om raden har flera enheter, annars bara den enda enheten. Tomma enheter
 * skrivs utan suffix.
 */
export function formatItemAmount(item: ShoppingItem): string {
  const parts: string[] = [];
  for (const [u, v] of Object.entries(item.belopp)) {
    parts.push(formatAmount(v, u));
  }
  return parts.join(" + ");
}

// ── Plaintext-formatering för clipboard ────────────────────────────────────

export const CATEGORY_ORDER: ShoppingCategory[] = [
  "Grönt",
  "Mejeri",
  "Kött & fisk",
  "Skafferi",
  "Övrigt",
];

/**
 * Bygg den plaintext-formaterade listan som klistras till urklipp:
 *
 *   Inköpslista (v.21, 19/5 – 25/5)
 *
 *   Grönt
 *   - 2 st gul lök
 *   - 3 klyfta vitlök
 *
 *   Mejeri
 *   - 5 dl mjölk
 */
export function formatShoppingListPlaintext(
  groups: Map<ShoppingCategory, ShoppingItem[]>,
  header: string,
): string {
  const lines: string[] = [header, ""];
  for (const cat of CATEGORY_ORDER) {
    const items = groups.get(cat);
    if (!items || items.length === 0) continue;
    lines.push(cat);
    for (const item of items) {
      const amount = formatItemAmount(item);
      lines.push(amount ? `- ${amount} ${item.namn}` : `- ${item.namn}`);
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

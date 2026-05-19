// ─── Mat — delade typer ──────────────────────────────────────────────────────
// Speglar de två Notion-databaserna under "Villa Björkdalen → Mat":
//   • 🥘 Recept     (NOTION_MAT_RECIPES_DB)
//   • 📅 Veckoplan  (NOTION_MAT_PLAN_DB)
// Coach-persona-sidan (NOTION_MAT_COACH_PAGE) är inte en DB — den läses som
// rå Notion-page i M3 för att försörja AI-prompten.

// ── Union-typer för select-värden ───────────────────────────────────────────
// Notion-select är användarutbyggbart — vi faller alltid tillbaka till string
// om värdet ligger utanför unionen. Samma mönster som garden/`PlantType`.

export type MealSlot = "Lunch" | "Middag";
export type Difficulty = 1 | 2 | 3;

// Vanliga tagg-värden vi förväntar oss att hitta i biblioteket (växer fritt
// i Notion). Listan är dokumentationshint — Notion fyller på över tid.
export type RecipeTag =
  | "Vegetariskt"
  | "Snabbt"
  | "Barnvänligt"
  | "Helg"
  | "Vardag"
  | "Festmat"
  | "Soppa"
  | "Sallad"
  | "Pasta"
  | "Ris"
  | "Fisk"
  | "Kött"
  | "Kyckling"
  | "Bakning";

// ── Strukturerade ingrediens-rader ──────────────────────────────────────────
// Lagras som JSON-blob i Notion `Ingredienser` (rich_text). Klienten parsar
// vid läsning och stringifierar vid skrivning. Tre fält: värde (number),
// enhet (string), namn (string). Värdet kan vara null när receptet säger
// "1 nypa salt" eller "efter smak".

export interface Ingredient {
  /** Mängd i recept-portioner (skala via `portions / basePortions`). */
  v: number | null;
  /** Enhet — `g`, `dl`, `msk`, `tsk`, `st`, `klyfta` osv. Tom sträng OK. */
  u: string;
  /** Namn på ingrediensen, t.ex. "passerade tomater". */
  n: string;
}

// ── Huvudentiteter ──────────────────────────────────────────────────────────

export interface Recipe {
  id: string;
  /** Titel i Notion — receptets namn. */
  namn: string;
  /** Kort ingress / brödtext, en mening, kursiv-läge i UI. */
  lede: string;
  /** Parsad lista — kommer från JSON-blob i Notion `Ingredienser`. */
  ingredienser: Ingredient[];
  /** Tillagningssteg, en per element. Lagras newline-separerat i Notion. */
  steg: string[];
  /** Total tid i minuter (förberedelse + tillagning). */
  minTotal: number | null;
  /** 1 = lätt, 2 = medel, 3 = svår. */
  svarighet: Difficulty | number | null;
  /** Antal portioner receptet är skrivet för. Default 4 vid skapa. */
  basPortioner: number;
  taggar: RecipeTag[] | string[];
  /** Fri text, valfri. Visas i LINGON-tonad tile på recept-detalj. */
  vintips: string;
  /** Extern OG-/schema.org-bild från importerad URL. Null om ingen bild. */
  bildUrl: string | null;
  /** Källans URL (om importerad). Visas i detail som "från {Källa} →". */
  kallaUrl: string | null;
  /** Domännamn — `ica.se`, `koket.se` etc. Renderas i detail-headern. */
  kallaLabel: string;
  /** True om receptet importerats via Claude-extraktion (sparkle-badge i M4). */
  aiSkapad: boolean;
  /** Notion created_time — ISO-sträng. */
  skapad: string;
  notionUrl: string;
}

export interface MealPlanSlot {
  id: string;
  /** ISO YYYY-MM-DD. */
  datum: string;
  slot: MealSlot | string;
  /** Recept-relation. Tom array = fritext-slot ("Rester från igår" etc.). */
  receptIds: string[];
  /** Sätts när slot inte refererar ett recept — bara en fri etikett. */
  egetNamn: string;
  /** Tid i minuter — valfri override för fritext-slottar. */
  tidMin: number | null;
  notionUrl: string;
}

// ── Input-typer (för skrivning via API) ─────────────────────────────────────
// Alla fält valfria — vi sätter bara properties som faktiskt skickas in,
// så PATCH blir partial. Samma mönster som garden + fitness.

export interface RecipeInput {
  namn?: string;
  lede?: string;
  ingredienser?: Ingredient[];
  steg?: string[];
  minTotal?: number | null;
  svarighet?: number | null;
  basPortioner?: number;
  taggar?: string[];
  vintips?: string;
  bildUrl?: string | null;
  kallaUrl?: string | null;
  kallaLabel?: string;
  aiSkapad?: boolean;
}

export interface MealPlanInput {
  datum?: string;
  slot?: string;
  receptIds?: string[];
  egetNamn?: string;
  tidMin?: number | null;
}

// ── AI-import: rå struktur från Claude innan användaren reviewar + sparar ──
// Skiljer sig från `RecipeInput` mest för att tydliggöra "detta är inte
// persisterat ännu". `/api/mat/import` returnerar denna; review-modalen
// mappar fält-för-fält till `RecipeInput` vid spara.

export interface ImportedRecipe {
  namn: string;
  lede: string;
  ingredienser: Ingredient[];
  steg: string[];
  minTotal: number | null;
  svarighet: number | null;
  basPortioner: number;
  taggar: string[];
  vintips: string;
  bildUrl: string | null;
  kallaUrl: string;
  kallaLabel: string;
}

// ── Inköpslista — computed på Planering-sidan, ingen persistens ────────────
// Aggregeras från veckans planerade recept (skalade via portions/basPortioner)
// och grupperas i `src/lib/mat/shopping.ts` (skapas i M2).

export interface ShoppingItem {
  /** Normaliserat ingrediensnamn (lowercased). */
  namn: string;
  /** Summerat värde per enhet — `{ dl: 5, msk: 2 }` om receptet blandar. */
  belopp: Record<string, number>;
  /** Vilken butikskategori raden ska grupperas under. */
  kategori: ShoppingCategory;
}

export type ShoppingCategory =
  | "Grönt"
  | "Mejeri"
  | "Kött & fisk"
  | "Skafferi"
  | "Övrigt";

// ── Svars-typer ─────────────────────────────────────────────────────────────

export interface RecipesResponse {
  recipes: Recipe[];
  matReady: boolean;
}

export interface MealPlanResponse {
  slots: MealPlanSlot[];
  matReady: boolean;
}

export interface MatReadyResponse {
  matReady: boolean;
  /** Vilka env-vars saknas — hjälpsamt för 501-banner-texten. */
  missing: Array<"recipes" | "plan" | "coach">;
}

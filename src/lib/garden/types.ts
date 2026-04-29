// ─── Garden — delade typer ───────────────────────────────────────────────────
// Speglar de tre Notion-databaserna under "Villa Björkdalen → Trädgård":
//   • 🌿 Växtregister      (NOTION_GARDEN_PLANTS_DB)
//   • 📆 Säsongsplan       (NOTION_GARDEN_SEASON_DB)
//   • 🧑🏻‍🌾 Utomhusprojekt    (NOTION_GARDEN_PROJECTS_DB)

// ── Union-typer för select-värden ───────────────────────────────────────────
// Används som dokumentations-hint i TS. På kört-tid fall vi gracefully tillbaka
// till string om Notion innehåller ett värde utanför unionen — samma mönster
// som `PlannedWorkout.typ`.

export type PlantType =
  | "Häck"
  | "Buske"
  | "Prydnadsgräs"
  | "Prydnadsträd"
  | "Perenn"
  | "Gräs"
  | "Fruktträd"
  | "Marktäckare"
  | "Grönsak"
  | "Blomma"
  | "Ört";

export type PlantPhase =
  | "Sådd"
  | "Plantskola"
  | "Härdning"
  | "Utplantering"
  | "Skörd"
  | "Etablerad"
  | "Vilande";

export type WateringInterval =
  | "Dagligen"
  | "Varannan dag"
  | "Veckovis"
  | "Vid behov"
  | "Inte nu";

export type PlantLocation = "Inomhus" | "Växthus" | "Altan" | "Baksida" | "Framsida";
export type PruningSeason = "Höst" | "Efter blomning" | "Ingen" | "JAS" | "Vår" | "Vårvinter" | "Löpande";
export type FertilizingSeason = "Ingen" | "Höst" | "Sommar" | "Försommar" | "Vår";

export type TaskStatus = "Planerad" | "Pågår" | "Klar";
export type TaskType = "Gräsmatta" | "Rabatter" | "Träd & buskar" | "Grönsaker";
export type TaskAction = "Underhåll" | "Delning" | "Beskärning" | "Gödsling" | "Inspektion" | "Plantering";

export type ProjectStatus = "Ny" | "Utreds" | "Planerad" | "Pågående" | "Väntar" | "Klart" | "Skrotad";
export type ProjectPriority = "Hög" | "Normal" | "Låg";
export type ProjectArea = "Uppfart" | "Finplanering" | "Grovplanering" | "Trädgård" | "Bygg" | "Altan";
export type ProjectTimeframe = "Oklart" | "2026" | "2027";

// ── Huvudentiteter ──────────────────────────────────────────────────────────

export interface Plant {
  id: string;
  /** Titel i Notion — växtens namn. */
  vaxt: string;
  /** Kan vara valfri sträng (Notion-select är utbyggbart av användaren). */
  typ: PlantType | string;
  platser: PlantLocation[] | string[];
  beskarning: PruningSeason[] | string[];
  godsling: FertilizingSeason[] | string[];
  /** Notion har av misstag `email`-typ på denna kolumn. Vi läser/skriver som sträng. */
  skotselrad: string | null;
  /** Relations till Säsongsplan — page-ids. */
  atgardIds: string[];
  /** https://www.notion.so/<id-utan-bindestreck> */
  notionUrl: string;

  // ── Nya fält (livscykel + daglig skötsel) ──────────────────────────────────
  /** Sortnamn / kultivarnamn, t.ex. "San Marzano". */
  sorttnamn: string | null;
  /** ISO-datum för sådd/plantering. */
  sadddatum: string | null;
  /** Antal plantor eller exemplar. */
  antalPlantor: number | null;
  /** Aktuell livscykelfas. */
  fas: PlantPhase | string | null;
  /** Total säsongslängd i dagar (t.ex. 120 för tomater). */
  sasongslangd: number | null;
  /** ISO-datum för senast vattnad. */
  senastVattnad: string | null;
  /** Hur ofta växten behöver vattnas. */
  vattningsintervall: WateringInterval | string | null;
  /** Fri text om vattning, t.ex. "jord torr ca 2 cm ner". */
  vattningsnotering: string | null;
  /** Näringsinformation, t.ex. "Söndag, halv dos kvävebaserat". */
  naring: string | null;
  /** Ljusbehov, t.ex. "14 t/dag" eller "Halvskugga". */
  ljusbehov: string | null;
  /** Temperaturintervall, t.ex. "20–22 °C, undvik drag". */
  temperaturintervall: string | null;
  /** Höjd, t.ex. "160–200 cm". */
  hojd: string | null;
  /** Skördeperiod, t.ex. "Aug–sep". */
  skordeperiod: string | null;
  /** Längre skötselguide-text (ersätter/kompletterar skotselrad). */
  skotselguide: string | null;
}

export interface SeasonTask {
  id: string;
  uppgift: string;
  /** ISO YYYY-MM-DD. Kan vara tom sträng om datum saknas i Notion. */
  datum: string;
  status: TaskStatus | string;
  typ: TaskType | string;
  atgarder: TaskAction[] | string[];
  kommentar: string;
  /** Relations till Växtregister — page-ids. */
  plantIds: string[];
  notionUrl: string;
}

export interface OutdoorProject {
  id: string;
  namn: string;
  status: ProjectStatus | string;
  prioritet: ProjectPriority | string;
  omrade: ProjectArea | string;
  tidsram: ProjectTimeframe | string;
  /** SEK. Kan vara null om fältet är tomt i Notion. */
  budget: number | null;
  faktiskKostnad: number | null;
  kommentar: string;
  notionUrl: string;
}

// ── Input-typer (för skrivning via API) ─────────────────────────────────────
// Alla fält är valfria — mönstret följer `PlannedWorkoutInput`: vi sätter bara
// properties som faktiskt skickas in, så PATCH blir naturligt partial.

export interface PlantInput {
  vaxt?: string;
  typ?: string;
  platser?: string[];
  beskarning?: string[];
  godsling?: string[];
  skotselrad?: string | null;
  atgardIds?: string[];
  sorttnamn?: string | null;
  sadddatum?: string | null;
  antalPlantor?: number | null;
  fas?: string | null;
  sasongslangd?: number | null;
  senastVattnad?: string | null;
  vattningsintervall?: string | null;
  vattningsnotering?: string | null;
  naring?: string | null;
  ljusbehov?: string | null;
  temperaturintervall?: string | null;
  hojd?: string | null;
  skordeperiod?: string | null;
  skotselguide?: string | null;
}

export interface SeasonTaskInput {
  uppgift?: string;
  datum?: string;
  status?: string;
  typ?: string;
  atgarder?: string[];
  kommentar?: string;
  plantIds?: string[];
}

export interface OutdoorProjectInput {
  namn?: string;
  status?: string;
  prioritet?: string;
  omrade?: string;
  tidsram?: string;
  budget?: number | null;
  faktiskKostnad?: number | null;
  kommentar?: string;
}

// ── Svars-typer ─────────────────────────────────────────────────────────────

export interface PlantsResponse {
  plants: Plant[];
  gardenReady: boolean;
}

export interface TasksResponse {
  tasks: SeasonTask[];
  gardenReady: boolean;
}

export interface ProjectsResponse {
  projects: OutdoorProject[];
  gardenReady: boolean;
}

export interface GardenOverviewResponse {
  gardenReady: boolean;
  plants: {
    count: number;
    byType: Record<string, number>;
  };
  tasks: {
    /** Uppgifter med datum mellan idag och +30 dagar, alla status. */
    upcoming: number;
    /** Fördelning per status bland de kommande 30 dagarna. */
    byStatus: Record<string, number>;
  };
  projects: {
    /** Projekt i en "aktiv" status: Planerad, Pågående, Utreds, Väntar. */
    active: number;
    /** Summa budget för aktiva projekt. */
    totalBudget: number;
    /** Summa faktisk kostnad för aktiva projekt. */
    totalSpent: number;
  };
}

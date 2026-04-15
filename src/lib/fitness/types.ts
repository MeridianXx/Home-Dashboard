// ─── Fitness — delade typer ──────────────────────────────────────────────────

export type WorkoutType = "Löpning" | "Cykling" | "Styrka" | "Annat";

/** En rad från Workouts_vN.xlsx (normaliserad). */
export interface Workout {
  /** ISO-datum YYYY-MM-DD */
  date: string;
  /** HH:MM (lokal tid som exporterad) — kan saknas */
  time?: string;
  /** Sporttyp, t.ex. "Running" */
  type: string;
  /** Total tid i sekunder */
  totalTimeSec: number;
  /** Aktiv tid (moving) i sekunder */
  movingTimeSec: number;
  /** Elapsed time i sekunder */
  elapsedTimeSec: number;
  /** Distans i meter */
  distanceM: number;
  /** Höjdmeter i meter */
  elevationGainM: number;
  /** Aktiv förbränning (kcal) */
  activeCalories: number;
  minHR: number | null;
  avgHR: number | null;
  maxHR: number | null;
  /** TRIMP-belastning (från HealthFit) */
  trimp: number | null;
  /** RPE 1–10 */
  rpe: number | null;
  mets: number | null;
  hrZoneType: string | null;
  /** Andel av total tid i zon 0 (0–1) */
  hrz0: number | null;
  hrz1: number | null;
  hrz2: number | null;
  hrz3: number | null;
  hrz4: number | null;
  hrz5: number | null;
  source: string | null;
  /** Snitthastighet (m/s) */
  avgSpeed: number | null;
  maxSpeed: number | null;
  avgPower: number | null;
  maxPower: number | null;
  groundContactTime: number | null;
  verticalOscillation: number | null;
  strideLength: number | null;
  steps: number | null;
}

/** Planerat pass i Notion. */
export interface PlannedWorkout {
  id: string;
  passnamn: string;
  typ: string;
  datum: string; // YYYY-MM-DD
  status: string;
  syfte: string;
  passdetaljer: string;
  pulsintervall: string;
  tempo: string;
  tid: string;
  underlag: string;
}

/** Användarprofil — fysiologi + mål. */
export interface FitnessProfile {
  /** Namn (visas i UI) */
  name?: string;
  /** Födelseår */
  birthYear?: number;
  /** Vikt i kg */
  weightKg?: number;
  /** Maxpuls (bpm) */
  maxHR: number;
  /** Vilopuls (bpm) */
  restingHR: number;
  /** Pulszoner som bpm-intervall */
  zones: {
    Z1: [number, number];
    Z2: [number, number];
    Z3: [number, number];
    Z4: [number, number];
    Z5: [number, number];
  };
  /** Tävlings-/träningsmål (fritext + deadline ISO-datum) */
  goals: Array<{ label: string; deadline?: string }>;
}

/** Svar från /api/fitness/workouts */
export interface WorkoutsResponse {
  workouts: Workout[];
  sourceFile: string | null;
  updatedAt: string;
}

/** Svar från /api/fitness/plans */
export interface PlansResponse {
  plans: PlannedWorkout[];
  logDbReady: boolean;
}

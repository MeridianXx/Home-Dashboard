// ─── Standardprofil — server-safe (ingen "use client") ───────────────────────
// Delas mellan `profile.ts` (Zustand-klient) och serverroutes.

import type { FitnessProfile } from "./types";

/**
 * Baseras på traningscoach-app/profile.json. Zoner är beräknade som % av
 * maxpuls (Karvonen-förenklad) och vikt/vilopuls skrivs över av HealthFit-export.
 */
export const DEFAULT_PROFILE: FitnessProfile = {
  name: "Adam",
  birthYear: 1985,
  weightKg: 78,
  maxHR: 209,
  restingHR: 55,
  zones: {
    Z1: [100, 149],
    Z2: [150, 164],
    Z3: [165, 179],
    Z4: [180, 191],
    Z5: [192, 209],
  },
  goals: [
    { label: "5 km under 20:00" },
    { label: "10 km under 45:00" },
  ],
};

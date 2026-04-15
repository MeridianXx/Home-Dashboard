"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FitnessProfile } from "./types";

/**
 * Standardprofil — baseras på traningscoach-app/profile.json.
 * Zoner är beräknade som % av maxpuls (Karvonen-förenklad).
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

interface FitnessProfileState {
  profile: FitnessProfile;
  setProfile: (p: Partial<FitnessProfile>) => void;
  reset: () => void;
}

export const useFitnessProfile = create<FitnessProfileState>()(
  persist(
    (set) => ({
      profile: DEFAULT_PROFILE,
      setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
      reset: () => set({ profile: DEFAULT_PROFILE }),
    }),
    { name: "fitness-profile" }
  )
);

/** Plocka rätt zon givet en bpm-puls. Returnerar "Z1"–"Z5" eller null. */
export function hrZone(bpm: number, zones: FitnessProfile["zones"]): keyof FitnessProfile["zones"] | null {
  for (const z of ["Z1", "Z2", "Z3", "Z4", "Z5"] as const) {
    const [lo, hi] = zones[z];
    if (bpm >= lo && bpm <= hi) return z;
  }
  return null;
}

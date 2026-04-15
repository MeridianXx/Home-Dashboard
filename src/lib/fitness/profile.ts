"use client";

import { create } from "zustand";
import type { FitnessProfile } from "./types";
import { DEFAULT_PROFILE } from "./profile-defaults";

export { DEFAULT_PROFILE };

/**
 * Profilstore med SWR-hydrering från `/api/fitness/profile` (Notion-backat).
 *
 * Strategi:
 *   - `hydrate()` kallas en gång från ProfileCard med responsen från SWR.
 *   - Lokala mutationer (`setProfile`) gör optimistic UI + fire-and-forget PATCH.
 *   - Om PATCH misslyckas visas ett felmeddelande i UI, men storen rullar inte
 *     tillbaka eftersom SWR kommer revalidera vid nästa focus.
 *
 * Jämfört med tidigare `persist`-variant: Notion är nu primärkälla, localStorage
 * används bara som session-cache — ändras på en annan enhet syns nästa
 * SWR-revalidering.
 */
interface FitnessProfileState {
  profile: FitnessProfile;
  hydrated: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
  hydrate: (p: FitnessProfile, updatedAt: string) => void;
  setProfile: (p: Partial<FitnessProfile>) => void;
  /** Skicka ändringar till Notion; anroparen hanterar sync-state om behövs. */
  pushToNotion: (p: Partial<FitnessProfile>) => Promise<void>;
  reset: () => void;
}

export const useFitnessProfile = create<FitnessProfileState>()((set, get) => ({
  profile: DEFAULT_PROFILE,
  hydrated: false,
  lastSyncedAt: null,
  lastError: null,

  hydrate: (p, updatedAt) =>
    set({ profile: p, hydrated: true, lastSyncedAt: updatedAt, lastError: null }),

  setProfile: (patch) => {
    // Optimistic lokal uppdatering
    set((s) => ({ profile: { ...s.profile, ...patch } }));
    // Skicka i bakgrunden — fel visas i store men UI rullar inte tillbaka
    void get().pushToNotion(patch);
  },

  pushToNotion: async (patch) => {
    try {
      const res = await fetch("/api/fitness/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        set({ lastError: body.error ?? `PATCH misslyckades (${res.status})` });
        return;
      }
      const body = (await res.json()) as { updatedAt: string };
      set({ lastSyncedAt: body.updatedAt, lastError: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ lastError: message });
    }
  },

  reset: () => set({ profile: DEFAULT_PROFILE, lastError: null }),
}));

/** Plocka rätt zon givet en bpm-puls. Returnerar "Z1"–"Z5" eller null. */
export function hrZone(bpm: number, zones: FitnessProfile["zones"]): keyof FitnessProfile["zones"] | null {
  for (const z of ["Z1", "Z2", "Z3", "Z4", "Z5"] as const) {
    const [lo, hi] = zones[z];
    if (bpm >= lo && bpm <= hi) return z;
  }
  return null;
}

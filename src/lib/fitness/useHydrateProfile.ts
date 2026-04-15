"use client";

import { useEffect } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useFitnessProfile } from "./profile";
import type { ProfileResponse } from "@/app/api/fitness/profile/route";

/**
 * Kör en gång från tab-sidan — hydrerar Zustand-storen med profil från Notion.
 * SWR revalidateOnFocus är på så att ändringar gjorda direkt i Notion dyker
 * upp när man byter tillbaka till fliken.
 */
export function useHydrateProfile() {
  const hydrate = useFitnessProfile((s) => s.hydrate);
  const { data } = useSWR<ProfileResponse>("/api/fitness/profile", fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 30 * 60 * 1000,
  });

  useEffect(() => {
    if (data?.profile) hydrate(data.profile, data.updatedAt);
  }, [data, hydrate]);

  return { dbReady: data?.dbReady ?? false, lastSyncedAt: data?.updatedAt ?? null };
}

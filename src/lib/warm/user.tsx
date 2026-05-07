"use client";

// ─── Warm user-context ───────────────────────────────────────────────────────
// Servern (v3 layout) läser `X-Forwarded-Email`, slår upp profilen via
// `getUserByEmail()` och skickar in den hit. Klient-komponenter (HubHeading,
// TabBar/Sidebar via chrome) konsumerar via `useWarmUser()`.

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_USER, type UserProfile } from "@/lib/users";

const WarmUserContext = createContext<UserProfile>(DEFAULT_USER);

export function WarmUserProvider({
  user,
  children,
}: {
  user: UserProfile;
  children: ReactNode;
}) {
  return (
    <WarmUserContext.Provider value={user}>{children}</WarmUserContext.Provider>
  );
}

export function useWarmUser(): UserProfile {
  return useContext(WarmUserContext);
}

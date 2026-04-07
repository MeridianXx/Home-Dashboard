"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "light" | "dark" | "system";
export type Context = "home" | "homelab" | "fitness" | "garden";

interface DashboardState {
  // Theme
  theme: Theme;
  setTheme: (t: Theme) => void;

  // Active context (for top-bar tabs)
  activeContext: Context;
  setActiveContext: (c: Context) => void;

  // Sidebar collapsed (tablet icon-only mode)
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;

  // Layout config per context (widget order/visibility — Fas 5)
  layouts: Record<Context, string[]>;
  setLayout: (context: Context, order: string[]) => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      theme: "system",
      setTheme: (theme) => set({ theme }),

      activeContext: "home",
      setActiveContext: (activeContext) => set({ activeContext }),

      sidebarCollapsed: false,
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),

      layouts: {
        home: [],
        homelab: [],
        fitness: [],
        garden: [],
      },
      setLayout: (context, order) =>
        set((s) => ({ layouts: { ...s.layouts, [context]: order } })),
    }),
    {
      name: "inicio-dashboard",
      // Only persist user preferences, not transient UI state
      partialize: (s) => ({
        theme: s.theme,
        sidebarCollapsed: s.sidebarCollapsed,
        layouts: s.layouts,
      }),
    }
  )
);

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { darkT, lightT, type WarmTheme } from "./tokens";

/**
 * `useHydrated()` — returnerar false vid första render (SSR + CSR första pass)
 * och true efter mount. Används för att skjuta upp render av komponenter som
 * är beroende av client-only data (SWR-cache, localStorage, Date.now, ...) så
 * server och client första-pass håller samma DOM-struktur.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}

/** Breakpoint där bottom-pillen ersätts av sidebar + 2-col-layout aktiveras. */
export const DESKTOP_BREAKPOINT = 1024;

/**
 * `useDesktop()` — true när viewport ≥ 1024px. Returnerar `false` vid SSR
 * och under första render för att hålla SSR/CSR-strukturen identisk (mobil
 * är default). Lyssnar på `resize` och `matchMedia`-change.
 */
export function useDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`);
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    if (mq.addEventListener) mq.addEventListener("change", handler);
    else mq.addListener(handler);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", handler);
      else mq.removeListener(handler);
    };
  }, []);
  return isDesktop;
}

const STORAGE_KEY = "warm-theme";

type ThemeMode = "light" | "dark";

type ThemeContextValue = {
  t: WarmTheme;
  dark: boolean;
  setDark: (value: boolean) => void;
  toggle: () => void;
};

const WarmThemeContext = createContext<ThemeContextValue | null>(null);

function readInitialMode(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Globalt tema för Warm Home. Wrappa `(warm)/v3/layout.tsx` med providern
 * så delar varje komponent samma state — toggle propagerar omedelbart till
 * TabBar:en, alla detaljskärmar och eventuella systerflikar.
 */
export function WarmThemeProvider({ children }: { children: ReactNode }) {
  // Render light på första paint (SSR-stabilt) → hydrera korrekt mode i effect.
  const [dark, setDarkState] = useState<boolean>(false);

  useEffect(() => {
    const mode = readInitialMode();
    setDarkState(mode === "dark");

    // Lyssna på storage-eventet (andra tabs) + custom-eventet (samma tab,
    // andra hook-instanser om någon skulle hamna utanför provider:n).
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && (e.newValue === "dark" || e.newValue === "light")) {
        setDarkState(e.newValue === "dark");
      }
    };
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<ThemeMode>).detail;
      if (detail === "dark" || detail === "light") {
        setDarkState(detail === "dark");
      }
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("warm-theme-change", onCustom as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("warm-theme-change", onCustom as EventListener);
    };
  }, []);

  const setDark = useCallback((value: boolean) => {
    setDarkState(value);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, value ? "dark" : "light");
      // Ekosystemet — broadcast inom samma tab så ev. icke-context-konsumenter
      // hänger med (storage-event firar bara i ANDRA tabs).
      window.dispatchEvent(
        new CustomEvent<ThemeMode>("warm-theme-change", { detail: value ? "dark" : "light" })
      );
    }
  }, []);

  const toggle = useCallback(() => setDark(!dark), [dark, setDark]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      t: dark ? darkT : lightT,
      dark,
      setDark,
      toggle,
    }),
    [dark, setDark, toggle]
  );

  return <WarmThemeContext.Provider value={value}>{children}</WarmThemeContext.Provider>;
}

/**
 * Returnerar aktuellt Warm-tema. MÅSTE användas under en `WarmThemeProvider`
 * (finns i `(warm)/v3/layout.tsx`). Tidigare implementation hade lokal state
 * per hook-instans → toggle uppdaterade bara den komponent som ägde knappen.
 */
export function useWarmTheme(): ThemeContextValue {
  const ctx = useContext(WarmThemeContext);
  if (!ctx) {
    throw new Error(
      "useWarmTheme måste användas under <WarmThemeProvider>. Wrappa (warm)/v3/layout.tsx."
    );
  }
  return ctx;
}

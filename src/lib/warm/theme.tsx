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

export type ThemeMode = "light" | "dark" | "auto";

type ThemeContextValue = {
  /** Aktuell tema-token-uppsättning (light eller dark beroende på resolved state). */
  t: WarmTheme;
  /** Resolved boolean: i auto-läget reflekterar detta solens position. */
  dark: boolean;
  /** Användarens valda mode. `auto` följer `sun.sun.state` från HA. */
  mode: ThemeMode;
  /** Sätt explicit mode. Persisterar i localStorage. */
  setMode: (mode: ThemeMode) => void;
  /**
   * Behållen för bakåtkompatibilitet — sätter explicit light/dark (inte auto).
   * Nya knappar bör använda `cycleMode()` istället.
   */
  setDark: (value: boolean) => void;
  /**
   * Cycla genom light → dark → auto → light. Ersätter den gamla `toggle()` på
   * 3-läges-toggle-knappar.
   */
  cycleMode: () => void;
  /** Behållen för bakåtkompatibilitet — alias för `cycleMode()`. */
  toggle: () => void;
};

const WarmThemeContext = createContext<ThemeContextValue | null>(null);

function isMode(v: unknown): v is ThemeMode {
  return v === "light" || v === "dark" || v === "auto";
}

function readInitialMode(): ThemeMode {
  if (typeof window === "undefined") return "auto";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (isMode(stored)) return stored;
  // Inga gamla värden att migrera — `light`/`dark` matchar fortfarande isMode.
  return "auto";
}

function readSystemPreferDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Globalt tema för Warm Home. Wrappa `(warm)/v3/layout.tsx` med providern
 * så delar varje komponent samma state — toggle propagerar omedelbart till
 * TabBar:en, alla detaljskärmar och eventuella systerflikar.
 *
 * I `auto`-läget pollas `/api/sun` (som proxar HA:s `sun.sun`) var 5:e minut
 * + på `visibilitychange`. När fetch failar (offline, HA nere) faller vi
 * tillbaka på `prefers-color-scheme` så användaren aldrig fastnar i fel tema.
 */
export function WarmThemeProvider({ children }: { children: ReactNode }) {
  // Render light på första paint (SSR-stabilt) → hydrera korrekt mode i effect.
  const [mode, setModeState] = useState<ThemeMode>("auto");
  // Resolved auto-mörker — uppdateras av polling-effekten nedan.
  const [autoIsDark, setAutoIsDark] = useState<boolean>(false);
  // Hydrerat? Använder vi för att inte skriva auto-resolved värde innan vi
  // hunnit läsa localStorage (annars visas fel tema kort).
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setModeState(readInitialMode());
    setHydrated(true);

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && isMode(e.newValue)) {
        setModeState(e.newValue);
      }
    };
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<ThemeMode>).detail;
      if (isMode(detail)) setModeState(detail);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("warm-theme-change", onCustom as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("warm-theme-change", onCustom as EventListener);
    };
  }, []);

  // Auto-resolver: pollar /api/sun när mode === "auto". Effekten plockar bort
  // sig själv i light/dark-läge så vi inte gör onödiga requests.
  useEffect(() => {
    if (!hydrated || mode !== "auto") return;
    let cancelled = false;

    const resolve = async () => {
      try {
        const r = await fetch("/api/sun", { cache: "no-store" });
        if (!r.ok) throw new Error(`sun ${r.status}`);
        const j = (await r.json()) as { above_horizon?: boolean };
        if (cancelled) return;
        if (typeof j.above_horizon === "boolean") {
          setAutoIsDark(!j.above_horizon);
        } else {
          setAutoIsDark(readSystemPreferDark());
        }
      } catch {
        if (!cancelled) setAutoIsDark(readSystemPreferDark());
      }
    };

    void resolve();
    const id = window.setInterval(resolve, 5 * 60_000);
    const onVis = () => {
      if (document.visibilityState === "visible") void resolve();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [mode, hydrated]);

  const dark = mode === "dark" ? true : mode === "light" ? false : autoIsDark;

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
      window.dispatchEvent(
        new CustomEvent<ThemeMode>("warm-theme-change", { detail: next })
      );
    }
  }, []);

  const setDark = useCallback(
    (value: boolean) => setMode(value ? "dark" : "light"),
    [setMode]
  );

  const cycleMode = useCallback(() => {
    const next: ThemeMode =
      mode === "light" ? "dark" : mode === "dark" ? "auto" : "light";
    setMode(next);
  }, [mode, setMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      t: dark ? darkT : lightT,
      dark,
      mode,
      setMode,
      setDark,
      cycleMode,
      toggle: cycleMode,
    }),
    [dark, mode, setMode, setDark, cycleMode]
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

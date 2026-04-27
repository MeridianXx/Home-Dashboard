"use client";

import { useEffect, useState, useCallback } from "react";
import { darkT, lightT, type WarmTheme } from "./tokens";

const STORAGE_KEY = "warm-theme";

type ThemeMode = "light" | "dark";

function readInitialMode(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useWarmTheme(): {
  t: WarmTheme;
  dark: boolean;
  setDark: (value: boolean) => void;
  toggle: () => void;
} {
  // Render light on first paint (SSR-stabilt) → hydrera korrekt mode i effect.
  const [dark, setDarkState] = useState<boolean>(false);

  useEffect(() => {
    const mode = readInitialMode();
    setDarkState(mode === "dark");
  }, []);

  const setDark = useCallback((value: boolean) => {
    setDarkState(value);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, value ? "dark" : "light");
    }
  }, []);

  const toggle = useCallback(() => setDark(!dark), [dark, setDark]);

  return { t: dark ? darkT : lightT, dark, setDark, toggle };
}

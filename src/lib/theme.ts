"use client";
import { useEffect, useState } from "react";

export type Theme = "auto" | "light" | "dark";

function applyTheme(t: Theme) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  if (t === "auto") html.removeAttribute("data-theme");
  else              html.setAttribute("data-theme", t);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("auto");

  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    const initial = stored ?? "auto";
    setThemeState(initial);
    applyTheme(initial);
  }, []);

  function setTheme(t: Theme) {
    setThemeState(t);
    localStorage.setItem("theme", t);
    applyTheme(t);
  }

  function cycleTheme() {
    const next: Theme = theme === "auto" ? "light" : theme === "light" ? "dark" : "auto";
    setTheme(next);
  }

  return { theme, setTheme, cycleTheme };
}

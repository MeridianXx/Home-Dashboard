"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

/**
 * WarmTopBar — global Apple-stil "large title becomes compact on scroll"-shell.
 *
 * Provider-state: `scrolled` (är användaren förbi tröskeln?) + `compactTitle`
 * (vilken text ska blur-strippen visa när scrollad?). Layout:n renderar den
 * fasta blur-strippen ovanför content. HubDisplay / DetailHero registrerar
 * sin compact-titel via `useRegisterCompactTitle(title)`.
 */

type TopBarState = {
  scrolled: boolean;
  compactTitle: string;
  setCompactTitle: (title: string) => void;
};

const WarmTopBarContext = createContext<TopBarState | null>(null);

const SCROLL_THRESHOLD = 56;

export function WarmTopBarProvider({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const [compactTitle, setCompactTitleState] = useState("");

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      setScrolled((prev) => {
        const next = y > SCROLL_THRESHOLD;
        return prev === next ? prev : next;
      });
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Stabil setter — komponenter kan registrera utan att trigga re-renders i kedjan.
  const setCompactTitle = useCallback((title: string) => {
    setCompactTitleState((prev) => (prev === title ? prev : title));
  }, []);

  return (
    <WarmTopBarContext.Provider
      value={{ scrolled, compactTitle, setCompactTitle }}
    >
      {children}
    </WarmTopBarContext.Provider>
  );
}

export function useWarmTopBar(): TopBarState {
  const ctx = useContext(WarmTopBarContext);
  if (!ctx) {
    // Fallback — komponenter utanför provider:n får tysta no-ops i stället för krasch.
    return {
      scrolled: false,
      compactTitle: "",
      setCompactTitle: () => {},
    };
  }
  return ctx;
}

/**
 * Anropa från HubDisplay/DetailHero så blur-strippen vet vilken titel den
 * ska visa när användaren scrollat förbi tröskeln. Rensas automatiskt vid
 * unmount så ingen stale text hänger kvar.
 */
export function useRegisterCompactTitle(title: string) {
  const { setCompactTitle } = useWarmTopBar();
  useEffect(() => {
    setCompactTitle(title);
    return () => setCompactTitle("");
  }, [title, setCompactTitle]);
}

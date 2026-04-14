"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useSWRConfig } from "swr";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import MobileNav from "@/components/layout/MobileNav";
import { useDashboardStore } from "@/lib/store";

const CONTEXT_TABS: Record<string, string[]> = {
  "/home":     ["", "/lighting", "/media", "/automations"],
  "/homelab":  ["", "/servers", "/containers", "/media", "/network"],
  "/fitness":  ["", "/coach", "/history"],
  "/garden":   ["", "/planner"],
};

function getContextKey(pathname: string) {
  return Object.keys(CONTEXT_TABS).find(k => pathname === k || pathname.startsWith(k + "/")) ?? "/home";
}

function getTabIndex(pathname: string) {
  const contextKey = getContextKey(pathname);
  const suffixes = CONTEXT_TABS[contextKey] ?? [];
  const current = pathname.slice(contextKey.length);
  return suffixes.indexOf(current);
}

// Smooth slide — slower, deeper deceleration for less "jumpy" feel
const SLIDE_EASE = { duration: 0.45, ease: [0.25, 0.8, 0.25, 1] as const };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const collapsed = useDashboardStore((s) => s.sidebarCollapsed);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const sidebarWidth = mounted && collapsed ? "md:ml-16" : "md:ml-60";

  const router   = useRouter();
  const pathname = usePathname();
  const { mutate } = useSWRConfig();

  // ─── Slide direction — computed during render, not in useEffect ───
  // This ensures direction is available on the SAME render that mounts the new motion.div.
  // On app-switch (pathname unchanged), direction stays 0 → no animation.
  const prevPathnameRef = useRef(pathname);
  const directionRef = useRef(0);

  if (pathname !== prevPathnameRef.current) {
    const prevCtx = getContextKey(prevPathnameRef.current);
    const newCtx = getContextKey(pathname);
    if (prevCtx === newCtx) {
      // Same section (e.g. /home → /home/lighting) — compare tab index
      const prevSuffix = prevPathnameRef.current.slice(prevCtx.length);
      const newSuffix = pathname.slice(newCtx.length);
      const suffixes = CONTEXT_TABS[prevCtx] ?? [];
      const prevIdx = suffixes.indexOf(prevSuffix);
      const newIdx = suffixes.indexOf(newSuffix);
      directionRef.current = newIdx > prevIdx ? 1 : -1;
    } else {
      // Different section (e.g. /home → /homelab) — compare section order
      const contexts = Object.keys(CONTEXT_TABS);
      directionRef.current = contexts.indexOf(newCtx) > contexts.indexOf(prevCtx) ? 1 : -1;
    }
    prevPathnameRef.current = pathname;
  }

  const slideDir = directionRef.current;

  // ─── Touch swipe navigation with live preview ───
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const swipeRef = useRef<HTMLDivElement | null>(null);
  const swipeLocked = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('input[type="range"], input[type="text"], input[type="number"], textarea, select')) {
      touchStart.current = null;
      return;
    }
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    swipeLocked.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current || swipeLocked.current) return;
    const dx = e.touches[0].clientX - touchStart.current.x;
    const dy = e.touches[0].clientY - touchStart.current.y;

    // Lock direction after 10px movement
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;

    // If vertical, give up
    if (Math.abs(dy) > Math.abs(dx)) {
      touchStart.current = null;
      return;
    }

    // Apply live translateX preview (clamped to ±120px)
    if (swipeRef.current) {
      const clamped = Math.max(-120, Math.min(120, dx));
      swipeRef.current.style.transform = `translateX(${clamped}px)`;
      swipeRef.current.style.opacity = `${1 - Math.abs(clamped) / 400}`;
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    // Reset transform
    if (swipeRef.current) {
      swipeRef.current.style.transform = "";
      swipeRef.current.style.opacity = "";
    }

    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return;

    const contextKey = getContextKey(pathname);
    const suffixes   = CONTEXT_TABS[contextKey] ?? [];
    const current    = pathname.slice(contextKey.length);
    const idx        = suffixes.indexOf(current);
    if (idx === -1) return;

    const next = dx < 0 ? idx + 1 : idx - 1;
    if (next < 0 || next >= suffixes.length) return;

    swipeLocked.current = true;
    router.push(contextKey + suffixes[next]);
  }, [pathname, router]);

  // Reset swipe transform on cancel (e.g. iOS app-switch) or visibility change
  const resetSwipeTransform = useCallback(() => {
    if (swipeRef.current) {
      swipeRef.current.style.transform = "";
      swipeRef.current.style.opacity = "";
    }
    touchStart.current = null;
    pullStart.current = null;
    setPullDistance(0);
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") resetSwipeTransform();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [resetSwipeTransform]);

  // ─── Pull-to-refresh ───
  const pullStart = useRef<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const PULL_THRESHOLD = 80;

  const handlePullStart = useCallback((e: React.TouchEvent) => {
    // Only activate when scrolled to top
    if (window.scrollY > 0 || refreshing) {
      pullStart.current = null;
      return;
    }
    pullStart.current = e.touches[0].clientY;
  }, [refreshing]);

  const handlePullMove = useCallback((e: React.TouchEvent) => {
    if (pullStart.current === null) return;
    const dy = e.touches[0].clientY - pullStart.current;
    const dx = Math.abs(e.touches[0].clientX - (touchStart.current?.x ?? e.touches[0].clientX));

    // Ignore if horizontal swipe
    if (dx > 20) {
      pullStart.current = null;
      setPullDistance(0);
      return;
    }

    if (dy > 0) {
      // Diminishing return after threshold
      const dampened = dy < PULL_THRESHOLD ? dy : PULL_THRESHOLD + (dy - PULL_THRESHOLD) * 0.3;
      setPullDistance(dampened);
    } else {
      setPullDistance(0);
    }
  }, []);

  const [refreshDone, setRefreshDone] = useState(false);

  const handlePullEnd = useCallback(async () => {
    if (pullDistance >= PULL_THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(PULL_THRESHOLD);
      await mutate(() => true, undefined, { revalidate: true });
      setRefreshing(false);
      // Show done checkmark briefly
      setRefreshDone(true);
      await new Promise(r => setTimeout(r, 800));
      setRefreshDone(false);
    }
    pullStart.current = null;
    setPullDistance(0);
  }, [pullDistance, refreshing, mutate]);

  // Combine touch handlers — pull-to-refresh piggybacks on start/move/end
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    handleTouchStart(e);
    handlePullStart(e);
  }, [handleTouchStart, handlePullStart]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    handleTouchMove(e);
    handlePullMove(e);
  }, [handleTouchMove, handlePullMove]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    handleTouchEnd(e);
    handlePullEnd();
  }, [handleTouchEnd, handlePullEnd]);

  return (
    <>
      <TopBar />
      <Sidebar />
      <main
        className={`pt-16 min-h-screen transition-all duration-300 ${sidebarWidth}`}
        style={{ paddingBottom: "140px" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={resetSwipeTransform}
      >
        {/* Pull-to-refresh indicator */}
        <div
          style={{
            height: pullDistance > 0 || refreshing || refreshDone ? `${Math.max(pullDistance, refreshing || refreshDone ? 48 : 0)}px` : "0px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            overflow: "hidden",
            transition: pullDistance === 0 ? "height 0.3s ease" : "none",
          }}
        >
          {(pullDistance > 10 || refreshing || refreshDone) && (
            <>
              <span
                className={`material-symbols-outlined ${refreshing ? "spin-anim" : ""}`}
                style={{
                  fontSize: 20,
                  color: refreshDone ? "var(--color-secondary)" : "var(--color-on-surface-variant)",
                  opacity: refreshing || refreshDone ? 1 : Math.min(pullDistance / PULL_THRESHOLD, 1),
                  transform: refreshDone ? "scale(1)" : `rotate(${refreshing ? 0 : (pullDistance / PULL_THRESHOLD) * 360}deg)`,
                  transition: refreshDone ? "color 0.2s, transform 0.2s" : refreshing ? "none" : "transform 0.05s",
                  fontVariationSettings: refreshDone ? "'FILL' 1" : "'FILL' 0",
                }}
              >
                {refreshDone ? "check_circle" : refreshing ? "progress_activity" : "arrow_downward"}
              </span>
              {refreshDone && (
                <span style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--color-secondary)",
                }}>
                  Uppdaterat
                </span>
              )}
            </>
          )}
        </div>

        <div className="px-5 lg:px-8 py-6 max-w-[1600px] mx-auto">
          <motion.div
            ref={swipeRef}
            key={pathname}
            initial={slideDir !== 0 ? { x: `${slideDir * 15}%`, opacity: 0 } : false}
            animate={{ x: 0, opacity: 1 }}
            transition={SLIDE_EASE}
            onAnimationComplete={() => { directionRef.current = 0; }}
            style={{ willChange: "transform, opacity" }}
          >
            {children}
          </motion.div>
        </div>
      </main>
      <MobileNav />
    </>
  );
}

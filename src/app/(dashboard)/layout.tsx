"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import MobileNav from "@/components/layout/MobileNav";
import { useDashboardStore } from "@/lib/store";

const CONTEXT_TABS: Record<string, string[]> = {
  "/home":     ["", "/lighting", "/automations"],
  "/homelab":  ["", "/servers", "/containers", "/media", "/network"],
  "/fitness":  ["", "/coach", "/history"],
  "/garden":   ["", "/planner"],
};

function getContextKey(pathname: string) {
  return Object.keys(CONTEXT_TABS).find(k => pathname === k || pathname.startsWith(k + "/")) ?? "/home";
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const collapsed = useDashboardStore((s) => s.sidebarCollapsed);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const sidebarWidth = mounted && collapsed ? "md:ml-16" : "md:ml-60";

  const router   = useRouter();
  const pathname = usePathname();
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
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
    router.push(contextKey + suffixes[next]);
  }, [pathname, router]);

  return (
    <>
      <TopBar />
      <Sidebar />
      <main
        className={`pt-16 min-h-screen transition-all duration-300 ${sidebarWidth}`}
        style={{ paddingBottom: "140px" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="px-5 lg:px-8 py-6 max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
      <MobileNav />
    </>
  );
}

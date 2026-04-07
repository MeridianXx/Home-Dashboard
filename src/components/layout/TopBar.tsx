"use client";

import { usePathname } from "next/navigation";
import { useDashboardStore } from "@/lib/store";

// Context metadata — label and sub-tabs for each dashboard context
const CONTEXT_META: Record<
  string,
  { label: string; tabs?: { label: string; suffix: string }[] }
> = {
  "/home": {
    label: "Home",
    tabs: [
      { label: "Overview", suffix: "" },
      { label: "Automations", suffix: "/automations" },
    ],
  },
  "/homelab": {
    label: "Homelab",
    tabs: [
      { label: "Overview", suffix: "" },
      { label: "Servers", suffix: "/servers" },
      { label: "Containers", suffix: "/containers" },
      { label: "Network", suffix: "/network" },
    ],
  },
  "/fitness": {
    label: "Fitness",
    tabs: [
      { label: "Dashboard", suffix: "" },
      { label: "Coach", suffix: "/coach" },
      { label: "History", suffix: "/history" },
    ],
  },
  "/garden": {
    label: "Garden",
    tabs: [
      { label: "Overview", suffix: "" },
      { label: "Planner", suffix: "/planner" },
    ],
  },
};

function getContextKey(pathname: string): string {
  const key = Object.keys(CONTEXT_META).find(
    (k) => pathname === k || pathname.startsWith(k + "/")
  );
  return key ?? "/home";
}

export default function TopBar() {
  const pathname = usePathname();
  const collapsed = useDashboardStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useDashboardStore((s) => s.setSidebarCollapsed);

  const contextKey = getContextKey(pathname);
  const meta = CONTEXT_META[contextKey];

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center h-16"
      style={{
        backgroundColor: "var(--color-surface)",
        borderBottom: "1px solid rgba(187,185,178,0.15)",
      }}
    >
      {/* Sidebar toggle — always visible */}
      <button
        onClick={() => setSidebarCollapsed(!collapsed)}
        className="hidden md:flex items-center justify-center w-16 h-full shrink-0 transition-opacity opacity-60 hover:opacity-100"
        aria-label="Toggle sidebar"
        style={{ color: "var(--color-on-surface)" }}
      >
        <span className="material-symbols-outlined">
          {collapsed ? "menu_open" : "menu"}
        </span>
      </button>

      {/* Logo — visible on mobile (md: hidden behind toggle) */}
      <span
        className="md:hidden text-lg font-black tracking-tight font-headline px-5"
        style={{ color: "var(--color-on-surface)" }}
      >
        inicio
      </span>

      {/* Context label + sub-tabs */}
      <div className="flex items-center flex-1 gap-4 px-2">
        <span
          className="hidden md:block text-sm font-bold"
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          {meta.label}
        </span>

        {meta.tabs && meta.tabs.length > 1 && (
          <nav className="flex gap-1">
            {meta.tabs.map(({ label, suffix }) => {
              const href = `${contextKey}${suffix}`;
              const active = pathname === href;
              return (
                <a
                  key={href}
                  href={href}
                  className="rounded-full px-3 py-1 text-sm font-medium transition-all"
                  style={
                    active
                      ? {
                          backgroundColor: "var(--color-inverse-surface)",
                          color: "var(--color-surface)",
                        }
                      : { color: "var(--color-on-surface-variant)" }
                  }
                >
                  {label}
                </a>
              );
            })}
          </nav>
        )}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3 px-5">
        <button
          className="material-symbols-outlined transition-colors opacity-70 hover:opacity-100"
          style={{ color: "var(--color-on-surface-variant)" }}
          aria-label="Notifications"
        >
          notifications
        </button>

        {/* Avatar */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
          style={{
            backgroundColor: "var(--color-primary)",
            color: "var(--color-on-primary)",
          }}
        >
          SA
        </div>
      </div>
    </header>
  );
}

"use client";

import { usePathname } from "next/navigation";
import { useDashboardStore } from "@/lib/store";

const CONTEXT_META: Record<
  string,
  { label: string; tabs?: { label: string; suffix: string }[] }
> = {
  "/home": {
    label: "Hem",
    tabs: [
      { label: "Översikt", suffix: "" },
      { label: "Automationer", suffix: "/automations" },
    ],
  },
  "/homelab": {
    label: "Homelab",
    tabs: [
      { label: "Översikt", suffix: "" },
      { label: "Servrar", suffix: "/servers" },
      { label: "Containers", suffix: "/containers" },
      { label: "Nätverk", suffix: "/network" },
    ],
  },
  "/fitness": {
    label: "Fitness",
    tabs: [
      { label: "Dashboard", suffix: "" },
      { label: "Coach", suffix: "/coach" },
      { label: "Historik", suffix: "/history" },
    ],
  },
  "/garden": {
    label: "Trädgård",
    tabs: [
      { label: "Översikt", suffix: "" },
      { label: "Planering", suffix: "/planner" },
    ],
  },
};

// Mock 4-day forecast — replaced with SMHI / HA weather entity in Fas 2.
// Dates are hardcoded relative to today (2026-04-07).
const FORECAST = [
  { day: "Idag", date: "7/4", icon: "ac_unit", temp: "-2°", color: "var(--color-primary)" },
  { day: "Tis", date: "8/4", icon: "wb_cloudy", temp: "1°", color: "var(--color-on-surface-variant)" },
  { day: "Ons", date: "9/4", icon: "rainy", temp: "3°", color: "var(--color-primary)" },
  { day: "Tor", date: "10/4", icon: "wb_sunny", temp: "6°", color: "var(--color-tertiary)" },
];

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
      {/* Sidebar toggle */}
      <button
        onClick={() => setSidebarCollapsed(!collapsed)}
        className="hidden md:flex items-center justify-center w-16 h-full shrink-0 transition-opacity opacity-60 hover:opacity-100"
        aria-label="Växla sidopanel"
        style={{ color: "var(--color-on-surface)" }}
      >
        <span className="material-symbols-outlined">
          {collapsed ? "menu_open" : "menu"}
        </span>
      </button>

      {/* Logo — mobile only */}
      <span
        className="md:hidden text-lg font-black tracking-tight font-headline px-5"
        style={{ color: "var(--color-on-surface)" }}
      >
        inicio
      </span>

      {/* Context label + sub-tabs */}
      <div className="flex items-center flex-1 gap-4 px-2 min-w-0">
        <span
          className="hidden md:block text-sm font-bold shrink-0"
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
                  className="rounded-full px-3 py-1 text-sm font-medium transition-all whitespace-nowrap"
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

      {/* 4-day weather forecast */}
      <div className="hidden lg:flex items-center gap-1 mr-3">
        {FORECAST.map(({ day, date, icon, temp, color }, i) => (
          <div
            key={day}
            className="flex flex-col items-center px-2.5 py-1 rounded-xl"
            style={{
              backgroundColor: i === 0 ? "var(--color-surface-container)" : "transparent",
              minWidth: "48px",
            }}
          >
            <span className="text-[10px] font-bold" style={{ color: "var(--color-on-surface-variant)" }}>
              {day}
            </span>
            <span className="text-[9px]" style={{ color: "var(--color-outline)" }}>
              {date}
            </span>
            <span
              className="material-symbols-outlined text-[16px] my-0.5"
              style={{ color }}
            >
              {icon}
            </span>
            <span className="text-xs font-bold" style={{ color: "var(--color-on-surface)" }}>
              {temp}
            </span>
          </div>
        ))}
      </div>

      {/* Kompakt chip — tablet (md–lg) */}
      <div
        className="hidden md:flex lg:hidden items-center gap-1.5 px-3 py-1.5 rounded-full mr-3"
        style={{
          backgroundColor: "var(--color-surface-container)",
          color: "var(--color-on-surface)",
        }}
      >
        <span className="material-symbols-outlined text-[16px]" style={{ color: "var(--color-primary)" }}>
          ac_unit
        </span>
        <span className="text-sm font-bold">-2°</span>
        <span className="text-xs" style={{ color: "var(--color-on-surface-variant)" }}>Idag</span>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3 px-4">
        <button
          className="material-symbols-outlined transition-colors opacity-70 hover:opacity-100"
          style={{ color: "var(--color-on-surface-variant)" }}
          aria-label="Aviseringar"
        >
          notifications
        </button>

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

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDashboardStore } from "@/lib/store";
import { useTheme } from "@/lib/theme";
import { CONTEXT_META, getContextKey } from "@/lib/nav";

const THEME_ICONS: Record<string, string> = { auto: "brightness_auto", light: "light_mode", dark: "dark_mode" };

// Mock 4-day forecast — replaced with SMHI / HA weather entity in Fas 2.
const FORECAST = [
  { day: "Idag", icon: "ac_unit", temp: "-2°", color: "var(--color-primary)" },
  { day: "Tis", icon: "wb_cloudy", temp: "1°", color: "var(--color-on-surface-variant)" },
  { day: "Ons", icon: "rainy", temp: "3°", color: "var(--color-primary)" },
  { day: "Tor", icon: "wb_sunny", temp: "6°", color: "var(--color-tertiary)" },
];

export default function TopBar() {
  const pathname = usePathname();
  const collapsed = useDashboardStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useDashboardStore((s) => s.setSidebarCollapsed);

  const contextKey = getContextKey(pathname);
  const meta = CONTEXT_META[contextKey];
  const { theme, cycleTheme } = useTheme();

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

      {/* Context label + sub-tabs.
          Mobil: ikon-only (text har `subnav-label`-klass med @media-gate i globals.css
          eftersom tw.css inte hanterar `md:`-prefix via @media).
          Desktop: ikon + text stackade som tidigare. */}
      <div className="flex items-center flex-1 min-w-0 pl-0 pr-2 overflow-visible">
        <span
          className="hidden md:block text-sm font-bold shrink-0 mr-4"
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          {meta?.label}
        </span>

        {meta?.tabs && meta.tabs.length > 1 && (
          <div
            className="overflow-x-auto no-scrollbar flex-1"
            style={{
              borderRight: "1px solid rgba(187,185,178,0.2)",
              paddingLeft: 8,
              paddingRight: 8,
            }}
          >
            <nav className="flex gap-1 w-max">
              {meta.tabs.map(({ label, suffix, icon }) => {
                const href = `${contextKey}${suffix}`;
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-label={label}
                    className="rounded-full px-3 py-1.5 transition-all whitespace-nowrap flex flex-col items-center gap-0.5"
                    style={
                      active
                        ? { backgroundColor: "var(--color-inverse-surface)", color: "var(--color-surface)" }
                        : { color: "var(--color-on-surface-variant)" }
                    }
                  >
                    <span className="material-symbols-outlined"
                      style={{ fontSize: 18, fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>
                      {icon}
                    </span>
                    <span className="subnav-label" style={{ fontSize: 10, fontWeight: 700, lineHeight: 1 }}>{label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* Väderprognos — 4 dagar */}
      <div
        className="hidden md:flex items-stretch mr-2"
        style={{ borderLeft: "1px solid rgba(187,185,178,0.2)" }}
      >
        {FORECAST.map(({ day, icon, temp, color }, i) => (
          <div
            key={day}
            className="flex flex-col items-center justify-center gap-0.5 px-3"
            style={{
              backgroundColor: i === 0 ? "var(--color-surface-container)" : "transparent",
            }}
          >
            <span
              className="text-[10px] font-bold"
              style={{ color: i === 0 ? "var(--color-on-surface)" : "var(--color-on-surface-variant)" }}
            >
              {day}
            </span>
            <span className="material-symbols-outlined text-[18px]" style={{ color }}>
              {icon}
            </span>
            <span
              className="text-xs font-bold"
              style={{ color: "var(--color-on-surface)" }}
            >
              {temp}
            </span>
          </div>
        ))}
      </div>

      {/* Right actions — desktop */}
      <div className="hidden md:flex items-center gap-3 px-4">
        <button
          className="material-symbols-outlined transition-colors opacity-70 hover:opacity-100"
          style={{ color: "var(--color-on-surface-variant)" }}
          aria-label="Aviseringar"
        >
          notifications
        </button>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ backgroundColor: "var(--color-primary)", color: "var(--color-on-primary)" }}
        >
          SA
        </div>
      </div>

      {/* Theme toggle — mobile only */}
      <button
        onClick={cycleTheme}
        className="md:hidden flex items-center justify-center rounded-full opacity-70"
        style={{
          color: "var(--color-on-surface-variant)",
          width: 32,
          height: 32,
          marginRight: 10,
        }}
        aria-label="Växla tema"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{THEME_ICONS[theme]}</span>
      </button>
    </header>
  );
}

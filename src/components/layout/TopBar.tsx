"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDashboardStore } from "@/lib/store";
import { useTheme } from "@/lib/theme";
import Logo from "@/components/Logo";

const THEME_ICONS: Record<string, string> = { auto: "brightness_auto", light: "light_mode", dark: "dark_mode" };

const CONTEXT_META: Record<
  string,
  { label: string; tabs?: { label: string; suffix: string; icon: string }[] }
> = {
  "/home": {
    label: "Hem",
    tabs: [
      { label: "Översikt",    suffix: "",            icon: "dashboard"     },
      { label: "Belysning",   suffix: "/lighting",   icon: "light_mode"    },
      { label: "Media",       suffix: "/media",      icon: "speaker"       },
      { label: "Auto",        suffix: "/automations",icon: "auto_mode"     },
    ],
  },
  "/homelab": {
    label: "Homelab",
    tabs: [
      { label: "Översikt",   suffix: "",          icon: "dashboard"   },
      { label: "Infra",      suffix: "/servers",  icon: "dns"         },
      { label: "Nätverk",    suffix: "/network",  icon: "router"      },
    ],
  },
  "/fitness": {
    label: "Fitness",
    tabs: [
      { label: "Översikt",  suffix: "",           icon: "dashboard"      },
      { label: "Coach",     suffix: "/coach",     icon: "person"         },
      { label: "Historik",  suffix: "/history",   icon: "history"        },
    ],
  },
  "/garden": {
    label: "Trädgård",
    tabs: [
      { label: "Översikt",  suffix: "",          icon: "dashboard"     },
      { label: "Planering", suffix: "/planner",  icon: "calendar_today"},
    ],
  },
};

// Mock 4-day forecast — replaced with SMHI / HA weather entity in Fas 2.
const FORECAST = [
  { day: "Idag", icon: "ac_unit", temp: "-2°", color: "var(--color-primary)" },
  { day: "Tis", icon: "wb_cloudy", temp: "1°", color: "var(--color-on-surface-variant)" },
  { day: "Ons", icon: "rainy", temp: "3°", color: "var(--color-primary)" },
  { day: "Tor", icon: "wb_sunny", temp: "6°", color: "var(--color-tertiary)" },
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

      {/* Logo — mobile only */}
      <span
        className="md:hidden flex items-center px-5"
        style={{ color: "var(--color-on-surface)" }}
      >
        <Logo size={26} />
      </span>

      {/* Context label + sub-tabs */}
      <div className="flex items-center flex-1 min-w-0 px-2 overflow-visible">
        <span
          className="hidden md:block text-sm font-bold shrink-0 mr-4"
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          {meta.label}
        </span>

        {meta.tabs && meta.tabs.length > 1 && (
          <div className="overflow-x-auto no-scrollbar flex-1">
            <nav className="flex gap-1 w-max">
              {meta.tabs.map(({ label, suffix, icon }) => {
                const href = `${contextKey}${suffix}`;
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className="rounded-full px-3 py-1.5 transition-all whitespace-nowrap flex flex-col items-center gap-0.5"
                    style={
                      active
                        ? { backgroundColor: "var(--color-inverse-surface)", color: "var(--color-surface)" }
                        : { color: "var(--color-on-surface-variant)" }
                    }
                  >
                    <span className="material-symbols-outlined"
                      style={{ fontSize: 16, fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>
                      {icon}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, lineHeight: 1 }}>{label}</span>
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
        className="md:hidden flex items-center justify-center w-10 h-10 mr-2 rounded-full opacity-70"
        style={{ color: "var(--color-on-surface-variant)" }}
        aria-label="Växla tema"
      >
        <span className="material-symbols-outlined text-[22px]">{THEME_ICONS[theme]}</span>
      </button>
    </header>
  );
}

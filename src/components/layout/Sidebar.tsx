"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDashboardStore } from "@/lib/store";
import { useTheme } from "@/lib/theme";

const THEME_ICONS: Record<string, string>  = { auto: "brightness_auto", light: "light_mode", dark: "dark_mode" };
const THEME_LABELS: Record<string, string> = { auto: "Auto", light: "Ljust", dark: "Mörkt" };

const CONTEXTS = [
  { icon: "home", label: "Hem", href: "/home" },
  { icon: "dns", label: "Homelab", href: "/homelab" },
  { icon: "fitness_center", label: "Fitness", href: "/fitness" },
  { icon: "yard", label: "Trädgård", href: "/garden" },
] as const;

const SECONDARY = [
  { icon: "settings", label: "Inställningar", href: "#" },
  { icon: "help", label: "Support", href: "#" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const collapsed = useDashboardStore((s) => s.sidebarCollapsed);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isCollapsed = mounted && collapsed;
  const { theme, cycleTheme } = useTheme();

  return (
    <aside
      className={`hidden md:flex flex-col fixed left-0 top-16 h-[calc(100vh-64px)] z-40 transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-60"
      }`}
      style={{
        backgroundColor: "var(--color-surface-container)",
        borderRight: "1px solid rgba(187,185,178,0.15)",
        boxShadow: "2px 0 16px rgba(56,56,51,0.04)",
      }}
    >
      {/* Branding block — only when expanded */}
      {!isCollapsed && (
        <div className="px-5 py-5 mb-2">
          <p
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            inicio.cloud
          </p>
          <p
            className="text-[11px] font-medium mt-0.5"
            style={{ color: "var(--color-outline)" }}
          >
            Villa Björkdalen
          </p>
        </div>
      )}

      {/* Context nav */}
      <nav className={`flex-1 ${isCollapsed ? "px-1 pt-4" : "px-2"} space-y-0.5`}>
        {CONTEXTS.map(({ icon, label, href }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              title={isCollapsed ? label : undefined}
              className={`flex items-center gap-3 rounded-xl transition-all ${
                isCollapsed ? "justify-center px-0 py-3" : "px-3 py-2.5"
              } ${active ? "opacity-100" : "opacity-60 hover:opacity-90"}`}
              style={
                active
                  ? {
                      backgroundColor: "var(--color-inverse-surface)",
                      color: "var(--color-surface)",
                    }
                  : {
                      color: "var(--color-on-surface)",
                    }
              }
            >
              <span className="material-symbols-outlined text-[22px]">{icon}</span>
              {!isCollapsed && <span className="font-semibold text-sm">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Secondary links + theme toggle */}
      <div className={`${isCollapsed ? "px-1" : "px-2"} mb-4 space-y-0.5`}>
        {SECONDARY.map(({ icon, label, href }) => (
          <Link
            key={label}
            href={href}
            title={isCollapsed ? label : undefined}
            className={`flex items-center gap-3 rounded-xl transition-all opacity-50 hover:opacity-80 ${
              isCollapsed ? "justify-center px-0 py-3" : "px-3 py-2"
            }`}
            style={{ color: "var(--color-on-surface)" }}
          >
            <span className="material-symbols-outlined text-[20px]">{icon}</span>
            {!isCollapsed && <span className="text-sm font-medium">{label}</span>}
          </Link>
        ))}

        {/* Theme toggle */}
        <button
          onClick={cycleTheme}
          title={isCollapsed ? `Tema: ${THEME_LABELS[theme]}` : undefined}
          className={`w-full flex items-center gap-3 rounded-xl transition-all opacity-50 hover:opacity-80 ${
            isCollapsed ? "justify-center px-0 py-3" : "px-3 py-2"
          }`}
          style={{ color: "var(--color-on-surface)" }}
        >
          <span className="material-symbols-outlined text-[20px]">{THEME_ICONS[theme]}</span>
          {!isCollapsed && <span className="text-sm font-medium">{THEME_LABELS[theme]}</span>}
        </button>
      </div>
    </aside>
  );
}

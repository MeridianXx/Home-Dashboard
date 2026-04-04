"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Energy", href: "/energy" },
  { label: "Climate", href: "/climate" },
  { label: "Media", href: "/media" },
  { label: "Servers", href: "/servers" },
  { label: "Containers", href: "/containers" },
];

export default function TopNav() {
  const pathname = usePathname();

  return (
    <header
      className="fixed top-0 w-full z-50 flex justify-between items-center px-8 h-16"
      style={{
        backgroundColor: "var(--color-surface)",
        borderBottom: "1px solid rgba(187,185,178,0.15)",
      }}
    >
      {/* Left: logo + nav pills */}
      <div className="flex items-center gap-8">
        <span
          className="text-xl font-bold tracking-tight font-headline"
          style={{ color: "var(--color-inverse-surface)" }}
        >
          inicio.cloud
        </span>

        <nav className="hidden md:flex gap-1">
          {NAV_LINKS.map(({ label, href }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className="rounded-full px-4 py-1.5 text-sm font-medium transition-all"
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
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Right: search + icons + avatar */}
      <div className="flex items-center gap-4">
        <div
          className="hidden sm:flex items-center rounded-full px-4 py-1.5 gap-2 text-sm"
          style={{
            backgroundColor: "var(--color-surface-container)",
            color: "var(--color-on-surface-variant)",
          }}
        >
          <span className="material-symbols-outlined text-[18px]">search</span>
          <span className="opacity-60">Search system...</span>
        </div>

        <button
          className="material-symbols-outlined transition-colors"
          style={{ color: "var(--color-on-surface-variant)" }}
          aria-label="Notifications"
        >
          notifications
        </button>

        <button
          className="material-symbols-outlined transition-colors"
          style={{ color: "var(--color-on-surface-variant)" }}
          aria-label="Settings"
        >
          settings
        </button>

        <div
          className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold"
          style={{
            backgroundColor: "var(--color-surface-container-high)",
            color: "var(--color-on-surface-variant)",
          }}
        >
          SA
        </div>
      </div>
    </header>
  );
}

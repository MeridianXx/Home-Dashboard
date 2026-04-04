"use client";

import Link from "next/link";

const NAV_ITEMS = [
  { icon: "devices", label: "Devices", href: "#" },
  { icon: "bolt", label: "Automations", href: "#" },
  { icon: "lan", label: "Network", href: "#" },
  { icon: "list_alt", label: "Logs", href: "#" },
];

export default function SideNav() {
  return (
    <aside
      className="hidden lg:flex flex-col fixed left-0 top-16 h-[calc(100vh-64px)] py-6 w-64 z-40 transition-all duration-300"
      style={{
        backgroundColor: "var(--color-surface-container)",
        borderRight: "1px solid rgba(187,185,178,0.15)",
        boxShadow: "2px 0 16px rgba(56,56,51,0.04)",
      }}
    >
      {/* User block */}
      <div className="px-6 mb-8 flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          <span className="material-symbols-outlined">dns</span>
        </div>
        <div>
          <p
            className="text-sm font-black font-headline leading-tight"
            style={{ color: "var(--color-on-surface)" }}
          >
            System Admin
          </p>
          <p
            className="text-[11px] font-medium"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            Local Instance
          </p>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-2 space-y-1">
        {NAV_ITEMS.map(({ icon, label, href }) => (
          <Link
            key={label}
            href={href}
            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all opacity-70 hover:opacity-100 hover:bg-white/40"
            style={{ color: "var(--color-on-surface)" }}
          >
            <span className="material-symbols-outlined">{icon}</span>
            <span className="font-medium">{label}</span>
          </Link>
        ))}
      </nav>

      {/* Add Device button */}
      <div className="px-4 mb-4">
        <button
          className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
          style={{
            backgroundColor: "var(--color-primary)",
            color: "var(--color-on-primary)",
            boxShadow: "0 4px 16px rgba(71,91,194,0.25)",
          }}
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Add Device
        </button>
      </div>

      {/* Bottom links */}
      <div className="px-2 space-y-1">
        {[
          { icon: "help", label: "Support" },
          { icon: "update", label: "Updates" },
        ].map(({ icon, label }) => (
          <Link
            key={label}
            href="#"
            className="flex items-center gap-3 px-4 py-2 text-xs transition-all opacity-60 hover:opacity-100"
            style={{ color: "var(--color-on-surface)" }}
          >
            <span className="material-symbols-outlined text-[18px]">{icon}</span>
            {label}
          </Link>
        ))}
      </div>
    </aside>
  );
}

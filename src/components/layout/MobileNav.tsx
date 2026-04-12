"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { icon: "home",          label: "Hem",      href: "/home" },
  { icon: "dns",           label: "Homelab",  href: "/homelab" },
  { icon: "fitness_center",label: "Fitness",  href: "/fitness" },
  { icon: "yard",          label: "Trädgård", href: "/garden" },
] as const;

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed z-50" style={{ bottom: "20px", left: "50%", transform: "translateX(-50%)" }}>
      <div
        className="flex items-center gap-0.5 px-2 py-2 rounded-full"
        style={{
          backgroundColor: "var(--color-surface-container-highest)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1.5px rgba(187,185,178,0.25)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid var(--color-outline-variant)",
        }}
      >
        {ITEMS.map(({ icon, label, href }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-full transition-all"
              style={
                active
                  ? { backgroundColor: "var(--color-inverse-surface)", color: "var(--color-surface)" }
                  : { color: "var(--color-on-surface-variant)" }
              }
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 22, fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
              >
                {icon}
              </span>
              <span className="text-[10px] font-bold whitespace-nowrap">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

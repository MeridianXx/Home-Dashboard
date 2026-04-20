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
    <nav className="md:hidden fixed z-50" style={{ bottom: "20px", left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <div
        className="flex items-center gap-1 px-2 py-2 rounded-full"
        style={{
          backgroundColor: "var(--nav-glass-bg)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.1)",
          backdropFilter: "blur(32px) saturate(180%)",
          WebkitBackdropFilter: "blur(32px) saturate(180%)",
          border: "1px solid var(--nav-glass-border)",
        }}
      >
        {ITEMS.map(({ icon, label, href }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center gap-0.5 py-2 rounded-full transition-all"
              style={{
                width: 76,
                ...(active
                  ? { backgroundColor: "var(--color-inverse-surface)", color: "var(--color-surface)" }
                  : { color: "var(--color-on-surface-variant)" }),
              }}
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

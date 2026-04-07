"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { icon: "home", label: "Home", href: "/home" },
  { icon: "dns", label: "Homelab", href: "/homelab" },
  { icon: "fitness_center", label: "Fitness", href: "/fitness" },
  { icon: "yard", label: "Garden", href: "/garden" },
] as const;

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around h-16 safe-area-pb"
      style={{
        backgroundColor: "var(--color-surface-container)",
        borderTop: "1px solid rgba(187,185,178,0.15)",
      }}
    >
      {ITEMS.map(({ icon, label, href }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-0.5 py-1 px-4 transition-all"
            style={{
              color: active
                ? "var(--color-primary)"
                : "var(--color-on-surface-variant)",
            }}
          >
            <span
              className="material-symbols-outlined text-[24px]"
              style={active ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              {icon}
            </span>
            <span className="text-[10px] font-semibold">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

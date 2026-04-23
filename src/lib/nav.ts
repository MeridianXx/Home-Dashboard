// ─── Delad nav-config ────────────────────────────────────────────────────────
// En enda sanning för vilka sektioner och sub-tabs som finns. Importeras av
// TopBar (visar bara kontext-label), SubNav (renderar själva tab-pills) och
// dashboard-layouten (driver swipe-navigation + page-transition-riktning).

export interface SubTab {
  label: string;
  suffix: string;
  icon: string;
}

export interface SectionMeta {
  label: string;
  tabs: SubTab[];
}

export const CONTEXT_META: Record<string, SectionMeta> = {
  "/home": {
    label: "Hem",
    tabs: [
      { label: "Översikt",    suffix: "",            icon: "dashboard"  },
      { label: "Belysning",   suffix: "/lighting",   icon: "light_mode" },
      { label: "Media",       suffix: "/media",      icon: "speaker"    },
      { label: "Auto",        suffix: "/automations",icon: "auto_mode"  },
    ],
  },
  "/homelab": {
    label: "Homelab",
    tabs: [
      { label: "Översikt", suffix: "",         icon: "dashboard" },
      { label: "Infra",    suffix: "/servers", icon: "dns"       },
      { label: "Nätverk",  suffix: "/network", icon: "router"    },
    ],
  },
  "/fitness": {
    label: "Fitness",
    tabs: [
      { label: "Översikt", suffix: "",         icon: "dashboard" },
      { label: "Coach",    suffix: "/coach",   icon: "person"    },
      { label: "Historik", suffix: "/history", icon: "history"   },
    ],
  },
  "/garden": {
    label: "Trädgård",
    tabs: [
      { label: "Översikt",    suffix: "",             icon: "dashboard"      },
      { label: "Växter",      suffix: "/vaxter",      icon: "local_florist"  },
      { label: "Säsong",      suffix: "/sasongsplan", icon: "calendar_today" },
      { label: "Projekt",     suffix: "/projekt",     icon: "construction"   },
      { label: "AI",          suffix: "/ai",          icon: "auto_awesome"   },
    ],
  },
};

export function getContextKey(pathname: string): string {
  return (
    Object.keys(CONTEXT_META).find(
      (k) => pathname === k || pathname.startsWith(k + "/"),
    ) ?? "/home"
  );
}

/** Returnerar suffix-listan för aktuell sektion (tom = ingen sub-nav). */
export function getSuffixes(pathname: string): string[] {
  return CONTEXT_META[getContextKey(pathname)]?.tabs.map((t) => t.suffix) ?? [];
}

export function getTabIndex(pathname: string): number {
  const ctx = getContextKey(pathname);
  const current = pathname.slice(ctx.length);
  return getSuffixes(pathname).indexOf(current);
}

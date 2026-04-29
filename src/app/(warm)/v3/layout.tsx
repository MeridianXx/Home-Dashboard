"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { mutate as swrMutate } from "swr";
import {
  Sidebar,
  SIDEBAR_WIDTH,
  TabBar,
  type TabKey,
} from "@/components/warm/primitives";
import { FitIcon, GardIcon, HemIcon, LabIcon, ThemeIcon } from "@/components/warm/icons";
import {
  DESKTOP_BREAKPOINT,
  useDesktop,
  useWarmTheme,
  WarmThemeProvider,
} from "@/lib/warm/theme";
import { ACC, SAGE, body } from "@/lib/warm/tokens";
import { CheckIcon } from "@/components/warm/icons/extra";

const TAB_LABELS: Record<TabKey, string> = {
  hem: "Hem",
  lab: "Lab",
  fit: "Fitness",
  gard: "Trädgård",
};

const TAB_ROUTES: Record<TabKey, string> = {
  hem: "/v3/home",
  lab: "/v3/lab",
  fit: "/v3/fitness",
  gard: "/v3/garden",
};

function activeTab(pathname: string): TabKey {
  if (pathname.startsWith("/v3/lab")) return "lab";
  if (pathname.startsWith("/v3/fitness")) return "fit";
  if (pathname.startsWith("/v3/garden")) return "gard";
  return "hem";
}

function tabIcon(key: TabKey, color: string, size = 20) {
  const props = { size, color };
  if (key === "hem") return <HemIcon {...props} />;
  if (key === "lab") return <LabIcon {...props} />;
  if (key === "fit") return <FitIcon {...props} />;
  return <GardIcon {...props} />;
}

const PULL_THRESHOLD = 80;

export default function WarmV3Layout({ children }: { children: ReactNode }) {
  return (
    <WarmThemeProvider>
      <WarmV3Chrome>{children}</WarmV3Chrome>
    </WarmThemeProvider>
  );
}

function WarmV3Chrome({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? "/v3/home";
  const { t, dark, toggle } = useWarmTheme();
  const tab = activeTab(pathname);
  const isDesktop = useDesktop();

  // Pull-to-refresh — bara på mobil. Desktop använder ingen pull-gesture.
  const [pull, setPull] = useState(0);
  const [confirming, setConfirming] = useState(false);
  // Indikator-text persisterar under fade-out så vi inte blinkar tillbaka
  // till "Dra för att uppdatera" under 220ms-opacity-transition efter
  // "Uppdaterat". Sätts av text-deriveringen nedan.
  const [labelMode, setLabelMode] = useState<"pull" | "release" | "confirmed">("pull");
  const startY = useRef<number | null>(null);
  const armed = useRef(false);
  // Aktuell pathname tillgänglig i timeout-callbacken utan stale closure.
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  // Cache-bypass + SWR-revalidate för fitness-routes — bara där HealthFit-
  // Drive-cachen (5 min in-memory i drive.ts) skiljer sig från SWR-cachen.
  // Andra sektioner (HA, Notion-trädgård) har inget att tjäna på det.
  async function bypassFitnessCacheIfRelevant() {
    if (!pathnameRef.current.startsWith("/v3/fitness")) return;
    try {
      await Promise.all([
        fetch("/api/fitness/workouts?limit=10&refresh=1"),
        fetch("/api/fitness/workouts?limit=60&refresh=1"),
        fetch("/api/fitness/readiness?refresh=1"),
        fetch("/api/fitness/metrics?refresh=1"),
      ]);
    } catch {
      // Best-effort — om bypass-fetch failar, router.refresh() täcker
      // fortfarande RSC-data.
    }
    // SWR re-fetch utan refresh=1 — servern har nu färska Drive-data i
    // sin in-memory-cache så detta tjänar UI:t.
    swrMutate("/api/fitness/workouts?limit=10");
    swrMutate("/api/fitness/workouts?limit=60");
    swrMutate("/api/fitness/readiness");
    swrMutate("/api/fitness/metrics");
    swrMutate("/api/fitness/plans");
    swrMutate("/api/fitness/analysed");
  }

  useEffect(() => {
    if (isDesktop) return;
    function onTouchStart(e: TouchEvent) {
      if (window.scrollY > 0) {
        startY.current = null;
        armed.current = false;
        return;
      }
      startY.current = e.touches[0]?.clientY ?? null;
      armed.current = true;
    }
    function onTouchMove(e: TouchEvent) {
      if (!armed.current || startY.current == null) return;
      const dy = (e.touches[0]?.clientY ?? 0) - startY.current;
      if (dy <= 0) {
        if (pull !== 0) setPull(0);
        return;
      }
      const eased = Math.min(120, dy * 0.55);
      setPull(eased);
    }
    function onTouchEnd() {
      if (!armed.current) return;
      armed.current = false;
      startY.current = null;
      if (pull >= PULL_THRESHOLD) {
        setConfirming(true);
        setLabelMode("confirmed");
        setPull(0);
        setTimeout(() => {
          void bypassFitnessCacheIfRelevant();
          router.refresh();
        }, 80);
        setTimeout(() => setConfirming(false), 900);
      } else {
        setPull(0);
      }
    }
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pull, router, isDesktop]);

  // Uppdatera label-mode bara när vi har en aktiv interaktion. Under
  // fade-out (pull=0 + !confirming + !armed) lämnar vi state orört så
  // den senaste texten ("Uppdaterat" / "Släpp …") fortsätter renderas
  // tills opacity nått 0.
  useEffect(() => {
    if (confirming) {
      setLabelMode("confirmed");
    } else if (pull >= PULL_THRESHOLD) {
      setLabelMode("release");
    } else if (pull > 0) {
      setLabelMode("pull");
    }
  }, [pull, confirming]);

  const showSpinner = !isDesktop && (pull > 16 || confirming);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: t.bg,
        color: t.ink,
        position: "relative",
      }}
    >
      {/* Pull-to-refresh-indikator (bara mobil) */}
      <div
        style={{
          position: "fixed",
          top: 12,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          zIndex: 60,
          pointerEvents: "none",
          opacity: showSpinner ? 1 : 0,
          transform: `translateY(${confirming ? 0 : Math.min(28, pull * 0.4)}px)`,
          transition: confirming ? "opacity 220ms ease, transform 220ms ease" : "opacity 120ms",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: 999,
            background: t.paperHi,
            border: `1px solid ${t.line}`,
            color: labelMode === "confirmed" ? SAGE : t.mute,
            fontFamily: body,
            fontSize: 12,
            fontWeight: 500,
            boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
          }}
        >
          {labelMode === "confirmed" ? (
            <>
              <CheckIcon size={14} color={SAGE} />
              Uppdaterat
            </>
          ) : (
            <>
              <svg
                width={14}
                height={14}
                viewBox="0 0 24 24"
                fill="none"
                style={{
                  animation: labelMode === "release" ? "spin-anim 0.8s linear infinite" : "none",
                  transform: `rotate(${pull * 2}deg)`,
                  transition: labelMode === "release" ? "none" : "transform 80ms",
                }}
              >
                <path
                  d="M4 12a8 8 0 1 1 2 5.5"
                  fill="none"
                  stroke={labelMode === "release" ? ACC : t.mute}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </svg>
              {labelMode === "release" ? "Släpp för att uppdatera" : "Dra för att uppdatera"}
            </>
          )}
        </div>
      </div>

      {/* Sidebar (desktop ≥1024px). Pure CSS-skifte sker via paddingLeft +
          rendering — useDesktop()-hook returnerar `false` vid första render
          så SSR-strukturen blir mobil-stabil. */}
      {isDesktop ? (
        <Sidebar
          t={t}
          active={tab}
          onChange={(key) => router.push(TAB_ROUTES[key])}
          labelFor={(key) => TAB_LABELS[key]}
          iconFor={(key, isActive) => tabIcon(key, isActive ? "#FFFBF0" : t.mute, 22)}
          footer={
            <button
              type="button"
              onClick={toggle}
              aria-label={dark ? "Byt till ljust tema" : "Byt till mörkt tema"}
              title={dark ? "Byt till ljust tema" : "Byt till mörkt tema"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 38,
                height: 38,
                borderRadius: 999,
                background: t.paper,
                border: `1px solid ${t.line}`,
                color: t.ink,
                cursor: "pointer",
              }}
            >
              <ThemeIcon dark={dark} size={16} color={t.ink} />
            </button>
          }
        />
      ) : null}

      {/* Innehåll. På desktop får sidan ett sidebar-offset + max-width-centrerad
          inner-pane. På mobil: paddingBottom för TabBar-pillen + pull-translate. */}
      <div
        style={{
          paddingBottom: isDesktop ? 0 : 110,
          paddingLeft: isDesktop ? SIDEBAR_WIDTH : 0,
          transform: !isDesktop ? `translateY(${pull * 0.6}px)` : undefined,
          transition: !isDesktop && armed.current ? "none" : "transform 200ms ease",
        }}
      >
        {isDesktop ? (
          <div
            style={{
              maxWidth: 980,
              margin: "0 auto",
              padding: "12px 28px 48px",
            }}
          >
            {children}
          </div>
        ) : (
          children
        )}
      </div>

      {/* Bottom-pill (mobil <1024px) */}
      {!isDesktop ? (
        <TabBar
          t={t}
          active={tab}
          onChange={(key) => router.push(TAB_ROUTES[key])}
          labelFor={(key) => TAB_LABELS[key]}
          iconFor={(key, isActive) => tabIcon(key, isActive ? "#FFFBF0" : t.mute)}
        />
      ) : null}
    </div>
  );
}

// `DESKTOP_BREAKPOINT` exporteras endast för dokumentation — inline via @media
// i `globals.warm.css` är inte aktuellt eftersom alla styles drivs inline-style
// (princip 7). Hooks-versionen (`useDesktop()`) är källan till sanning.
export { DESKTOP_BREAKPOINT };

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
import { ACC, SAGE, body, serif } from "@/lib/warm/tokens";
import { CheckIcon } from "@/components/warm/icons/extra";
import { haptic } from "@/lib/warm/haptics";
import {
  WarmTopBarProvider,
  useWarmTopBar,
} from "@/lib/warm/topbar";

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
      <WarmTopBarProvider>
        <WarmV3Chrome>{children}</WarmV3Chrome>
      </WarmTopBarProvider>
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
        void haptic("success");
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

  // Capacitor StatusBar — match status-bar text-färgen mot Warm-temat.
  // Dynamic import för att inte dra in plugin-koden i SSR/Safari/PWA där
  // den bara no-op:ar ändå.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (cancelled || Capacitor.getPlatform() !== "ios") return;
      const { StatusBar, Style } = await import("@capacitor/status-bar");
      try {
        // Capacitor `Style`-enum är counter-intuitivt: `Style.Dark` betyder
        // "för mörk bakgrund" → ljus text, `Style.Light` → mörk text.
        await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
      } catch {
        // No-op — status-bar-plugin saknas eller iOS-versionen blockerar.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dark]);

  // Capacitor SplashScreen — göm direkt vid mount istället för att vänta ut
  // launchShowDuration-timeouten. Inget hänger på mobil/PWA — Capacitor
  // no-op:ar utanför native iOS.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (cancelled || Capacitor.getPlatform() !== "ios") return;
      const { SplashScreen } = await import("@capacitor/splash-screen");
      try {
        await SplashScreen.hide();
      } catch {
        // No-op — plugin saknas eller redan dold.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Edge-swipe → router.back() / router.forward() · iOS native
  // `allowsBackForwardNavigationGestures` exponeras inte via Capacitor 8:s
  // config, och WKWebView-gesten är dessutom läjlig med Next.js App Router
  // (SPA-pushState). Vi rullar egen: vänsterkant → drag höger = back,
  // högerkant → drag vänster = forward. Aktivering bara inom 24 px från
  // respektive kant, drag måste vara ≥ 80 px horisontellt.
  useEffect(() => {
    if (isDesktop) return;
    let startX = 0;
    let startY = 0;
    let edge: "left" | "right" | null = null;
    let cancelled = false;

    function onStart(e: TouchEvent) {
      const touch = e.touches[0];
      if (!touch) return;
      const w = window.innerWidth;
      if (touch.clientX <= 24) {
        edge = "left";
      } else if (touch.clientX >= w - 24) {
        edge = "right";
      } else {
        edge = null;
        return;
      }
      startX = touch.clientX;
      startY = touch.clientY;
      cancelled = false;
    }
    function onMove(e: TouchEvent) {
      if (!edge || cancelled) return;
      const touch = e.touches[0];
      if (!touch) return;
      const dx = touch.clientX - startX;
      const dy = Math.abs(touch.clientY - startY);
      // Avbryt om vertikal rörelse dominerar — då är det scroll, inte swipe.
      // Riktningen avgörs av edge: left vill ha dx > 0, right vill ha dx < 0.
      const absDx = Math.abs(dx);
      if (dy > 30 && dy > absDx) {
        cancelled = true;
      }
    }
    function onEnd(e: TouchEvent) {
      if (!edge || cancelled) {
        edge = null;
        return;
      }
      const touch = e.changedTouches[0];
      const startEdge = edge;
      edge = null;
      if (!touch) return;
      const dx = touch.clientX - startX;
      if (startEdge === "left" && dx >= 80) {
        void haptic("tap");
        router.back();
      } else if (startEdge === "right" && dx <= -80) {
        void haptic("tap");
        router.forward();
      }
    }

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [isDesktop, router]);

  const showSpinner = !isDesktop && (pull > 16 || confirming);
  const { scrolled: topbarScrolled, compactTitle } = useWarmTopBar();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: t.bg,
        color: t.ink,
        position: "relative",
      }}
    >
      {/* WarmTopBar: blur-strip ovan content (bara mobil). Visar safe-area-zon
          + en kompakt titelrad när användaren scrollat förbi tröskeln. */}
      {!isDesktop ? (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            height: "calc(env(safe-area-inset-top) + 44px)",
            background: dark
              ? "rgba(26, 23, 18, 0.72)"
              : "rgba(245, 238, 222, 0.72)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            zIndex: 50,
            opacity: topbarScrolled ? 1 : 0,
            transition: "opacity 220ms ease-out",
            pointerEvents: topbarScrolled ? "auto" : "none",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            paddingBottom: 10,
          }}
          aria-hidden={!topbarScrolled}
        >
          <span
            style={{
              fontFamily: serif,
              fontSize: 17,
              fontWeight: 500,
              letterSpacing: "-0.01em",
              color: t.ink,
            }}
          >
            {compactTitle}
          </span>
        </div>
      ) : null}

      {/* Pull-to-refresh-indikator (bara mobil). `top` använder safe-area-inset-top
          så pillen hamnar under notch:en när Capacitor kör med `contentInset: "never"`. */}
      <div
        style={{
          position: "fixed",
          top: "calc(env(safe-area-inset-top) + 12px)",
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
              onClick={() => {
                void haptic("tap");
                toggle();
              }}
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
          inner-pane. På mobil: paddingBottom för TabBar-pillen + pull-translate.
          `env(safe-area-inset-*)` ger plats åt notch/home indicator när appen
          körs i Capacitor med `contentInset: "never"`. I vanlig browser är de 0. */}
      <div
        style={{
          paddingTop: isDesktop ? 0 : "env(safe-area-inset-top)",
          paddingBottom: isDesktop
            ? 0
            : "calc(110px + env(safe-area-inset-bottom))",
          paddingLeft: isDesktop ? SIDEBAR_WIDTH : 0,
          transform: !isDesktop ? `translateY(${pull * 0.6}px)` : undefined,
          transition: !isDesktop && armed.current ? "none" : "transform 200ms ease",
        }}
      >
        {/* Fade-in på ny sida vid pathname-byte via CSS-animation
            `warm-page-fade-in` (definierad i globals.warm.css). React mount:ar
            ny div via `key={pathname}` → CSS-animation körs från noll varje
            mount. Använder INTE framer-motion eller Web Animations API — båda
            har visat sig opålitliga (motion.div fastnade på opacity 0,
            element.animate() registrerade animation men progresserade aldrig
            i preview-environment). Ren CSS är robustaste vägen. */}
        <div
          key={pathname}
          className="warm-page-fade"
          style={
            isDesktop
              ? { maxWidth: 980, margin: "0 auto", padding: "12px 28px 48px" }
              : undefined
          }
        >
          {children}
        </div>
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

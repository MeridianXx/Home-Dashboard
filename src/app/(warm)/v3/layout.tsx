"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { TabBar, type TabKey } from "@/components/warm/primitives";
import { FitIcon, GardIcon, HemIcon, LabIcon } from "@/components/warm/icons";
import { useWarmTheme, WarmThemeProvider } from "@/lib/warm/theme";
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

function tabIcon(key: TabKey, color: string) {
  const props = { size: 20, color };
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
  const { t } = useWarmTheme();
  const tab = activeTab(pathname);

  // Pull-to-refresh
  const [pull, setPull] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const startY = useRef<number | null>(null);
  const armed = useRef(false);

  useEffect(() => {
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
        setPull(0);
        setTimeout(() => {
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
  }, [pull, router]);

  const showSpinner = pull > 16 || confirming;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: t.bg,
        color: t.ink,
        position: "relative",
      }}
    >
      {/* Pull-to-refresh-indikator */}
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
            color: confirming ? SAGE : t.mute,
            fontFamily: body,
            fontSize: 12,
            fontWeight: 500,
            boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
          }}
        >
          {confirming ? (
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
                  animation: pull >= PULL_THRESHOLD ? "spin-anim 0.8s linear infinite" : "none",
                  transform: `rotate(${pull * 2}deg)`,
                  transition: pull >= PULL_THRESHOLD ? "none" : "transform 80ms",
                }}
              >
                <path
                  d="M4 12a8 8 0 1 1 2 5.5"
                  fill="none"
                  stroke={pull >= PULL_THRESHOLD ? ACC : t.mute}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </svg>
              {pull >= PULL_THRESHOLD ? "Släpp för att uppdatera" : "Dra för att uppdatera"}
            </>
          )}
        </div>
      </div>

      {/* Innehåll */}
      <div
        style={{
          paddingBottom: 110,
          transform: `translateY(${pull * 0.6}px)`,
          transition: armed.current ? "none" : "transform 200ms ease",
        }}
      >
        {children}
      </div>

      <TabBar
        t={t}
        active={tab}
        onChange={(key) => router.push(TAB_ROUTES[key])}
        labelFor={(key) => TAB_LABELS[key]}
        iconFor={(key, isActive) => tabIcon(key, isActive ? "#FFFBF0" : t.mute)}
      />
    </div>
  );
}

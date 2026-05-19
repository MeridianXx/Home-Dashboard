"use client";

import { useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { ACC } from "@/lib/warm/tokens";
import { haptic } from "@/lib/warm/haptics";

type Ripple = { id: number; x: number; y: number; scale: number };

const RIPPLE_DURATION_MS = 380;

/**
 * WarmPress — delad knapp-wrapper med taktil feedback.
 *
 * Press-feedback i två lager (haptic-ersättning på iOS Safari där
 * navigator.vibrate inte stöds):
 * 1. Scale-down till 0.94 vid pointer-down med snabb ease-out, release
 *    går tillbaka med back-out cubic-bezier (lätt overshoot).
 * 2. Tap-ring — ACC-tonad cirkel som expanderar från press-position
 *    och fadar ut på 380 ms. Renderas inuti en absolut wrapper med
 *    border-radius: inherit så ringen clip:as vid knappens kant.
 *
 * Loading-state (medan onClick:s promise är pending):
 * - Barnen dämpas till 25 % opacity, spinner i ACC visas centrerat,
 *   knappen är disabled så användaren inte kan dubbel-trigga.
 */
export default function WarmPress({
  children,
  onClick,
  loading = false,
  disabled = false,
  style,
  ariaLabel,
  ariaPressed,
  spinnerColor = ACC,
  ringColor,
}: {
  children: ReactNode;
  onClick?: () => void | Promise<void>;
  loading?: boolean;
  disabled?: boolean;
  style?: CSSProperties;
  ariaLabel?: string;
  ariaPressed?: boolean;
  spinnerColor?: string;
  /** CSS-färg för tap-ringen. Default: ACC vid 40 % opacitet via CSS-var. */
  ringColor?: string;
}) {
  const [pressed, setPressed] = useState(false);
  const [running, setRunning] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const ripIdRef = useRef(0);
  const isLoading = loading || running;
  const isDisabled = disabled || isLoading;

  function spawnRipple(e: PointerEvent<HTMLButtonElement>) {
    if (isDisabled) return;
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // Skala ringen så den täcker hela knappen — base är 24 px, max-dim/24
    // räcker oftast men vi adderar 2 för marginalen mot rundade hörn.
    const scale = Math.ceil(Math.max(rect.width, rect.height) / 24) + 2;
    const id = ++ripIdRef.current;
    setRipples((prev) => [...prev, { id, x, y, scale }]);
    window.setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, RIPPLE_DURATION_MS + 20);
  }

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      disabled={isDisabled}
      onPointerDown={(e) => {
        setPressed(true);
        spawnRipple(e);
      }}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onClick={async (e) => {
        e.stopPropagation();
        if (isDisabled || !onClick) return;
        void haptic("tap");
        const result = onClick();
        if (result && typeof (result as Promise<void>).then === "function") {
          setRunning(true);
          try {
            await result;
          } finally {
            setRunning(false);
          }
        }
      }}
      style={(() => {
        // Caller-style spreadas FÖRST så vår transform/transition/position
        // alltid vinner — flera ställen skickar in `transition: "background
        // 160ms"` på pressed-state-knappar, vilket tidigare skrev över vår
        // transform-transition och dödade både scale-feedback och ringen.
        // Vi mergar in caller-transitionen i slutsträngen så bg fortfarande
        // animeras parallellt.
        const { transition: callerTransition, ...restStyle } = style ?? {};
        const pressTransition = pressed
          ? "transform 90ms ease-out, opacity 90ms"
          : "transform 240ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 120ms";
        const finalTransition = callerTransition
          ? `${pressTransition}, ${callerTransition}`
          : pressTransition;
        return {
          ...restStyle,
          position: "relative",
          cursor: isDisabled ? "default" : "pointer",
          transform: pressed ? "scale(0.94)" : "scale(1)",
          opacity: isDisabled && !isLoading ? 0.45 : 1,
          transition: finalTransition,
        };
      })()}
    >
      {/* Tap-ring-container — clip:ar ringen vid knappens border-radius.
          Renderas FÖRE children i DOM så children paint:as ovanpå. */}
      {ripples.length > 0 && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            borderRadius: "inherit",
            pointerEvents: "none",
            // Färgen sätts på containern och ärvs av varje ripple via CSS-var.
            ...(ringColor ? ({ "--warm-ring-color": ringColor } as CSSProperties) : {}),
          }}
        >
          {ripples.map((r) => (
            <span
              key={r.id}
              className="warm-tap-ring"
              style={
                {
                  left: r.x,
                  top: r.y,
                  "--warm-ring-scale": r.scale,
                } as CSSProperties
              }
            />
          ))}
        </span>
      )}

      {/* Barnen dämpas när loading — spinnern syns ovanpå */}
      <span
        style={{
          opacity: isLoading ? 0.25 : 1,
          transition: "opacity 120ms",
          // display:contents gör spannen osynlig i layouten —
          // barnen hänger kvar i knappens eget flex/inline-context
          display: "contents",
        }}
      >
        {children}
      </span>

      {isLoading && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "inherit",
            pointerEvents: "none",
          }}
        >
          <svg
            width={15}
            height={15}
            viewBox="0 0 24 24"
            style={{ animation: "spin-anim 0.8s linear infinite" }}
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              fill="none"
              stroke={spinnerColor}
              strokeOpacity="0.25"
              strokeWidth="3"
            />
            <path
              d="M22 12a10 10 0 0 1-10 10"
              fill="none"
              stroke={spinnerColor}
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </span>
      )}
    </button>
  );
}

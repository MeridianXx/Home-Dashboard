"use client";

import {
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
} from "react";

type Ripple = { id: number; x: number; y: number; scale: number };

const RIPPLE_DURATION_MS = 380;

/**
 * `useTapFeedback()` — haptic-ersättning för iOS Safari (där navigator.vibrate
 * inte stöds). Ger två lager visuell feedback som spridas på vilken inline
 * `<button>`/`<div role="button">` som helst utan att röra deras styling:
 *
 *   1. Press-state via `pressed`-boolean + färdig transform/transition.
 *   2. Tap-ring (ACC-tonad cirkel) som expanderar från press-position.
 *
 * Användning:
 *
 *   const tap = useTapFeedback();
 *   <button
 *     {...tap.handlers}
 *     style={{ ...tap.style, ...callerStyle }}
 *   >
 *     {tap.ring}
 *     {children}
 *   </button>
 *
 * Caller-style spreadas EFTER `tap.style` — vi vill att vissa fält
 * (position:relative, transform, transition) inte överskrids. Om callern
 * skickar in en egen `transition` (t.ex. för bg/border-color) går den
 * förlorad — mergebehov hanteras med `mergeTransition()`-helpern nedan.
 */
export function useTapFeedback(options?: { ringColor?: string }): {
  pressed: boolean;
  handlers: {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
    onPointerUp: () => void;
    onPointerLeave: () => void;
    onPointerCancel: () => void;
  };
  style: CSSProperties;
  ring: ReactElement | null;
} {
  const [pressed, setPressed] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const ripIdRef = useRef(0);

  function spawnRipple(e: ReactPointerEvent<HTMLElement>) {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const scale = Math.ceil(Math.max(rect.width, rect.height) / 24) + 2;
    const id = ++ripIdRef.current;
    setRipples((prev) => [...prev, { id, x, y, scale }]);
    window.setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, RIPPLE_DURATION_MS + 20);
  }

  const ring =
    ripples.length > 0 ? (
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          borderRadius: "inherit",
          pointerEvents: "none",
          ...(options?.ringColor
            ? ({ "--warm-ring-color": options.ringColor } as CSSProperties)
            : {}),
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
    ) : null;

  return {
    pressed,
    handlers: {
      onPointerDown: (e) => {
        setPressed(true);
        spawnRipple(e);
      },
      onPointerUp: () => setPressed(false),
      onPointerLeave: () => setPressed(false),
      onPointerCancel: () => setPressed(false),
    },
    style: {
      position: "relative",
      transform: pressed ? "scale(0.94)" : "scale(1)",
      transition: pressed
        ? "transform 90ms ease-out, opacity 90ms"
        : "transform 240ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 120ms",
    },
    ring,
  };
}

/**
 * Helper för callers som har en egen `style.transition` (t.ex. `"background
 * 160ms"`) och vill att den ska köras parallellt med tap-feedback-transitionen
 * istället för att skriva över den. Returnerar `${tap}, ${caller}`.
 */
export function mergeTransition(
  tapTransition: string,
  callerTransition: string | undefined
): string {
  return callerTransition ? `${tapTransition}, ${callerTransition}` : tapTransition;
}

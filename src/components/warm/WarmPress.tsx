"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { ACC } from "@/lib/warm/tokens";
import { haptic } from "@/lib/warm/haptics";

/**
 * WarmPress — delad knapp-wrapper med taktil feedback.
 *
 * - Vid klick: liten scale-down + opacity-puls (~180 ms).
 * - När loading=true (eller medan onClick:s promise är pending):
 *   barnen dämpas till 25 % opacity och en spinner visas centrerat
 *   i mitten av knappen — INTE i hörnet.
 * - Disabled när loading pågår.
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
}: {
  children: ReactNode;
  onClick?: () => void | Promise<void>;
  loading?: boolean;
  disabled?: boolean;
  style?: CSSProperties;
  ariaLabel?: string;
  ariaPressed?: boolean;
  spinnerColor?: string;
}) {
  const [pressed, setPressed] = useState(false);
  const [running, setRunning] = useState(false);
  const isLoading = loading || running;
  const isDisabled = disabled || isLoading;

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      disabled={isDisabled}
      onPointerDown={() => setPressed(true)}
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
      style={{
        position: "relative",
        cursor: isDisabled ? "default" : "pointer",
        transform: pressed ? "scale(0.97)" : "scale(1)",
        opacity: isDisabled && !isLoading ? 0.45 : pressed ? 0.85 : 1,
        transition: "transform 120ms, opacity 120ms",
        ...style,
      }}
    >
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

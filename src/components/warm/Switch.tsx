"use client";

import { ACC, type WarmTheme } from "@/lib/warm/tokens";

export default function WarmSwitch({
  on,
  onChange,
  t,
  ariaLabel,
}: {
  on: boolean;
  onChange: () => void;
  t: WarmTheme;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      style={{
        position: "relative",
        width: 44,
        height: 26,
        borderRadius: 13,
        flexShrink: 0,
        background: on ? ACC : t.line,
        border: `1px solid ${on ? ACC : t.line}`,
        cursor: "pointer",
        transition: "background-color 0.18s",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: on ? 20 : 2,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: t.paperHi,
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          transition: "left 0.15s",
          pointerEvents: "none",
        }}
      />
    </button>
  );
}

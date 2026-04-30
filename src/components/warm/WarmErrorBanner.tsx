"use client";

import { body, type WarmTheme } from "@/lib/warm/tokens";
import { haptic } from "@/lib/warm/haptics";

export default function WarmErrorBanner({
  t,
  message,
  onRetry,
}: {
  t: WarmTheme;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "10px 14px",
        borderRadius: 14,
        background: t.tint,
        border: `1px solid ${t.line}`,
        color: t.ink,
        fontFamily: body,
        fontSize: 13,
      }}
    >
      <span>{message ?? "Kunde inte hämta data."}</span>
      {onRetry ? (
        <button
          type="button"
          onClick={() => { void haptic("tap"); onRetry?.(); }}
          style={{
            fontFamily: body,
            fontSize: 12,
            fontWeight: 600,
            color: t.ink,
            textDecoration: "underline",
            cursor: "pointer",
          }}
        >
          Försök igen
        </button>
      ) : null}
    </div>
  );
}

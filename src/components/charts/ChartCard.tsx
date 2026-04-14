"use client";

import { useEffect, useState, useCallback, useRef } from "react";

// ─── Theme hook ──────────────────────────────────────────────────────────────

function readVars() {
  if (typeof window === "undefined") return null;
  const s = getComputedStyle(document.documentElement);
  return {
    primary:    s.getPropertyValue("--color-primary").trim(),
    secondary:  s.getPropertyValue("--color-secondary").trim(),
    tertiary:   s.getPropertyValue("--color-tertiary").trim(),
    error:      s.getPropertyValue("--color-error").trim(),
    onSurface:  s.getPropertyValue("--color-on-surface").trim(),
    onSurfaceVariant: s.getPropertyValue("--color-on-surface-variant").trim(),
    outline:    s.getPropertyValue("--color-outline").trim(),
    surfaceContainerLowest: s.getPropertyValue("--color-surface-container-lowest").trim(),
    surfaceContainer: s.getPropertyValue("--color-surface-container").trim(),
  };
}

export type ChartTheme = NonNullable<ReturnType<typeof readVars>>;

export function useChartTheme(): ChartTheme | null {
  const [theme, setTheme] = useState<ChartTheme | null>(null);

  const refresh = useCallback(() => {
    const t = readVars();
    if (t) setTheme(t);
  }, []);

  useEffect(() => {
    refresh();
    const obs = new MutationObserver(refresh);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, [refresh]);

  return theme;
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

export function ChartTooltip({
  active,
  payload,
  labelFormatter,
  valueFormatter,
  unit,
}: {
  active?: boolean;
  payload?: Array<{ value: number; color: string; name?: string }>;
  labelFormatter?: (label: string) => string;
  valueFormatter?: (v: number) => string;
  unit?: string;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const first = payload[0] as { value: number; color: string; name?: string; payload?: Record<string, unknown> };
  const rawLabel = first.payload?.t as string | undefined;
  const timeLabel = rawLabel && labelFormatter ? labelFormatter(rawLabel) : "";

  return (
    <div style={{
      backgroundColor: "var(--color-surface-container-lowest)",
      border: "1px solid var(--color-outline)",
      borderRadius: 8,
      padding: "6px 10px",
      fontSize: 12,
    }}>
      {timeLabel && (
        <div style={{ color: "var(--color-on-surface-variant)", marginBottom: 2, fontWeight: 600 }}>
          {timeLabel}
        </div>
      )}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 700 }}>
          {p.name ? `${p.name}: ` : ""}
          {valueFormatter ? valueFormatter(p.value) : p.value.toFixed(1)}
          {unit ? ` ${unit}` : ""}
        </div>
      ))}
    </div>
  );
}

// ─── Formatters ──────────────────────────────────────────────────────────────

export function formatHour(iso: string) {
  return new Date(iso).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
}

export function formatHourShort(iso: string) {
  const h = new Date(iso).getHours();
  return h.toString().padStart(2, "0");
}

// ─── Deferred mount — wait for AnimatePresence to finish expanding ───────────

export function useDeferredMount() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)));
    return () => cancelAnimationFrame(id);
  }, []);
  return ready;
}

// ─── Chart size — measure container to avoid ResponsiveContainer -1 bug ─────

/** Stop horizontal swipe on charts from triggering page navigation */
const stopSwipe = { onTouchStart: (e: React.TouchEvent) => e.stopPropagation() };

export function useChartSize(height = 200) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      if (w > 0) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, width, height, stopSwipe };
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

export function ChartSkeleton() {
  return (
    <div style={{ height: 200, width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ color: "var(--color-on-surface-variant)", fontSize: 12 }}>Laddar graf...</span>
    </div>
  );
}

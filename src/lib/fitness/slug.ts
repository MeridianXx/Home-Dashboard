// ─── Pass-slug för /fitness/pass/[slug] ──────────────────────────────────────
// Format: YYYY-MM-DD-HHMM-Type   (Type kan innehålla bindestreck i stället för mellanslag)

import type { Workout } from "./types";

export function workoutSlug(w: Pick<Workout, "date" | "time" | "type">): string {
  const time = (w.time ?? "00:00").replace(":", "");
  const type = w.type.replace(/\s+/g, "-");
  return `${w.date}-${time}-${type}`;
}

export function parseSlug(slug: string): { date: string; time: string; type: string } | null {
  const decoded = decodeURIComponent(slug);
  const m = decoded.match(/^(\d{4}-\d{2}-\d{2})-(\d{2})(\d{2})-(.+)$/);
  if (!m) return null;
  return { date: m[1], time: `${m[2]}:${m[3]}`, type: m[4].replace(/-/g, " ") };
}

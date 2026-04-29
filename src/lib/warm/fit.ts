// Warm Home — Fitness-helpers (kategorisering, färger, formattering, RPE).
// Server- och klientvänlig — inga client-bara importer.

import { ACC, AMBER, LINGON, SAGE, SKY } from "@/lib/warm/tokens";

export type SportCategory =
  | "run" | "walk" | "bike" | "strength" | "core"
  | "swim" | "ski" | "padel" | "yoga" | "other";

export function sportCategory(type: string): SportCategory {
  const t = (type ?? "").toLowerCase();
  if (
    t.includes("löp") || t.includes("run") || t.includes("jogg") ||
    t.includes("intervall") || t.includes("tempo") || t.includes("tröskel") ||
    t.includes("långpass") || t.includes("återhämtning") || t.includes("distans")
  ) return "run";
  if (t.includes("walk") || t.includes("promenad") || t.includes("vandring")) return "walk";
  if (t.includes("cykl") || t.includes("bike") || t.includes("cycl")) return "bike";
  if (t.includes("core") || t.includes("bål")) return "core";
  if (t.includes("strength") || t.includes("styr")) return "strength";
  if (t.includes("swim") || t.includes("sim")) return "swim";
  if (t.includes("ski") || t.includes("skid")) return "ski";
  if (t.includes("padel")) return "padel";
  if (t.includes("yoga")) return "yoga";
  return "other";
}

/** Mjuk Warm-färg per sport — landar inom paletten ACC/SAGE/SKY/AMBER/LINGON. */
export function sportColor(type: string): string {
  switch (sportCategory(type)) {
    case "run": return ACC;          // terracotta
    case "walk": return SAGE;
    case "bike": return SKY;
    case "strength": return SAGE;
    case "core": return AMBER;
    case "swim": return SKY;
    case "ski": return SKY;
    case "padel": return LINGON;
    case "yoga": return "#B68AB0";   // dämpad lila — passar paletten
    default: return ACC;
  }
}

/** Kort svensk etikett för HealthFit-typsträngar. */
export function sportLabel(type: string): string {
  const t = (type ?? "").toLowerCase();
  if (t.includes("outdoor running")) return "Löpning";
  if (t.includes("indoor running") || t.includes("treadmill")) return "Löpning (inne)";
  if (t.includes("walk")) return "Promenad";
  if (t.includes("cycl") || t.includes("bike")) return "Cykling";
  if (t.includes("functional strength") || t.includes("traditional strength")) return "Styrketräning";
  if (t.includes("core")) return "Core";
  if (t.includes("swim")) return "Simning";
  if (t.includes("ski")) return "Skidåkning";
  if (t.includes("padel")) return "Padel";
  if (t.includes("yoga")) return "Yoga";
  return type || "Pass";
}

/** Returnerar true när HR-zon-pill är meningsfull (uthållighetspass). */
export function hasCardioZone(type: string): boolean {
  const c = sportCategory(type);
  return c === "run" || c === "walk" || c === "bike" || c === "swim" || c === "ski";
}

/** Pulszon-färger — Warm-paletten i kall→varm-progression. */
export function zoneColor(z: "Z1" | "Z2" | "Z3" | "Z4" | "Z5"): string {
  return {
    Z1: SKY,
    Z2: SAGE,
    Z3: AMBER,
    Z4: ACC,
    Z5: LINGON,
  }[z];
}

export function zoneLabel(z: "Z1" | "Z2" | "Z3" | "Z4" | "Z5"): string {
  return {
    Z1: "Mycket lätt",
    Z2: "Lätt",
    Z3: "Måttlig",
    Z4: "Hårt",
    Z5: "Mycket hårt",
  }[z];
}

/** RPE 1–10 → färg-bucket (Warm). */
export function rpeColor(rpe: number): string {
  const r = Math.round(rpe);
  if (r <= 3) return SAGE;
  if (r <= 6) return SKY;
  if (r <= 8) return "#B68AB0";  // lila
  return LINGON;
}

export function rpeLabel(rpe: number): string {
  const labels: Record<number, string> = {
    1: "Lätt", 2: "Ganska lätt", 3: "Måttlig", 4: "Lite jobbig",
    5: "Jobbig", 6: "Ganska svår", 7: "Svår", 8: "Mycket svår",
    9: "Extremt svår", 10: "Maximal",
  };
  return labels[Math.round(rpe)] ?? "–";
}

/** Sek → "1:23" / "1:23:45" */
export function formatSec(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return "–";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** ISO-datum → "tor 17 apr." */
export function shortDateSv(iso: string): string {
  if (!iso) return "–";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("sv-SE", { weekday: "short", day: "numeric", month: "short" });
}

/** ISO-datum → "April 2026" (för månadsgrupper) */
export function monthLabelSv(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const s = d.toLocaleDateString("sv-SE", { year: "numeric", month: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

/** Antal dagar mellan idag och iso-datum (positivt = framtid). */
export function daysUntil(iso: string): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

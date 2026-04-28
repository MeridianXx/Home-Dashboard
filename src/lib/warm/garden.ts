// Warm Home · Trädgård — delade helpers för formattering, kategorisering
// och färg per typ/status. Importeras från Hub, växt-detalj, säsongs-CRUD,
// projekt-kanban och AI-chat.

import { ACC, AMBER, LINGON, SAGE, SKY } from "@/lib/warm/tokens";

// ── Datumhjälpare (Notion-format YYYY-MM-DD) ────────────────────────────────

export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isoToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return isoDate(d);
}

export function parseISO(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : null;
}

export function shortDateSv(iso: string): string {
  if (!iso) return "";
  const d = parseISO(iso);
  if (!d) return iso;
  return d.toLocaleDateString("sv-SE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function monthLabelSv(year: number, monthIdx: number): string {
  return new Date(year, monthIdx, 1).toLocaleDateString("sv-SE", {
    month: "long",
    year: "numeric",
  });
}

/** Bygg månadsgrid mån–sön. 6 rader × 7 kolumner med ev. dagar från
 *  grannmånader utfyllda så veckostarten alltid är måndag. */
export function monthGrid(
  year: number,
  monthIdx: number,
): { iso: string; inMonth: boolean }[][] {
  const first = new Date(year, monthIdx, 1);
  const offset = (first.getDay() + 6) % 7; // 0 = mån
  const start = new Date(first);
  start.setDate(start.getDate() - offset);

  const rows: { iso: string; inMonth: boolean }[][] = [];
  const cur = new Date(start);
  for (let r = 0; r < 6; r++) {
    const row: { iso: string; inMonth: boolean }[] = [];
    for (let c = 0; c < 7; c++) {
      row.push({ iso: isoDate(cur), inMonth: cur.getMonth() === monthIdx });
      cur.setDate(cur.getDate() + 1);
    }
    rows.push(row);
  }
  return rows;
}

// ── Säsongs-klocka (12 månader → vad är aktivt nu) ──────────────────────────

const MONTHS_SV = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

export function monthShort(idx: number): string {
  return MONTHS_SV[idx] ?? "";
}

/** Säsongs-fas: vinter (nov-feb), tidig vår (mar), vår (apr-maj), försommar
 *  (juni), sommar (juli-aug), tidig höst (sep), höst (okt). */
export function seasonPhase(monthIdx: number): {
  label: string;
  italicTail: string;
  color: string;
} {
  if (monthIdx <= 1 || monthIdx === 11) {
    return { label: "Vintervila", italicTail: "vänta in värmen.", color: SKY };
  }
  if (monthIdx === 2) return { label: "Tidig vår,", italicTail: "starta såbäddarna.", color: AMBER };
  if (monthIdx === 3 || monthIdx === 4) return { label: "Vår,", italicTail: "plantera och fördela.", color: SAGE };
  if (monthIdx === 5) return { label: "Försommar,", italicTail: "rabatterna växer.", color: SAGE };
  if (monthIdx === 6 || monthIdx === 7) return { label: "Sommar,", italicTail: "håll fukt och form.", color: ACC };
  if (monthIdx === 8) return { label: "Tidig höst,", italicTail: "skörda och beskär.", color: AMBER };
  return { label: "Höst,", italicTail: "förbered vintern.", color: LINGON };
}

// ── Färgpaletter ────────────────────────────────────────────────────────────

const PLANT_TYPE_COLOR: Record<string, string> = {
  Häck: SAGE,
  Buske: SAGE,
  Prydnadsgräs: AMBER,
  Gräs: AMBER,
  Prydnadsträd: SAGE,
  Fruktträd: ACC,
  Perenn: ACC,
  Blomma: ACC,
  Marktäckare: SAGE,
  Grönsak: SAGE,
};

export function plantTypeColor(typ: string): string {
  return PLANT_TYPE_COLOR[typ] ?? ACC;
}

export const TASK_STATUS_COLOR: Record<string, string> = {
  Planerad: SKY,
  Pågår: AMBER,
  Klar: SAGE,
};

export const PROJECT_STATUS_COLOR: Record<string, string> = {
  Ny: "#8E8576",
  Utreds: SKY,
  Planerad: ACC,
  Pågående: AMBER,
  Väntar: "#8E8576",
  Klart: SAGE,
  Skrotad: LINGON,
};

export const PROJECT_PRIORITY_COLOR: Record<string, string> = {
  Hög: LINGON,
  Normal: ACC,
  Låg: "#8E8576",
};

// ── Plant-grupperare för "Säsong nu"-sektionen på hubben ────────────────────

/** Returnerar växter som hör till nuvarande säsongs aktiva listor (gödsling
 *  eller beskärning denna säsong). Används för Hub-listan "Aktiva växter". */
export function plantsActiveThisSeason<
  T extends {
    beskarning: string[] | readonly string[];
    godsling: string[] | readonly string[];
  },
>(plants: T[], monthIdx: number): T[] {
  const isSpring = monthIdx >= 2 && monthIdx <= 4; // mar–maj
  const isSummer = monthIdx >= 5 && monthIdx <= 7; // jun–aug
  const isAutumn = monthIdx >= 8 && monthIdx <= 10; // sep–nov
  const matchesSeason = (val: string): boolean => {
    const v = val.toLowerCase();
    if (v === "löpande") return true;
    if (v === "ingen") return false;
    if (isSpring && (v === "vår" || v === "vårvinter" || v === "försommar")) return true;
    if (isSummer && (v === "sommar" || v === "försommar" || v === "jas" || v === "efter blomning")) return true;
    if (isAutumn && (v === "höst" || v === "jas" || v === "efter blomning")) return true;
    return false;
  };
  return plants.filter((p) => {
    const all = [...(p.beskarning ?? []), ...(p.godsling ?? [])];
    return all.some((s) => matchesSeason(s));
  });
}

export function formatSek(value: number | null | undefined): string {
  if (value == null) return "–";
  return value.toLocaleString("sv-SE", { maximumFractionDigits: 0 });
}

/** Relativ tid bakåt — "just nu" / "5 min sedan" / "3 h sedan" / fallback datum. */
export function formatRelativeSv(iso: string): string {
  try {
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const mins = Math.round(diffMs / 60000);
    if (mins < 1) return "just nu";
    if (mins < 60) return `${mins} min sedan`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours} h sedan`;
    return d.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

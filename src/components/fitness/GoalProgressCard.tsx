"use client";

// ─── Fitness · Goal progress ─────────────────────────────────────────────────
// Visar mål från profilen med tidsprogress (hur mycket tid som gått sedan målet
// formulerades mot deadline) och dagar kvar. Inga interaktiva redigeringar —
// mål hanteras i ProfileEditor.

import { useFitnessProfile } from "@/lib/fitness/profile";

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        backgroundColor: "var(--color-surface-container-lowest)",
        boxShadow: "0px 8px 24px rgba(56,56,51,0.06)",
        border: "1px solid var(--color-card-border)",
      }}
    >
      {children}
    </div>
  );
}

function daysBetween(from: Date, to: Date): number {
  const f = new Date(from); f.setHours(0, 0, 0, 0);
  const t = new Date(to); t.setHours(0, 0, 0, 0);
  return Math.round((t.getTime() - f.getTime()) / 86400000);
}

function formatDateSv(iso: string): string {
  return new Date(iso).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" });
}

export function GoalProgressCard() {
  const goals = useFitnessProfile((s) => s.profile.goals);

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-on-surface-variant)" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>flag</span>
          Mål
        </h2>
      </div>
      {goals.length === 0 ? (
        <div className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
          Inga mål definierade. Lägg till under Min profil → Ändra.
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((g, i) => {
            const today = new Date();
            let pct: number | null = null;
            let daysLeft: number | null = null;
            let deadlineLabel = "Inget datum";
            let color = "var(--color-primary)";

            if (g.deadline) {
              const deadline = new Date(g.deadline);
              daysLeft = daysBetween(today, deadline);
              deadlineLabel = formatDateSv(g.deadline);
              // Anta att målet sattes 90 dagar före deadline när vi inte vet exakt
              // startpunkt — progress = hur mycket tid som gått av en antagen
              // 12-veckors förberedelse.
              const assumedStart = new Date(deadline);
              assumedStart.setDate(assumedStart.getDate() - 84);
              const total = daysBetween(assumedStart, deadline);
              const gone = Math.max(0, daysBetween(assumedStart, today));
              pct = total > 0 ? Math.min(100, Math.round((gone / total) * 100)) : null;

              if (daysLeft < 0) color = "#9aa0a6";
              else if (daysLeft < 14) color = "#e5484d";
              else if (daysLeft < 42) color = "#fab849";
              else color = "#7fb8a3";
            }

            return (
              <div key={i}>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color }}>
                      flag
                    </span>
                    <span className="text-sm font-semibold truncate" style={{ color: "var(--color-on-surface)" }}>
                      {g.label}
                    </span>
                  </div>
                  {daysLeft != null && (
                    <span
                      className="text-xs font-semibold tabular-nums whitespace-nowrap"
                      style={{ color }}
                    >
                      {daysLeft < 0
                        ? `${Math.abs(daysLeft)} d sedan`
                        : daysLeft === 0
                          ? "idag"
                          : `${daysLeft} d kvar`}
                    </span>
                  )}
                </div>
                <div className="text-[11px] tabular-nums mb-2" style={{ color: "var(--color-on-surface-variant)" }}>
                  {deadlineLabel}
                </div>
                {pct != null && (
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-surface-container)" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.max(2, pct)}%`,
                        backgroundColor: color,
                        borderRadius: 999,
                        transition: "width 300ms ease-out",
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

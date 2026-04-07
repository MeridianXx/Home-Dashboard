// Garden context — placeholder for Fas 6 Notion integration.

export default function GardenPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight font-headline" style={{ color: "var(--color-on-surface)" }}>
          Garden
        </h1>
        <p className="text-sm font-medium mt-1" style={{ color: "var(--color-on-surface-variant)" }}>
          Planner · Notion database · Seasonal tasks
        </p>
      </div>

      <div
        className="rounded-2xl p-12 flex flex-col items-center justify-center gap-4 text-center"
        style={{ backgroundColor: "var(--color-surface-container-lowest)", boxShadow: "0px 8px 24px rgba(56,56,51,0.06)" }}
      >
        <span className="material-symbols-outlined text-5xl" style={{ color: "var(--color-outline)" }}>
          yard
        </span>
        <p className="text-lg font-bold" style={{ color: "var(--color-on-surface-variant)" }}>
          Coming in Fas 6
        </p>
        <p className="text-sm max-w-sm" style={{ color: "var(--color-outline)" }}>
          Garden planner with Notion database sync for tasks, planting schedules, and seasonal tracking.
        </p>
      </div>
    </div>
  );
}

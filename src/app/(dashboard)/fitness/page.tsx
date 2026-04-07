// Fitness context — placeholder for Fas 6 training coach merge.
// Will integrate: Anthropic AI coach, Notion training logs, FIT/GPX parsing.

export default function FitnessPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight font-headline" style={{ color: "var(--color-on-surface)" }}>
          Fitness
        </h1>
        <p className="text-sm font-medium mt-1" style={{ color: "var(--color-on-surface-variant)" }}>
          Training coach · Notion logs · FIT/GPX analysis
        </p>
      </div>

      {/* Placeholder */}
      <div
        className="rounded-2xl p-12 flex flex-col items-center justify-center gap-4 text-center"
        style={{ backgroundColor: "var(--color-surface-container-lowest)", boxShadow: "0px 8px 24px rgba(56,56,51,0.06)" }}
      >
        <span className="material-symbols-outlined text-5xl" style={{ color: "var(--color-outline)" }}>
          fitness_center
        </span>
        <p className="text-lg font-bold" style={{ color: "var(--color-on-surface-variant)" }}>
          Coming in Fas 6
        </p>
        <p className="text-sm max-w-sm" style={{ color: "var(--color-outline)" }}>
          The training coach app from <code>/traningscoach-app</code> will be integrated here — AI coaching, Notion log sync, and activity analysis.
        </p>
      </div>
    </div>
  );
}

"use client";

// ─── AI-analys-kort för pass-detaljsidan ─────────────────────────────────────
// Hämtar ev. sparad analys från Notion-loggen (GET). "Generera"-knapp kör en
// POST mot /api/fitness/analyse som anropar Claude och skriver tillbaka i Notion.

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

interface AnalyseGetResponse {
  analysis: string | null;
  updatedAt: string | null;
  logDbReady: boolean;
}

interface AnalysePostResponse {
  analysis: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  sourceFile: string | null;
  savedPageId: string | null;
  updatedAt: string;
}

function formatTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  const d0 = new Date(d); d0.setHours(0, 0, 0, 0);
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d0.getTime()) / 86400000);
  const hm = d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
  if (diff === 0) return `${hm} idag`;
  if (diff === 1) return `${hm} igår`;
  return `${d.toLocaleDateString("sv-SE", { day: "numeric", month: "short" })} kl. ${hm}`;
}

export function AIAnalysisCard({
  date, time, type,
}: {
  date: string;
  time: string;
  type: string;
}) {
  const key = `/api/fitness/analyse?date=${date}&time=${encodeURIComponent(time)}&type=${encodeURIComponent(type)}`;
  const { data, error, mutate } = useSWR<AnalyseGetResponse>(key, fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  const [generating, setGenerating] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [justGenerated, setJustGenerated] = useState<AnalysePostResponse | null>(null);

  const analysis = justGenerated?.analysis ?? data?.analysis ?? null;
  const updatedAt = justGenerated?.updatedAt ?? data?.updatedAt ?? null;

  const generate = async () => {
    if (generating) return;
    setGenerating(true);
    setLocalError(null);
    try {
      const res = await fetch(key, { method: "POST", cache: "no-store" });
      const body: AnalysePostResponse & { error?: string } = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setJustGenerated(body);
      await mutate(
        { analysis: body.analysis, updatedAt: body.updatedAt, logDbReady: true },
        { revalidate: false },
      );
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        backgroundColor: "var(--color-surface-container-lowest)",
        boxShadow: "0px 8px 24px rgba(56,56,51,0.06)",
        border: "1px solid var(--color-card-border)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h2
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>auto_awesome</span>
          AI-analys
        </h2>
        {analysis && !generating && (
          <button
            onClick={generate}
            className="text-xs font-semibold rounded-full"
            style={{
              backgroundColor: "transparent",
              color: "var(--color-on-surface-variant)",
              border: "1px solid var(--color-outline-variant)",
              padding: "4px 10px",
              cursor: "pointer",
              lineHeight: 1.2,
            }}
          >
            Regenerera
          </button>
        )}
      </div>

      {error ? (
        <div className="text-sm" style={{ color: "var(--color-error, #b3261e)" }}>
          Kunde inte läsa analys från Notion.
        </div>
      ) : !data && !justGenerated ? (
        <div className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>Läser…</div>
      ) : analysis ? (
        <>
          <p
            className="text-sm"
            style={{
              color: "var(--color-on-surface)",
              lineHeight: 1.55,
              whiteSpace: "pre-wrap",
            }}
          >
            {analysis}
          </p>
          {updatedAt && (
            <div
              className="text-[11px] mt-3 flex items-center gap-1.5"
              style={{ color: "var(--color-on-surface-variant)" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 12 }}>cloud_done</span>
              Genererad {formatTime(updatedAt) ?? "tidigare"}
              {justGenerated && ` · ${justGenerated.inputTokens + justGenerated.outputTokens} tokens`}
            </div>
          )}
        </>
      ) : (
        <div>
          <p className="text-sm mb-3" style={{ color: "var(--color-on-surface-variant)" }}>
            Kör Claude över passet plus din träningsbild (profil, PMC, senaste 20 pass). Analysen sparas i Notion.
          </p>
          <button
            onClick={generate}
            disabled={generating}
            className="flex items-center gap-1.5 text-xs font-semibold rounded-full"
            style={{
              backgroundColor: "var(--color-primary-container)",
              color: "var(--color-on-primary-container)",
              border: "1px solid var(--color-outline-variant)",
              padding: "8px 16px",
              cursor: generating ? "wait" : "pointer",
              opacity: generating ? 0.7 : 1,
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: 14,
                animation: generating ? "spin-anim 0.8s linear infinite" : undefined,
              }}
            >
              {generating ? "progress_activity" : "auto_awesome"}
            </span>
            {generating ? "Analyserar…" : "Generera analys"}
          </button>
          {data && !data.logDbReady && (
            <div
              className="text-[11px] mt-2"
              style={{ color: "var(--color-on-surface-variant)" }}
            >
              Notion-träningslogg ej konfigurerad — analysen genereras men sparas inte.
            </div>
          )}
        </div>
      )}

      {localError && (
        <div
          className="text-[11px] mt-3 flex items-center gap-1.5"
          style={{ color: "var(--color-error, #b3261e)" }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 12 }}>error</span>
          {localError}
        </div>
      )}
    </div>
  );
}

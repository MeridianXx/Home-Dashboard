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
  const [comment, setComment] = useState("");
  const [showCommentForRegen, setShowCommentForRegen] = useState(false);

  const analysis = justGenerated?.analysis ?? data?.analysis ?? null;
  const updatedAt = justGenerated?.updatedAt ?? data?.updatedAt ?? null;

  const generate = async () => {
    if (generating) return;
    setGenerating(true);
    setLocalError(null);
    try {
      const res = await fetch(key, {
        method: "POST",
        cache: "no-store",
        headers: comment.trim() ? { "Content-Type": "application/json" } : undefined,
        body: comment.trim() ? JSON.stringify({ context: comment.trim() }) : undefined,
      });
      const body: AnalysePostResponse & { error?: string } = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setJustGenerated(body);
      setComment("");
      setShowCommentForRegen(false);
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

  const commentField = (
    <textarea
      value={comment}
      onChange={(e) => setComment(e.target.value)}
      disabled={generating}
      placeholder="Kommentar (valfritt): upplevt, förutsättningar, känsla inför/under passet. Hjälper coachen tolka siffrorna."
      rows={3}
      className="w-full text-sm rounded-xl resize-none"
      style={{
        backgroundColor: "var(--color-surface-container)",
        color: "var(--color-on-surface)",
        border: "1px solid var(--color-outline-variant)",
        padding: "10px 12px",
        lineHeight: 1.45,
        outline: "none",
        fontFamily: "inherit",
        width: "100%",
      }}
    />
  );

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
        {analysis && (
          <div className="flex items-center gap-2">
            {!generating && (
              <button
                onClick={() => setShowCommentForRegen((s) => !s)}
                className="flex items-center gap-1 text-xs font-semibold rounded-full"
                style={{
                  backgroundColor: showCommentForRegen ? "var(--color-surface-container)" : "transparent",
                  color: "var(--color-on-surface-variant)",
                  border: "1px solid var(--color-outline-variant)",
                  padding: "4px 10px",
                  cursor: "pointer",
                  lineHeight: 1.2,
                }}
                aria-label="Lägg till kommentar inför regenerering"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 12 }}>comment</span>
                {showCommentForRegen ? "Dölj" : "Kommentar"}
              </button>
            )}
            <button
              onClick={generate}
              disabled={generating}
              className="flex items-center gap-1 text-xs font-semibold rounded-full"
              style={{
                backgroundColor: "transparent",
                color: "var(--color-on-surface-variant)",
                border: "1px solid var(--color-outline-variant)",
                padding: "4px 10px",
                cursor: generating ? "wait" : "pointer",
                lineHeight: 1.2,
                opacity: generating ? 0.7 : 1,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: 12,
                  animation: generating ? "spin-anim 0.8s linear infinite" : undefined,
                }}
              >
                {generating ? "progress_activity" : "refresh"}
              </span>
              {generating ? "Analyserar…" : "Regenerera"}
            </button>
          </div>
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
              opacity: generating ? 0.5 : 1,
              transition: "opacity 0.2s ease-out",
            }}
          >
            {analysis}
          </p>
          {showCommentForRegen && !generating && (
            <div className="mt-3">{commentField}</div>
          )}
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
          <div className="mb-3">{commentField}</div>
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

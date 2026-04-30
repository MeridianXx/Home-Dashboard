"use client";

// ─── Warm Home · Fitness · AI-analys-kort ────────────────────────────────────
// Hämtar ev. sparad analys (GET) eller genererar ny via Claude (POST).
// Kommentarsfält ephemeral — sparas inte i Notion.

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useWarmTheme } from "@/lib/warm/theme";
import { ACC, body, ital, lab, num } from "@/lib/warm/tokens";
import { SparkleIcon, RefreshIcon, ErrorIcon } from "@/components/warm/icons/fit";
import { haptic } from "@/lib/warm/haptics";

interface AnalyseGet {
  analysis: string | null;
  updatedAt: string | null;
  logDbReady: boolean;
}

interface AnalysePost {
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
  const d0 = new Date(d);
  d0.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d0.getTime()) / 86400000);
  const hm = d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
  if (diff === 0) return `${hm} idag`;
  if (diff === 1) return `${hm} igår`;
  return `${d.toLocaleDateString("sv-SE", { day: "numeric", month: "short" })} kl. ${hm}`;
}

export function WarmAIAnalysisCard({
  date,
  time,
  type,
}: {
  date: string;
  time: string;
  type: string;
}) {
  const { t } = useWarmTheme();
  const key = `/api/fitness/analyse?date=${date}&time=${encodeURIComponent(time)}&type=${encodeURIComponent(type)}`;
  const { data, error, mutate } = useSWR<AnalyseGet>(key, fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });
  const [generating, setGenerating] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [justGenerated, setJustGenerated] = useState<AnalysePost | null>(null);
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
      const apiBody = (await res.json()) as AnalysePost & { error?: string };
      if (!res.ok) throw new Error(apiBody.error ?? `HTTP ${res.status}`);
      setJustGenerated(apiBody);
      setComment("");
      setShowCommentForRegen(false);
      await mutate({ analysis: apiBody.analysis, updatedAt: apiBody.updatedAt, logDbReady: true }, { revalidate: false });
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
      placeholder="Kommentar (valfritt): känsla, förutsättningar, händelser kring passet."
      rows={3}
      style={{
        width: "100%",
        background: t.paperHi,
        color: t.ink,
        border: `1px solid ${t.line}`,
        padding: "10px 12px",
        borderRadius: 10,
        fontFamily: body,
        fontSize: 13,
        lineHeight: 1.45,
        outline: "none",
        resize: "vertical",
        boxSizing: "border-box",
      }}
    />
  );

  return (
    <div
      style={{
        background: t.tint,
        border: `1px solid ${t.line}`,
        borderRadius: 14,
        padding: "14px 16px",
        color: t.ink,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <SparkleIcon size={14} color={ACC} fill={ACC} />
          <span style={{ ...lab(t, { color: ACC }) }}>Coach · AI-analys</span>
        </div>
        {analysis ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {!generating && (
              <button
                type="button"
                onClick={() => { void haptic("tap"); setShowCommentForRegen((s) => !s); }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: showCommentForRegen ? t.paperHi : "transparent",
                  color: t.mute,
                  border: `1px solid ${t.line}`,
                  cursor: "pointer",
                  fontFamily: body,
                  fontSize: 11,
                  fontWeight: 500,
                }}
              >
                {showCommentForRegen ? "Dölj" : "Kommentar"}
              </button>
            )}
            <button
              type="button"
              onClick={() => { void haptic("tap"); generate(); }}
              disabled={generating}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 10px",
                borderRadius: 999,
                background: "transparent",
                color: t.mute,
                border: `1px solid ${t.line}`,
                cursor: generating ? "wait" : "pointer",
                fontFamily: body,
                fontSize: 11,
                fontWeight: 500,
                opacity: generating ? 0.7 : 1,
              }}
            >
              <RefreshIcon
                size={11}
                color={t.mute}
                style={{ animation: generating ? "spin-anim 0.8s linear infinite" : undefined }}
              />
              {generating ? "Analyserar…" : "Regenerera"}
            </button>
          </div>
        ) : null}
      </div>

      {error ? (
        <div style={{ fontFamily: body, fontSize: 12, color: "#A83E4A" }}>Kunde inte läsa analys från Notion.</div>
      ) : !data && !justGenerated ? (
        <div style={{ fontFamily: body, fontSize: 13, color: t.mute }}>Läser…</div>
      ) : analysis ? (
        <>
          <p
            style={{
              fontFamily: body,
              fontSize: 14,
              lineHeight: 1.55,
              color: t.ink,
              whiteSpace: "pre-wrap",
              opacity: generating ? 0.5 : 1,
              transition: "opacity 0.2s ease-out",
            }}
          >
            {analysis}
          </p>
          {showCommentForRegen && !generating ? <div style={{ marginTop: 12 }}>{commentField}</div> : null}
          {updatedAt ? (
            <div
              style={{
                ...ital(t, 11),
                marginTop: 12,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <SparkleIcon size={11} color={t.dim} />
              Genererad {formatTime(updatedAt) ?? "tidigare"}
              {justGenerated ? (
                <span style={{ marginLeft: 6 }} className="warm-tab-nums">
                  · {justGenerated.inputTokens + justGenerated.outputTokens} tokens
                </span>
              ) : null}
            </div>
          ) : null}
        </>
      ) : (
        <div>
          <p style={{ fontFamily: body, fontStyle: "italic", fontSize: 13, color: t.ink, lineHeight: 1.5, marginBottom: 12 }}>
            Coachen läser passet mot din profil, PMC och historik och tolkar siffrorna. Analysen sparas i Notion.
          </p>
          <div style={{ marginBottom: 12 }}>{commentField}</div>
          <button
            type="button"
            onClick={() => { void haptic("tap"); generate(); }}
            disabled={generating}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              borderRadius: 999,
              background: ACC,
              color: "#FFFBF0",
              border: "none",
              cursor: generating ? "wait" : "pointer",
              fontFamily: body,
              fontSize: 12,
              fontWeight: 600,
              opacity: generating ? 0.75 : 1,
            }}
          >
            <SparkleIcon size={14} color="#FFFBF0" fill="#FFFBF0" style={{ animation: generating ? "spin-anim 0.8s linear infinite" : undefined }} />
            {generating ? "Analyserar…" : "Generera analys"}
          </button>
          {data && !data.logDbReady ? (
            <div style={{ ...ital(t, 11), marginTop: 8 }}>
              Notion-träningslogg ej konfigurerad — analysen genereras men sparas inte.
            </div>
          ) : null}
        </div>
      )}

      {localError ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 12,
            fontFamily: body,
            fontSize: 11,
            color: "#A83E4A",
          }}
        >
          <ErrorIcon size={12} color="#A83E4A" />
          {localError}
        </div>
      ) : null}
    </div>
  );
}

void num;

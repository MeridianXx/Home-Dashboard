"use client";

// ─── Warm Home · Trädgård · AI-rådgivare ─────────────────────────────────────
// Fullskärm-chat mot /api/garden/chat (SSE). Tool-use renderas som inline-chip
// i assistant-bubblan. Bilduppladdning som base64 (max 5 MB) för diagnos.

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useWarmTheme } from "@/lib/warm/theme";
import { ACC, body, ital, lab, num } from "@/lib/warm/tokens";
import { Tile } from "@/components/warm/primitives";
import { DetailHero } from "@/components/warm/fit/parts";
import {
  SparkleIcon,
  SendIcon,
  ImageIcon,
  CloseIcon,
  RefreshIcon,
  CheckIcon,
  AlertIcon,
  ProgressIcon,
} from "@/components/warm/icons/garden";

// ── Typer ────────────────────────────────────────────────────────────────────

type ToolPart = {
  kind: "tool";
  name: string;
  input: unknown;
  ok?: boolean;
  result?: unknown;
  error?: string;
};

type TextPart = {
  kind: "text";
  text: string;
};

type Part = TextPart | ToolPart;

interface UIImage {
  mediaType: "image/png" | "image/jpeg" | "image/gif" | "image/webp";
  base64: string;
}

interface UIMessage {
  id: string;
  role: "user" | "assistant";
  parts: Part[];
  images?: UIImage[];
}

interface ContextSummary {
  currentDate: string;
  gardenZone: string;
  plantCount: number;
  upcomingTaskCount: number;
  activeProjectCount: number;
  weatherToday?: { tMaxC: number | null; tMinC: number | null; precipMm: number | null } | null;
  claudeReady: boolean;
}

const QUICK_PROMPTS = [
  "Vad ska jag göra denna vecka?",
  "Inför plantering — vad bör jag tänka på?",
  "Felsöka en sjuk växt",
  "Föreslå nästa månads säsongsuppgifter",
];

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ── SSE-parser ───────────────────────────────────────────────────────────────

interface StreamEvent {
  type: "text" | "tool_use_start" | "tool_use_result" | "stop" | "error" | "usage";
  delta?: string;
  name?: string;
  input?: unknown;
  ok?: boolean;
  result?: unknown;
  error?: string;
  message?: string;
  inputTokens?: number;
  outputTokens?: number;
  stopReason?: string;
}

async function* parseSseStream(body: ReadableStream<Uint8Array>): AsyncGenerator<StreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const ev of events) {
      const line = ev.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      try {
        yield JSON.parse(payload) as StreamEvent;
      } catch {
        // ignorera trasiga fragment — nästa läsning kompletterar
      }
    }
  }
}

// ── Bygg API-body ────────────────────────────────────────────────────────────

interface SdkMessage {
  role: "user" | "assistant";
  content:
    | string
    | Array<
        | { type: "text"; text: string }
        | {
            type: "image";
            source: { type: "base64"; media_type: UIImage["mediaType"]; data: string };
          }
      >;
}

function buildSdkMessages(history: UIMessage[]): SdkMessage[] {
  return history.map((m) => {
    if (m.role === "assistant") {
      const text = m.parts
        .filter((p): p is TextPart => p.kind === "text")
        .map((p) => p.text)
        .join("\n")
        .trim();
      return { role: "assistant", content: text || "(inget svar)" };
    }
    const text = m.parts
      .filter((p): p is TextPart => p.kind === "text")
      .map((p) => p.text)
      .join("\n");
    if (!m.images || m.images.length === 0) {
      return { role: "user", content: text };
    }
    return {
      role: "user",
      content: [
        ...m.images.map((img) => ({
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: img.mediaType,
            data: img.base64,
          },
        })),
        { type: "text" as const, text: text || "(se bild)" },
      ],
    };
  });
}

// ── Komponenter ──────────────────────────────────────────────────────────────

function ToolChip({ tool }: { tool: ToolPart }) {
  const { t } = useWarmTheme();
  const label =
    tool.name === "create_task"
      ? "Skapar uppgift"
      : tool.name === "update_task"
      ? "Uppdaterar uppgift"
      : tool.name === "create_project"
      ? "Skapar projekt"
      : tool.name === "list_plants"
      ? "Listar växter"
      : tool.name === "get_plant"
      ? "Hämtar växt"
      : tool.name === "search_tasks"
      ? "Söker uppgifter"
      : tool.name === "get_weather_forecast"
      ? "Hämtar väder"
      : tool.name;

  const status = tool.ok === true ? "ok" : tool.ok === false ? "err" : "pending";
  const accent = status === "err" ? t.bad : status === "ok" ? t.ok : t.mute;

  let resultBlurb = "";
  if (tool.ok && tool.result) {
    if (Array.isArray(tool.result)) {
      resultBlurb = ` → ${tool.result.length} resultat`;
    } else if (typeof tool.result === "object" && tool.result !== null) {
      const r = tool.result as Record<string, unknown>;
      if ("uppgift" in r && typeof r.uppgift === "string") resultBlurb = ` → "${r.uppgift}"`;
      else if ("namn" in r && typeof r.namn === "string") resultBlurb = ` → "${r.namn}"`;
      else if ("vaxt" in r && typeof r.vaxt === "string") resultBlurb = ` → "${r.vaxt}"`;
    }
  }
  if (tool.error) resultBlurb = ` → ${tool.error}`;

  const Icon = status === "err" ? AlertIcon : status === "ok" ? CheckIcon : ProgressIcon;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: t.paperHi,
        border: `1px solid ${t.line}`,
        borderRadius: 14,
        padding: "4px 10px",
        fontFamily: body,
        fontSize: 11,
        color: t.mute,
        marginTop: 6,
        marginBottom: 6,
      }}
    >
      <span
        style={{
          display: "inline-flex",
          animation: status === "pending" ? "spin-anim 0.8s linear infinite" : undefined,
        }}
      >
        <Icon size={13} color={accent} />
      </span>
      <span style={{ fontWeight: 600, color: t.ink }}>{label}</span>
      <span style={{ opacity: 0.85 }}>{resultBlurb}</span>
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const { t } = useWarmTheme();
  const isUser = message.role === "user";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: 12,
      }}
    >
      <div
        style={{
          maxWidth: "85%",
          background: isUser ? ACC : t.paperHi,
          color: isUser ? "#FFFBF0" : t.ink,
          border: isUser ? "none" : `1px solid ${t.line}`,
          borderRadius: 16,
          padding: "10px 14px",
          fontFamily: body,
          fontSize: 14,
          lineHeight: 1.55,
        }}
      >
        {message.images && message.images.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {message.images.map((img, i) => (
              <img
                key={i}
                alt="uppladdad bild"
                src={`data:${img.mediaType};base64,${img.base64}`}
                style={{
                  maxWidth: 200,
                  maxHeight: 200,
                  borderRadius: 10,
                  display: "block",
                }}
              />
            ))}
          </div>
        )}
        {message.parts.map((part, i) => {
          if (part.kind === "text") {
            return (
              <div key={i} style={{ whiteSpace: "pre-wrap" }}>
                {part.text}
              </div>
            );
          }
          return <ToolChip key={i} tool={part} />;
        })}
      </div>
    </div>
  );
}

// ── Huvudkomponent ──────────────────────────────────────────────────────────

export default function GardenAIPage() {
  const { t } = useWarmTheme();
  const search = useSearchParams();
  const initialPrompt = search.get("prompt") ?? "";

  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [pendingImages, setPendingImages] = useState<UIImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [showContext, setShowContext] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sentInitialRef = useRef(false);

  const ctxSwr = useSWR<ContextSummary>("/api/garden/chat", fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 0,
  });
  const ctx = ctxSwr.data;

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (initialPrompt && !sentInitialRef.current) {
      sentInitialRef.current = true;
      setInput(initialPrompt);
    }
  }, [initialPrompt]);

  const send = async (text: string, images: UIImage[]) => {
    const trimmed = text.trim();
    if (!trimmed && images.length === 0) return;
    if (busy) return;

    const userMsg: UIMessage = {
      id: uid(),
      role: "user",
      parts: [{ kind: "text", text: trimmed || "(se bild)" }],
      images: images.length > 0 ? images : undefined,
    };
    const assistantMsg: UIMessage = {
      id: uid(),
      role: "assistant",
      parts: [],
    };
    const next = [...messages, userMsg, assistantMsg];
    setMessages(next);
    setInput("");
    setPendingImages([]);
    setBusy(true);

    const sdkMessages = buildSdkMessages([...messages, userMsg]);

    try {
      const res = await fetch("/api/garden/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: sdkMessages }),
      });
      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${errText.slice(0, 200)}`);
      }

      const updateAssistant = (mutator: (parts: Part[]) => Part[]) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMsg.id ? { ...m, parts: mutator(m.parts) } : m)),
        );
      };

      for await (const ev of parseSseStream(res.body)) {
        if (ev.type === "text" && typeof ev.delta === "string") {
          updateAssistant((parts) => {
            const last = parts[parts.length - 1];
            if (last && last.kind === "text") {
              return [...parts.slice(0, -1), { kind: "text", text: last.text + ev.delta! }];
            }
            return [...parts, { kind: "text", text: ev.delta! }];
          });
        } else if (ev.type === "tool_use_start" && ev.name) {
          updateAssistant((parts) => [
            ...parts,
            { kind: "tool", name: ev.name!, input: ev.input ?? {} },
          ]);
        } else if (ev.type === "tool_use_result" && ev.name) {
          updateAssistant((parts) => {
            for (let i = parts.length - 1; i >= 0; i--) {
              const p = parts[i]!;
              if (p.kind === "tool" && p.name === ev.name && p.ok === undefined) {
                const nextParts = [...parts];
                nextParts[i] = { ...p, ok: ev.ok, result: ev.result, error: ev.error };
                return nextParts;
              }
            }
            return parts;
          });
        } else if (ev.type === "error") {
          updateAssistant((parts) => [
            ...parts,
            { kind: "text", text: `\n\n_(fel: ${ev.message ?? "okänt"})_` },
          ]);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsg.id
            ? { ...m, parts: [...m.parts, { kind: "text", text: `\n\n_(fel: ${message})_` }] }
            : m,
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  const handlePickFile = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      alert(`Bilden är för stor (max ${MAX_IMAGE_BYTES / 1024 / 1024} MB).`);
      return;
    }
    const supported = ["image/png", "image/jpeg", "image/gif", "image/webp"];
    if (!supported.includes(file.type)) {
      alert("Endast PNG, JPEG, GIF eller WebP stöds.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1] ?? "";
      setPendingImages((arr) => [
        ...arr,
        { mediaType: file.type as UIImage["mediaType"], base64 },
      ]);
    };
    reader.readAsDataURL(file);
  };

  const errMsg = ctxSwr.error instanceof Error ? ctxSwr.error.message : "";
  const notReady = errMsg.includes(": 501");
  const conversationEmpty = messages.length === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100dvh - 140px)", minHeight: 480 }}>
      <DetailHero
        backHref="/v3/garden"
        backLabel="Trädgård"
        eyebrow="AI-RÅDGIVARE"
        title="Coachen,"
        italicTail="frågor och svar."
        subtitle={
          ctx
            ? `${ctx.plantCount} växter · ${ctx.upcomingTaskCount} kommande · zon ${ctx.gardenZone}`
            : "laddar kontext…"
        }
      />

      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, padding: "0 18px", gap: 10 }}>
        {/* Kontext-toggle-rad */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={() => setShowContext((v) => !v)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontFamily: body,
              fontSize: 11,
              fontWeight: 600,
              background: showContext ? t.tint : t.paper,
              color: showContext ? ACC : t.mute,
              border: `1px solid ${showContext ? ACC : t.line}`,
              borderRadius: 999,
              padding: "5px 11px",
              cursor: "pointer",
            }}
          >
            <SparkleIcon size={11} color={showContext ? ACC : t.mute} />
            Kontext
          </button>
        </div>

        {showContext && (
          <ContextPanel ctx={ctx} onRefresh={() => ctxSwr.mutate()} loading={ctxSwr.isLoading} />
        )}

        {notReady && (
          <Tile t={t}>
            <p style={{ fontFamily: body, fontSize: 13, color: t.mute, lineHeight: 1.55 }}>
              AI-chatten kräver att <code>NOTION_GARDEN_*_DB</code> och <code>ANTHROPIC_API_KEY</code>{" "}
              är satta i miljön.
            </p>
          </Tile>
        )}

        {/* Scroll-yta */}
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            background: t.paper,
            border: `1px solid ${t.line}`,
            borderRadius: 14,
            padding: 14,
          }}
        >
          {conversationEmpty ? (
            <EmptyState />
          ) : (
            messages.map((m) => <MessageBubble key={m.id} message={m} />)
          )}
          {busy && messages[messages.length - 1]?.parts.length === 0 && (
            <div
              style={{
                fontFamily: body,
                fontSize: 12,
                color: t.mute,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span style={{ display: "inline-flex", animation: "spin-anim 0.8s linear infinite" }}>
                <ProgressIcon size={13} color={t.mute} />
              </span>
              Tänker…
            </div>
          )}
        </div>

        {/* Snabbprompter */}
        {conversationEmpty && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setInput(q)}
                style={{
                  fontFamily: body,
                  fontSize: 11,
                  fontWeight: 600,
                  background: t.paperHi,
                  color: t.ink,
                  border: `1px solid ${t.line}`,
                  borderRadius: 999,
                  padding: "5px 11px",
                  cursor: "pointer",
                }}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input-rad */}
        <div
          style={{
            background: t.paperHi,
            border: `1px solid ${t.line}`,
            borderRadius: 14,
            padding: 10,
          }}
        >
          {pendingImages.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {pendingImages.map((img, i) => (
                <div key={i} style={{ position: "relative" }}>
                  <img
                    src={`data:${img.mediaType};base64,${img.base64}`}
                    alt={`bilaga ${i + 1}`}
                    style={{
                      width: 60,
                      height: 60,
                      objectFit: "cover",
                      borderRadius: 8,
                      display: "block",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setPendingImages((arr) => arr.filter((_, idx) => idx !== i))
                    }
                    aria-label="Ta bort bild"
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -6,
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      background: t.ink,
                      color: t.bg,
                      border: "none",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <CloseIcon size={10} color={t.bg} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
            <button
              type="button"
              onClick={handlePickFile}
              disabled={busy}
              aria-label="Lägg till bild"
              style={{
                width: 34,
                height: 34,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 17,
                background: t.paper,
                border: `1px solid ${t.line}`,
                cursor: busy ? "wait" : "pointer",
                flexShrink: 0,
              }}
            >
              <ImageIcon size={16} color={t.mute} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !busy) {
                  e.preventDefault();
                  send(input, pendingImages);
                }
              }}
              placeholder="Fråga om dina växter, planera in uppgifter, ladda upp bild på sjuk växt…"
              rows={Math.min(5, Math.max(1, input.split("\n").length))}
              style={{
                flex: 1,
                minWidth: 0,
                resize: "none",
                fontFamily: body,
                fontSize: 13,
                background: t.paper,
                color: t.ink,
                border: `1px solid ${t.line}`,
                borderRadius: 10,
                padding: "8px 12px",
                outline: "none",
                lineHeight: 1.4,
              }}
            />

            <button
              type="button"
              onClick={() => send(input, pendingImages)}
              disabled={busy || (!input.trim() && pendingImages.length === 0)}
              aria-label="Skicka"
              style={{
                width: 34,
                height: 34,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 17,
                background: ACC,
                color: "#FFFBF0",
                border: "none",
                cursor: busy ? "wait" : "pointer",
                opacity: busy || (!input.trim() && pendingImages.length === 0) ? 0.55 : 1,
                flexShrink: 0,
              }}
            >
              {busy ? (
                <span style={{ display: "inline-flex", animation: "spin-anim 0.8s linear infinite" }}>
                  <ProgressIcon size={16} color="#FFFBF0" />
                </span>
              ) : (
                <SendIcon size={14} color="#FFFBF0" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  const { t } = useWarmTheme();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        minHeight: 220,
        gap: 10,
      }}
    >
      <SparkleIcon size={32} color={ACC} />
      <div style={{ ...num(t, 16, 500), color: t.ink }}>Fråga AI:n om trädgården</div>
      <div style={{ ...ital(t, 12, t.dim), maxWidth: 320, lineHeight: 1.5 }}>
        Coachen känner till växtregister, säsongsplan, projekt och 7-dygns
        väderprognos för Borås.
      </div>
    </div>
  );
}

function ContextPanel({
  ctx,
  onRefresh,
  loading,
}: {
  ctx: ContextSummary | undefined;
  onRefresh: () => void;
  loading: boolean;
}) {
  const { t } = useWarmTheme();
  return (
    <Tile t={t} hi style={{ padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={lab(t)}>Kontext laddat till AI</span>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontFamily: body,
            fontSize: 11,
            fontWeight: 600,
            color: t.ink,
            background: t.paper,
            border: `1px solid ${t.line}`,
            borderRadius: 999,
            padding: "4px 10px",
            cursor: loading ? "wait" : "pointer",
          }}
        >
          <RefreshIcon
            size={11}
            color={t.mute}
            style={{ animation: loading ? "spin-anim 0.8s linear infinite" : undefined }}
          />
          Uppdatera
        </button>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
          gap: 8,
        }}
      >
        <Stat label="Växter" value={ctx?.plantCount ?? "–"} />
        <Stat label="Kommande" value={ctx?.upcomingTaskCount ?? "–"} unit="uppg." />
        <Stat label="Aktiva projekt" value={ctx?.activeProjectCount ?? "–"} />
        <Stat
          label="Idag"
          value={
            ctx?.weatherToday?.tMaxC != null ? `${ctx.weatherToday.tMaxC.toFixed(0)}°` : "–"
          }
          unit={
            ctx?.weatherToday?.tMinC != null ? `min ${ctx.weatherToday.tMinC.toFixed(0)}°` : undefined
          }
        />
      </div>
    </Tile>
  );
}

function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number;
  unit?: string;
}) {
  const { t } = useWarmTheme();
  return (
    <div
      style={{
        background: t.paper,
        border: `1px solid ${t.line}`,
        borderRadius: 10,
        padding: "8px 10px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <span style={lab(t)}>{label}</span>
      <span style={{ ...num(t, 16, 500), lineHeight: 1, color: t.ink }} className="warm-tab-nums">
        {value}
      </span>
      {unit ? <span style={{ fontFamily: body, fontSize: 10, color: t.mute }}>{unit}</span> : null}
    </div>
  );
}

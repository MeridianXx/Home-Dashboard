"use client";

// ─── Trädgård · AI-rådgivare ─────────────────────────────────────────────────
// Fullskärm-chat mot /api/garden/chat. SSE-streaming med tool-use-event som
// renderas som inline-chips i assistantens svar. Bilduppladdning som base64
// (max 5 MB) så användaren kan visa upp en växtbild för diagnos.

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

// ─── Typer ───────────────────────────────────────────────────────────────────

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

// ─── SSE-parser ──────────────────────────────────────────────────────────────

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
        // Ignorera trasiga fragment — nästa läsning kompletterar förhoppningsvis.
      }
    }
  }
}

// ─── Bygg API-body ───────────────────────────────────────────────────────────

interface SdkMessage {
  role: "user" | "assistant";
  content: string | Array<
    | { type: "text"; text: string }
    | { type: "image"; source: { type: "base64"; media_type: UIImage["mediaType"]; data: string } }
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
    // user
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

// ─── Komponenter ─────────────────────────────────────────────────────────────

function ToolChip({ tool }: { tool: ToolPart }) {
  const label =
    tool.name === "create_task" ? "Skapar uppgift" :
    tool.name === "update_task" ? "Uppdaterar uppgift" :
    tool.name === "create_project" ? "Skapar projekt" :
    tool.name === "list_plants" ? "Listar växter" :
    tool.name === "get_plant" ? "Hämtar växt" :
    tool.name === "search_tasks" ? "Söker uppgifter" :
    tool.name === "get_weather_forecast" ? "Hämtar väder" :
    tool.name;

  const status = tool.ok === true ? "ok" : tool.ok === false ? "err" : "pending";
  const color =
    status === "err" ? "var(--color-error, #b3261e)" :
    status === "ok" ? "#10b981" :
    "var(--color-on-surface-variant)";
  const icon =
    status === "err" ? "error" :
    status === "ok" ? "check_circle" :
    "progress_activity";

  // Försök sammanfatta resultatet kort
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

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        backgroundColor: "var(--color-surface-container)",
        border: "1px solid var(--color-outline-variant)",
        borderRadius: 14,
        padding: "4px 10px",
        fontSize: 11,
        color: "var(--color-on-surface-variant)",
        marginTop: 6,
        marginBottom: 6,
      }}
    >
      <span
        className="material-symbols-outlined"
        style={{
          fontSize: 14,
          color,
          animation: status === "pending" ? "spin-anim 0.8s linear infinite" : undefined,
        }}
      >
        {icon}
      </span>
      <span style={{ fontWeight: 600, color: "var(--color-on-surface)" }}>{label}</span>
      <span style={{ opacity: 0.85 }}>{resultBlurb}</span>
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
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
          backgroundColor: isUser
            ? "var(--color-primary)"
            : "var(--color-surface-container-lowest)",
          color: isUser ? "var(--color-on-primary)" : "var(--color-on-surface)",
          border: isUser ? "none" : "1px solid var(--color-card-border)",
          borderRadius: 16,
          padding: "10px 14px",
          fontSize: 14,
          lineHeight: 1.5,
        }}
      >
        {message.images && message.images.length > 0 && (
          <div className="flex flex-wrap gap-2" style={{ marginBottom: 8 }}>
            {message.images.map((img, i) => (
              <img
                key={i}
                alt="uppladdad bild"
                src={`data:${img.mediaType};base64,${img.base64}`}
                style={{ maxWidth: 200, maxHeight: 200, borderRadius: 8, display: "block" }}
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

// ─── Huvudkomponent ──────────────────────────────────────────────────────────

// useSearchParams() måste wrappas i Suspense vid prerendering.
// Inner-komponenten gör allt jobb; default-export wrap:ar den.
export default function GardenAIPage() {
  return (
    <Suspense fallback={null}>
      <GardenAIPageInner />
    </Suspense>
  );
}

function GardenAIPageInner() {
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

  // Auto-scroll till botten när meddelanden uppdateras
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Deep-link: ?prompt=... fyller textarean så användaren ser vad som skickas
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

      // Konsumera SSE-events och muta assistantens parts.
      const updateAssistant = (mutator: (parts: Part[]) => Part[]) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id ? { ...m, parts: mutator(m.parts) } : m,
          ),
        );
      };

      for await (const ev of parseSseStream(res.body)) {
        if (ev.type === "text" && typeof ev.delta === "string") {
          updateAssistant((parts) => {
            const last = parts[parts.length - 1];
            if (last && last.kind === "text") {
              return [
                ...parts.slice(0, -1),
                { kind: "text", text: last.text + ev.delta! },
              ];
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
            // Hitta sista pending tool-part med matchande namn
            for (let i = parts.length - 1; i >= 0; i--) {
              const p = parts[i];
              if (p.kind === "tool" && p.name === ev.name && p.ok === undefined) {
                const next = [...parts];
                next[i] = { ...p, ok: ev.ok, result: ev.result, error: ev.error };
                return next;
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
    <div className="flex flex-col" style={{ height: "calc(100dvh - 220px)", minHeight: 480 }}>
      {/* Toppraden — titel + kontext-toggle */}
      <div className="flex items-end gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-extrabold tracking-tight font-headline" style={{ color: "var(--color-on-surface)" }}>
            AI-rådgivare
          </h1>
          <p className="text-sm font-medium mt-1" style={{ color: "var(--color-on-surface-variant)" }}>
            {ctx
              ? `${ctx.plantCount} växter · ${ctx.upcomingTaskCount} kommande uppgifter · zon ${ctx.gardenZone}`
              : "laddar kontext…"}
          </p>
        </div>
        <button
          onClick={() => setShowContext((v) => !v)}
          className="text-xs font-semibold rounded-full"
          style={{
            backgroundColor: showContext ? "var(--color-inverse-surface)" : "var(--color-surface-container)",
            color: showContext ? "var(--color-surface)" : "var(--color-on-surface-variant)",
            border: "1px solid var(--color-outline-variant)",
            padding: "6px 12px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>info</span>
          Kontext
        </button>
      </div>

      {showContext && (
        <ContextPanel ctx={ctx} onRefresh={() => ctxSwr.mutate()} loading={ctxSwr.isLoading} />
      )}

      {notReady && (
        <div
          className="rounded-2xl p-4 text-sm mb-3"
          style={{
            backgroundColor: "var(--color-surface-container-lowest)",
            border: "1px solid var(--color-card-border)",
            color: "var(--color-on-surface-variant)",
          }}
        >
          AI-chatten kräver att <code>NOTION_GARDEN_*_DB</code> och <code>ANTHROPIC_API_KEY</code> är satta i miljön.
        </div>
      )}

      {/* Scroll-yta */}
      <div
        ref={scrollRef}
        className="rounded-2xl"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          backgroundColor: "var(--color-surface)",
          padding: 16,
        }}
      >
        {conversationEmpty ? (
          <EmptyState />
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}
        {busy && messages[messages.length - 1]?.parts.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--color-on-surface-variant)" }}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 14, animation: "spin-anim 0.8s linear infinite", marginRight: 4 }}
            >
              progress_activity
            </span>
            Tänker…
          </div>
        )}
      </div>

      {/* Snabbprompter */}
      {conversationEmpty && (
        <div className="flex flex-wrap gap-1.5" style={{ marginTop: 10 }}>
          {QUICK_PROMPTS.map((q) => (
            <button
              key={q}
              onClick={() => setInput(q)}
              className="text-xs font-semibold rounded-full"
              style={{
                backgroundColor: "var(--color-surface-container)",
                color: "var(--color-on-surface)",
                border: "1px solid var(--color-outline-variant)",
                padding: "5px 12px",
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
        className="rounded-2xl"
        style={{
          marginTop: 10,
          padding: 10,
          backgroundColor: "var(--color-surface-container-lowest)",
          border: "1px solid var(--color-card-border)",
        }}
      >
        {pendingImages.length > 0 && (
          <div className="flex flex-wrap gap-2" style={{ marginBottom: 8 }}>
            {pendingImages.map((img, i) => (
              <div key={i} style={{ position: "relative" }}>
                <img
                  src={`data:${img.mediaType};base64,${img.base64}`}
                  alt={`bilaga ${i + 1}`}
                  style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, display: "block" }}
                />
                <button
                  onClick={() => setPendingImages((arr) => arr.filter((_, idx) => idx !== i))}
                  aria-label="Ta bort bild"
                  style={{
                    position: "absolute", top: -6, right: -6,
                    width: 20, height: 20,
                    borderRadius: 10,
                    backgroundColor: "var(--color-inverse-surface)",
                    color: "var(--color-surface)",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 12,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <button
            onClick={handlePickFile}
            disabled={busy}
            aria-label="Lägg till bild"
            style={{
              width: 36, height: 36,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              borderRadius: 18,
              backgroundColor: "var(--color-surface-container)",
              border: "1px solid var(--color-outline-variant)",
              cursor: busy ? "wait" : "pointer",
              flexShrink: 0,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--color-on-surface-variant)" }}>
              image
            </span>
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
              fontFamily: "inherit",
              fontSize: 14,
              backgroundColor: "var(--color-surface-container)",
              color: "var(--color-on-surface)",
              border: "1px solid var(--color-outline-variant)",
              borderRadius: 10,
              padding: "8px 12px",
              outline: "none",
            }}
          />

          <button
            onClick={() => send(input, pendingImages)}
            disabled={busy || (!input.trim() && pendingImages.length === 0)}
            aria-label="Skicka"
            style={{
              width: 36, height: 36,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              borderRadius: 18,
              backgroundColor: "var(--color-primary)",
              color: "var(--color-on-primary)",
              border: "none",
              cursor: busy ? "wait" : "pointer",
              opacity: busy || (!input.trim() && pendingImages.length === 0) ? 0.5 : 1,
              flexShrink: 0,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              {busy ? "progress_activity" : "send"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center text-center"
      style={{ minHeight: 200, color: "var(--color-on-surface-variant)" }}
    >
      <span
        className="material-symbols-outlined"
        style={{ fontSize: 36, color: "var(--color-outline)" }}
      >
        auto_awesome
      </span>
      <div className="text-sm font-bold mt-2" style={{ color: "var(--color-on-surface-variant)" }}>
        Fråga AI:n om trädgården
      </div>
      <div className="text-xs mt-1" style={{ color: "var(--color-outline)", maxWidth: 320 }}>
        Coachen känner till växtregister, säsongsplan, projekt och 7-dygns väderprognos för Borås.
      </div>
    </div>
  );
}

function ContextPanel({
  ctx, onRefresh, loading,
}: {
  ctx: ContextSummary | undefined;
  onRefresh: () => void;
  loading: boolean;
}) {
  return (
    <div
      className="rounded-2xl p-4 mb-3"
      style={{
        backgroundColor: "var(--color-surface-container-lowest)",
        border: "1px solid var(--color-card-border)",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-on-surface-variant)" }}>
          Kontext laddat till AI
        </span>
        <div className="flex-1" />
        <button
          onClick={onRefresh}
          disabled={loading}
          className="text-xs font-semibold rounded-full"
          style={{
            backgroundColor: "var(--color-surface-container)",
            color: "var(--color-on-surface)",
            border: "1px solid var(--color-outline-variant)",
            padding: "4px 10px",
            cursor: loading ? "wait" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>refresh</span>
          Uppdatera
        </button>
      </div>

      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}
      >
        <Stat label="Växter" value={ctx?.plantCount ?? "–"} />
        <Stat label="Kommande" value={ctx?.upcomingTaskCount ?? "–"} unit="uppgifter" />
        <Stat label="Aktiva projekt" value={ctx?.activeProjectCount ?? "–"} />
        <Stat
          label="Idag"
          value={
            ctx?.weatherToday?.tMaxC != null
              ? `${ctx.weatherToday.tMaxC.toFixed(0)}°`
              : "–"
          }
          unit={ctx?.weatherToday?.tMinC != null ? `min ${ctx.weatherToday.tMinC.toFixed(0)}°` : undefined}
        />
      </div>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div
      className="rounded-xl"
      style={{ backgroundColor: "var(--color-surface-container)", padding: "10px 12px" }}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-on-surface-variant)" }}>
        {label}
      </div>
      <div className="text-lg font-bold tabular-nums leading-none mt-1" style={{ color: "var(--color-on-surface)" }}>
        {value}
      </div>
      {unit && (
        <div className="text-[10px] mt-1" style={{ color: "var(--color-on-surface-variant)" }}>
          {unit}
        </div>
      )}
    </div>
  );
}


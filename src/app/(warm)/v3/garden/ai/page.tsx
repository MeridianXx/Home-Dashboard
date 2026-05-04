"use client";

// ─── Warm Home · Trädgård · AI-rådgivare ─────────────────────────────────────
// Fullskärm-chat mot /api/garden/chat (SSE). Tool-use renderas som inline-chip.
// Tom konversation = kompakt empty-state + 2×2-grid med snabbprompts.
// Konversation = full-height scroll-yta.

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useWarmTheme } from "@/lib/warm/theme";
import { ACC, body, ital, lab, num } from "@/lib/warm/tokens";
import { Tile } from "@/components/warm/primitives";
import { DetailHero } from "@/components/warm/fit/parts";
import { haptic } from "@/lib/warm/haptics";
import {
  SparkleIcon,
  SendIcon,
  ImageIcon,
  CameraIcon,
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

// Cap efter resize: 4 MB är säkerhetsmarginal mot Anthropics 5 MB-limit per
// bild. I praktiken landar resize:ade bilder runt 0.5–2 MB.
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
// Anthropic optimerar bilder runt 1568 px på längsta sidan — större ger
// ingen kvalitetsvinst men kostar tokens. Vi kompir:ar via canvas.
const RESIZE_MAX_DIMENSION = 1568;
// Hur många bilder som max kan bifogas per meddelande.
const MAX_IMAGES_PER_MESSAGE = 8;

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Läser ett `File`/`Blob` till en HTMLImageElement, ritar i canvas vid max
 * 1568 px på längsta sidan, returnerar `image/jpeg`-base64 (utan data-prefix).
 * Spar ~50–80 % filstorlek vs raw kamera-bild på iPhone.
 */
async function resizeImageToBase64(
  file: Blob,
): Promise<{ mediaType: "image/jpeg"; base64: string }> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("filläsning misslyckades"));
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("kunde inte tolka bilden"));
    el.src = dataUrl;
  });
  const max = Math.max(img.width, img.height);
  const scale = max > RESIZE_MAX_DIMENSION ? RESIZE_MAX_DIMENSION / max : 1;
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas-context saknas");
  ctx.drawImage(img, 0, 0, w, h);
  const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.85);
  const base64 = jpegDataUrl.split(",")[1] ?? "";
  return { mediaType: "image/jpeg", base64 };
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
      try {
        yield JSON.parse(line.slice(5).trim()) as StreamEvent;
      } catch {
        // ignorera trasiga fragment
      }
    }
  }
}

// ── SDK-body ─────────────────────────────────────────────────────────────────

interface SdkMessage {
  role: "user" | "assistant";
  content:
    | string
    | Array<
        | { type: "text"; text: string }
        | { type: "image"; source: { type: "base64"; media_type: UIImage["mediaType"]; data: string } }
      >;
}

function buildSdkMessages(history: UIMessage[]): SdkMessage[] {
  return history.map((m) => {
    if (m.role === "assistant") {
      const text = m.parts.filter((p): p is TextPart => p.kind === "text").map((p) => p.text).join("\n").trim();
      return { role: "assistant", content: text || "(inget svar)" };
    }
    const text = m.parts.filter((p): p is TextPart => p.kind === "text").map((p) => p.text).join("\n");
    if (!m.images || m.images.length === 0) return { role: "user", content: text };
    return {
      role: "user",
      content: [
        ...m.images.map((img) => ({
          type: "image" as const,
          source: { type: "base64" as const, media_type: img.mediaType, data: img.base64 },
        })),
        { type: "text" as const, text: text || "(se bild)" },
      ],
    };
  });
}

// ── ToolChip ─────────────────────────────────────────────────────────────────

function ToolChip({ tool }: { tool: ToolPart }) {
  const { t } = useWarmTheme();
  const label =
    tool.name === "create_task" ? "Skapar uppgift"
    : tool.name === "update_task" ? "Uppdaterar uppgift"
    : tool.name === "create_project" ? "Skapar projekt"
    : tool.name === "list_plants" ? "Listar växter"
    : tool.name === "get_plant" ? "Hämtar växt"
    : tool.name === "search_tasks" ? "Söker uppgifter"
    : tool.name === "get_weather_forecast" ? "Hämtar väder"
    : tool.name;

  const status = tool.ok === true ? "ok" : tool.ok === false ? "err" : "pending";
  const accent = status === "err" ? t.bad : status === "ok" ? t.ok : t.mute;

  let blurb = "";
  if (tool.ok && tool.result) {
    if (Array.isArray(tool.result)) blurb = ` → ${tool.result.length} resultat`;
    else if (typeof tool.result === "object" && tool.result !== null) {
      const r = tool.result as Record<string, unknown>;
      if ("uppgift" in r && typeof r.uppgift === "string") blurb = ` → "${r.uppgift}"`;
      else if ("namn" in r && typeof r.namn === "string") blurb = ` → "${r.namn}"`;
      else if ("vaxt" in r && typeof r.vaxt === "string") blurb = ` → "${r.vaxt}"`;
    }
  }
  if (tool.error) blurb = ` → ${tool.error}`;

  const Icon = status === "err" ? AlertIcon : status === "ok" ? CheckIcon : ProgressIcon;
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: t.paperHi, border: `1px solid ${t.line}`, borderRadius: 14, padding: "4px 10px", fontFamily: body, fontSize: 11, color: t.mute, marginTop: 4, marginBottom: 4 }}>
      <span style={{ display: "inline-flex", animation: status === "pending" ? "spin-anim 0.8s linear infinite" : undefined }}>
        <Icon size={13} color={accent} />
      </span>
      <span style={{ fontWeight: 600, color: t.ink }}>{label}</span>
      <span style={{ opacity: 0.85 }}>{blurb}</span>
    </div>
  );
}

// ── MessageBubble ─────────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: UIMessage }) {
  const { t } = useWarmTheme();
  const isUser = message.role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 10 }}>
      <div style={{ maxWidth: "88%", background: isUser ? ACC : t.paperHi, color: isUser ? "#FFFBF0" : t.ink, border: isUser ? "none" : `1px solid ${t.line}`, borderRadius: 14, padding: "9px 13px", fontFamily: body, fontSize: 13, lineHeight: 1.55 }}>
        {message.images && message.images.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {message.images.map((img, i) => (
              <img key={i} alt="uppladdad bild" src={`data:${img.mediaType};base64,${img.base64}`} style={{ maxWidth: 180, maxHeight: 180, borderRadius: 8, display: "block" }} />
            ))}
          </div>
        )}
        {message.parts.map((part, i) =>
          part.kind === "text"
            ? <div key={i} style={{ whiteSpace: "pre-wrap" }}>{part.text}</div>
            : <ToolChip key={i} tool={part} />
        )}
      </div>
    </div>
  );
}

// ── Kontextpanel ─────────────────────────────────────────────────────────────

function ContextPanel({ ctx, onRefresh, loading }: { ctx: ContextSummary | undefined; onRefresh: () => void; loading: boolean }) {
  const { t } = useWarmTheme();
  return (
    <Tile t={t} hi style={{ padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={lab(t)}>Kontext laddat till AI</span>
        <div style={{ flex: 1 }} />
        <button type="button" onClick={() => { void haptic("tap"); onRefresh(); }} disabled={loading} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: body, fontSize: 11, fontWeight: 600, color: t.ink, background: t.paper, border: `1px solid ${t.line}`, borderRadius: 999, padding: "4px 10px", cursor: loading ? "wait" : "pointer" }}>
          <RefreshIcon size={11} color={t.mute} style={{ animation: loading ? "spin-anim 0.8s linear infinite" : undefined }} />
          Uppdatera
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 8 }}>
        {[
          { label: "Växter", value: ctx?.plantCount ?? "–" },
          { label: "Kommande", value: ctx?.upcomingTaskCount ?? "–" },
          { label: "Projekt", value: ctx?.activeProjectCount ?? "–" },
          { label: "Idag", value: ctx?.weatherToday?.tMaxC != null ? `${ctx.weatherToday.tMaxC.toFixed(0)}°` : "–" },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: t.paper, border: `1px solid ${t.line}`, borderRadius: 10, padding: "8px 10px" }}>
            <div style={lab(t, { marginBottom: 4 })}>{label}</div>
            <div style={{ ...num(t, 16, 500), lineHeight: 1 }} className="warm-tab-nums">{value}</div>
          </div>
        ))}
      </div>
    </Tile>
  );
}

// ── Huvudkomponent ────────────────────────────────────────────────────────────

export default function GardenAIPage() {
  // useSearchParams() kräver Suspense-boundary vid prerendering (Next 16).
  return (
    <Suspense fallback={null}>
      <GardenAIInner />
    </Suspense>
  );
}

function GardenAIInner() {
  const { t } = useWarmTheme();
  const search = useSearchParams();
  const initialPrompt = search.get("prompt") ?? "";

  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [pendingImages, setPendingImages] = useState<UIImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [showContext, setShowContext] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const sentInitialRef = useRef(false);

  const ctxSwr = useSWR<ContextSummary>("/api/garden/chat", fetcher, { revalidateOnFocus: false, refreshInterval: 0 });
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

  // Composern är låst till en rad — textarea-höjden kommer från style.height,
  // inget auto-grow. Långa texter scrollar horisontellt i fältet.

  const send = async (text: string, images: UIImage[]) => {
    const trimmed = text.trim();
    if (!trimmed && images.length === 0) return;
    if (busy) return;

    const userMsg: UIMessage = { id: uid(), role: "user", parts: [{ kind: "text", text: trimmed || "(se bild)" }], images: images.length > 0 ? images : undefined };
    const assistantMsg: UIMessage = { id: uid(), role: "assistant", parts: [] };
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
        setMessages((prev) => prev.map((m) => m.id === assistantMsg.id ? { ...m, parts: mutator(m.parts) } : m));
      };

      for await (const ev of parseSseStream(res.body)) {
        if (ev.type === "text" && typeof ev.delta === "string") {
          updateAssistant((parts) => {
            const last = parts[parts.length - 1];
            if (last && last.kind === "text") return [...parts.slice(0, -1), { kind: "text", text: last.text + ev.delta! }];
            return [...parts, { kind: "text", text: ev.delta! }];
          });
        } else if (ev.type === "tool_use_start" && ev.name) {
          updateAssistant((parts) => [...parts, { kind: "tool", name: ev.name!, input: ev.input ?? {} }]);
        } else if (ev.type === "tool_use_result" && ev.name) {
          updateAssistant((parts) => {
            for (let i = parts.length - 1; i >= 0; i--) {
              const p = parts[i]!;
              if (p.kind === "tool" && p.name === ev.name && p.ok === undefined) {
                const np = [...parts];
                np[i] = { ...p, ok: ev.ok, result: ev.result, error: ev.error };
                return np;
              }
            }
            return parts;
          });
        } else if (ev.type === "error") {
          updateAssistant((parts) => [...parts, { kind: "text", text: `\n\n_(fel: ${ev.message ?? "okänt"})_` }]);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((prev) => prev.map((m) => m.id === assistantMsg.id ? { ...m, parts: [...m.parts, { kind: "text", text: `\n\n_(fel: ${msg})_` }] } : m));
    } finally {
      setBusy(false);
    }
  };

  const handlePickFile = () => fileInputRef.current?.click();

  /**
   * Native iOS-kamera via @capacitor/camera-pluginet. Kraschar inte i
   * Capacitor-appen (vilket html `<input capture>` gör pga minne) och ger
   * automatisk resize. Web-fallback öppnar dolt file-input.
   */
  const handlePickCamera = async () => {
    try {
      const { Capacitor } = await import("@capacitor/core");
      if (Capacitor.getPlatform() === "ios" || Capacitor.getPlatform() === "android") {
        const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
        const photo = await Camera.getPhoto({
          quality: 80,
          allowEditing: false,
          resultType: CameraResultType.Base64,
          source: CameraSource.Camera,
          width: RESIZE_MAX_DIMENSION,
        });
        if (photo.base64String) {
          setPendingImages((arr) => {
            if (arr.length >= MAX_IMAGES_PER_MESSAGE) {
              alert(`Max ${MAX_IMAGES_PER_MESSAGE} bilder per meddelande.`);
              return arr;
            }
            return [...arr, { mediaType: "image/jpeg", base64: photo.base64String! }];
          });
        }
        return;
      }
    } catch (err) {
      // Plugin ej tillgänglig eller användaren avbröt — fallback till input.
      const msg = err instanceof Error ? err.message : "";
      if (msg.toLowerCase().includes("cancel")) return;
    }
    cameraInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    if (files.length === 0) return;
    const supported = ["image/png", "image/jpeg", "image/gif", "image/webp"];
    const slotsLeft = MAX_IMAGES_PER_MESSAGE - pendingImages.length;
    if (slotsLeft <= 0) {
      alert(`Max ${MAX_IMAGES_PER_MESSAGE} bilder per meddelande.`);
      return;
    }
    const accepted = files.slice(0, slotsLeft);
    const newImages: UIImage[] = [];
    for (const file of accepted) {
      if (!supported.includes(file.type)) {
        alert(`"${file.name}" stöds inte. Endast PNG, JPEG, GIF eller WebP.`);
        continue;
      }
      try {
        const { mediaType, base64 } = await resizeImageToBase64(file);
        const sizeBytes = (base64.length * 3) / 4;
        if (sizeBytes > MAX_IMAGE_BYTES) {
          alert(`"${file.name}" är fortfarande för stor efter komprimering. Hoppa över.`);
          continue;
        }
        newImages.push({ mediaType, base64 });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "okänt fel";
        alert(`Kunde inte läsa "${file.name}": ${msg}`);
      }
    }
    if (newImages.length > 0) {
      setPendingImages((arr) => [...arr, ...newImages]);
    }
    if (files.length > slotsLeft) {
      alert(`Bara ${slotsLeft} av ${files.length} bilder lades till — max ${MAX_IMAGES_PER_MESSAGE} per meddelande.`);
    }
  };

  const errMsg = ctxSwr.error instanceof Error ? ctxSwr.error.message : "";
  const notReady = errMsg.includes(": 501");
  const isEmpty = messages.length === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100dvh - 190px)", minHeight: 460, paddingBottom: 8 }}>
      <DetailHero
        backHref="/v3/garden"
        backLabel="Trädgård"
        eyebrow="TRÄDGÅRDSMÄSTAREN"
        title="Trädgårdsmästaren,"
        italicTail="frågor och svar."
        subtitle={ctx ? `${ctx.plantCount} växter · ${ctx.upcomingTaskCount} kommande · zon ${ctx.gardenZone}` : "laddar kontext…"}
        right={
          <button
            type="button"
            onClick={() => { void haptic("tap"); setShowContext((v) => !v); }}
            style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: body, fontSize: 11, fontWeight: 600, background: showContext ? `${ACC}20` : t.paper, color: showContext ? ACC : t.mute, border: `1px solid ${showContext ? ACC : t.line}`, borderRadius: 999, padding: "5px 11px", cursor: "pointer" }}
          >
            <SparkleIcon size={11} color={showContext ? ACC : t.mute} />
            Kontext
          </button>
        }
      />

      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, padding: "0 18px 16px", gap: 10 }}>

        {showContext && <ContextPanel ctx={ctx} onRefresh={() => ctxSwr.mutate()} loading={ctxSwr.isLoading} />}

        {notReady && (
          <Tile t={t}>
            <p style={{ fontFamily: body, fontSize: 13, color: t.mute, lineHeight: 1.55 }}>
              AI-chatten kräver att <code>NOTION_GARDEN_*_DB</code> och <code>ANTHROPIC_API_KEY</code> är satta.
            </p>
          </Tile>
        )}

        {/* Tom konversation: kompakt tagline + 2×2 snabbprompts */}
        {isEmpty && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: t.paper, border: `1px solid ${t.line}`, borderRadius: 14 }}>
              <SparkleIcon size={20} color={ACC} />
              <div>
                <div style={{ ...num(t, 14, 500), color: t.ink, lineHeight: 1.2 }}>Fråga trädgårdsmästaren</div>
                <div style={{ ...ital(t, 11, t.dim), marginTop: 2 }}>Växtregister · säsongsplan · projekt · väder Borås</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => { void haptic("tap"); setInput(q); textareaRef.current?.focus(); }}
                  style={{ fontFamily: body, fontSize: 12, fontWeight: 500, background: t.paper, color: t.ink, border: `1px solid ${t.line}`, borderRadius: 12, padding: "10px 12px", cursor: "pointer", textAlign: "left", lineHeight: 1.35 }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Konversation */}
        {!isEmpty && (
          <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "4px 0" }}>
            {messages.map((m) => <MessageBubble key={m.id} message={m} />)}
            {busy && messages[messages.length - 1]?.parts.length === 0 && (
              <div style={{ fontFamily: body, fontSize: 12, color: t.mute, display: "inline-flex", alignItems: "center", gap: 4, paddingLeft: 4 }}>
                <span style={{ display: "inline-flex", animation: "spin-anim 0.8s linear infinite" }}>
                  <ProgressIcon size={13} color={t.mute} />
                </span>
                Tänker…
              </div>
            )}
          </div>
        )}

        {/* Spacer när tom (trycker input till botten) */}
        {isEmpty && <div style={{ flex: 1 }} />}

        {/* Input-fält */}
        <div style={{ background: t.paperHi, border: `1px solid ${t.line}`, borderRadius: 14, padding: 10 }}>
          {pendingImages.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {pendingImages.map((img, i) => (
                <div key={i} style={{ position: "relative" }}>
                  <img src={`data:${img.mediaType};base64,${img.base64}`} alt={`bilaga ${i + 1}`} style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, display: "block" }} />
                  <button type="button" onClick={() => { void haptic("tap"); setPendingImages((arr) => arr.filter((_, idx) => idx !== i)); }} aria-label="Ta bort bild" style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: 9, background: t.ink, border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                    <CloseIcon size={10} color={t.bg} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
            <button type="button" onClick={() => { void haptic("tap"); handlePickCamera(); }} disabled={busy} aria-label="Ta foto" title="Ta foto" style={{ width: 34, height: 34, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 17, background: "transparent", border: "none", cursor: busy ? "wait" : "pointer", flexShrink: 0, padding: 0 }}>
              <CameraIcon size={18} color={t.mute} />
            </button>
            <button type="button" onClick={() => { void haptic("tap"); handlePickFile(); }} disabled={busy} aria-label="Lägg till bild" title="Lägg till bild" style={{ width: 34, height: 34, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 17, background: "transparent", border: "none", cursor: busy ? "wait" : "pointer", flexShrink: 0, padding: 0 }}>
              <ImageIcon size={18} color={t.mute} />
            </button>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" multiple onChange={handleFileChange} style={{ display: "none" }} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} style={{ display: "none" }} />

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !busy) {
                  e.preventDefault();
                  send(input, pendingImages);
                }
              }}
              placeholder=""
              rows={1}
              style={{
                flex: 1,
                minWidth: 0,
                resize: "none",
                fontFamily: body,
                // 16px = lägstanivå för att iOS Safari inte ska autozooma
                // när textfältet får fokus.
                fontSize: 16,
                background: "transparent",
                color: t.ink,
                border: "none",
                borderRadius: 0,
                padding: "6px 6px",
                outline: "none",
                lineHeight: 1.4,
                height: 34,
                overflowY: "auto",
                whiteSpace: "nowrap",
              }}
            />

            <button type="button" onClick={() => { void haptic("success"); send(input, pendingImages); }} disabled={busy || (!input.trim() && pendingImages.length === 0)} aria-label="Skicka" style={{ width: 34, height: 34, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 17, background: ACC, color: "#FFFBF0", border: "none", cursor: busy ? "wait" : "pointer", opacity: busy || (!input.trim() && pendingImages.length === 0) ? 0.5 : 1, flexShrink: 0 }}>
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

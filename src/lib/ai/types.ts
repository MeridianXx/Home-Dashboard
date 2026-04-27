// ─── AI · delade typer (modul-agnostiska) ────────────────────────────────────
// Används av båda chat- och briefing-flödena samt av modul-specifika tool-
// registries (garden, fitness, etc.). Speglar Anthropic-SDK:s message-format
// men i en mindre yta så vi inte läcker SDK-typer ut i route-koden.

import type Anthropic from "@anthropic-ai/sdk";

/** Inkommande user/assistant-meddelanden från klienten (chat-historiken). */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string | Array<TextBlock | ImageBlock>;
}

export interface TextBlock {
  type: "text";
  text: string;
}

export interface ImageBlock {
  type: "image";
  source: {
    type: "base64";
    media_type: "image/png" | "image/jpeg" | "image/gif" | "image/webp";
    data: string;
  };
}

/** Tool-definition redo att registreras i en `ToolRegistry`. Schemat följer
 *  Anthropic JSON-schema-konventionen. */
export interface ToolDefinition<TInput = Record<string, unknown>, TOutput = unknown> {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  /** Server-side handler som körs när modellen anropar verktyget. */
  handler: (input: TInput) => Promise<TOutput>;
}

/** Map från tool-namn → definition. `executeToolCall` slår upp i denna. */
export type ToolRegistry = Record<string, ToolDefinition>;

/** Streaming-event som /api/.../chat:s SSE-output skickar till klienten. */
export type StreamEvent =
  | { type: "text"; delta: string }
  | { type: "tool_use_start"; name: string; input: unknown }
  | { type: "tool_use_result"; name: string; ok: boolean; result?: unknown; error?: string }
  | { type: "stop"; stopReason: string }
  | { type: "error"; message: string }
  | { type: "usage"; inputTokens: number; outputTokens: number };

/** Re-export så modul-koden kan typa parametrar utan att importera SDK:n direkt. */
export type AnthropicMessageParam = Anthropic.Messages.MessageParam;
export type AnthropicTool = Anthropic.Messages.Tool;

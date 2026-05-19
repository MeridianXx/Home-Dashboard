// ─── AI · server-side input-validering ───────────────────────────────────────
// Klient-side validering räcker inte — en direkt POST kan kringgå UI-checken
// och skicka godtyckligt stora base64-blobs. Det kostar Anthropic-budget och
// risker minneshugg i Next-processen.

import type { ChatMessage } from "@/lib/ai/types";

// 5 MB base64 ≈ 3.75 MB faktisk bilddata. Matchar Anthropic-API:ts gräns
// och klient-side-checken.
export const MAX_IMAGE_BASE64_BYTES = 5 * 1024 * 1024;

// Anthropic accepterar bara dessa media-types för image-block.
const ALLOWED_MEDIA_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

/** Returnerar felmeddelande som sträng om något är fel, annars null. */
export function validateChatMessages(messages: ChatMessage[]): string | null {
  if (!Array.isArray(messages) || messages.length === 0) {
    return "messages krävs (icke-tom array)";
  }
  if (messages.length > 100) {
    return "för många meddelanden (max 100 per request)";
  }

  for (const m of messages) {
    if (m.role !== "user" && m.role !== "assistant") {
      return `ogiltig role: ${m.role}`;
    }
    if (typeof m.content === "string") {
      if (m.content.length > 50_000) {
        return "meddelande för långt (max 50 000 tecken)";
      }
      continue;
    }
    if (!Array.isArray(m.content)) {
      return "content måste vara sträng eller array";
    }

    for (const block of m.content) {
      if (block.type === "text") {
        if (typeof block.text !== "string") return "text-block utan text-fält";
        if (block.text.length > 50_000) {
          return "text-block för långt (max 50 000 tecken)";
        }
        continue;
      }
      if (block.type === "image") {
        const src = block.source;
        if (!src || src.type !== "base64") {
          return "image-block kräver source.type = base64";
        }
        if (!ALLOWED_MEDIA_TYPES.has(src.media_type)) {
          return `otillåten media_type: ${src.media_type}`;
        }
        if (typeof src.data !== "string") {
          return "image source.data måste vara base64-sträng";
        }
        if (src.data.length > MAX_IMAGE_BASE64_BYTES) {
          return `bild för stor (max ${MAX_IMAGE_BASE64_BYTES} base64-tecken)`;
        }
        continue;
      }
      return `okänd content-block-typ`;
    }
  }

  return null;
}

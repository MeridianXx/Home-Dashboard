// ─── Claude API — generisk wrapper ───────────────────────────────────────────
// Tunn yta runt @anthropic-ai/sdk. En singleton-klient + två export-funktioner:
//   • createMessage() — fullständigt svar (icke-streaming)
//   • streamMessage() — async iterable av delta-event från SDK:n
// Modul-specifika filer (t.ex. garden/ai-tools.ts) bygger ovanpå dessa istället
// för att tala mot SDK:n direkt — så modellnamn/keys/timeout sitter i en fil.

import Anthropic from "@anthropic-ai/sdk";

/** Sonnet 4.6 är default per jan 2026. För coach/briefing-flöden räcker den
 *  och prompt-cache hittar bättre med en fast modell. */
export const DEFAULT_MODEL = "claude-sonnet-4-6";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY saknas i env");
  if (!client) client = new Anthropic({ apiKey: key });
  return client;
}

export function isClaudeReady(): boolean {
  return (process.env.ANTHROPIC_API_KEY ?? "").length > 0;
}

/** Direkt-exponera klienten för platser som behöver Anthropic-typer. */
export function anthropicClient(): Anthropic {
  return getClient();
}

export type CreateMessageArgs = Anthropic.Messages.MessageCreateParamsNonStreaming;
export type CreateMessageResponse = Anthropic.Messages.Message;
export type StreamMessageArgs = Anthropic.Messages.MessageCreateParamsStreaming;

/** Icke-streaming. Används av briefing och korta one-shot-anrop. */
export async function createMessage(
  args: Omit<CreateMessageArgs, "model"> & { model?: string },
): Promise<CreateMessageResponse> {
  const c = getClient();
  // Spread argen FÖRST, sätt model sist — annars skriver `...args` över
  // model:en med `undefined` om anroparen inte gav någon.
  return c.messages.create({
    ...args,
    model: args.model ?? DEFAULT_MODEL,
  } as CreateMessageArgs);
}

/** Streaming. Returnerar SDK:s `MessageStream` som vi konsumerar i tools.ts. */
export function streamMessage(
  args: Omit<StreamMessageArgs, "model" | "stream"> & { model?: string },
): ReturnType<Anthropic["messages"]["stream"]> {
  const c = getClient();
  return c.messages.stream({
    ...args,
    model: args.model ?? DEFAULT_MODEL,
  } as Omit<StreamMessageArgs, "stream">);
}

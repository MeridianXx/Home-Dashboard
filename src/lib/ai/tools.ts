// ─── AI · tool-use-loop ──────────────────────────────────────────────────────
// Hanterar Anthropics tool-use-protokoll: modellen kan returnera en eller flera
// `tool_use`-block. Vi kör motsvarande handler i `ToolRegistry`, lägger
// `tool_result` i message-historiken och kör ett nytt anrop. Loopar tills
// modellen är "klar" (`end_turn`) eller `MAX_ITERATIONS` nås.

import type Anthropic from "@anthropic-ai/sdk";
import { streamMessage, createMessage, DEFAULT_MODEL } from "./claude";
import type {
  ToolRegistry,
  ToolDefinition,
  StreamEvent,
  AnthropicMessageParam,
} from "./types";

const MAX_ITERATIONS = 10;

/**
 * Mappa en `ToolRegistry` till SDK:ns `Tool[]`-format. SDK:n vill ha namn,
 * description och input_schema (ingen handler). Schemat skickar vi rakt
 * igenom — tool-definitionen ansvarar själv för korrekt JSON-schema.
 */
export function toolsForSdk(registry: ToolRegistry): Anthropic.Messages.Tool[] {
  return Object.values(registry).map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema as Anthropic.Messages.Tool.InputSchema,
  }));
}

/**
 * Kör en tool-call mot registret och returnera ett `tool_result`-block.
 * Fångar exceptions så modellen får ett strukturerat felmeddelande att jobba
 * vidare med istället för att flödet kraschar.
 */
async function runTool(
  registry: ToolRegistry,
  toolUseId: string,
  name: string,
  input: unknown,
): Promise<{ block: Anthropic.Messages.ToolResultBlockParam; ok: boolean; result?: unknown; error?: string }> {
  const def: ToolDefinition | undefined = registry[name];
  if (!def) {
    return {
      block: {
        type: "tool_result",
        tool_use_id: toolUseId,
        content: `Tool "${name}" finns inte i registret.`,
        is_error: true,
      },
      ok: false,
      error: `unknown tool: ${name}`,
    };
  }
  try {
    const result = await def.handler(input as Record<string, unknown>);
    return {
      block: {
        type: "tool_result",
        tool_use_id: toolUseId,
        content: typeof result === "string" ? result : JSON.stringify(result),
      },
      ok: true,
      result,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      block: {
        type: "tool_result",
        tool_use_id: toolUseId,
        content: `Fel: ${message}`,
        is_error: true,
      },
      ok: false,
      error: message,
    };
  }
}

interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: unknown;
}

/** Plocka tool_use-block + assistant-content ur ett Message-svar. */
function extractToolUses(
  message: Anthropic.Messages.Message,
): { content: Array<Anthropic.Messages.ContentBlock>; toolUses: ToolUseBlock[] } {
  const toolUses: ToolUseBlock[] = [];
  for (const block of message.content) {
    if (block.type === "tool_use") {
      toolUses.push({ type: "tool_use", id: block.id, name: block.name, input: block.input });
    }
  }
  return { content: message.content, toolUses };
}

export interface RunWithToolsArgs {
  system: string;
  messages: AnthropicMessageParam[];
  registry: ToolRegistry;
  model?: string;
  maxTokens?: number;
  /** Skickas via callback per stream-event så route-koden kan SSE:a vidare. */
  onEvent?: (event: StreamEvent) => void;
}

export interface RunWithToolsResult {
  finalText: string;
  iterations: number;
  inputTokens: number;
  outputTokens: number;
  stopReason: string;
}

/**
 * Streamar svar + kör tool-loop. Skickar event via `onEvent` så API-routen
 * kan vidarebefordra till klienten via SSE i samma takt som modellen
 * producerar tokens.
 */
export async function runWithTools(args: RunWithToolsArgs): Promise<RunWithToolsResult> {
  const { system, registry, model, maxTokens = 4096, onEvent } = args;
  const messages: AnthropicMessageParam[] = [...args.messages];
  const tools = toolsForSdk(registry);

  let iterations = 0;
  let totalInput = 0;
  let totalOutput = 0;
  let stopReason = "";
  let finalText = "";

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    // Streama detta anrop. SDK:s .stream() returnerar en MessageStream som
    // emittar text-deltas; den slutgiltiga `finalMessage()` ger oss
    // tool_use-blocken i strukturerat format efter att streamen stängts.
    const stream = streamMessage({
      system,
      messages,
      tools: tools.length > 0 ? tools : undefined,
      max_tokens: maxTokens,
      model,
    });

    // Pipe text-deltas vidare till klienten medan modellen skriver.
    if (onEvent) {
      stream.on("text", (delta) => {
        onEvent({ type: "text", delta });
      });
    }

    const message = await stream.finalMessage();
    totalInput += message.usage.input_tokens;
    totalOutput += message.usage.output_tokens;
    stopReason = message.stop_reason ?? "";

    const { content, toolUses } = extractToolUses(message);

    // Lägg till assistantens svar i historiken (inkl. eventuella tool_use-block).
    messages.push({ role: "assistant", content });

    if (toolUses.length === 0) {
      // Inga fler verktyg — slutgiltig text. Plocka ut den.
      const textBlocks = content.filter((b) => b.type === "text");
      finalText = textBlocks.map((b) => (b as { text: string }).text).join("\n");
      break;
    }

    // Kör verktygen och samla `tool_result`-block i ett nytt user-meddelande.
    const toolResultBlocks: Anthropic.Messages.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      onEvent?.({ type: "tool_use_start", name: tu.name, input: tu.input });
      const r = await runTool(registry, tu.id, tu.name, tu.input);
      toolResultBlocks.push(r.block);
      onEvent?.({
        type: "tool_use_result",
        name: tu.name,
        ok: r.ok,
        result: r.result,
        error: r.error,
      });
    }
    messages.push({ role: "user", content: toolResultBlocks });
  }

  onEvent?.({ type: "stop", stopReason });
  onEvent?.({ type: "usage", inputTokens: totalInput, outputTokens: totalOutput });

  return {
    finalText,
    iterations,
    inputTokens: totalInput,
    outputTokens: totalOutput,
    stopReason,
  };
}

/** Icke-streamande variant av tool-loopen — för t.ex. briefings som inte
 *  visas progressivt. Återanvänder samma fel-fångning som streamingvarianten. */
export async function runWithToolsSync(args: Omit<RunWithToolsArgs, "onEvent">): Promise<RunWithToolsResult> {
  const { system, registry, model, maxTokens = 2048 } = args;
  const messages: AnthropicMessageParam[] = [...args.messages];
  const tools = toolsForSdk(registry);

  let iterations = 0;
  let totalInput = 0;
  let totalOutput = 0;
  let stopReason = "";
  let finalText = "";

  while (iterations < MAX_ITERATIONS) {
    iterations++;
    const message = await createMessage({
      system,
      messages,
      tools: tools.length > 0 ? tools : undefined,
      max_tokens: maxTokens,
      model: model ?? DEFAULT_MODEL,
    });
    totalInput += message.usage.input_tokens;
    totalOutput += message.usage.output_tokens;
    stopReason = message.stop_reason ?? "";

    const { content, toolUses } = extractToolUses(message);
    messages.push({ role: "assistant", content });

    if (toolUses.length === 0) {
      const textBlocks = content.filter((b) => b.type === "text");
      finalText = textBlocks.map((b) => (b as { text: string }).text).join("\n");
      break;
    }
    const toolResultBlocks: Anthropic.Messages.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      const r = await runTool(registry, tu.id, tu.name, tu.input);
      toolResultBlocks.push(r.block);
    }
    messages.push({ role: "user", content: toolResultBlocks });
  }

  return { finalText, iterations, inputTokens: totalInput, outputTokens: totalOutput, stopReason };
}

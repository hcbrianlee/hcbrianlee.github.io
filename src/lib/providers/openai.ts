import OpenAI from "openai";
import type { UsageTotals } from "../types";

/**
 * o-series reasoning models (o1, o3, o3-mini, o4-mini, ...) AND the gpt-5
 * family (gpt-5, gpt-5-mini, gpt-5-nano, and point releases like gpt-5.1)
 * use a different Chat Completions request shape than standard chat models
 * like gpt-4o: they reject temperature/top_p/presence_penalty/seed outright
 * (the API errors on them rather than ignoring them), use
 * max_completion_tokens instead of max_tokens (which also counts invisible
 * internal reasoning tokens, not just the visible answer), and accept an
 * optional reasoning_effort instead of sampling params as their main
 * behavior knob. gpt-5-mini/nano aren't marketed as "o-series reasoning
 * models" but take the identical param set, so they're matched here too.
 * They're also routed through the Responses API (see streamOpenAIReasoning
 * below) instead of Chat Completions, since Chat Completions never returns
 * any reasoning content -- Responses is the only way to get a reasoning
 * summary back at all.
 */
export function isReasoningModel(model: string): boolean {
  return /^o\d/i.test(model) || /^gpt-5/i.test(model);
}

/**
 * A visible-answer delta ("text") or a reasoning-summary delta
 * ("reasoning"). Reasoning events are only ever emitted on the Responses
 * API path (reasoning models, see streamOpenAIReasoning) -- the plain Chat
 * Completions path only ever yields "text".
 */
export type OpenAIStreamEvent = { type: "text"; text: string } | { type: "reasoning"; text: string };

export async function streamOpenAI(params: {
  apiKey: string;
  model: string;
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  temperature: number;
  topP: number;
  presencePenalty: number | null;
  maxTokens: number;
  /** OpenAI's "best effort" reproducibility knob -- paired with temperature 0, usually (not guaranteed) returns the same completion for the same seed+prompt+params. Reasoning models don't support this. */
  seed: number | null;
  /** Reasoning models only ("low" | "medium" | "high") -- ignored for standard chat models. */
  reasoningEffort: string | null;
}): Promise<{ events: AsyncIterable<OpenAIStreamEvent>; getUsage: () => UsageTotals }> {
  const client = new OpenAI({ apiKey: params.apiKey });
  const usage: UsageTotals = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

  if (isReasoningModel(params.model)) {
    return streamOpenAIReasoning(client, params, usage);
  }

  const requestBody: Record<string, unknown> = {
    model: params.model,
    messages: params.messages,
    stream: true,
    stream_options: { include_usage: true },
    temperature: params.temperature,
    top_p: params.topP,
    max_tokens: params.maxTokens,
  };
  if (params.presencePenalty !== null) requestBody.presence_penalty = params.presencePenalty;
  if (params.seed !== null) requestBody.seed = params.seed;

  const stream = await client.chat.completions.create(
    requestBody as unknown as Parameters<typeof client.chat.completions.create>[0]
  );

  async function* events(): AsyncIterable<OpenAIStreamEvent> {
    for await (const chunk of stream as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) yield { type: "text", text: delta };
      // The usage-bearing chunk (sent last, when stream_options.include_usage
      // is set) has an empty `choices` array and no delta.
      if (chunk.usage) {
        usage.inputTokens = chunk.usage.prompt_tokens ?? 0;
        usage.outputTokens = chunk.usage.completion_tokens ?? 0;
        usage.totalTokens = chunk.usage.total_tokens ?? usage.inputTokens + usage.outputTokens;
      }
    }
  }

  return { events: events(), getUsage: () => usage };
}

/**
 * Reasoning models go through the Responses API instead of Chat
 * Completions -- Chat Completions discards a reasoning model's internal
 * reasoning server-side and never returns any of it, at any price point.
 * Responses supports `reasoning.summary`, which streams back a
 * (summarized, not raw) narration of the model's reasoning as it happens,
 * via its own `response.reasoning_summary_text.delta` events, alongside
 * the visible answer's `response.output_text.delta` events. Requesting the
 * summary costs nothing extra -- the underlying reasoning tokens are
 * already generated and billed as output tokens today regardless of
 * whether a summary is requested; this only surfaces something already
 * being paid for.
 */
async function streamOpenAIReasoning(
  client: OpenAI,
  params: {
    model: string;
    messages: { role: "system" | "user" | "assistant"; content: string }[];
    maxTokens: number;
    reasoningEffort: string | null;
  },
  usage: UsageTotals
): Promise<{ events: AsyncIterable<OpenAIStreamEvent>; getUsage: () => UsageTotals }> {
  const requestBody: Record<string, unknown> = {
    model: params.model,
    input: params.messages,
    stream: true,
    max_output_tokens: params.maxTokens,
    reasoning: {
      summary: "auto",
      ...(params.reasoningEffort ? { effort: params.reasoningEffort } : {}),
    },
  };

  const stream = await client.responses.create(
    requestBody as unknown as Parameters<typeof client.responses.create>[0]
  );

  async function* events(): AsyncIterable<OpenAIStreamEvent> {
    for await (const event of stream as unknown as AsyncIterable<OpenAI.Responses.ResponseStreamEvent>) {
      if (event.type === "response.output_text.delta") {
        yield { type: "text", text: event.delta };
      } else if (event.type === "response.reasoning_summary_text.delta") {
        yield { type: "reasoning", text: event.delta };
      } else if (event.type === "response.completed") {
        const u = event.response.usage;
        if (u) {
          usage.inputTokens = u.input_tokens ?? 0;
          usage.outputTokens = u.output_tokens ?? 0;
          usage.totalTokens = u.total_tokens ?? usage.inputTokens + usage.outputTokens;
        }
      }
    }
  }

  return { events: events(), getUsage: () => usage };
}

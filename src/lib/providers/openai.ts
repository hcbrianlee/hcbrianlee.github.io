import OpenAI from "openai";
import type { UsageTotals } from "../types";

/**
 * o-series reasoning models (o1, o3, o3-mini, o4-mini, ...) use a different
 * Chat Completions request shape than standard chat models like gpt-4o:
 * they reject temperature/top_p/presence_penalty/seed outright (the API
 * errors on them rather than ignoring them), use max_completion_tokens
 * instead of max_tokens (which also counts invisible internal reasoning
 * tokens, not just the visible answer), and accept an optional
 * reasoning_effort instead of sampling params as their main behavior knob.
 */
export function isReasoningModel(model: string): boolean {
  return /^o\d/i.test(model);
}

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
}): Promise<{ textStream: AsyncIterable<string>; getUsage: () => UsageTotals }> {
  const client = new OpenAI({ apiKey: params.apiKey });
  const usage: UsageTotals = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  const reasoning = isReasoningModel(params.model);

  const requestBody: Record<string, unknown> = {
    model: params.model,
    messages: params.messages,
    stream: true,
    stream_options: { include_usage: true },
  };

  if (reasoning) {
    requestBody.max_completion_tokens = params.maxTokens;
    if (params.reasoningEffort) requestBody.reasoning_effort = params.reasoningEffort;
  } else {
    requestBody.temperature = params.temperature;
    requestBody.top_p = params.topP;
    if (params.presencePenalty !== null) requestBody.presence_penalty = params.presencePenalty;
    if (params.seed !== null) requestBody.seed = params.seed;
    requestBody.max_tokens = params.maxTokens;
  }

  const stream = await client.chat.completions.create(
    requestBody as unknown as Parameters<typeof client.chat.completions.create>[0]
  );

  async function* textStream(): AsyncIterable<string> {
    for await (const chunk of stream as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) yield delta;
      // The usage-bearing chunk (sent last, when stream_options.include_usage
      // is set) has an empty `choices` array and no delta.
      if (chunk.usage) {
        usage.inputTokens = chunk.usage.prompt_tokens ?? 0;
        usage.outputTokens = chunk.usage.completion_tokens ?? 0;
        usage.totalTokens = chunk.usage.total_tokens ?? usage.inputTokens + usage.outputTokens;
      }
    }
  }

  return { textStream: textStream(), getUsage: () => usage };
}

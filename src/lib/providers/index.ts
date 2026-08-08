import type { Provider, UsageTotals } from "../types";
import { streamOpenAI } from "./openai";
import { streamAnthropic } from "./anthropic";

export async function streamChat(params: {
  provider: Provider;
  model: string;
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  temperature: number;
  topP: number;
  /** OpenAI only -- silently ignored for the "anthropic" provider (no equivalent param). */
  presencePenalty: number | null;
  maxTokens: number;
  /** OpenAI only -- silently ignored for the "anthropic" provider (no equivalent param). */
  seed: number | null;
  /** OpenAI reasoning models only (o1/o3/o4-*) -- silently ignored otherwise. */
  reasoningEffort: string | null;
}): Promise<{ textStream: AsyncIterable<string>; getUsage: () => UsageTotals }> {
  if (params.provider === "anthropic") {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    return streamAnthropic({
      apiKey,
      model: params.model,
      messages: params.messages,
      temperature: params.temperature,
      topP: params.topP,
      maxTokens: params.maxTokens,
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  return streamOpenAI({
    apiKey,
    model: params.model,
    messages: params.messages,
    temperature: params.temperature,
    topP: params.topP,
    presencePenalty: params.presencePenalty,
    maxTokens: params.maxTokens,
    seed: params.seed,
    reasoningEffort: params.reasoningEffort,
  });
}

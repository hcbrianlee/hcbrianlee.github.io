import Anthropic from "@anthropic-ai/sdk";
import type { UsageTotals } from "../types";

const DEFAULT_MAX_TOKENS = 1024;

export async function streamAnthropic(params: {
  apiKey: string;
  model: string;
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  temperature: number;
  topP: number;
  topK: number | null;
  maxTokens: number;
}): Promise<{ textStream: AsyncIterable<string>; getUsage: () => UsageTotals }> {
  const client = new Anthropic({ apiKey: params.apiKey });
  const usage: UsageTotals = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

  const system = params.messages.find((m) => m.role === "system")?.content;
  const conversation = params.messages
    .filter((m): m is { role: "user" | "assistant"; content: string } => m.role !== "system");

  // Anthropic's temperature scale is 0-1 (OpenAI's is 0-2) -- clamp so a
  // shared MODEL_*_TEMPERATURE value tuned for OpenAI doesn't error out if a
  // model is ever pointed at Anthropic instead. top_p is already 0-1 on
  // both, so it's passed through unchanged.
  const temperature = Math.min(params.temperature, 1);

  const stream = client.messages.stream({
    model: params.model,
    max_tokens: params.maxTokens || DEFAULT_MAX_TOKENS,
    system,
    messages: conversation,
    temperature,
    top_p: params.topP,
    ...(params.topK !== null ? { top_k: params.topK } : {}),
  });

  async function* textStream(): AsyncIterable<string> {
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield event.delta.text;
      }
    }
    const final = await stream.finalMessage();
    usage.inputTokens = final.usage.input_tokens ?? 0;
    usage.outputTokens = final.usage.output_tokens ?? 0;
    usage.totalTokens = usage.inputTokens + usage.outputTokens;
  }

  return { textStream: textStream(), getUsage: () => usage };
}

import Anthropic from "@anthropic-ai/sdk";
import type { UsageTotals } from "../types";

const DEFAULT_MAX_TOKENS = 1024;

export async function streamAnthropic(params: {
  apiKey: string;
  model: string;
  messages: { role: "system" | "user" | "assistant"; content: string }[];
}): Promise<{ textStream: AsyncIterable<string>; getUsage: () => UsageTotals }> {
  const client = new Anthropic({ apiKey: params.apiKey });
  const usage: UsageTotals = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

  const system = params.messages.find((m) => m.role === "system")?.content;
  const conversation = params.messages
    .filter((m): m is { role: "user" | "assistant"; content: string } => m.role !== "system");

  const stream = client.messages.stream({
    model: params.model,
    max_tokens: DEFAULT_MAX_TOKENS,
    system,
    messages: conversation,
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

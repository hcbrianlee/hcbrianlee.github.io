import OpenAI from "openai";
import type { UsageTotals } from "../types";

export async function streamOpenAI(params: {
  apiKey: string;
  model: string;
  messages: { role: "system" | "user" | "assistant"; content: string }[];
}): Promise<{ textStream: AsyncIterable<string>; getUsage: () => UsageTotals }> {
  const client = new OpenAI({ apiKey: params.apiKey });
  const usage: UsageTotals = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

  const stream = await client.chat.completions.create({
    model: params.model,
    messages: params.messages,
    stream: true,
    stream_options: { include_usage: true },
  });

  async function* textStream(): AsyncIterable<string> {
    for await (const chunk of stream) {
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

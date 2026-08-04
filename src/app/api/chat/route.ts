import { NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { getModelConfig } from "@/lib/models";
import { streamChat } from "@/lib/providers";
import { estimateImpact } from "@/lib/carbon";
import { getCumulativeUsage } from "@/lib/session";
import type { ChatStreamFrame, ModelKey } from "@/lib/types";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function encodeFrame(frame: ChatStreamFrame): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(frame) + "\n");
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const sessionId: string | undefined = body?.sessionId;
  const modelKey: ModelKey | undefined = body?.modelKey;
  const messages: { role: "user" | "assistant"; content: string }[] | undefined = body?.messages;

  if (
    !sessionId ||
    (modelKey !== "light" && modelKey !== "heavy") ||
    !Array.isArray(messages) ||
    messages.length === 0
  ) {
    return jsonError("sessionId, modelKey ('light'|'heavy'), and a non-empty messages array are required", 400);
  }

  const supabase = getSupabaseServerClient();

  const { data: session, error: sessionErr } = await supabase
    .from("sessions")
    .select("id, status")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionErr || !session) {
    return jsonError("Unknown session", 404);
  }
  if (session.status !== "active") {
    return jsonError("Session has already ended", 409);
  }

  const modelCfg = getModelConfig(modelKey);
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");

  // Log the prompt before generating so we have a record even if the
  // downstream provider call fails.
  await supabase.from("events").insert({
    session_id: sessionId,
    event_type: "prompt_submitted",
    model: modelCfg.key,
    provider: modelCfg.provider,
    prompt_text: lastUserMessage?.content ?? null,
    prompt_length_chars: lastUserMessage?.content?.length ?? null,
  });

  const systemMessage = {
    role: "system" as const,
    content:
      "You are a helpful creative writing assistant helping a participant draft a caption for The New Yorker Cartoon Caption Contest. Keep responses concise and focused on caption ideas.",
  };

  const startedAt = Date.now();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let fullText = "";
      try {
        const { textStream, getUsage } = await streamChat({
          provider: modelCfg.provider,
          model: modelCfg.model,
          messages: [systemMessage, ...messages],
        });

        for await (const delta of textStream) {
          fullText += delta;
          controller.enqueue(encodeFrame({ type: "delta", text: delta }));
        }

        const usage = getUsage();
        const responseTimeMs = Date.now() - startedAt;
        const impact = estimateImpact({
          modelKey: modelCfg.key,
          totalTokens: usage.totalTokens,
          responseTimeMs,
        });

        await supabase.from("events").insert({
          session_id: sessionId,
          event_type: "response_received",
          model: modelCfg.key,
          provider: modelCfg.provider,
          response_text: fullText,
          input_tokens: usage.inputTokens,
          output_tokens: usage.outputTokens,
          total_tokens: usage.totalTokens,
          response_time_ms: responseTimeMs,
          estimated_energy_wh: impact.energyWh,
          estimated_co2_g: impact.co2G,
          estimated_water_ml: impact.waterMl,
        });

        const cumulative = await getCumulativeUsage(supabase, sessionId);

        controller.enqueue(encodeFrame({ type: "done", usage, impact, cumulative }));
        controller.close();
      } catch (err) {
        console.error("chat stream failed", err);
        controller.enqueue(
          encodeFrame({ type: "error", message: err instanceof Error ? err.message : "Generation failed" })
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

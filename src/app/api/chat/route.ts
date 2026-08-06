import { NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { getModelConfig } from "@/lib/models";
import { streamChat } from "@/lib/providers";
import { estimateImpact } from "@/lib/carbon";
import { estimateCostCents } from "@/lib/pricing";
import { getCumulativeUsage, getFixedPlan } from "@/lib/session";
import type { ChatStreamFrame, ConditionRow, ModelKey } from "@/lib/types";

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

  let supabase;
  let modelCfg;
  let pricingVariant: ConditionRow["pricing_variant"];
  try {
    supabase = getSupabaseServerClient();

    const { data: session, error: sessionErr } = await supabase
      .from("sessions")
      .select("id, status, condition:conditions(pricing_variant)")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionErr || !session) {
      return jsonError("Unknown session", 404);
    }
    if (session.status !== "active") {
      return jsonError("Session has already ended", 409);
    }

    const condition = (session as unknown as { condition: Pick<ConditionRow, "pricing_variant"> | null })
      .condition;
    pricingVariant = condition?.pricing_variant ?? "free";

    if (pricingVariant === "fixed") {
      const plan = await getFixedPlan(supabase, sessionId);
      if (!plan) {
        return jsonError("Choose a model plan before chatting", 400);
      }
      if (plan.model !== modelKey) {
        return jsonError(`Your plan only covers the ${plan.model} model this session`, 400);
      }
    }

    modelCfg = getModelConfig(modelKey);
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
  } catch (err) {
    console.error("POST /api/chat setup failed", err);
    return jsonError(err instanceof Error ? err.message : "Failed to start generation", 500);
  }

  // Heavy and light both call the same underlying model -- sampling
  // temperature/top_p and the artificial delay below are what actually make
  // "heavy" and "light" behave differently. Both give one suggestion per
  // response; the model is told not to mention or number that constraint so
  // it reads as a natural single reply, not an enforced rule.
  const systemMessage = {
    role: "system" as const,
    content: [
      "You are a creative-writing assistant with exactly one job: help this participant brainstorm,",
      "refine, and polish captions for The New Yorker Cartoon Caption Contest.",
      "",
      "In scope: cartoon caption ideas, jokes, wordplay, comedic angles, tone, and feedback on captions",
      "the participant has drafted.",
      "",
      "Out of scope: everything else -- general knowledge questions, coding help, writing unrelated to",
      "a caption, personal advice, or any other topic. If the participant asks for something out of",
      "scope, do not answer it, even partially. Reply with one short sentence declining and redirecting",
      "them back to the caption task, for example: \"I'm just here to help with your contest caption --",
      "want to try a different angle on the cartoon?\"",
      "",
      "Keep in-scope responses concise and focused on caption ideas. Give exactly one caption suggestion",
      "per response -- never a list or multiple options. Do not mention, number, or otherwise call out",
      "that you're limiting yourself to one; just respond naturally, as a collaborator would.",
    ].join("\n"),
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
          temperature: modelCfg.temperature,
          topP: modelCfg.topP,
        });

        for await (const delta of textStream) {
          fullText += delta;
          controller.enqueue(encodeFrame({ type: "delta", text: delta }));
        }

        const usage = getUsage();

        // Artificial "heavier model" delay -- both models call gpt-4o-mini
        // under the hood, so this is what actually makes heavy responses
        // slower. A flat extraDelayBaseSec +/- extraDelayJitterSec pause
        // (uniformly random), not proportional to response length. Applied
        // before computing responseTimeMs so it's reflected in the logged
        // latency, not just an invisible pause the data doesn't see.
        if (modelCfg.extraDelayBaseSec > 0) {
          const jitter = (Math.random() * 4 - 1) * modelCfg.extraDelayJitterSec;
          const extraDelayMs = Math.max(0, modelCfg.extraDelayBaseSec + jitter) * 1000;
          await new Promise((resolve) => setTimeout(resolve, extraDelayMs));
        }

        const responseTimeMs = Date.now() - startedAt;
        const impact = estimateImpact({
          modelKey: modelCfg.key,
          totalTokens: usage.totalTokens,
          responseTimeMs,
        });
        const costCents = estimateCostCents({
          modelKey: modelCfg.key,
          totalTokens: usage.totalTokens,
          pricingVariant,
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
          estimated_cost_cents: costCents,
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

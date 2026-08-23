import { NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { getModelConfig } from "@/lib/models";
import { streamChat } from "@/lib/providers";
import { isReasoningModel } from "@/lib/providers/openai";
import { estimateImpact } from "@/lib/carbon";
import { estimateCostCents, getMaxTokensPerSession } from "@/lib/pricing";
import { getCumulativeUsage } from "@/lib/session";
import { getExperimentOverrides } from "@/lib/overrides";
import type { ChatStreamFrame, ConditionRow, ModelKey } from "@/lib/types";

const DEFAULT_MAX_TOKENS = 1024;
// Reasoning models spend part of max_completion_tokens on invisible
// internal reasoning before producing any visible answer -- 1024 is prone
// to truncating the response to nothing on a multi-step task like the
// scheduling puzzle, so reasoning models get a larger default budget.
const DEFAULT_MAX_TOKENS_REASONING = 4096;
const DEFAULT_PRESENCE_PENALTY = 0;

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
  let effective: {
    temperature: number;
    topP: number;
    presencePenalty: number | null;
    maxTokens: number;
    systemTone: string | null;
    systemPrompt: string;
    seed: number | null;
    delayBaseSec: number;
    delayJitterSec: number;
    reasoningEffort: string | null;
  };
  try {
    supabase = getSupabaseServerClient();

    const { data: session, error: sessionErr } = await supabase
      .from("sessions")
      .select("id, status, fixed_credit_cents, condition:conditions(pricing_variant)")
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
    pricingVariant = condition?.pricing_variant ?? "flat";

    // Hard stops (design doc, 2026-08), checked server-side (never trust a
    // client-side gate for this) before generating so an over-cap request
    // is rejected without ever calling the model:
    // - Universal token cap applies to BOTH pricing variants -- once
    //   cumulative total_tokens reaches this, no more messages, period.
    // - "variable" additionally caps by dollar credit on top of that --
    //   in practice the token cap trips first given current per-token
    //   prices, but the dollar check stays as a backstop.
    const cumulative = await getCumulativeUsage(supabase, sessionId);
    const maxTokens = getMaxTokensPerSession();
    if (cumulative.totalTokens >= maxTokens) {
      return jsonError(`You've reached the ${maxTokens.toLocaleString()}-token limit for this session.`, 402);
    }
    if (pricingVariant === "variable" && cumulative.spentCents >= session.fixed_credit_cents) {
      return jsonError("You've used your full participation credit for this session.", 402);
    }

    modelCfg = getModelConfig(modelKey);

    // Live experimenter overrides from /admin -- null fields fall back to
    // the src/lib/models.ts default for this model. See src/lib/overrides.ts.
    // No built-in default system prompt for either task: heavySystemPrompt/
    // lightSystemPrompt fall back to "" (no system message at all) rather
    // than a hardcoded default -- see the systemMessage construction below.
    const overrides = await getExperimentOverrides(supabase);
    const defaultMaxTokens = isReasoningModel(modelCfg.model) ? DEFAULT_MAX_TOKENS_REASONING : DEFAULT_MAX_TOKENS;
    effective =
      modelKey === "heavy"
        ? {
            temperature: overrides.heavyTemperature ?? modelCfg.temperature,
            topP: overrides.heavyTopP ?? modelCfg.topP,
            presencePenalty: overrides.heavyPresencePenalty ?? DEFAULT_PRESENCE_PENALTY,
            maxTokens: overrides.heavyMaxTokens ?? defaultMaxTokens,
            systemTone: overrides.heavySystemTone,
            systemPrompt: overrides.heavySystemPrompt ?? "",
            seed: overrides.heavySeed,
            delayBaseSec: overrides.heavyDelayBaseSec ?? modelCfg.extraDelayBaseSec,
            delayJitterSec: overrides.heavyDelayJitterSec ?? modelCfg.extraDelayJitterSec,
            reasoningEffort: overrides.heavyReasoningEffort ?? modelCfg.reasoningEffort,
          }
        : {
            temperature: overrides.lightTemperature ?? modelCfg.temperature,
            topP: overrides.lightTopP ?? modelCfg.topP,
            presencePenalty: overrides.lightPresencePenalty ?? DEFAULT_PRESENCE_PENALTY,
            maxTokens: overrides.lightMaxTokens ?? defaultMaxTokens,
            systemTone: overrides.lightSystemTone,
            systemPrompt: overrides.lightSystemPrompt ?? "",
            seed: overrides.lightSeed,
            delayBaseSec: overrides.lightDelayBaseSec ?? modelCfg.extraDelayBaseSec,
            delayJitterSec: overrides.lightDelayJitterSec ?? modelCfg.extraDelayJitterSec,
            reasoningEffort: overrides.lightReasoningEffort ?? modelCfg.reasoningEffort,
          };

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

  // No built-in system prompt for either model or task -- effective.systemPrompt
  // is only ever a per-model override set from /admin (empty by default), with
  // system_tone appended as an extra line if the admin has set one. If neither
  // is set, no system message is sent at all: the model gets no instructions
  // about the task, the single-suggestion rule, or heavy/light framing --
  // sampling params (temperature, top_p, delay, etc.) are the only thing
  // differentiating heavy and light in that case.
  const systemContent = [effective.systemPrompt, ...(effective.systemTone ? [`Tone: ${effective.systemTone}`] : [])]
    .filter(Boolean)
    .join("\n\n");
  const systemMessages = systemContent ? [{ role: "system" as const, content: systemContent }] : [];

  const startedAt = Date.now();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let fullText = "";
      try {
        // Artificial per-model delay -- both models call the same underlying
        // model, so this (and effective.delayBaseSec/delayJitterSec, live
        // adjustable from /admin) is what actually makes "heavy" and
        // "light" take different amounts of time. Applied before generation
        // starts, while the client is still showing the pending/typing
        // indicator (no content yet) -- delaying it until after the text
        // has already streamed in would make it a silent pause on an
        // already-visible answer instead of a felt "thinking" delay.
        if (effective.delayBaseSec > 0) {
          const jitter = (5 + Math.random() * 2 - 1) * effective.delayJitterSec;
          const extraDelayMs = Math.max(0, effective.delayBaseSec + jitter) * 1000;
          await new Promise((resolve) => setTimeout(resolve, extraDelayMs));
        }

        const { textStream, getUsage } = await streamChat({
          provider: modelCfg.provider,
          model: modelCfg.model,
          messages: [...systemMessages, ...messages],
          temperature: effective.temperature,
          topP: effective.topP,
          presencePenalty: effective.presencePenalty,
          maxTokens: effective.maxTokens,
          seed: effective.seed,
          reasoningEffort: effective.reasoningEffort,
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

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { getExperimentOverrides, saveExperimentOverrides, type ExperimentOverrides } from "@/lib/overrides";
import { getModelConfig } from "@/lib/models";
import { isReasoningModel } from "@/lib/providers/openai";
import { getMaxTokensPerSession } from "@/lib/pricing";

export const runtime = "nodejs";

const DEFAULT_MAX_TOKENS = 1024;
const DEFAULT_MAX_TOKENS_REASONING = 4096;

function defaults() {
  const heavy = getModelConfig("heavy");
  const light = getModelConfig("light");
  const heavyReasoning = isReasoningModel(heavy.model);
  const lightReasoning = isReasoningModel(light.model);
  return {
    // Env default (MAX_TOKENS_PER_SESSION) -- shown as the NumberField's
    // "default" when no /admin override is set.
    maxTokensPerSession: getMaxTokensPerSession(null),
    heavy: {
      provider: heavy.provider,
      // Reasoning models (o1/o3/o4-*) reject temperature/top_p/presence_penalty
      // outright via the API -- these are no-ops on heavy now, kept only so
      // the dashboard's shared fields stay uniform. See isReasoning below.
      isReasoning: heavyReasoning,
      temperature: heavy.temperature,
      topP: heavy.topP,
      // presence_penalty has no Anthropic equivalent -- there's no
      // model.ts default for it, so the dashboard shows "0" (the
      // provider's own default) rather than model.ts.
      presencePenalty: 0,
      maxTokens: heavyReasoning ? DEFAULT_MAX_TOKENS_REASONING : DEFAULT_MAX_TOKENS,
      systemTone: "" as string,
      // No built-in default for either task -- if this is unset, no system
      // message is sent at all (see src/app/api/chat/route.ts).
      systemPrompt: "" as string,
      // No model.ts default -- unset means OpenAI/Anthropic pick their own
      // random seed per request, which is exactly what "no override" should mean.
      seed: null as number | null,
      delayBaseSec: heavy.extraDelayBaseSec,
      delayJitterSec: heavy.extraDelayJitterSec,
      reasoningEffort: heavy.reasoningEffort,
    },
    light: {
      provider: light.provider,
      isReasoning: lightReasoning,
      temperature: light.temperature,
      topP: light.topP,
      presencePenalty: 0,
      maxTokens: lightReasoning ? DEFAULT_MAX_TOKENS_REASONING : DEFAULT_MAX_TOKENS,
      systemTone: "" as string,
      systemPrompt: "" as string,
      seed: null as number | null,
      delayBaseSec: light.extraDelayBaseSec,
      delayJitterSec: light.extraDelayJitterSec,
      reasoningEffort: light.reasoningEffort,
    },
  };
}

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const supabase = getSupabaseServerClient();
    const overrides = await getExperimentOverrides(supabase);
    return NextResponse.json({ overrides, defaults: defaults() });
  } catch (err) {
    console.error("GET /api/admin/settings failed", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<ExperimentOverrides>;
    const supabase = getSupabaseServerClient();
    const overrides = await saveExperimentOverrides(supabase, body);
    return NextResponse.json({ overrides, defaults: defaults() });
  } catch (err) {
    console.error("POST /api/admin/settings failed", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

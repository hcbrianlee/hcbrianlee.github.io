import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { getExperimentOverrides, saveExperimentOverrides, type ExperimentOverrides } from "@/lib/overrides";
import { getModelConfig } from "@/lib/models";

export const runtime = "nodejs";

function defaults() {
  const heavy = getModelConfig("heavy");
  const light = getModelConfig("light");
  return {
    heavy: {
      provider: heavy.provider,
      temperature: heavy.temperature,
      topP: heavy.topP,
      // presence_penalty has no Anthropic equivalent -- there's no
      // model.ts default for it, so the dashboard shows "0" (the
      // provider's own default) rather than model.ts.
      presencePenalty: 0,
      maxTokens: 1024,
      systemTone: "" as string,
      // No built-in default for either task -- if this is unset, no system
      // message is sent at all (see src/app/api/chat/route.ts).
      systemPrompt: "" as string,
      // No model.ts default -- unset means OpenAI/Anthropic pick their own
      // random seed per request, which is exactly what "no override" should mean.
      seed: null as number | null,
      delayBaseSec: heavy.extraDelayBaseSec,
      delayJitterSec: heavy.extraDelayJitterSec,
    },
    light: {
      provider: light.provider,
      temperature: light.temperature,
      topP: light.topP,
      presencePenalty: 0,
      maxTokens: 1024,
      systemTone: "" as string,
      systemPrompt: "" as string,
      seed: null as number | null,
      delayBaseSec: light.extraDelayBaseSec,
      delayJitterSec: light.extraDelayJitterSec,
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

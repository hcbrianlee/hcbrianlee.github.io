import type { SupabaseClient } from "@supabase/supabase-js";

export type ActiveTask = "cartoon" | "scheduling" | "staffScheduling" | "adCaption" | "tripPlanning";

export interface ExperimentOverrides {
  /**
   * Which task participants see: the cartoon caption contest, or the
   * speaker-scheduling puzzle (src/lib/scheduling.ts). Global -- applies to
   * every session, not per-participant like the randomized condition. This
   * is a temporary dev-only switch for comparing how heavy/light differ
   * across task types; expected to be removed once one task is settled on.
   */
  activeTask: ActiveTask;
  heavyTemperature: number | null;
  lightTemperature: number | null;
  /** Nucleus sampling threshold [0,1]. Supported by both OpenAI and Anthropic. */
  heavyTopP: number | null;
  lightTopP: number | null;
  /** OpenAI only -- Anthropic's API has no presence_penalty param, so this is ignored for any model on the "anthropic" provider. */
  heavyPresencePenalty: number | null;
  lightPresencePenalty: number | null;
  heavyMaxTokens: number | null;
  lightMaxTokens: number | null;
  /** Freeform text appended to that model's system prompt as a "Tone: ..." line. */
  heavySystemTone: string | null;
  lightSystemTone: string | null;
  /**
   * The system prompt sent for that model, if any. There's no built-in
   * default (see src/app/api/chat/route.ts) -- if this is null, no system
   * message is sent at all. system_tone above still gets appended after it
   * if both are set.
   */
  heavySystemPrompt: string | null;
  lightSystemPrompt: string | null;
  /**
   * OpenAI only -- Anthropic's API has no seed param. Paired with
   * temperature: 0, this is OpenAI's "best effort" reproducibility knob:
   * same seed + same params + same prompt usually (not guaranteed) returns
   * the same completion. Neither gpt-4 nor gpt-4o-mini are deterministic
   * even at temperature 0 without it -- that's inherent to how OpenAI
   * serves these models (MoE routing, floating-point non-associativity),
   * not a bug here.
   */
  heavySeed: number | null;
  lightSeed: number | null;
  /**
   * Artificial post-generation delay (seconds), applied as
   * delayBaseSec +/- delayJitterSec (uniformly random) -- see
   * src/app/api/chat/route.ts. This is the whole mechanism behind "heavy
   * takes noticeably longer"; light defaults to 0/0 (no delay) but can be
   * given one here too.
   */
  heavyDelayBaseSec: number | null;
  lightDelayBaseSec: number | null;
  heavyDelayJitterSec: number | null;
  lightDelayJitterSec: number | null;
  /** Reasoning models only ("low" | "medium" | "high") -- see src/lib/providers/openai.ts isReasoningModel. No effect on a standard chat model. */
  heavyReasoningEffort: string | null;
  lightReasoningEffort: string | null;
}

const EMPTY_OVERRIDES: ExperimentOverrides = {
  activeTask: "cartoon",
  heavyTemperature: null,
  lightTemperature: null,
  heavyTopP: null,
  lightTopP: null,
  heavyPresencePenalty: null,
  lightPresencePenalty: null,
  heavyMaxTokens: null,
  lightMaxTokens: null,
  heavySystemTone: null,
  lightSystemTone: null,
  heavySystemPrompt: null,
  lightSystemPrompt: null,
  heavySeed: null,
  lightSeed: null,
  heavyDelayBaseSec: null,
  lightDelayBaseSec: null,
  heavyDelayJitterSec: null,
  lightDelayJitterSec: null,
  heavyReasoningEffort: null,
  lightReasoningEffort: null,
};

/** Row -> ExperimentOverrides. Missing row (never saved yet) reads as all-null, i.e. every model default applies. */
export async function getExperimentOverrides(supabase: SupabaseClient): Promise<ExperimentOverrides> {
  const { data, error } = await supabase.from("experiment_overrides").select("*").eq("id", 1).maybeSingle();
  if (error) throw new Error(`experiment_overrides query failed: ${error.message}`);
  if (!data) return EMPTY_OVERRIDES;

  return {
    activeTask: (["scheduling", "staffScheduling", "adCaption", "tripPlanning"] as const).includes(data.active_task)
      ? data.active_task
      : "cartoon",
    heavyTemperature: data.heavy_temperature,
    lightTemperature: data.light_temperature,
    heavyTopP: data.heavy_top_p,
    lightTopP: data.light_top_p,
    heavyPresencePenalty: data.heavy_presence_penalty,
    lightPresencePenalty: data.light_presence_penalty,
    heavyMaxTokens: data.heavy_max_tokens,
    lightMaxTokens: data.light_max_tokens,
    heavySystemTone: data.heavy_system_tone,
    lightSystemTone: data.light_system_tone,
    heavySystemPrompt: data.heavy_system_prompt,
    lightSystemPrompt: data.light_system_prompt,
    heavySeed: data.heavy_seed,
    lightSeed: data.light_seed,
    heavyDelayBaseSec: data.heavy_delay_base_sec,
    lightDelayBaseSec: data.light_delay_base_sec,
    heavyDelayJitterSec: data.heavy_delay_jitter_sec,
    lightDelayJitterSec: data.light_delay_jitter_sec,
    heavyReasoningEffort: data.heavy_reasoning_effort,
    lightReasoningEffort: data.light_reasoning_effort,
  };
}

/** Partial update -- only the passed keys change; omitted keys keep their current stored value (not reset to null). */
export async function saveExperimentOverrides(
  supabase: SupabaseClient,
  patch: Partial<ExperimentOverrides>
): Promise<ExperimentOverrides> {
  const current = await getExperimentOverrides(supabase);
  const next: ExperimentOverrides = { ...current, ...patch };

  const { error } = await supabase.from("experiment_overrides").upsert({
    id: 1,
    active_task: next.activeTask,
    heavy_temperature: next.heavyTemperature,
    light_temperature: next.lightTemperature,
    heavy_top_p: next.heavyTopP,
    light_top_p: next.lightTopP,
    heavy_presence_penalty: next.heavyPresencePenalty,
    light_presence_penalty: next.lightPresencePenalty,
    heavy_max_tokens: next.heavyMaxTokens,
    light_max_tokens: next.lightMaxTokens,
    heavy_system_tone: next.heavySystemTone,
    light_system_tone: next.lightSystemTone,
    heavy_system_prompt: next.heavySystemPrompt,
    light_system_prompt: next.lightSystemPrompt,
    heavy_seed: next.heavySeed,
    light_seed: next.lightSeed,
    heavy_delay_base_sec: next.heavyDelayBaseSec,
    light_delay_base_sec: next.lightDelayBaseSec,
    heavy_delay_jitter_sec: next.heavyDelayJitterSec,
    light_delay_jitter_sec: next.lightDelayJitterSec,
    heavy_reasoning_effort: next.heavyReasoningEffort,
    light_reasoning_effort: next.lightReasoningEffort,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`experiment_overrides save failed: ${error.message}`);

  return next;
}

import type { SupabaseClient } from "@supabase/supabase-js";

export interface ExperimentOverrides {
  heavyTemperature: number | null;
  lightTemperature: number | null;
  /** OpenAI only -- Anthropic's API has no presence_penalty param, so this is ignored for any model on the "anthropic" provider. */
  heavyPresencePenalty: number | null;
  lightPresencePenalty: number | null;
  heavyMaxTokens: number | null;
  lightMaxTokens: number | null;
  /** Freeform text appended to that model's system prompt as a "Tone: ..." line. */
  heavySystemTone: string | null;
  lightSystemTone: string | null;
  /**
   * OpenAI only -- Anthropic's API has no seed param. Paired with
   * temperature: 0, this is OpenAI's "best effort" reproducibility knob:
   * same seed + same params + same prompt usually (not guaranteed) returns
   * the same completion. Without it, gpt-4o is not deterministic even at
   * temperature 0 -- that's inherent to how OpenAI serves the model (MoE
   * routing, floating-point non-associativity), not a bug here.
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
}

const EMPTY_OVERRIDES: ExperimentOverrides = {
  heavyTemperature: null,
  lightTemperature: null,
  heavyPresencePenalty: null,
  lightPresencePenalty: null,
  heavyMaxTokens: null,
  lightMaxTokens: null,
  heavySystemTone: null,
  lightSystemTone: null,
  heavySeed: null,
  lightSeed: null,
  heavyDelayBaseSec: null,
  lightDelayBaseSec: null,
  heavyDelayJitterSec: null,
  lightDelayJitterSec: null,
};

/** Row -> ExperimentOverrides. Missing row (never saved yet) reads as all-null, i.e. every model default applies. */
export async function getExperimentOverrides(supabase: SupabaseClient): Promise<ExperimentOverrides> {
  const { data, error } = await supabase.from("experiment_overrides").select("*").eq("id", 1).maybeSingle();
  if (error) throw new Error(`experiment_overrides query failed: ${error.message}`);
  if (!data) return EMPTY_OVERRIDES;

  return {
    heavyTemperature: data.heavy_temperature,
    lightTemperature: data.light_temperature,
    heavyPresencePenalty: data.heavy_presence_penalty,
    lightPresencePenalty: data.light_presence_penalty,
    heavyMaxTokens: data.heavy_max_tokens,
    lightMaxTokens: data.light_max_tokens,
    heavySystemTone: data.heavy_system_tone,
    lightSystemTone: data.light_system_tone,
    heavySeed: data.heavy_seed,
    lightSeed: data.light_seed,
    heavyDelayBaseSec: data.heavy_delay_base_sec,
    lightDelayBaseSec: data.light_delay_base_sec,
    heavyDelayJitterSec: data.heavy_delay_jitter_sec,
    lightDelayJitterSec: data.light_delay_jitter_sec,
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
    heavy_temperature: next.heavyTemperature,
    light_temperature: next.lightTemperature,
    heavy_presence_penalty: next.heavyPresencePenalty,
    light_presence_penalty: next.lightPresencePenalty,
    heavy_max_tokens: next.heavyMaxTokens,
    light_max_tokens: next.lightMaxTokens,
    heavy_system_tone: next.heavySystemTone,
    light_system_tone: next.lightSystemTone,
    heavy_seed: next.heavySeed,
    light_seed: next.lightSeed,
    heavy_delay_base_sec: next.heavyDelayBaseSec,
    light_delay_base_sec: next.lightDelayBaseSec,
    heavy_delay_jitter_sec: next.heavyDelayJitterSec,
    light_delay_jitter_sec: next.lightDelayJitterSec,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`experiment_overrides save failed: ${error.message}`);

  return next;
}

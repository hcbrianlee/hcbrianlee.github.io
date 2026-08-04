import type { SupabaseClient } from "@supabase/supabase-js";
import type { CumulativeUsage, ConditionRow } from "./types";

export async function getCumulativeUsage(
  supabase: SupabaseClient,
  sessionId: string
): Promise<CumulativeUsage> {
  const { data, error } = await supabase
    .from("session_usage_summary")
    .select("prompt_count, total_tokens, total_co2_g, total_water_ml")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) throw error;

  return {
    promptCount: data?.prompt_count ?? 0,
    totalTokens: data?.total_tokens ?? 0,
    co2G: Number(data?.total_co2_g ?? 0),
    waterMl: Number(data?.total_water_ml ?? 0),
  };
}

/**
 * Share of logged responses (across all sessions) that used the light
 * model, used for the social-norm nudge ("x% of participants used the
 * light version"). Returns null until there's enough data to be meaningful.
 */
export async function getSocialProofPct(supabase: SupabaseClient): Promise<number | null> {
  const { count: lightCount, error: lightErr } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("event_type", "response_received")
    .eq("model", "light");

  const { count: totalCount, error: totalErr } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("event_type", "response_received");

  if (lightErr) throw lightErr;
  if (totalErr) throw totalErr;

  if (!totalCount || totalCount < 10) return null;
  return Math.round(((lightCount ?? 0) / totalCount) * 100);
}

export async function getConditions(supabase: SupabaseClient): Promise<ConditionRow[]> {
  const { data, error } = await supabase
    .from("conditions")
    .select("id, code, info_variant, pricing_variant, default_model")
    .order("id", { ascending: true });

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error(
      "No rows in `conditions`. Run sql/schema.sql then sql/seed_conditions.sql against your Supabase project."
    );
  }
  return data as ConditionRow[];
}

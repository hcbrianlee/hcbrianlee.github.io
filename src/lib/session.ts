import type { SupabaseClient } from "@supabase/supabase-js";
import type { CaptionSubmission, CumulativeUsage, ConditionRow, EventPromoSubmission } from "./types";
import { DEFAULT_AVG_RESPONSE_TOKENS } from "./carbon";

/** Most caption ideas a single session may submit for its cartoon. */
export const MAX_CAPTION_SUBMISSIONS = 10;

/**
 * Platform-wide average response length per model (model_avg_tokens view),
 * for the "token"/"environmental" model-toggle captions -- falls back to
 * DEFAULT_AVG_RESPONSE_TOKENS for a model with no logged responses yet
 * (e.g. a fresh deployment) rather than showing 0.
 */
export async function getAverageTokensPerModel(supabase: SupabaseClient): Promise<{ heavy: number; light: number }> {
  const { data, error } = await supabase.from("model_avg_tokens").select("model, avg_tokens, response_count");

  if (error) throw new Error(`model_avg_tokens query failed: ${error.message}`);

  const byModel = new Map((data ?? []).map((row) => [row.model, row]));
  const heavyRow = byModel.get("heavy");
  const lightRow = byModel.get("light");

  return {
    heavy: heavyRow && heavyRow.response_count > 0 ? Number(heavyRow.avg_tokens) : DEFAULT_AVG_RESPONSE_TOKENS,
    light: lightRow && lightRow.response_count > 0 ? Number(lightRow.avg_tokens) : DEFAULT_AVG_RESPONSE_TOKENS,
  };
}

export async function getCumulativeUsage(
  supabase: SupabaseClient,
  sessionId: string
): Promise<CumulativeUsage> {
  const { data, error } = await supabase
    .from("session_usage_summary")
    .select("prompt_count, total_tokens, total_co2_g, total_water_ml, total_spent_cents")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) throw new Error(`session_usage_summary query failed: ${error.message}`);

  return {
    promptCount: data?.prompt_count ?? 0,
    totalTokens: data?.total_tokens ?? 0,
    co2G: Number(data?.total_co2_g ?? 0),
    waterMl: Number(data?.total_water_ml ?? 0),
    spentCents: Number(data?.total_spent_cents ?? 0),
  };
}

/**
 * Every caption idea submitted so far for this session, oldest first.
 * Sourced entirely from the `caption_submitted` events already logged by
 * /api/submit-caption -- sessions.final_caption / final_caption_submitted_at
 * are no longer written to, superseded by this event-log-derived list.
 */
export async function getCaptionSubmissions(
  supabase: SupabaseClient,
  sessionId: string
): Promise<CaptionSubmission[]> {
  const { data, error } = await supabase
    .from("events")
    .select("caption_text, created_at")
    .eq("session_id", sessionId)
    .eq("event_type", "caption_submitted")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`caption submissions query failed: ${error.message}`);

  return (data ?? []).map((row) => ({ text: row.caption_text as string, submittedAt: row.created_at as string }));
}

/**
 * Every ad caption idea submitted so far (adCaption task), oldest first --
 * same pattern as getCaptionSubmissions, just a different event_type.
 */
export async function getAdCaptionSubmissions(supabase: SupabaseClient, sessionId: string): Promise<CaptionSubmission[]> {
  const { data, error } = await supabase
    .from("events")
    .select("caption_text, created_at")
    .eq("session_id", sessionId)
    .eq("event_type", "ad_caption_submitted")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`ad caption submissions query failed: ${error.message}`);

  return (data ?? []).map((row) => ({ text: row.caption_text as string, submittedAt: row.created_at as string }));
}

/**
 * Every trip itinerary submitted so far (tripPlanning task), oldest first --
 * same pattern as getCaptionSubmissions, reusing the same caption_text
 * column for the free-text itinerary body.
 */
export async function getTripPlanSubmissions(supabase: SupabaseClient, sessionId: string): Promise<CaptionSubmission[]> {
  const { data, error } = await supabase
    .from("events")
    .select("caption_text, created_at")
    .eq("session_id", sessionId)
    .eq("event_type", "trip_plan_submitted")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`trip plan submissions query failed: ${error.message}`);

  return (data ?? []).map((row) => ({ text: row.caption_text as string, submittedAt: row.created_at as string }));
}

/**
 * When this session's scheduling-puzzle timer began, or null if the
 * participant hasn't clicked "Start" yet (see /api/start-schedule). Sourced
 * from the earliest schedule_started event for this session -- distinct from
 * sessions.started_at, which is stamped at session creation (page load), not
 * when the participant is actually ready to begin the puzzle.
 */
export async function getScheduleStartedAt(supabase: SupabaseClient, sessionId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("events")
    .select("created_at")
    .eq("session_id", sessionId)
    .eq("event_type", "schedule_started")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`schedule started query failed: ${error.message}`);
  return (data?.created_at as string | undefined) ?? null;
}

/**
 * True once any fully-correct schedule has been submitted for this session
 * (scheduling task only) -- sourced from schedule_submitted events' stored
 * metadata.allCorrect (src/app/api/submit-schedule/route.ts), not
 * re-validated here.
 */
export async function getScheduleSolved(supabase: SupabaseClient, sessionId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("events")
    .select("metadata")
    .eq("session_id", sessionId)
    .eq("event_type", "schedule_submitted")
    .eq("metadata->>allCorrect", "true")
    .limit(1);

  if (error) throw new Error(`schedule solved query failed: ${error.message}`);
  return (data ?? []).length > 0;
}

/** Same as getScheduleStartedAt but for the staffScheduling task (see /api/start-staff-schedule). */
export async function getStaffScheduleStartedAt(supabase: SupabaseClient, sessionId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("events")
    .select("created_at")
    .eq("session_id", sessionId)
    .eq("event_type", "staff_schedule_started")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`staff schedule started query failed: ${error.message}`);
  return (data?.created_at as string | undefined) ?? null;
}

/**
 * True once any staff_schedule_submitted event for this session has
 * allCorrect: true -- meaning the participant reached an assignment
 * satisfying every constraint except the one they chose to relax, with a
 * rationale attached. "Correct" here isn't "the right answer" (there isn't
 * one -- 23 different assignments qualify once the right constraint is
 * dropped, and other constraints could be dropped instead) -- it's just
 * "produced a complete, consistent submission," which is what unlocks
 * FinishSection. Whether it was actually a *good* choice is for a human
 * judge reviewing staff_schedule_submitted events directly, not this app.
 */
export async function getStaffScheduleSolved(supabase: SupabaseClient, sessionId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("events")
    .select("metadata")
    .eq("session_id", sessionId)
    .eq("event_type", "staff_schedule_submitted")
    .eq("metadata->>allCorrect", "true")
    .limit(1);

  if (error) throw new Error(`staff schedule solved query failed: ${error.message}`);
  return (data ?? []).length > 0;
}

/**
 * Every eventPromo submission so far, oldest first -- unlike the caption-
 * style tasks, this is structured (evidence list + two texts), so it's
 * stored in metadata jsonb rather than the caption_text column, same
 * pattern as staff_schedule_submitted.
 */
export async function getEventPromoSubmissions(
  supabase: SupabaseClient,
  sessionId: string
): Promise<EventPromoSubmission[]> {
  const { data, error } = await supabase
    .from("events")
    .select("metadata, created_at")
    .eq("session_id", sessionId)
    .eq("event_type", "event_promo_submitted")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`event promo submissions query failed: ${error.message}`);

  return (data ?? []).map((row) => {
    const metadata = row.metadata as { evidenceSelected: string[]; part1: string; part2: string };
    return {
      evidenceSelected: metadata.evidenceSelected,
      part1: metadata.part1,
      part2: metadata.part2,
      submittedAt: row.created_at as string,
    };
  });
}

/**
 * Only active=true rows -- rows retired by a redesign (see sql/schema.sql)
 * stay in the table so existing `sessions.condition_id` references keep
 * resolving, but new session assignment must never draw from them.
 */
export async function getConditions(supabase: SupabaseClient): Promise<ConditionRow[]> {
  const { data, error } = await supabase
    .from("conditions")
    .select("id, code, info_variant, pricing_variant, default_model")
    .eq("active", true)
    .order("id", { ascending: true });

  if (error) throw new Error(`conditions query failed: ${error.message}`);
  if (!data || data.length === 0) {
    throw new Error(
      "No active rows in `conditions`. Run sql/schema.sql then sql/seed_conditions.sql against your Supabase project."
    );
  }
  return data as ConditionRow[];
}

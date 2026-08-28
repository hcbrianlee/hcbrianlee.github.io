import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase";
import { hashIndex } from "@/lib/assignment";
import {
  MAX_CAPTION_SUBMISSIONS,
  getCaptionSubmissions,
  getAdCaptionSubmissions,
  getTripPlanSubmissions,
  getEventPromoSubmissions,
  getConditions,
  getCumulativeUsage,
  getAverageTokensPerModel,
  getScheduleSolved,
  getScheduleStartedAt,
  getStaffScheduleSolved,
  getStaffScheduleStartedAt,
} from "@/lib/session";
import { getPricingCopy } from "@/lib/conditions";
import { getMaxTokensPerSession } from "@/lib/pricing";
import { getModelComparison, estimateAverageResponseImpact } from "@/lib/carbon";
import { pickDefaultModel } from "@/lib/models";
import { getCartoonImageUrl, pickCartoonFilename } from "@/lib/cartoons";
import { getAdProductImageUrl, MAX_AD_CAPTION_SUBMISSIONS } from "@/lib/adTask";
import { MAX_TRIP_PLAN_SUBMISSIONS } from "@/lib/tripPlanning";
import { MAX_EVENT_PROMO_SUBMISSIONS } from "@/lib/eventPromo";
import { getExperimentOverrides } from "@/lib/overrides";
import type { ConditionRow, SessionInfo } from "@/lib/types";

export const runtime = "nodejs";

async function buildSessionInfo(
  supabase: SupabaseClient,
  sessionId: string,
  condition: ConditionRow,
  fixedCreditCents: number,
  cartoonFilename: string,
  startedAt: string
): Promise<SessionInfo> {
  const [
    cumulative,
    avgTokensPerModel,
    captionSubmissions,
    scheduleSolved,
    scheduleStartedAt,
    staffScheduleSolved,
    staffScheduleStartedAt,
    adCaptionSubmissions,
    tripPlanSubmissions,
    eventPromoSubmissions,
    overrides,
  ] = await Promise.all([
    getCumulativeUsage(supabase, sessionId),
    getAverageTokensPerModel(supabase),
    getCaptionSubmissions(supabase, sessionId),
    getScheduleSolved(supabase, sessionId),
    getScheduleStartedAt(supabase, sessionId),
    getStaffScheduleSolved(supabase, sessionId),
    getStaffScheduleStartedAt(supabase, sessionId),
    getAdCaptionSubmissions(supabase, sessionId),
    getTripPlanSubmissions(supabase, sessionId),
    getEventPromoSubmissions(supabase, sessionId),
    getExperimentOverrides(supabase),
  ]);

  const maxTokensPerSession = getMaxTokensPerSession();
  const budgetExhausted =
    cumulative.totalTokens >= maxTokensPerSession ||
    (condition.pricing_variant === "variable" && cumulative.spentCents >= fixedCreditCents);

  return {
    sessionId,
    condition: {
      code: condition.code,
      infoVariant: condition.info_variant,
      pricingVariant: condition.pricing_variant,
      defaultModel: pickDefaultModel(sessionId),
    },
    pricingCopy: getPricingCopy(maxTokensPerSession),
    fixedCreditCents,
    maxTokensPerSession,
    cumulative,
    budgetExhausted,
    avgResponseImpact: {
      heavy: estimateAverageResponseImpact("heavy", avgTokensPerModel.heavy),
      light: estimateAverageResponseImpact("light", avgTokensPerModel.light),
    },
    cartoonImageUrl: getCartoonImageUrl(cartoonFilename),
    captionSubmissions,
    maxCaptionSubmissions: MAX_CAPTION_SUBMISSIONS,
    modelComparison: getModelComparison(),
    activeTask: overrides.activeTask,
    sessionStartedAt: startedAt,
    scheduleStartedAt,
    scheduleSolved,
    staffScheduleStartedAt,
    staffScheduleSolved,
    adProductImageUrl: getAdProductImageUrl(),
    adCaptionSubmissions,
    maxAdCaptionSubmissions: MAX_AD_CAPTION_SUBMISSIONS,
    tripPlanSubmissions,
    maxTripPlanSubmissions: MAX_TRIP_PLAN_SUBMISSIONS,
    eventPromoSubmissions,
    maxEventPromoSubmissions: MAX_EVENT_PROMO_SUBMISSIONS,
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const existingSessionId: string | undefined = body?.existingSessionId;
  const participantRef: string | undefined = body?.participantRef;
  // Internal testing only: forces a specific condition by its `code` instead
  // of the normal sha256(sessionId) mod N assignment, and always mints a
  // fresh session so it can't be confused with a real randomized one. Never
  // reachable unless this exact field is sent (the ordinary UI never sends
  // it), so it can't be used to cherry-pick a condition as a participant.
  const debugConditionCode: string | undefined = body?.debugConditionCode;

  try {
    const supabase = getSupabaseServerClient();

    if (existingSessionId && !debugConditionCode) {
      const { data: existing } = await supabase
        .from("sessions")
        .select(
          "id, fixed_credit_cents, status, cartoon_filename, started_at, condition:conditions(id, code, info_variant, pricing_variant, default_model)"
        )
        .eq("id", existingSessionId)
        .maybeSingle();

      const condition = (existing as unknown as { condition: ConditionRow | null } | null)?.condition ?? null;

      if (existing && condition) {
        const info = await buildSessionInfo(
          supabase,
          existing.id,
          condition,
          existing.fixed_credit_cents,
          existing.cartoon_filename,
          existing.started_at
        );
        return NextResponse.json(info);
      }
      // Unknown session id (e.g. stale localStorage after a DB reset) -- fall
      // through and mint a fresh one instead of erroring the client out.
    }

    const conditions = await getConditions(supabase);
    const sessionId = randomUUID();

    let condition: ConditionRow;
    if (debugConditionCode) {
      const match = conditions.find((c) => c.code === debugConditionCode);
      if (!match) {
        throw new Error(
          `Unknown debug condition code "${debugConditionCode}". Valid codes: ${conditions.map((c) => c.code).join(", ")}`
        );
      }
      condition = match;
    } else {
      const idx = hashIndex(sessionId, conditions.length);
      condition = conditions[idx];
    }

    const cartoonFilename = pickCartoonFilename(sessionId);
    const fixedCreditCents = Number(process.env.FIXED_CREDIT_CENTS ?? 300);

    const { data: inserted, error: insertError } = await supabase
      .from("sessions")
      .insert({
        id: sessionId,
        condition_id: condition.id,
        participant_ref: participantRef ?? null,
        fixed_credit_cents: fixedCreditCents,
        cartoon_filename: cartoonFilename,
      })
      .select("started_at")
      .single();
    if (insertError) throw new Error(`sessions insert failed: ${insertError.message}`);

    await supabase.from("events").insert({
      session_id: sessionId,
      event_type: "session_started",
      metadata: {
        condition_code: condition.code,
        participant_ref: participantRef ?? null,
        debug: Boolean(debugConditionCode),
        cartoon_filename: cartoonFilename,
      },
    });

    const info = await buildSessionInfo(
      supabase,
      sessionId,
      condition,
      fixedCreditCents,
      cartoonFilename,
      inserted.started_at
    );
    return NextResponse.json(info);
  } catch (err) {
    console.error("POST /api/session failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

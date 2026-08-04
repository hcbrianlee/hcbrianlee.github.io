import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase";
import { assignConditionIndex } from "@/lib/assignment";
import { getConditions, getCumulativeUsage, getSocialProofPct } from "@/lib/session";
import { getInfoCopy, getPricingCopy } from "@/lib/conditions";
import type { ConditionRow, SessionInfo } from "@/lib/types";

export const runtime = "nodejs";

async function buildSessionInfo(
  supabase: SupabaseClient,
  sessionId: string,
  condition: ConditionRow,
  fixedCreditCents: number
): Promise<SessionInfo> {
  const [cumulative, socialProofPct] = await Promise.all([
    getCumulativeUsage(supabase, sessionId),
    getSocialProofPct(supabase),
  ]);

  return {
    sessionId,
    condition: {
      code: condition.code,
      infoVariant: condition.info_variant,
      pricingVariant: condition.pricing_variant,
      defaultModel: condition.default_model,
    },
    infoCopy: getInfoCopy(condition.info_variant),
    pricingCopy: getPricingCopy(condition.pricing_variant),
    fixedCreditCents,
    socialProofPct,
    cumulative,
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const existingSessionId: string | undefined = body?.existingSessionId;
  const participantRef: string | undefined = body?.participantRef;

  try {
    const supabase = getSupabaseServerClient();

    if (existingSessionId) {
      const { data: existing } = await supabase
        .from("sessions")
        .select(
          "id, fixed_credit_cents, status, condition:conditions(id, code, info_variant, pricing_variant, default_model)"
        )
        .eq("id", existingSessionId)
        .maybeSingle();

      const condition = (existing as unknown as { condition: ConditionRow | null } | null)?.condition ?? null;

      if (existing && condition) {
        const info = await buildSessionInfo(supabase, existing.id, condition, existing.fixed_credit_cents);
        return NextResponse.json(info);
      }
      // Unknown session id (e.g. stale localStorage after a DB reset) -- fall
      // through and mint a fresh one instead of erroring the client out.
    }

    const conditions = await getConditions(supabase);
    const sessionId = randomUUID();
    const idx = assignConditionIndex(sessionId, conditions.length);
    const condition = conditions[idx];
    const fixedCreditCents = Number(process.env.FIXED_CREDIT_CENTS ?? 1000);

    const { error: insertError } = await supabase.from("sessions").insert({
      id: sessionId,
      condition_id: condition.id,
      participant_ref: participantRef ?? null,
      fixed_credit_cents: fixedCreditCents,
    });
    if (insertError) throw insertError;

    await supabase.from("events").insert({
      session_id: sessionId,
      event_type: "session_started",
      metadata: { condition_code: condition.code, participant_ref: participantRef ?? null },
    });

    const info = await buildSessionInfo(supabase, sessionId, condition, fixedCreditCents);
    return NextResponse.json(info);
  } catch (err) {
    console.error("POST /api/session failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

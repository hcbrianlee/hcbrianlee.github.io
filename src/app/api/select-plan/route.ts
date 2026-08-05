import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { getFixedPlanPriceCents } from "@/lib/pricing";
import { getCumulativeUsage, getFixedPlan } from "@/lib/session";
import type { ConditionRow, ModelKey } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const sessionId: string | undefined = body?.sessionId;
  const modelKey: ModelKey | undefined = body?.modelKey;

  if (!sessionId || (modelKey !== "light" && modelKey !== "heavy")) {
    return NextResponse.json({ error: "sessionId and modelKey ('light'|'heavy') are required" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseServerClient();

    const { data: session, error: sessionErr } = await supabase
      .from("sessions")
      .select("id, status, fixed_credit_cents, condition:conditions(pricing_variant)")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionErr || !session) {
      return NextResponse.json({ error: "Unknown session" }, { status: 404 });
    }
    if (session.status !== "active") {
      return NextResponse.json({ error: "Session has already ended" }, { status: 409 });
    }

    const condition = (session as unknown as { condition: Pick<ConditionRow, "pricing_variant"> | null }).condition;
    if (condition?.pricing_variant !== "fixed") {
      return NextResponse.json(
        { error: "Plan selection only applies to the \"fixed\" pricing condition" },
        { status: 400 }
      );
    }

    const existingPlan = await getFixedPlan(supabase, sessionId);
    if (existingPlan) {
      return NextResponse.json({ error: "A plan has already been selected for this session" }, { status: 409 });
    }

    const costCents = getFixedPlanPriceCents(modelKey);
    if (costCents > session.fixed_credit_cents) {
      return NextResponse.json({ error: "This plan costs more than your participation credit" }, { status: 400 });
    }

    const { error: insertError } = await supabase.from("events").insert({
      session_id: sessionId,
      event_type: "fixed_plan_selected",
      model: modelKey,
      estimated_cost_cents: costCents,
      metadata: { costCents },
    });
    if (insertError) throw new Error(`fixed_plan_selected insert failed: ${insertError.message}`);

    const cumulative = await getCumulativeUsage(supabase, sessionId);

    return NextResponse.json({ model: modelKey, costCents, cumulative });
  } catch (err) {
    console.error("POST /api/select-plan failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

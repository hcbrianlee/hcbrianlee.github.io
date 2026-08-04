import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { getCumulativeUsage } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const sessionId: string | undefined = body?.sessionId;
  const donationCents: number | undefined = body?.donationCents;

  if (!sessionId || typeof donationCents !== "number" || !Number.isFinite(donationCents) || donationCents < 0) {
    return NextResponse.json(
      { error: "sessionId and a non-negative integer donationCents are required" },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseServerClient();

    const { data: session, error: sessionErr } = await supabase
      .from("sessions")
      .select("id, fixed_credit_cents")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionErr || !session) {
      return NextResponse.json({ error: "Unknown session" }, { status: 404 });
    }
    if (donationCents > session.fixed_credit_cents) {
      return NextResponse.json({ error: "donationCents exceeds the session's fixed credit" }, { status: 400 });
    }

    const { error: updateErr } = await supabase
      .from("sessions")
      .update({
        donation_cents: donationCents,
        status: "completed",
        ended_at: new Date().toISOString(),
      })
      .eq("id", sessionId);
    if (updateErr) throw updateErr;

    await supabase.from("events").insert([
      { session_id: sessionId, event_type: "donation_submitted", metadata: { donation_cents: donationCents } },
      { session_id: sessionId, event_type: "session_ended" },
    ]);

    const cumulative = await getCumulativeUsage(supabase, sessionId);

    return NextResponse.json({
      donationCents,
      remainingCents: session.fixed_credit_cents - donationCents,
      cumulative,
    });
  } catch (err) {
    console.error("POST /api/donate failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

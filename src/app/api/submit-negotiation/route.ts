import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { getNegotiationSubmissions } from "@/lib/session";
import { MAX_NEGOTIATION_SUBMISSIONS } from "@/lib/negotiation";

export const runtime = "nodejs";

const MAX_MEMO_LENGTH = 6000;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const sessionId: string | undefined = body?.sessionId;
  const memoText: string | undefined = body?.memoText;

  if (!sessionId || typeof memoText !== "string" || memoText.trim().length === 0) {
    return NextResponse.json({ error: "sessionId and a non-empty memoText are required" }, { status: 400 });
  }
  const trimmed = memoText.trim().slice(0, MAX_MEMO_LENGTH);

  try {
    const supabase = getSupabaseServerClient();

    const { data: session, error: sessionErr } = await supabase
      .from("sessions")
      .select("id, status")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionErr || !session) {
      return NextResponse.json({ error: "Unknown session" }, { status: 404 });
    }
    if (session.status !== "active") {
      return NextResponse.json({ error: "Session has already ended" }, { status: 409 });
    }

    const existing = await getNegotiationSubmissions(supabase, sessionId);
    if (existing.length >= MAX_NEGOTIATION_SUBMISSIONS) {
      return NextResponse.json(
        { error: `You've already submitted the maximum of ${MAX_NEGOTIATION_SUBMISSIONS} memos.` },
        { status: 409 }
      );
    }

    const { error: insertErr } = await supabase.from("events").insert({
      session_id: sessionId,
      event_type: "negotiation_submitted",
      caption_text: trimmed,
    });
    if (insertErr) throw new Error(`negotiation_submitted insert failed: ${insertErr.message}`);

    const submissions = await getNegotiationSubmissions(supabase, sessionId);
    return NextResponse.json({ submissions });
  } catch (err) {
    console.error("POST /api/submit-negotiation failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

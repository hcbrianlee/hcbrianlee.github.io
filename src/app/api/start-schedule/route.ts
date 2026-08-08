import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { getScheduleStartedAt } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const sessionId: string | undefined = body?.sessionId;

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

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

    // Idempotent -- a page reload after starting shouldn't reset the timer,
    // so return the existing schedule_started event's timestamp if there is one.
    const existingStartedAt = await getScheduleStartedAt(supabase, sessionId);
    if (existingStartedAt) {
      return NextResponse.json({ startedAt: existingStartedAt });
    }

    const { data: inserted, error: insertErr } = await supabase
      .from("events")
      .insert({ session_id: sessionId, event_type: "schedule_started" })
      .select("created_at")
      .single();
    if (insertErr) throw new Error(`schedule_started insert failed: ${insertErr.message}`);

    return NextResponse.json({ startedAt: inserted.created_at });
  } catch (err) {
    console.error("POST /api/start-schedule failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { getScheduleStartedAt } from "@/lib/session";
import { checkSchedule, SPEAKERS } from "@/lib/scheduling";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const sessionId: string | undefined = body?.sessionId;
  const schedule: string[] | undefined = body?.schedule;

  if (!sessionId || !Array.isArray(schedule)) {
    return NextResponse.json({ error: "sessionId and a schedule array are required" }, { status: 400 });
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

    const scheduleStartedAt = await getScheduleStartedAt(supabase, sessionId);
    if (!scheduleStartedAt) {
      return NextResponse.json({ error: "Puzzle hasn't been started yet" }, { status: 409 });
    }

    let results;
    let allCorrect;
    try {
      ({ results, allCorrect } = checkSchedule(schedule));
    } catch {
      return NextResponse.json(
        { error: `Schedule must include each of the ${SPEAKERS.length} speakers exactly once` },
        { status: 400 }
      );
    }

    // Elapsed time is computed server-side from the schedule_started event
    // (when the participant clicked "Start", not session creation), never
    // trusted from a client-supplied timer -- same principle as token usage
    // and response timing elsewhere in this app.
    const elapsedMs = Date.now() - new Date(scheduleStartedAt).getTime();

    const { error: insertErr } = await supabase.from("events").insert({
      session_id: sessionId,
      event_type: "schedule_submitted",
      metadata: { schedule, results, allCorrect, elapsedMs },
    });
    if (insertErr) throw new Error(`schedule_submitted insert failed: ${insertErr.message}`);

    return NextResponse.json({ results, allCorrect, elapsedMs });
  } catch (err) {
    console.error("POST /api/submit-schedule failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { getStaffScheduleStartedAt } from "@/lib/session";
import { checkStaffSchedule, STAFF, STAFF_CONSTRAINTS } from "@/lib/staffScheduling";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const sessionId: string | undefined = body?.sessionId;
  const schedule: string[] | undefined = body?.schedule;
  const droppedConstraintId: number | undefined = body?.droppedConstraintId;
  const rationale: string | undefined = body?.rationale;

  if (!sessionId || !Array.isArray(schedule) || typeof droppedConstraintId !== "number") {
    return NextResponse.json(
      { error: "sessionId, a schedule array, and droppedConstraintId are required" },
      { status: 400 }
    );
  }
  if (!rationale || !rationale.trim()) {
    return NextResponse.json({ error: "A rationale for the relaxed constraint is required" }, { status: 400 });
  }
  if (!STAFF_CONSTRAINTS.some((c) => c.id === droppedConstraintId)) {
    return NextResponse.json({ error: "droppedConstraintId must be a valid constraint id" }, { status: 400 });
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

    const staffScheduleStartedAt = await getStaffScheduleStartedAt(supabase, sessionId);
    if (!staffScheduleStartedAt) {
      return NextResponse.json({ error: "Puzzle hasn't been started yet" }, { status: 409 });
    }

    let results;
    let allCorrect;
    try {
      ({ results, allCorrect } = checkStaffSchedule(schedule, droppedConstraintId));
    } catch {
      return NextResponse.json(
        { error: `Schedule must include each of the ${STAFF.length} staff members exactly once` },
        { status: 400 }
      );
    }

    const elapsedMs = Date.now() - new Date(staffScheduleStartedAt).getTime();

    const { error: insertErr } = await supabase.from("events").insert({
      session_id: sessionId,
      event_type: "staff_schedule_submitted",
      metadata: { schedule, droppedConstraintId, rationale: rationale.trim(), results, allCorrect, elapsedMs },
    });
    if (insertErr) throw new Error(`staff_schedule_submitted insert failed: ${insertErr.message}`);

    return NextResponse.json({ results, allCorrect, elapsedMs });
  } catch (err) {
    console.error("POST /api/submit-staff-schedule failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

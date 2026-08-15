import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { getTripPlanSubmissions } from "@/lib/session";
import { MAX_TRIP_PLAN_SUBMISSIONS } from "@/lib/tripPlanning";

export const runtime = "nodejs";

const MAX_ITINERARY_LENGTH = 6000;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const sessionId: string | undefined = body?.sessionId;
  const itineraryText: string | undefined = body?.itineraryText;

  if (!sessionId || typeof itineraryText !== "string" || itineraryText.trim().length === 0) {
    return NextResponse.json({ error: "sessionId and a non-empty itineraryText are required" }, { status: 400 });
  }
  const trimmed = itineraryText.trim().slice(0, MAX_ITINERARY_LENGTH);

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

    const existing = await getTripPlanSubmissions(supabase, sessionId);
    if (existing.length >= MAX_TRIP_PLAN_SUBMISSIONS) {
      return NextResponse.json(
        { error: `You've already submitted the maximum of ${MAX_TRIP_PLAN_SUBMISSIONS} itineraries.` },
        { status: 409 }
      );
    }

    const { error: insertErr } = await supabase.from("events").insert({
      session_id: sessionId,
      event_type: "trip_plan_submitted",
      caption_text: trimmed,
    });
    if (insertErr) throw new Error(`trip_plan_submitted insert failed: ${insertErr.message}`);

    const submissions = await getTripPlanSubmissions(supabase, sessionId);
    return NextResponse.json({ submissions });
  } catch (err) {
    console.error("POST /api/submit-trip-plan failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

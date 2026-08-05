import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

const MAX_CAPTION_LENGTH = 500;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const sessionId: string | undefined = body?.sessionId;
  const captionText: string | undefined = body?.captionText;

  if (!sessionId || typeof captionText !== "string" || captionText.trim().length === 0) {
    return NextResponse.json({ error: "sessionId and a non-empty captionText are required" }, { status: 400 });
  }
  const trimmed = captionText.trim().slice(0, MAX_CAPTION_LENGTH);

  try {
    const supabase = getSupabaseServerClient();

    const { data: session, error: sessionErr } = await supabase
      .from("sessions")
      .select("id, status, cartoon_filename")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionErr || !session) {
      return NextResponse.json({ error: "Unknown session" }, { status: 404 });
    }
    if (session.status !== "active") {
      return NextResponse.json({ error: "Session has already ended" }, { status: 409 });
    }

    const submittedAt = new Date().toISOString();

    const { error: updateErr } = await supabase
      .from("sessions")
      .update({ final_caption: trimmed, final_caption_submitted_at: submittedAt })
      .eq("id", sessionId);
    if (updateErr) throw new Error(`sessions update failed: ${updateErr.message}`);

    const { error: insertErr } = await supabase.from("events").insert({
      session_id: sessionId,
      event_type: "caption_submitted",
      caption_text: trimmed,
      cartoon_filename: session.cartoon_filename,
    });
    if (insertErr) throw new Error(`caption_submitted insert failed: ${insertErr.message}`);

    return NextResponse.json({ finalCaption: trimmed, finalCaptionSubmittedAt: submittedAt });
  } catch (err) {
    console.error("POST /api/submit-caption failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { getEventPromoSubmissions } from "@/lib/session";
import {
  EVIDENCE_ITEMS,
  REQUIRED_EVIDENCE_COUNT,
  PART1_MAX_WORDS,
  PART2_MAX_WORDS,
  MAX_EVENT_PROMO_SUBMISSIONS,
  countWords,
} from "@/lib/eventPromo";

export const runtime = "nodejs";

const VALID_EVIDENCE_IDS = new Set(EVIDENCE_ITEMS.map((e) => e.id));

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const sessionId: string | undefined = body?.sessionId;
  const evidenceSelected: string[] | undefined = body?.evidenceSelected;
  const part1: string | undefined = body?.part1;
  const part2: string | undefined = body?.part2;

  if (!sessionId || !Array.isArray(evidenceSelected) || typeof part1 !== "string" || typeof part2 !== "string") {
    return NextResponse.json(
      { error: "sessionId, an evidenceSelected array, part1, and part2 are required" },
      { status: 400 }
    );
  }

  // Format rules are the only part of this task that can be mechanically
  // checked -- everything about whether the selected evidence was used
  // honestly and completely is for a human judge (see src/lib/eventPromo.ts).
  const uniqueEvidence = new Set(evidenceSelected);
  if (uniqueEvidence.size !== evidenceSelected.length || evidenceSelected.some((id) => !VALID_EVIDENCE_IDS.has(id))) {
    return NextResponse.json({ error: "evidenceSelected must be distinct, valid evidence IDs" }, { status: 400 });
  }
  if (uniqueEvidence.size !== REQUIRED_EVIDENCE_COUNT) {
    return NextResponse.json(
      { error: `You must select exactly ${REQUIRED_EVIDENCE_COUNT} evidence items (selected ${uniqueEvidence.size}).` },
      { status: 400 }
    );
  }
  if (!part1.trim() || !part2.trim()) {
    return NextResponse.json({ error: "Both Part 1 and Part 2 are required" }, { status: 400 });
  }
  const part1Words = countWords(part1);
  const part2Words = countWords(part2);
  if (part1Words > PART1_MAX_WORDS) {
    return NextResponse.json(
      { error: `Part 1 is ${part1Words} words -- must be ${PART1_MAX_WORDS} or fewer.` },
      { status: 400 }
    );
  }
  if (part2Words > PART2_MAX_WORDS) {
    return NextResponse.json(
      { error: `Part 2 is ${part2Words} words -- must be ${PART2_MAX_WORDS} or fewer.` },
      { status: 400 }
    );
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

    const existing = await getEventPromoSubmissions(supabase, sessionId);
    if (existing.length >= MAX_EVENT_PROMO_SUBMISSIONS) {
      return NextResponse.json(
        { error: `You've already submitted the maximum of ${MAX_EVENT_PROMO_SUBMISSIONS} times.` },
        { status: 409 }
      );
    }

    const { error: insertErr } = await supabase.from("events").insert({
      session_id: sessionId,
      event_type: "event_promo_submitted",
      metadata: {
        evidenceSelected: [...uniqueEvidence],
        part1: part1.trim(),
        part2: part2.trim(),
        part1Words,
        part2Words,
      },
    });
    if (insertErr) throw new Error(`event_promo_submitted insert failed: ${insertErr.message}`);

    const submissions = await getEventPromoSubmissions(supabase, sessionId);
    return NextResponse.json({ submissions });
  } catch (err) {
    console.error("POST /api/submit-event-promo failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

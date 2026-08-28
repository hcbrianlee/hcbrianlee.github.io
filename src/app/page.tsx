"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ModelPicker } from "@/components/ModelPicker";
import { MessageList } from "@/components/MessageList";
import { Composer } from "@/components/Composer";
import { DonationModal } from "@/components/DonationModal";
import { CartoonImage } from "@/components/CartoonImage";
import { CaptionSubmit } from "@/components/CaptionSubmit";
import { SchedulingTask } from "@/components/SchedulingTask";
import { StaffSchedulingTask } from "@/components/StaffSchedulingTask";
import { ProductPanel } from "@/components/ProductPanel";
import { TripPlanningTask } from "@/components/TripPlanningTask";
import { EventPromoTask } from "@/components/EventPromoTask";
import { FinishSection } from "@/components/FinishSection";
import type { ChatMessage, ChatStreamFrame, CumulativeUsage, ModelKey, SessionInfo } from "@/lib/types";

const SESSION_STORAGE_KEY = "gn_session_id";
const SESSION_DEBUG_KEY = "gn_session_debug_condition";
const EMPTY_USAGE: CumulativeUsage = { promptCount: 0, totalTokens: 0, co2G: 0, waterMl: 0, spentCents: 0 };

export default function Home() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [debugConditionCode, setDebugConditionCode] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [selectedModel, setSelectedModel] = useState<ModelKey>("light");
  const [sending, setSending] = useState(false);

  const [captionSubmitting, setCaptionSubmitting] = useState(false);
  const [adCaptionSubmitting, setAdCaptionSubmitting] = useState(false);
  const [tripPlanSubmitting, setTripPlanSubmitting] = useState(false);
  const [eventPromoSubmitting, setEventPromoSubmitting] = useState(false);
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);
  const [scheduleStarting, setScheduleStarting] = useState(false);
  const [staffScheduleSubmitting, setStaffScheduleSubmitting] = useState(false);
  const [staffScheduleStarting, setStaffScheduleStarting] = useState(false);

  const [donateOpen, setDonateOpen] = useState(false);
  const [donateSubmitting, setDonateSubmitting] = useState(false);
  const [donateResult, setDonateResult] = useState<{ donationCents: number; remainingCents: number } | null>(null);
  const [sessionEnded, setSessionEnded] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const participantRef = params.get("pid") ?? params.get("PROLIFIC_PID") ?? undefined;
    // ?condition=<code> forces that exact condition (see sql/seed_conditions.sql
    // for valid codes) every time it's present, and always mints a fresh
    // session so it can't be mistaken for a real randomized assignment.
    // Removing the param -- even if a forced session is still cached in
    // localStorage -- goes back to true random assignment.
    const debugParam = params.get("condition");
    const previousDebugCode = window.localStorage.getItem(SESSION_DEBUG_KEY);

    let existingSessionId: string | undefined;
    if (debugParam) {
      existingSessionId = undefined; // always fresh when forcing a condition
    } else if (previousDebugCode) {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      window.localStorage.removeItem(SESSION_DEBUG_KEY);
      existingSessionId = undefined; // discard the forced session, go random
    } else {
      existingSessionId = window.localStorage.getItem(SESSION_STORAGE_KEY) ?? undefined;
    }

    (async () => {
      try {
        const res = await fetch("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            existingSessionId,
            participantRef,
            debugConditionCode: debugParam ?? undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Failed to start session");

        const info = data as SessionInfo;
        window.localStorage.setItem(SESSION_STORAGE_KEY, info.sessionId);
        if (debugParam) {
          window.localStorage.setItem(SESSION_DEBUG_KEY, info.condition.code);
          setDebugConditionCode(info.condition.code);
        }
        setSession(info);
        setSelectedModel(info.condition.defaultModel);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to start session");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSend() {
    const text = draft.trim();
    if (!text || !session || sending || sessionEnded || session.budgetExhausted) return;

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text };
    const assistantId = crypto.randomUUID();
    const historyForRequest = [...messages, userMsg].map(({ role, content }) => ({ role, content }));

    setMessages((prev) => [...prev, userMsg, { id: assistantId, role: "assistant", content: "", pending: true }]);
    setDraft("");
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.sessionId, modelKey: selectedModel, messages: historyForRequest }),
      });

      // Rejections (unknown session, budget exhausted, etc.) come back as a
      // single JSON error object, not the NDJSON stream -- handle that
      // before treating the body as a frame stream.
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = data?.error ?? "Failed to generate a response.";
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: `Error: ${message}`, pending: false } : m))
        );
        if (res.status === 402) {
          setSession((prev) => (prev ? { ...prev, budgetExhausted: true } : prev));
        }
        return;
      }

      if (!res.body) throw new Error("No response body from server");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const frame: ChatStreamFrame = JSON.parse(line);

          if (frame.type === "delta") {
            accumulated += frame.text;
            const snapshot = accumulated;
            setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: snapshot } : m)));
          } else if (frame.type === "done") {
            setSession((prev) =>
              prev
                ? {
                    ...prev,
                    cumulative: frame.cumulative,
                    budgetExhausted:
                      frame.cumulative.totalTokens >= prev.maxTokensPerSession ||
                      (prev.condition.pricingVariant === "variable" &&
                        frame.cumulative.spentCents >= prev.fixedCreditCents),
                  }
                : prev
            );
            setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, pending: false } : m)));
          } else if (frame.type === "error") {
            const message = frame.message;
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: `Error: ${message}`, pending: false } : m))
            );
          }
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: "Error: failed to generate a response.", pending: false } : m))
      );
    } finally {
      setSending(false);
    }
  }

  async function handleSubmitCaption(captionText: string) {
    if (!session || captionSubmitting) return;
    setCaptionSubmitting(true);
    try {
      const res = await fetch("/api/submit-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.sessionId, captionText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to submit caption");
      setSession((prev) => (prev ? { ...prev, captionSubmissions: data.submissions } : prev));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to submit caption");
    } finally {
      setCaptionSubmitting(false);
    }
  }

  async function handleStartSchedule() {
    if (!session || scheduleStarting || session.scheduleStartedAt) return;
    setScheduleStarting(true);
    try {
      const res = await fetch("/api/start-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to start puzzle");
      setSession((prev) => (prev ? { ...prev, scheduleStartedAt: data.startedAt } : prev));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to start puzzle");
    } finally {
      setScheduleStarting(false);
    }
  }

  async function handleSubmitSchedule(schedule: string[]) {
    if (!session || scheduleSubmitting) return null;
    setScheduleSubmitting(true);
    try {
      const res = await fetch("/api/submit-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.sessionId, schedule }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to submit schedule");
      if (data.allCorrect) {
        setSession((prev) => (prev ? { ...prev, scheduleSolved: true } : prev));
      }
      return data as { results: { id: number; text: string; satisfied: boolean }[]; allCorrect: boolean; elapsedMs: number };
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to submit schedule");
      return null;
    } finally {
      setScheduleSubmitting(false);
    }
  }

  async function handleSubmitAdCaption(captionText: string) {
    if (!session || adCaptionSubmitting) return;
    setAdCaptionSubmitting(true);
    try {
      const res = await fetch("/api/submit-ad-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.sessionId, captionText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to submit caption");
      setSession((prev) => (prev ? { ...prev, adCaptionSubmissions: data.submissions } : prev));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to submit caption");
    } finally {
      setAdCaptionSubmitting(false);
    }
  }

  async function handleSubmitTripPlan(itineraryText: string) {
    if (!session || tripPlanSubmitting) return;
    setTripPlanSubmitting(true);
    try {
      const res = await fetch("/api/submit-trip-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.sessionId, itineraryText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to submit itinerary");
      setSession((prev) => (prev ? { ...prev, tripPlanSubmissions: data.submissions } : prev));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to submit itinerary");
    } finally {
      setTripPlanSubmitting(false);
    }
  }

  async function handleSubmitEventPromo(evidenceSelected: string[], part1: string, part2: string) {
    if (!session || eventPromoSubmitting) return;
    setEventPromoSubmitting(true);
    try {
      const res = await fetch("/api/submit-event-promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.sessionId, evidenceSelected, part1, part2 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to submit");
      setSession((prev) => (prev ? { ...prev, eventPromoSubmissions: data.submissions } : prev));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setEventPromoSubmitting(false);
    }
  }

  async function handleStartStaffSchedule() {
    if (!session || staffScheduleStarting || session.staffScheduleStartedAt) return;
    setStaffScheduleStarting(true);
    try {
      const res = await fetch("/api/start-staff-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to start puzzle");
      setSession((prev) => (prev ? { ...prev, staffScheduleStartedAt: data.startedAt } : prev));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to start puzzle");
    } finally {
      setStaffScheduleStarting(false);
    }
  }

  async function handleSubmitStaffSchedule(schedule: string[], droppedConstraintId: number, rationale: string) {
    if (!session || staffScheduleSubmitting) return null;
    setStaffScheduleSubmitting(true);
    try {
      const res = await fetch("/api/submit-staff-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.sessionId, schedule, droppedConstraintId, rationale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to submit schedule");
      if (data.allCorrect) {
        setSession((prev) => (prev ? { ...prev, staffScheduleSolved: true } : prev));
      }
      return data as { results: { id: number; text: string; satisfied: boolean }[]; allCorrect: boolean; elapsedMs: number };
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to submit schedule");
      return null;
    } finally {
      setStaffScheduleSubmitting(false);
    }
  }

  async function handleDonateSubmit(donationCents: number) {
    if (!session) return;
    setDonateSubmitting(true);
    try {
      const res = await fetch("/api/donate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.sessionId, donationCents }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to submit donation");
      setDonateResult({ donationCents: data.donationCents, remainingCents: data.remainingCents });
      setSession((prev) => (prev ? { ...prev, cumulative: data.cumulative } : prev));
      setSessionEnded(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to submit donation");
    } finally {
      setDonateSubmitting(false);
    }
  }

  function handleNewChat() {
    setMessages([]);
    setDraft("");
  }

  function closeDonateModal() {
    setDonateOpen(false);
    setDonateResult(null);
  }

  if (loading) {
    return <div className="center-screen">Starting your session…</div>;
  }

  if (loadError || !session) {
    return (
      <div className="center-screen">
        Couldn&apos;t start a session: {loadError}
        <br />
        Check that SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are set and that sql/schema.sql + sql/seed_conditions.sql
        have been run against your Supabase project.
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        cumulative={session.cumulative ?? EMPTY_USAGE}
        scaleUsers={session.modelComparison.scaleUsers}
        pricingCopy={session.pricingCopy}
        infoVariant={session.condition.infoVariant}
        pricingVariant={session.condition.pricingVariant}
        onNewChat={handleNewChat}
      />

      <main className="main">
        {debugConditionCode && (
          <div className="debug-banner">
            Debug mode — forced condition <code>{debugConditionCode}</code>. Remove <code>?condition=…</code> from the
            URL and reload to go back to random assignment.
          </div>
        )}

        <>
            {session.activeTask === "scheduling" ? (
              <SchedulingTask
                startedAt={session.scheduleStartedAt}
                solved={session.scheduleSolved}
                submitting={scheduleSubmitting}
                starting={scheduleStarting}
                onStart={handleStartSchedule}
                onSubmit={handleSubmitSchedule}
              />
            ) : session.activeTask === "staffScheduling" ? (
              <StaffSchedulingTask
                startedAt={session.staffScheduleStartedAt}
                solved={session.staffScheduleSolved}
                submitting={staffScheduleSubmitting}
                starting={staffScheduleStarting}
                onStart={handleStartStaffSchedule}
                onSubmit={handleSubmitStaffSchedule}
              />
            ) : session.activeTask === "adCaption" ? (
              <>
                <ProductPanel imageUrl={session.adProductImageUrl} />
                <CaptionSubmit
                  submissions={session.adCaptionSubmissions}
                  maxSubmissions={session.maxAdCaptionSubmissions}
                  submitting={adCaptionSubmitting}
                  onSubmit={handleSubmitAdCaption}
                  subjectLabel="this product"
                  itemLabel="ad caption"
                />
              </>
            ) : session.activeTask === "tripPlanning" ? (
              <TripPlanningTask
                submissions={session.tripPlanSubmissions}
                maxSubmissions={session.maxTripPlanSubmissions}
                submitting={tripPlanSubmitting}
                onSubmit={handleSubmitTripPlan}
              />
            ) : session.activeTask === "eventPromo" ? (
              <EventPromoTask
                submissions={session.eventPromoSubmissions}
                maxSubmissions={session.maxEventPromoSubmissions}
                submitting={eventPromoSubmitting}
                onSubmit={handleSubmitEventPromo}
              />
            ) : (
              <>
                <CartoonImage cartoonImageUrl={session.cartoonImageUrl} />
                <CaptionSubmit
                  submissions={session.captionSubmissions}
                  maxSubmissions={session.maxCaptionSubmissions}
                  submitting={captionSubmitting}
                  onSubmit={handleSubmitCaption}
                />
              </>
            )}

            {(session.activeTask === "scheduling"
              ? session.scheduleSolved
              : session.activeTask === "staffScheduling"
                ? session.staffScheduleSolved
                : session.activeTask === "adCaption"
                  ? session.adCaptionSubmissions.length > 0
                  : session.activeTask === "tripPlanning"
                    ? session.tripPlanSubmissions.length > 0
                    : session.activeTask === "eventPromo"
                      ? session.eventPromoSubmissions.length > 0
                      : session.captionSubmissions.length > 0) && (
              <FinishSection sessionEnded={sessionEnded} onDonateClick={() => setDonateOpen(true)} />
            )}

            <MessageList messages={messages} />

            {session.budgetExhausted && (
              <div className="budget-exhausted-banner">
                {session.condition.pricingVariant === "variable" &&
                session.cumulative.spentCents >= session.fixedCreditCents
                  ? "You've used your full participation credit for this session"
                  : `You've reached the ${session.maxTokensPerSession.toLocaleString()}-token limit for this session`}{" "}
                -- you can&apos;t send more messages, but you can still finish up the task below.
              </div>
            )}

            <Composer
              value={draft}
              onChange={setDraft}
              onSend={handleSend}
              disabled={sending || sessionEnded || session.budgetExhausted}
              topContent={
                <ModelPicker
                  selected={selectedModel}
                  onChange={setSelectedModel}
                  infoVariant={session.condition.infoVariant}
                  avgResponseImpact={session.avgResponseImpact}
                />
              }
            />
          </>
      </main>

      {donateOpen && (
        <DonationModal
          fixedCreditCents={session.fixedCreditCents}
          cumulative={session.cumulative ?? EMPTY_USAGE}
          submitting={donateSubmitting}
          result={donateResult}
          onClose={closeDonateModal}
          onSubmit={handleDonateSubmit}
        />
      )}
    </div>
  );
}

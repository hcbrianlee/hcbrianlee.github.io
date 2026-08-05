"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ModelPicker } from "@/components/ModelPicker";
import { MessageList } from "@/components/MessageList";
import { Composer } from "@/components/Composer";
import { DonationModal } from "@/components/DonationModal";
import { FixedPlanPicker } from "@/components/FixedPlanPicker";
import { CartoonImage } from "@/components/CartoonImage";
import { CaptionSubmit } from "@/components/CaptionSubmit";
import { NudgePanel } from "@/components/NudgePanel";
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

  const [planSubmitting, setPlanSubmitting] = useState(false);
  const [captionSubmitting, setCaptionSubmitting] = useState(false);

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
        setSelectedModel(info.fixedPlan?.model ?? info.condition.defaultModel);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to start session");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSend() {
    const text = draft.trim();
    if (!text || !session || sending || sessionEnded) return;

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
            setSession((prev) => (prev ? { ...prev, cumulative: frame.cumulative } : prev));
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

  async function handleSelectPlan(model: ModelKey) {
    if (!session || planSubmitting) return;
    setPlanSubmitting(true);
    try {
      const res = await fetch("/api/select-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.sessionId, modelKey: model }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to select plan");

      setSession((prev) =>
        prev ? { ...prev, fixedPlan: { model: data.model, costCents: data.costCents }, cumulative: data.cumulative } : prev
      );
      setSelectedModel(data.model);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to select plan");
    } finally {
      setPlanSubmitting(false);
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
      setSession((prev) =>
        prev ? { ...prev, finalCaption: data.finalCaption, finalCaptionSubmittedAt: data.finalCaptionSubmittedAt } : prev
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to submit caption");
    } finally {
      setCaptionSubmitting(false);
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

  const needsPlanSelection = session.condition.pricingVariant === "fixed" && !session.fixedPlan;

  return (
    <div className="app-shell">
      <Sidebar
        cumulative={session.cumulative ?? EMPTY_USAGE}
        socialProofPct={session.socialProofPct}
        fixedCreditCents={session.fixedCreditCents}
        pricingCopy={session.pricingCopy}
        onNewChat={handleNewChat}
      />

      <main className="main">
        {debugConditionCode && (
          <div className="debug-banner">
            Debug mode — forced condition <code>{debugConditionCode}</code>. Remove <code>?condition=…</code> from the
            URL and reload to go back to random assignment.
          </div>
        )}

        {needsPlanSelection ? (
          <FixedPlanPicker
            options={session.fixedPlanOptions}
            fixedCreditCents={session.fixedCreditCents}
            infoCopy={session.infoCopy}
            submitting={planSubmitting}
            onSelect={handleSelectPlan}
          />
        ) : (
          <>
            <CartoonImage cartoonImageUrl={session.cartoonImageUrl} />

            <CaptionSubmit
              finalCaption={session.finalCaption}
              finalCaptionSubmittedAt={session.finalCaptionSubmittedAt}
              submitting={captionSubmitting}
              onSubmit={handleSubmitCaption}
            />

            {session.finalCaption && (
              <FinishSection sessionEnded={sessionEnded} onDonateClick={() => setDonateOpen(true)} />
            )}

            <MessageList messages={messages} />

            <Composer
              value={draft}
              onChange={setDraft}
              onSend={handleSend}
              disabled={sending || sessionEnded}
              topContent={
                <>
                  <ModelPicker
                    selected={selectedModel}
                    onChange={setSelectedModel}
                    locked={session.condition.pricingVariant === "fixed"}
                  />
                  {session.condition.pricingVariant !== "fixed" && <NudgePanel infoCopy={session.infoCopy} />}
                </>
              }
            />
          </>
        )}
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

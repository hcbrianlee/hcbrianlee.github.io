"use client";

import { useEffect } from "react";
import type { ChatMessage } from "@/lib/types";

export function MessageList({ messages }: { messages: ChatMessage[] }) {
  useEffect(() => {
    // Scroll the page itself to its current bottom, not scrollIntoView on a
    // sentinel -- with the composer pinned via position: sticky,
    // scrollIntoView's "end" calculation doesn't play well with that and
    // was intermittently jumping to the top of the page instead of
    // following newly streamed text. This runs on every content update
    // (messages is a new array reference per streamed delta), so the page
    // tracks the response as it grows.
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "auto" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="messages">
        <div className="empty-state">
          Ask the assistant to help you brainstorm a caption for The New Yorker Cartoon Caption Contest, or just say
          hello to get started.
        </div>
      </div>
    );
  }

  return (
    <div className="messages">
      {messages.map((m) => (
        <div key={m.id} className={`message-row-outer ${m.role}`}>
          <div className="message-row-inner">
            <div className={`avatar ${m.role}`}>{m.role === "user" ? "U" : "AI"}</div>
            <div className={`message-content ${m.pending && !m.content ? "pending" : ""}`}>
              {m.content || (m.pending ? "" : "")}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/lib/types";

export function MessageList({ messages }: { messages: ChatMessage[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
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
      <div ref={bottomRef} />
    </div>
  );
}

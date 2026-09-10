"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/lib/types";

export function MessageList({ messages }: { messages: ChatMessage[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll this list's own container to its current bottom -- not the
    // window. Now that this lives inside FloatingChat's fixed-size panel
    // (.messages is the scrolling flex child, see globals.css), the page
    // itself doesn't scroll at all; only this container does. Runs on
    // every content update (messages is a new array reference per
    // streamed delta), so it tracks the response as it grows.
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  if (messages.length === 0) {
    return <div className="messages" ref={containerRef} />;
  }

  return (
    <div className="messages" ref={containerRef}>
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

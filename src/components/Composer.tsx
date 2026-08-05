"use client";

import { useRef } from "react";
import type { KeyboardEvent } from "react";

export function Composer(props: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
  /** Rendered inside the sticky composer bar, above the input -- keeps the model picker/nudge panel pinned with the input instead of scrolling away with the message list. */
  topContent?: React.ReactNode;
}) {
  const { value, onChange, onSend, disabled, topContent } = props;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) onSend();
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    onChange(e.target.value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    }
  }

  return (
    <div className="composer-wrap">
      {topContent}
      <div className="composer">
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder="Message the assistant..."
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        <button
          className="send-btn"
          onClick={onSend}
          disabled={disabled || !value.trim()}
          aria-label="Send message"
        >
          ↑
        </button>
      </div>
      <div className="footnote">Model choice affects estimated energy use.</div>
    </div>
  );
}

"use client";

/** Chat input bar — auto-growing textarea with send button and keyboard shortcuts */

import { useEffect, useRef, useState } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
}

const MAX_HEIGHT_PX = 128; // ~4 lines
const CHAR_WARN_THRESHOLD = 9_000;
const MAX_CHARS = 10_000;

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isEmpty = value.trim().length === 0;
  const canSend = !disabled && !isEmpty;
  const showCharCount = value.length > CHAR_WARN_THRESHOLD;

  // Auto-focus on mount and whenever AI finishes responding
  useEffect(() => {
    if (!disabled) {
      textareaRef.current?.focus();
    }
  }, [disabled]);

  // Auto-resize textarea height as content grows
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, MAX_HEIGHT_PX) + "px";
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
  }

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends; Shift+Enter inserts a newline
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="border-t border-gray-800 bg-gray-950 shadow-[0_-4px_12px_rgba(0,0,0,0.3)] p-3 sm:p-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-4">
      {/* Character count — only shown when approaching the limit */}
      {showCharCount && (
        <p className="text-[10px] text-gray-600 text-right mb-1 sm:max-w-2xl mx-auto w-full">
          {value.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
        </p>
      )}

      <div className="flex items-end gap-2 sm:gap-3 sm:max-w-2xl mx-auto w-full">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="e.g. I spent ₹500 on groceries..."
          className={`flex-1 resize-none overflow-y-auto bg-gray-800 text-white rounded-xl px-4 py-3 text-sm leading-6 placeholder-gray-500 outline-none transition focus:ring-2 focus:ring-blue-500 ${
            disabled ? "opacity-50 cursor-not-allowed" : ""
          }`}
        />

        <button
          onClick={handleSend}
          disabled={!canSend}
          className={`shrink-0 rounded-xl px-5 py-3 text-sm font-medium transition-all flex items-center justify-center min-w-[72px] h-[46px] ${
            disabled
              ? "bg-gray-700 text-gray-500 cursor-not-allowed"
              : isEmpty
              ? "bg-gray-700 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-500 text-white"
          }`}
        >
          {/* Spinner while AI is responding; "Send" otherwise */}
          {disabled ? (
            <div className="w-4 h-4 rounded-full border-2 border-gray-500 border-t-white animate-spin" />
          ) : (
            "Send"
          )}
        </button>
      </div>
    </div>
  );
}

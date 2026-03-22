import React from "react";

/** Single chat message bubble — renders user or assistant messages */

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

/** Renders **bold** text by splitting on double-asterisk pairs */
function renderBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      part
    )
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function ChatMessage({ role, content, timestamp }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div
      className={`mb-4 flex flex-col animate-message-in ${isUser ? "items-end" : "items-start"}`}
    >
      {/* Role label */}
      <p className={`text-xs mb-1 ${isUser ? "text-gray-500" : "text-gray-400"}`}>
        {isUser ? "You" : "💰 UAI Expense AI"}
      </p>

      {/* Message bubble */}
      <div
        className={`max-w-[90%] sm:max-w-[80%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words ${
          isUser
            ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl rounded-br-md shadow-md shadow-blue-900/20"
            : "bg-gray-800/80 text-gray-100 rounded-2xl rounded-bl-md border border-gray-700/50"
        }`}
      >
        {renderBold(content)}
      </div>

      {/* Timestamp */}
      <p className={`text-[10px] text-gray-600 mt-1 ${isUser ? "text-right" : "text-left"}`}>
        {formatTime(timestamp)}
      </p>
    </div>
  );
}

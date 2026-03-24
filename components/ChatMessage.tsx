import React from "react";
import ExpenseCard from "./ExpenseCard";
import ExpenseList from "./ExpenseList";
import SummaryCard from "./SummaryCard";

/** Single chat message bubble — renders user or assistant messages with optional data attachments */

type SummaryData = {
  summary: Array<{ category: string; total: number; count: number }>;
  total: number;
  count: number;
  avgPerExpense?: number;
  topCategory?: string | null;
};

type MessageAttachment =
  | { type: "expense_logged"; expense: import("./ExpenseCard").ExpenseData }
  | { type: "expenses_list"; expenses: import("./ExpenseCard").ExpenseData[] }
  | { type: "summary"; data: SummaryData }
  | { type: "daily_breakdown"; data: Array<{ date: string; total: number; count: number }> };

interface MessageShape {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  attachments?: MessageAttachment[];
}

interface ChatMessageProps {
  message: MessageShape;
  onDeleteExpense?: (id: number) => void;
  deletedIds?: Set<number>;
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

export default function ChatMessage({
  message,
  onDeleteExpense,
  deletedIds,
}: ChatMessageProps) {
  const { role, content, timestamp, attachments } = message;
  const isUser = role === "user";

  return (
    <div
      className={`mb-4 flex flex-col animate-message-in ${isUser ? "items-end" : "items-start"}`}
    >
      {/* Role label */}
      <p className={`text-xs mb-1 ${isUser ? "text-gray-500" : "text-gray-400"}`}>
        {isUser ? "You" : "💰 UAI Expense AI"}
      </p>

      {/* Message bubble — only shown if there's text content */}
      {content && (
        <div
          className={`max-w-[90%] sm:max-w-[80%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words ${
            isUser
              ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl rounded-br-md shadow-md shadow-blue-900/20"
              : "bg-gray-800/80 text-gray-100 rounded-2xl rounded-bl-md border border-gray-700/50"
          }`}
        >
          {renderBold(content)}
        </div>
      )}

      {/* Attachments — rendered below the text bubble */}
      {!isUser && attachments && attachments.length > 0 && (
        <div className="mt-2 w-full max-w-[90%] sm:max-w-[80%] space-y-2">
          {attachments.map((attachment, i) => {
            if (attachment.type === "expense_logged") {
              const isDeleted = deletedIds?.has(attachment.expense.id);
              return (
                <div
                  key={i}
                  className={`transition-opacity ${isDeleted ? "opacity-40 pointer-events-none" : ""}`}
                >
                  <ExpenseCard
                    expense={attachment.expense}
                    variant="inline"
                    showDelete={!isDeleted}
                    isNew={true}
                    onDelete={onDeleteExpense}
                  />
                </div>
              );
            }

            if (attachment.type === "expenses_list") {
              return (
                <ExpenseList
                  key={i}
                  expenses={attachment.expenses}
                  onDelete={onDeleteExpense}
                  deletedIds={deletedIds}
                />
              );
            }

            if (attachment.type === "summary") {
              return <SummaryCard key={i} data={attachment.data} />;
            }

            return null;
          })}
        </div>
      )}

      {/* Timestamp */}
      <p
        className={`text-[10px] text-gray-600 mt-1 ${isUser ? "text-right" : "text-left"}`}
      >
        {formatTime(timestamp)}
      </p>
    </div>
  );
}

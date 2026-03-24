"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ChatInput from "@/components/ChatInput";
import ChatMessage from "@/components/ChatMessage";
import TypingIndicator from "@/components/TypingIndicator";
import SummaryPanel from "@/components/SummaryPanel";
import RecentExpenses from "@/components/RecentExpenses";
import { type ExpenseData } from "@/components/ExpenseCard";

// ── Types ──────────────────────────────────────────────────────────────────

type SummaryData = {
  summary: Array<{ category: string; total: number; count: number }>;
  total: number;
  count: number;
  avgPerExpense?: number;
  topCategory?: string | null;
};

type DailyBreakdownData = {
  date: string;
  total: number;
  count: number;
};

type MessageAttachment =
  | { type: "expense_logged"; expense: ExpenseData }
  | { type: "expenses_list"; expenses: ExpenseData[] }
  | { type: "summary"; data: SummaryData }
  | { type: "daily_breakdown"; data: DailyBreakdownData[] };

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  attachments?: MessageAttachment[];
}

// ── Constants ─────────────────────────────────────────────────────────────

const WELCOME_MESSAGE: Message = {
  role: "assistant",
  content:
    'Hi! I\'m your AI expense tracker. Tell me about your spending — like "I spent ₹500 on groceries" — or ask me anything about your expenses.',
  timestamp: new Date(),
};

const SUGGESTION_CHIPS = [
  { icon: "🛒", text: "I spent ₹500 on groceries" },
  { icon: "📊", text: "How much did I spend this week?" },
  { icon: "📋", text: "Show me my spending summary" },
  { icon: "💡", text: "I paid ₹1200 for electricity bill" },
];

// ── Component ─────────────────────────────────────────────────────────────

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [loading, setLoading] = useState(false);
  const [deletedIds, setDeletedIds] = useState<Set<number>>(new Set());
  const [summaryRefreshKey, setSummaryRefreshKey] = useState(0);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [recentOpen, setRecentOpen] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const hasUserMessage = messages.some((m) => m.role === "user");

  const showTypingIndicator =
    loading && messages[messages.length - 1]?.role === "user";

  const isNearBottom = () => {
    const el = chatContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 150;
  };

  const scrollToBottom = useCallback(() => {
    if (isNearBottom()) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  // Delete an expense by sending a chat message — routes through the full AI flow
  const handleDeleteExpense = useCallback(
    (id: number) => {
      handleSend(`Delete expense #${id}`);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  async function handleSend(text: string) {
    if (loading) return;

    const userMessage: Message = {
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    const apiMessages = [...messages.slice(1), userMessage].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      const contentType = res.headers.get("content-type") ?? "";

      if (contentType.includes("text/event-stream")) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "", timestamp: new Date() },
        ]);

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) throw new Error("No reader available");

        let buffer = "";
        let receivedText = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6));

              if (event.type === "text") {
                receivedText = true;
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...last,
                      content: last.content + event.text,
                    };
                  }
                  return updated;
                });
              } else if (event.type === "expense_logged") {
                setSummaryRefreshKey((k) => k + 1);
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...last,
                      attachments: [
                        ...(last.attachments ?? []),
                        { type: "expense_logged", expense: event.expense },
                      ],
                    };
                  }
                  return updated;
                });
              } else if (event.type === "expenses_list") {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...last,
                      attachments: [
                        ...(last.attachments ?? []),
                        { type: "expenses_list", expenses: event.expenses },
                      ],
                    };
                  }
                  return updated;
                });
              } else if (event.type === "summary") {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...last,
                      attachments: [
                        ...(last.attachments ?? []),
                        { type: "summary", data: event.data },
                      ],
                    };
                  }
                  return updated;
                });
              } else if (event.type === "daily_breakdown") {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...last,
                      attachments: [
                        ...(last.attachments ?? []),
                        { type: "daily_breakdown", data: event.data },
                      ],
                    };
                  }
                  return updated;
                });
              } else if (event.type === "expense_deleted") {
                setSummaryRefreshKey((k) => k + 1);
                if (event.id) {
                  setDeletedIds((prev) => new Set(prev).add(event.id));
                }
              } else if (event.type === "error") {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...last,
                      content: event.error,
                    };
                  }
                  return updated;
                });
              }
            } catch {
              // Skip malformed SSE chunks
            }
          }
        }

        if (!receivedText) {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === "assistant" && last.content === "") {
              updated[updated.length - 1] = {
                ...last,
                content:
                  "I didn't have a response for that. Could you try rephrasing?",
              };
            }
            return updated;
          });
        }
      } else {
        const data = await res.json().catch(() => null);
        const errorMessage =
          data?.error ?? "Something went wrong. Please try again.";
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: errorMessage,
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      const message = !navigator.onLine
        ? "You seem to be offline. Check your connection and try again."
        : "Something went wrong. Please try again.";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: message, timestamp: new Date() },
      ]);
      console.error("Chat error:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[100dvh] bg-gray-950 text-white">
      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="shrink-0 bg-gradient-to-r from-blue-600 via-blue-700 to-purple-600 px-4 py-3 shadow-lg shadow-black/20 border-b border-white/10">
          <div className="flex items-center justify-between sm:max-w-2xl mx-auto w-full">
            <div className="flex-1" />
            <div className="text-center">
              <h1 className="text-base sm:text-lg font-bold text-white">
                💰 UAI Expense AI
              </h1>
              <p className="hidden sm:block text-xs text-blue-100 mt-0.5">
                Track your spending with natural language
              </p>
            </div>
            {/* Recent expenses toggle */}
            <div className="flex-1 flex justify-end">
              <button
                onClick={() => setRecentOpen((o) => !o)}
                title="Recent expenses"
                className="text-white/80 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
              >
                📋
              </button>
            </div>
          </div>
        </header>

        {/* Summary panel */}
        <SummaryPanel
          isOpen={summaryOpen}
          onToggle={() => setSummaryOpen((o) => !o)}
          refreshKey={summaryRefreshKey}
        />

        {/* Messages area */}
        <main ref={chatContainerRef} className="flex-1 overflow-y-auto p-3 sm:p-4">
          <div className="sm:max-w-2xl mx-auto w-full">
            {/* Suggestion chips — only shown before first user message */}
            {!hasUserMessage && (
              <div className="flex flex-wrap gap-2 mb-4">
                {SUGGESTION_CHIPS.map(({ icon, text }) => (
                  <button
                    key={text}
                    onClick={() => handleSend(text)}
                    disabled={loading}
                    className="text-[11px] sm:text-xs bg-gray-800 hover:bg-gray-700 hover:scale-105 text-gray-300 px-3 py-2 rounded-full transition-all disabled:opacity-50"
                  >
                    {icon} {text}
                  </button>
                ))}
              </div>
            )}

            {/* Message list */}
            {messages.map((msg, i) => (
              <ChatMessage
                key={i}
                message={msg}
                onDeleteExpense={handleDeleteExpense}
                deletedIds={deletedIds}
              />
            ))}

            {/* Typing indicator */}
            {showTypingIndicator && <TypingIndicator />}

            {/* Scroll anchor */}
            <div ref={bottomRef} />
          </div>
        </main>

        {/* Input bar */}
        <div className="relative">
          <ChatInput onSend={handleSend} disabled={loading} />
          {/* Mobile FAB for recent expenses */}
          <button
            onClick={() => setRecentOpen((o) => !o)}
            className="lg:hidden absolute right-4 -top-14 w-10 h-10 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-lg shadow-lg hover:bg-gray-700 transition-colors"
            title="Recent expenses"
          >
            📋
          </button>
        </div>
      </div>

      {/* Recent expenses sidebar (desktop) + bottom sheet (mobile) */}
      <RecentExpenses
        isOpen={recentOpen}
        onToggle={() => setRecentOpen((o) => !o)}
        onDelete={handleDeleteExpense}
        refreshKey={summaryRefreshKey}
        deletedIds={deletedIds}
      />
    </div>
  );
}

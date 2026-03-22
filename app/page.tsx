"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ChatInput from "@/components/ChatInput";
import ChatMessage from "@/components/ChatMessage";
import TypingIndicator from "@/components/TypingIndicator";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const WELCOME_MESSAGE: Message = {
  role: "assistant",
  content:
    'Hi! I\'m your AI expense tracker. Tell me about your spending — like "I spent ₹500 on groceries" — or ask me anything about your expenses. More features are coming soon!',
  timestamp: new Date(),
};

const SUGGESTION_CHIPS = [
  { icon: "🛒", text: "I spent ₹500 on groceries" },
  { icon: "📊", text: "How much did I spend this week?" },
  { icon: "📋", text: "Show me my spending summary" },
  { icon: "💡", text: "I paid ₹1200 for electricity bill" },
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [loading, setLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const hasUserMessage = messages.some((m) => m.role === "user");

  // Show dots only before the first streaming chunk — once we add the empty
  // assistant message, the last message is "assistant" and dots hide
  const showTypingIndicator =
    loading && messages[messages.length - 1]?.role === "user";

  // Only auto-scroll if the user is already near the bottom
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

  async function handleSend(text: string) {
    if (loading) return; // guard against double-send

    const userMessage: Message = { role: "user", content: text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    // Build API payload — skip the welcome message (index 0), add new user msg
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
        // ── Streaming response ─────────────────────────────────────────────
        // Add an empty assistant message — we'll fill it as chunks arrive
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
              } else if (event.type === "error") {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === "assistant") {
                    updated[updated.length - 1] = { ...last, content: event.error };
                  }
                  return updated;
                });
              }
            } catch {
              // Skip malformed SSE chunks
            }
          }
        }

        // If stream ended with no content, show a fallback
        if (!receivedText) {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === "assistant" && last.content === "") {
              updated[updated.length - 1] = {
                ...last,
                content: "I didn't have a response for that. Could you try rephrasing?",
              };
            }
            return updated;
          });
        }
      } else {
        // ── JSON response (validation error) ──────────────────────────────
        const data = await res.json().catch(() => null);
        const errorMessage = data?.error ?? "Something went wrong. Please try again.";
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: errorMessage, timestamp: new Date() },
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
    <div className="flex flex-col h-[100dvh] bg-gray-950 text-white">
      {/* Header */}
      <header className="shrink-0 bg-gradient-to-r from-blue-600 via-blue-700 to-purple-600 p-4 shadow-lg shadow-black/20 border-b border-white/10">
        <h1 className="text-base sm:text-lg font-bold text-white text-center">
          💰 UAI Expense AI
        </h1>
        <p className="hidden sm:block text-xs text-blue-100 text-center mt-1">
          Track your spending with natural language
        </p>
      </header>

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
              role={msg.role}
              content={msg.content}
              timestamp={msg.timestamp}
            />
          ))}

          {/* Typing indicator — shown before first streaming chunk arrives */}
          {showTypingIndicator && <TypingIndicator />}

          {/* Scroll anchor */}
          <div ref={bottomRef} />
        </div>
      </main>

      {/* Input bar */}
      <ChatInput onSend={handleSend} disabled={loading} />
    </div>
  );
}

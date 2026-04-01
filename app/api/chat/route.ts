import Groq from "groq-sdk";
import { tools } from "@/lib/tools";
import { executeTool } from "@/lib/toolExecutor";

// Allow up to 60s on Vercel Pro; Hobby is capped at 10s but this signals intent
export const maxDuration = 60;

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

type GroqMessage = Groq.Chat.Completions.ChatCompletionMessageParam;

interface IncomingMessage {
  role: "user" | "assistant";
  content: string;
}

function buildSystemPrompt(): string {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const dayOfWeek = now.toLocaleDateString("en-US", { weekday: "long" });

  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const mondayStr = monday.toISOString().split("T")[0];

  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstOfMonthStr = firstOfMonth.toISOString().split("T")[0];

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  return `You are "UAI Expense AI", a friendly and concise AI expense tracking assistant.

CURRENT DATE CONTEXT:
- Today is: ${today} (${dayOfWeek})
- Yesterday was: ${yesterdayStr}
- This week started (Monday): ${mondayStr}
- This month started: ${firstOfMonthStr}

Use these dates when the user refers to relative dates like "today", "yesterday",
"this week", "this month". Always convert relative dates to YYYY-MM-DD format when
calling tools.

YOUR PERSONALITY:
- Friendly but concise. 1-3 sentences unless detail is needed.
- Use ₹ symbol for all amounts (Indian Rupees default).
- When logging expenses, confirm what was saved with the exact amount and category.
- When showing summaries, format amounts nicely: ₹1,500 not ₹1500.
- When showing expense lists, present them clearly with amounts and dates.
- Use relevant emoji sparingly: 🍕 food, 🚗 transport, 🛍️ shopping, 📄 bills,
  🎬 entertainment, 💊 health, 📚 education, 🛒 groceries, 🏠 rent, 💰 salary.

TOOL USAGE RULES:
- When the user mentions spending money → use log_expense
- When the user asks to SEE expenses → use get_expenses
- When the user asks about TOTALS or SUMMARIES → use get_summary
- When the user wants to DELETE → use delete_expense
  (if you don't know the ID, call get_expenses first to find it)
- If a user logs multiple expenses in one message ("₹500 on food and ₹200 on transport"),
  call log_expense ONCE for EACH expense (multiple tool calls).
- NEVER make up or estimate expense data. ONLY use data from tool results.
- CRITICAL: Only call log_expense for expenses mentioned in the CURRENT user message.
  NEVER re-log expenses from earlier messages in the conversation history — they are
  already saved. Each expense must only be logged once.

FORMATTING RULES FOR SUMMARIES:
When showing spending summaries, format like this:
"Here's your spending for [period]:
- 🍕 Food: ₹X,XXX (N transactions)
- 🚗 Transport: ₹X,XXX (N transactions)
Total: ₹X,XXX across N expenses"

FORMATTING RULES FOR EXPENSE LISTS:
When showing expense lists, format like this:
"Here are your recent expenses:
1. ₹500 — lunch at restaurant (food) — Mar 24
2. ₹150 — uber to office (transport) — Mar 24
3. ₹1,200 — electricity bill (bills) — Mar 23"

FORMATTING FOR DAILY BREAKDOWNS:
"Here's your day-by-day spending:
📅 Mon, Mar 24: ₹1,200 (3 expenses)
📅 Sun, Mar 23: ₹800 (2 expenses)
─────────────
Total: ₹2,000"

WHEN NO DATA EXISTS:
If a query returns zero results, say something helpful like:
"No expenses found for [period]. Start tracking by telling me what you spent!"
Do NOT say "Error" or "Failed" — the user just hasn't logged anything yet.

If the user talks about something unrelated to expenses, respond briefly and
steer back: "I'm best at helping with expense tracking! Want to log something?"`;
}

const MAX_MESSAGES = 100;
const MAX_CONTENT_LENGTH = 10_000;
const VALID_ROLES = ["user", "assistant"] as const;
const MAX_TOOL_ROUNDS = 10;

export async function POST(request: Request) {
  // ── 1. Parse JSON body ────────────────────────────────────────────────────
  let body: { messages?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON in request body" }, { status: 400 });
  }

  // ── 2. Validate messages field ────────────────────────────────────────────
  if (body.messages === undefined || body.messages === null) {
    return Response.json(
      { error: "Missing 'messages' field in request body" },
      { status: 400 }
    );
  }
  if (!Array.isArray(body.messages)) {
    return Response.json({ error: "'messages' must be an array" }, { status: 400 });
  }
  if (body.messages.length === 0) {
    return Response.json({ error: "'messages' array cannot be empty" }, { status: 400 });
  }
  if (body.messages.length > MAX_MESSAGES) {
    return Response.json(
      { error: `Too many messages. Maximum is ${MAX_MESSAGES}.` },
      { status: 400 }
    );
  }

  // ── 3. Validate each message ──────────────────────────────────────────────
  for (let i = 0; i < body.messages.length; i++) {
    const msg = body.messages[i];
    if (!msg || typeof msg !== "object" || Array.isArray(msg)) {
      return Response.json(
        { error: `Message at index ${i} must be an object` },
        { status: 400 }
      );
    }
    const { role, content } = msg as Record<string, unknown>;
    if (
      typeof role !== "string" ||
      !VALID_ROLES.includes(role as "user" | "assistant")
    ) {
      return Response.json(
        { error: `Message at index ${i} has invalid role: '${role}'` },
        { status: 400 }
      );
    }
    if (typeof content !== "string" || content.length === 0) {
      return Response.json(
        { error: `Message at index ${i} has empty content` },
        { status: 400 }
      );
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      return Response.json(
        {
          error: `Message at index ${i} exceeds maximum length of ${MAX_CONTENT_LENGTH} characters`,
        },
        { status: 400 }
      );
    }
  }

  const validatedMessages = body.messages as IncomingMessage[];

  // ── 4. Start SSE stream immediately — all processing happens inside ────────
  // This prevents Vercel from timing out while waiting for Groq + tool calls.
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      function send(obj: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      }

      function friendlyError(error: unknown): string {
        if (error instanceof Groq.APIError) {
          const status = error.status;
          if (status === 401) return "AI service configuration error. Please contact support.";
          if (status === 429) return "I'm getting a lot of requests right now. Please wait 30 seconds and try again.";
          if (status === 503 || status === 529) return "AI service is temporarily busy. Please try again in a moment.";
          if (
            error.message?.toLowerCase().includes("context") ||
            error.message?.toLowerCase().includes("token")
          ) return "Our conversation has gotten very long. Try starting a new chat.";
        }
        const msg = error instanceof Error ? error.message : "";
        if (msg.includes("ECONNREFUSED") || msg.includes("fetch failed")) {
          return "Could not reach AI service. Check your internet connection.";
        }
        return "Something unexpected happened. Please try again.";
      }

      try {
        const systemPrompt = buildSystemPrompt();
        const groqMessages: GroqMessage[] = [
          { role: "system", content: systemPrompt },
          ...validatedMessages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        ];

        let toolRound = 0;
        const toolResults: Array<{ toolName: string; result: string }> = [];

        while (toolRound < MAX_TOOL_ROUNDS) {
          toolRound++;

          let response: Groq.Chat.Completions.ChatCompletion | null = null;
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              response = await client.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                max_tokens: 1024,
                tools,
                tool_choice: "auto",
                messages: groqMessages,
              });
              break;
            } catch (err) {
              if (err instanceof Groq.APIError) {
                const code = (err.error as Record<string, unknown>)?.code;
                const isToolFailed = err.status === 400 && code === "tool_use_failed";
                const isRateLimit = err.status === 429;
                if ((isToolFailed || isRateLimit) && attempt < 2) {
                  const delay = isRateLimit ? 20000 : 0;
                  console.error(`[retry] ${code ?? err.status} — attempt ${attempt + 1}`);
                  if (delay) await new Promise((r) => setTimeout(r, delay));
                  continue;
                }
              }
              throw err;
            }
          }
          if (!response) throw new Error("No response after retries");

          const choice = response.choices[0];
          const message = choice.message;
          const toolCalls = message.tool_calls;

          if (!toolCalls || toolCalls.length === 0 || choice.finish_reason !== "tool_calls") {
            const finalText =
              message.content || "Done! Is there anything else you'd like to track?";

            // Emit structured data events
            for (const { toolName, result } of toolResults) {
              try {
                const parsed = JSON.parse(result);

                if (toolName === "log_expense" && parsed.success && parsed.expense) {
                  send({ type: "expense_logged", expense: parsed.expense });
                }
                if (toolName === "get_expenses" && parsed.expenses) {
                  send({ type: "expenses_list", expenses: parsed.expenses });
                }
                if (toolName === "get_summary" && parsed.summary) {
                  send({ type: "summary", data: parsed });
                }
                if (toolName === "get_daily_breakdown" && parsed.days) {
                  send({ type: "daily_breakdown", data: parsed.days });
                }
                if (toolName === "delete_expense" && parsed.success) {
                  send({ type: "expense_deleted", id: parsed.id ?? null });
                }
              } catch {
                // Skip malformed tool results
              }
            }

            // Stream text in chunks
            const chunkSize = 12;
            let index = 0;
            await new Promise<void>((resolve) => {
              function pushChunk() {
                if (index >= finalText.length) {
                  send({ type: "done" });
                  controller.close();
                  resolve();
                  return;
                }
                const chunk = finalText.slice(index, index + chunkSize);
                index += chunkSize;
                send({ type: "text", text: chunk });
                setTimeout(pushChunk, 15);
              }
              pushChunk();
            });
            return;
          }

          groqMessages.push(message as GroqMessage);

          for (const toolCall of toolCalls) {
            const fnName = toolCall.function.name;
            let fnArgs: Record<string, unknown> = {};
            try {
              fnArgs = JSON.parse(toolCall.function.arguments);
            } catch {
              fnArgs = {};
            }

            console.error(`[tool] ${fnName}`, JSON.stringify(fnArgs));

            const result = await executeTool(fnName, fnArgs);
            toolResults.push({ toolName: fnName, result });

            groqMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: result,
            });
          }
        }

        // Safety: exceeded MAX_TOOL_ROUNDS
        send({ type: "text", text: "I got a bit carried away. Could you try again with a simpler ask?" });
        send({ type: "done" });
        controller.close();

      } catch (error) {
        console.error("Chat stream error:", error);
        send({ type: "error", error: friendlyError(error) });
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

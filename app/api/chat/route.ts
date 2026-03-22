import Groq from "groq-sdk";

/** Groq client — initialized once at module level, reused across requests */
const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface Message {
  role: "user" | "assistant";
  content: string;
}

/** Builds the system prompt with today's date injected dynamically */
function buildSystemPrompt(): string {
  const today = new Date().toISOString().split("T")[0];
  return `You are "UAI Expense AI", a friendly and concise AI expense tracking assistant.

Today's date is ${today}.

Your personality:
- Friendly but not over-the-top. No excessive emojis or exclamation marks.
- Concise — keep responses to 1-3 sentences unless the user asks for detail.
- Helpful — always try to understand what the user is trying to do.
- Smart about money — you understand Indian Rupees (₹) as default currency.

What you can do right now:
- Chat naturally about expenses and money
- Acknowledge when users tell you about spending
- Answer questions about expenses (even though we don't have a database yet,
  you can remember what was said in this conversation)
- Give basic financial tips if asked

What you CANNOT do yet (features coming soon):
- You cannot actually save expenses to a database
- You cannot show historical data beyond this conversation
- You cannot connect to bank accounts or other apps

When a user mentions spending money, acknowledge it warmly and note that
persistent tracking is coming soon. For example:
User: "I spent ₹500 on food"
You: "Noted — ₹500 on food today. I'll be able to save and track these
for you once the full tracking feature goes live! For now, I can keep
track within our conversation."

If someone asks something completely unrelated to expenses or money,
respond briefly but gently steer back: "I'm best at helping with expense
tracking! Want to log some spending or ask about your finances?"`;
}

const MAX_MESSAGES = 100;
const MAX_CONTENT_LENGTH = 10_000;
const VALID_ROLES = ["user", "assistant"] as const;

export async function POST(request: Request) {
  // ── 1. Parse JSON body ──────────────────────────────────────────────────────
  let body: { messages?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON in request body" }, { status: 400 });
  }

  // ── 2. Validate messages field ──────────────────────────────────────────────
  if (body.messages === undefined || body.messages === null) {
    return Response.json({ error: "Missing 'messages' field in request body" }, { status: 400 });
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

  // ── 3. Validate each message ────────────────────────────────────────────────
  for (let i = 0; i < body.messages.length; i++) {
    const msg = body.messages[i];
    if (!msg || typeof msg !== "object" || Array.isArray(msg)) {
      return Response.json({ error: `Message at index ${i} must be an object` }, { status: 400 });
    }
    const { role, content } = msg as Record<string, unknown>;
    if (typeof role !== "string" || !VALID_ROLES.includes(role as "user" | "assistant")) {
      return Response.json(
        { error: `Message at index ${i} has invalid role: '${role}'` },
        { status: 400 }
      );
    }
    if (typeof content !== "string" || content.length === 0) {
      return Response.json({ error: `Message at index ${i} has empty content` }, { status: 400 });
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      return Response.json(
        { error: `Message at index ${i} exceeds maximum length of ${MAX_CONTENT_LENGTH} characters` },
        { status: 400 }
      );
    }
  }

  const messages = body.messages as Message[];

  // ── 4. Create streaming response ────────────────────────────────────────────
  let stream: AsyncIterable<Groq.Chat.Completions.ChatCompletionChunk>;
  try {
    stream = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1024,
      stream: true,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        ...messages,
      ],
    });
  } catch (error) {
    // Handle errors that occur before the stream starts (auth, rate limit, etc.)
    if (error instanceof Groq.APIError) {
      const status = error.status;
      if (status === 401) {
        console.error("Groq auth error:", error.message);
        return Response.json(
          { error: "AI service configuration error. Please try again later." },
          { status: 500 }
        );
      }
      if (status === 429) {
        console.error("Groq rate limit:", error.message);
        return Response.json(
          { error: "Too many requests right now. Please wait a moment and try again." },
          { status: 429 }
        );
      }
      if (status === 503 || status === 529) {
        console.error("Groq overloaded:", error.message);
        return Response.json(
          { error: "AI service is temporarily busy. Please try again in a few seconds." },
          { status: 503 }
        );
      }
      if (
        error.message?.toLowerCase().includes("context") ||
        error.message?.toLowerCase().includes("token")
      ) {
        return Response.json(
          { error: "Our conversation has gotten too long. Try starting a new chat." },
          { status: 400 }
        );
      }
    }
    console.error("Unexpected error starting stream:", error);
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  // ── 5. Pipe stream as Server-Sent Events ────────────────────────────────────
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) {
            const data = JSON.stringify({ type: "text", text });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        }
        controller.enqueue(encoder.encode(`data: {"type":"done"}\n\n`));
      } catch (err) {
        console.error("Stream error:", err);
        const data = JSON.stringify({
          type: "error",
          error: "AI response was interrupted. Please try again.",
        });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

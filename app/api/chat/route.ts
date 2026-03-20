import Groq from "groq-sdk";

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const SYSTEM_PROMPT = `You are UAI Expense AI, a friendly AI expense tracking assistant.
You help users track their spending through natural conversation.
For now, just chat normally. Expense tracking features are coming soon.
Be concise and friendly. Use ₹ (Indian Rupees) as default currency.`;

export async function POST(request: Request) {
  let body: { message?: unknown };
  try {
    body = await request.json();
  } catch (error) {
    console.error("Failed to parse request body:", error);
    return Response.json({ error: "Invalid JSON in request body" }, { status: 400 });
  }

  const { message } = body;
  if (!message || typeof message !== "string") {
    return Response.json(
      { error: "Request body must include a message string" },
      { status: 400 }
    );
  }

  try {
    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1024,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: message },
      ],
    });

    const reply = completion.choices[0].message.content ?? "";

    return Response.json({ reply });
  } catch (error) {
    console.error("Groq API error:", error);
    return Response.json(
      { error: "Failed to get response from AI" },
      { status: 500 }
    );
  }
}

import Groq from "groq-sdk";

type GroqTool = Groq.Chat.Completions.ChatCompletionTool;

const logExpenseTool: GroqTool = {
  type: "function",
  function: {
    name: "log_expense",
    description: `Log a new expense. Use this tool whenever the user mentions spending money,
making a payment, buying something, paying a bill, or any financial outflow.

Examples of when to use this tool:
- "I spent ₹500 on groceries"
- "Paid 1200 for electricity"
- "Bought a book for 350"
- "Had lunch for 200 rupees"
- "Uber ride cost me ₹150"
- "Gave ₹5000 rent to landlord"

Extract the amount, categorize the expense, write a brief description,
and determine the date. If the user doesn't specify a date, use today's date.
If the user says "yesterday", calculate the actual date.

For category, choose the most appropriate from: food, transport, shopping,
bills, entertainment, health, education, groceries, rent, salary, other.
If unsure between two categories, prefer the more specific one.`,
    parameters: {
      type: "object",
      properties: {
        amount: {
          type: "number",
          description:
            "The amount spent in INR (₹). Must be a positive number. If the user says 'five hundred', convert to 500. If they say '1.5k', convert to 1500.",
        },
        category: {
          type: "string",
          description:
            "The expense category. Must be one of: food, transport, shopping, bills, entertainment, health, education, groceries, rent, salary, other",
          enum: [
            "food",
            "transport",
            "shopping",
            "bills",
            "entertainment",
            "health",
            "education",
            "groceries",
            "rent",
            "salary",
            "other",
          ],
        },
        description: {
          type: "string",
          description:
            "A brief description of what the money was spent on. Keep it short (2-6 words). Examples: 'lunch at restaurant', 'uber to office', 'electricity bill', 'groceries at BigBasket'",
        },
        date: {
          type: "string",
          description:
            "The date of the expense in YYYY-MM-DD format. Use today's date if not specified. Calculate relative dates: 'yesterday' = today minus 1 day, 'last Friday' = the most recent Friday before today, etc.",
        },
      },
      required: ["amount", "category", "description", "date"],
    },
  },
};

const getExpensesTool: GroqTool = {
  type: "function",
  function: {
    name: "get_expenses",
    description: `Retrieve a list of expenses. Use this tool when the user wants to SEE their
expenses or transaction history.

Examples of when to use this tool:
- "Show me my expenses"
- "What did I spend on this week?"
- "List my food expenses"
- "Show me everything I spent in March"
- "What were my last 5 expenses?"

Do NOT use this for questions about totals or summaries — use get_summary instead.
Use this when the user wants to SEE individual expense line items.`,
    parameters: {
      type: "object",
      properties: {
        start_date: {
          type: "string",
          description:
            "Start date filter in YYYY-MM-DD format. For 'this week', use Monday of the current week. For 'this month', use the 1st of the current month. For 'today', use today's date.",
        },
        end_date: {
          type: "string",
          description:
            "End date filter in YYYY-MM-DD format. Usually today's date unless the user specifies a past period.",
        },
        category: {
          type: "string",
          description:
            "Optional category filter. Only include if the user specifically asks about a category.",
          enum: [
            "food",
            "transport",
            "shopping",
            "bills",
            "entertainment",
            "health",
            "education",
            "groceries",
            "rent",
            "salary",
            "other",
          ],
        },
        limit: {
          type: "number",
          description:
            "Maximum number of expenses to return. Default 10. Use 5 for 'last few expenses', up to 50 for comprehensive lists.",
        },
      },
      required: [],
    },
  },
};

const getSummaryTool: GroqTool = {
  type: "function",
  function: {
    name: "get_summary",
    description: `Get a spending summary with totals broken down by category. Use this tool
when the user asks about HOW MUCH they spent in total, wants a summary, overview,
breakdown, or asks about spending patterns.

Examples of when to use this tool:
- "How much did I spend today?"
- "How much have I spent this month?"
- "Give me a summary of my spending"
- "What's my total for this week?"
- "How much did I spend on food?"
- "Show me a breakdown of my expenses"
- "What am I spending the most on?"

Use this instead of get_expenses when the user wants TOTALS, not individual items.`,
    parameters: {
      type: "object",
      properties: {
        start_date: {
          type: "string",
          description:
            "Start date in YYYY-MM-DD format. For 'this week', use Monday of current week. For 'this month', use 1st of current month. For 'today', use today's date.",
        },
        end_date: {
          type: "string",
          description:
            "End date in YYYY-MM-DD format. Usually today's date unless asking about a past period.",
        },
      },
      required: [],
    },
  },
};

const deleteExpenseTool: GroqTool = {
  type: "function",
  function: {
    name: "delete_expense",
    description: `Delete a specific expense by its ID. Use this tool when the user wants to
remove, undo, or delete an expense they previously logged.

Examples of when to use this tool:
- "Delete that expense"
- "Remove the last expense"
- "Undo that"
- "I made a mistake, delete the ₹500 food expense"

IMPORTANT: If the user says "delete the last expense" or "undo that", you need to
first know which expense they mean. If you don't know the ID, call get_expenses first
to find recent expenses, then call delete_expense with the correct ID.

If the user says "delete the food expense" and there are multiple food expenses,
ask which one they mean before deleting.`,
    parameters: {
      type: "object",
      properties: {
        id: {
          type: "number",
          description:
            "The unique ID of the expense to delete. This must be an exact expense ID from the database.",
        },
      },
      required: ["id"],
    },
  },
};

const getDailyBreakdownTool: GroqTool = {
  type: "function",
  function: {
    name: "get_daily_breakdown",
    description: `Get a day-by-day breakdown of spending. Use this when the user asks
about spending patterns over time, daily spending, or wants to see how their
spending varied across days.

Examples:
- "Show me my daily spending this week"
- "How much did I spend each day?"
- "Day by day breakdown for this month"`,
    parameters: {
      type: "object",
      properties: {
        start_date: {
          type: "string",
          description: "Start date in YYYY-MM-DD format",
        },
        end_date: {
          type: "string",
          description: "End date in YYYY-MM-DD format",
        },
      },
      required: [],
    },
  },
};

export const tools: GroqTool[] = [
  logExpenseTool,
  getExpensesTool,
  getSummaryTool,
  deleteExpenseTool,
  getDailyBreakdownTool,
];

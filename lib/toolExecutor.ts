import {
  addExpense,
  getExpenses,
  getSummaryByCategory,
  deleteExpense,
  getExpenseById,
  getDailySummary,
} from "./expenses";

/**
 * Execute a named tool with the given input parameters.
 * Returns a JSON string result — success or structured error.
 * Never throws; all errors are caught and returned as JSON.
 */
export function executeTool(
  name: string,
  input: Record<string, unknown> | null
): string {
  // Groq occasionally passes null for tools with no required params — normalise to {}
  const args: Record<string, unknown> = input ?? {};
  try {
    switch (name) {
      case "log_expense": {
        const amount = Number(args.amount);
        if (isNaN(amount) || amount <= 0) {
          return JSON.stringify({
            success: false,
            error: "Invalid amount. Must be a positive number.",
          });
        }

        const category = String(args.category || "other");
        const description = String(args.description || category);
        const date = String(
          args.date || new Date().toISOString().split("T")[0]
        );

        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          return JSON.stringify({
            success: false,
            error: `Invalid date format: "${date}". Expected YYYY-MM-DD.`,
          });
        }

        const expense = addExpense(amount, category, description, date);

        return JSON.stringify({
          success: true,
          expense,
          message: `Logged ₹${expense.amount} for ${expense.description} on ${expense.date}`,
        });
      }

      case "get_expenses": {
        const expenses = getExpenses({
          startDate: args.start_date as string | undefined,
          endDate: args.end_date as string | undefined,
          category: args.category as string | undefined,
          limit: args.limit as number | undefined,
        });

        if (expenses.length === 0) {
          return JSON.stringify({
            expenses: [],
            count: 0,
            message: "No expenses found for the given criteria.",
          });
        }

        return JSON.stringify({
          expenses,
          count: expenses.length,
          message: `Found ${expenses.length} expense(s).`,
        });
      }

      case "get_summary": {
        const result = getSummaryByCategory({
          startDate: args.start_date as string | undefined,
          endDate: args.end_date as string | undefined,
        });

        if (result.count === 0) {
          return JSON.stringify({
            summary: [],
            total: 0,
            count: 0,
            message: "No expenses found for the given period.",
          });
        }

        return JSON.stringify({
          summary: result.summary,
          total: result.total,
          count: result.count,
          avgPerExpense: result.avgPerExpense,
          dateRange: result.dateRange,
          topCategory: result.topCategory,
          topExpense: result.topExpense,
          message: `Total: ₹${result.total} across ${result.count} expense(s).`,
        });
      }

      case "delete_expense": {
        const id = Number(args.id);
        if (isNaN(id) || id <= 0) {
          return JSON.stringify({
            success: false,
            error: "Invalid expense ID.",
          });
        }

        const deletedExpense = getExpenseById(id);
        const result = deleteExpense(id);
        return JSON.stringify({ ...result, id, deletedExpense });
      }

      case "get_daily_breakdown": {
        const rows = getDailySummary({
          startDate: args.start_date as string | undefined,
          endDate: args.end_date as string | undefined,
        });

        if (rows.length === 0) {
          return JSON.stringify({
            days: [],
            message: "No expenses found for the given period.",
          });
        }

        return JSON.stringify({
          days: rows,
          message: `Found spending data for ${rows.length} day(s).`,
        });
      }

      default:
        return JSON.stringify({
          success: false,
          error: `Unknown tool: ${name}. Available tools: log_expense, get_expenses, get_summary, delete_expense, get_daily_breakdown.`,
        });
    }
  } catch (error) {
    console.error(`Tool execution error (${name}):`, error);
    return JSON.stringify({
      success: false,
      error: `Failed to execute ${name}. Please try again.`,
    });
  }
}

import { getDb, ensureDbInitialized } from "./db";
import type { Row } from "@libsql/client";

/** A single expense row from the database */
export type Expense = {
  id: number;
  amount: number;
  category: string;
  description: string;
  date: string;       // YYYY-MM-DD
  created_at: string; // ISO timestamp
};

/** Aggregate totals for a single category */
export type CategorySummary = {
  category: string;
  total: number;
  count: number;
};

/** All valid expense categories */
export const VALID_CATEGORIES = [
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
] as const;

export type Category = (typeof VALID_CATEGORIES)[number];

function rowToExpense(row: Row): Expense {
  return {
    id: Number(row.id),
    amount: Number(row.amount),
    category: String(row.category),
    description: String(row.description),
    date: String(row.date),
    created_at: String(row.created_at ?? ""),
  };
}

/**
 * Insert a new expense into the database.
 */
export async function addExpense(
  amount: number,
  category: string,
  description: string,
  date: string
): Promise<Expense> {
  if (amount <= 0 || isNaN(amount)) {
    throw new Error("Amount must be a positive number");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid date format: "${date}". Expected YYYY-MM-DD.`);
  }

  await ensureDbInitialized();
  const client = getDb();

  const validCategory = VALID_CATEGORIES.includes(category as Category)
    ? category
    : "other";

  const trimmedDescription = description.trim() || validCategory;

  const result = await client.execute({
    sql: "INSERT INTO expenses (amount, category, description, date) VALUES (?, ?, ?, ?)",
    args: [amount, validCategory, trimmedDescription, date],
  });

  const id = Number(result.lastInsertRowid);

  const row = await client.execute({
    sql: "SELECT * FROM expenses WHERE id = ?",
    args: [id],
  });

  return rowToExpense(row.rows[0]);
}

/**
 * Retrieve expenses with optional date range, category, and limit filters.
 */
export async function getExpenses(options?: {
  startDate?: string;
  endDate?: string;
  category?: string;
  limit?: number;
}): Promise<Expense[]> {
  await ensureDbInitialized();
  const client = getDb();

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (options?.startDate) {
    conditions.push("date >= ?");
    params.push(options.startDate);
  }
  if (options?.endDate) {
    conditions.push("date <= ?");
    params.push(options.endDate);
  }
  if (options?.category) {
    conditions.push("category = ?");
    params.push(options.category);
  }

  const where =
    conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

  const limit = Math.min(options?.limit ?? 50, 200);
  params.push(limit);

  const result = await client.execute({
    sql: `SELECT * FROM expenses ${where} ORDER BY date DESC, created_at DESC LIMIT ?`,
    args: params,
  });

  return result.rows.map(rowToExpense);
}

/**
 * Return a spending summary grouped by category, plus grand totals.
 */
export async function getSummaryByCategory(options?: {
  startDate?: string;
  endDate?: string;
}): Promise<{
  summary: CategorySummary[];
  total: number;
  count: number;
  avgPerExpense: number;
  dateRange: { start: string; end: string } | null;
  topCategory: string | null;
  topExpense: Expense | null;
}> {
  await ensureDbInitialized();
  const client = getDb();

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (options?.startDate) {
    conditions.push("date >= ?");
    params.push(options.startDate);
  }
  if (options?.endDate) {
    conditions.push("date <= ?");
    params.push(options.endDate);
  }

  const where =
    conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

  const [summaryResult, totalResult, dateRangeResult, topExpenseResult] =
    await Promise.all([
      client.execute({
        sql: `SELECT category, SUM(amount) as total, COUNT(*) as count
              FROM expenses ${where}
              GROUP BY category
              ORDER BY total DESC`,
        args: params,
      }),
      client.execute({
        sql: `SELECT SUM(amount) as total, COUNT(*) as count FROM expenses ${where}`,
        args: params,
      }),
      client.execute({
        sql: `SELECT MIN(date) as start, MAX(date) as end FROM expenses ${where}`,
        args: params,
      }),
      client.execute({
        sql: `SELECT * FROM expenses ${where} ORDER BY amount DESC LIMIT 1`,
        args: params,
      }),
    ]);

  const summary: CategorySummary[] = summaryResult.rows.map((r) => ({
    category: String(r.category),
    total: Number(r.total),
    count: Number(r.count),
  }));

  const totalRow = totalResult.rows[0];
  const total = totalRow?.total != null ? Number(totalRow.total) : 0;
  const count = totalRow?.count != null ? Number(totalRow.count) : 0;

  const dateRangeRow = dateRangeResult.rows[0];
  const dateRange =
    dateRangeRow?.start && dateRangeRow?.end
      ? { start: String(dateRangeRow.start), end: String(dateRangeRow.end) }
      : null;

  const topExpense =
    topExpenseResult.rows.length > 0
      ? rowToExpense(topExpenseResult.rows[0])
      : null;

  return {
    summary,
    total,
    count,
    avgPerExpense: count > 0 ? Math.round((total / count) * 100) / 100 : 0,
    dateRange,
    topCategory: summary.length > 0 ? summary[0].category : null,
    topExpense,
  };
}

/**
 * Delete an expense by ID.
 */
export async function deleteExpense(
  id: number
): Promise<{ success: boolean; message: string }> {
  if (!Number.isInteger(id) || id <= 0) {
    return { success: false, message: "Invalid expense ID." };
  }

  await ensureDbInitialized();
  const client = getDb();

  const result = await client.execute({
    sql: "DELETE FROM expenses WHERE id = ?",
    args: [id],
  });

  if (result.rowsAffected === 0) {
    return { success: false, message: `No expense found with ID ${id}.` };
  }

  return { success: true, message: `Expense #${id} deleted.` };
}

/**
 * Look up a single expense by ID.
 */
export async function getExpenseById(id: number): Promise<Expense | null> {
  await ensureDbInitialized();
  const client = getDb();

  const result = await client.execute({
    sql: "SELECT * FROM expenses WHERE id = ?",
    args: [id],
  });

  return result.rows.length > 0 ? rowToExpense(result.rows[0]) : null;
}

/**
 * Return the N most recently created expenses (by created_at).
 */
export async function getRecentExpenses(count: number = 5): Promise<Expense[]> {
  await ensureDbInitialized();
  const client = getDb();

  const result = await client.execute({
    sql: "SELECT * FROM expenses ORDER BY created_at DESC LIMIT ?",
    args: [count],
  });

  return result.rows.map(rowToExpense);
}

/**
 * Return day-by-day spending totals, optionally filtered by date range.
 */
export async function getDailySummary(options?: {
  startDate?: string;
  endDate?: string;
}): Promise<Array<{ date: string; total: number; count: number }>> {
  await ensureDbInitialized();
  const client = getDb();

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (options?.startDate) {
    conditions.push("date >= ?");
    params.push(options.startDate);
  }
  if (options?.endDate) {
    conditions.push("date <= ?");
    params.push(options.endDate);
  }

  const where =
    conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

  const result = await client.execute({
    sql: `SELECT date, SUM(amount) as total, COUNT(*) as count
          FROM expenses ${where}
          GROUP BY date
          ORDER BY date DESC`,
    args: params,
  });

  return result.rows.map((r) => ({
    date: String(r.date),
    total: Number(r.total),
    count: Number(r.count),
  }));
}

/**
 * Return the total spending for a specific year/month.
 */
export async function getMonthlyTotal(
  year: number,
  month: number
): Promise<{ total: number; count: number; dailyAverage: number }> {
  await ensureDbInitialized();
  const client = getDb();

  const monthStr = `${year}-${String(month).padStart(2, "0")}`;

  const result = await client.execute({
    sql: "SELECT SUM(amount) as total, COUNT(*) as count FROM expenses WHERE date LIKE ?",
    args: [`${monthStr}-%`],
  });

  const row = result.rows[0];
  const total = row?.total != null ? Number(row.total) : 0;
  const count = row?.count != null ? Number(row.count) : 0;

  const now = new Date();
  const isCurrentMonth =
    now.getFullYear() === year && now.getMonth() + 1 === month;
  const daysElapsed = isCurrentMonth
    ? now.getDate()
    : new Date(year, month, 0).getDate();

  return {
    total,
    count,
    dailyAverage:
      daysElapsed > 0 ? Math.round((total / daysElapsed) * 100) / 100 : 0,
  };
}

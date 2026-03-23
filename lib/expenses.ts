import db from "./db";

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

/**
 * Insert a new expense into the database.
 * Validates amount, category, and date before inserting.
 * Returns the full saved Expense object including id and created_at.
 */
export function addExpense(
  amount: number,
  category: string,
  description: string,
  date: string
): Expense {
  if (amount <= 0 || isNaN(amount)) {
    throw new Error("Amount must be a positive number");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid date format: "${date}". Expected YYYY-MM-DD.`);
  }

  const validCategory = VALID_CATEGORIES.includes(category as Category)
    ? category
    : "other";

  const trimmedDescription = description.trim() || validCategory;

  const result = db
    .prepare(
      `INSERT INTO expenses (amount, category, description, date)
       VALUES (?, ?, ?, ?)`
    )
    .run(amount, validCategory, trimmedDescription, date);

  return db
    .prepare(`SELECT * FROM expenses WHERE id = ?`)
    .get(result.lastInsertRowid) as Expense;
}

/**
 * Retrieve expenses with optional date range, category, and limit filters.
 * Results are ordered newest first (by date DESC, then created_at DESC).
 */
export function getExpenses(options?: {
  startDate?: string;
  endDate?: string;
  category?: string;
  limit?: number;
}): Expense[] {
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

  const query = `SELECT * FROM expenses ${where} ORDER BY date DESC, created_at DESC LIMIT ?`;
  params.push(limit);

  return db.prepare(query).all(...params) as Expense[];
}

/**
 * Return a spending summary grouped by category, plus grand totals.
 * Optionally filtered by date range.
 */
export function getSummaryByCategory(options?: {
  startDate?: string;
  endDate?: string;
}): {
  summary: CategorySummary[];
  total: number;
  count: number;
  avgPerExpense: number;
  dateRange: { start: string; end: string } | null;
  topCategory: string | null;
  topExpense: Expense | null;
} {
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

  const summary = db
    .prepare(
      `SELECT category, SUM(amount) as total, COUNT(*) as count
       FROM expenses ${where}
       GROUP BY category
       ORDER BY total DESC`
    )
    .all(...params) as CategorySummary[];

  const totalRow = db
    .prepare(
      `SELECT SUM(amount) as total, COUNT(*) as count FROM expenses ${where}`
    )
    .get(...params) as { total: number | null; count: number };

  const total = totalRow.total ?? 0;
  const count = totalRow.count ?? 0;

  const dateRangeRow = db
    .prepare(
      `SELECT MIN(date) as start, MAX(date) as end FROM expenses ${where}`
    )
    .get(...params) as { start: string | null; end: string | null };

  const dateRange =
    dateRangeRow.start && dateRangeRow.end
      ? { start: dateRangeRow.start, end: dateRangeRow.end }
      : null;

  const topCategory = summary.length > 0 ? summary[0].category : null;

  const topExpense = db
    .prepare(
      `SELECT * FROM expenses ${where} ORDER BY amount DESC LIMIT 1`
    )
    .get(...params) as Expense | undefined ?? null;

  return {
    summary,
    total,
    count,
    avgPerExpense: count > 0 ? Math.round((total / count) * 100) / 100 : 0,
    dateRange,
    topCategory,
    topExpense,
  };
}

/**
 * Delete an expense by ID.
 * Returns success/failure with a descriptive message.
 */
export function deleteExpense(
  id: number
): { success: boolean; message: string } {
  if (!Number.isInteger(id) || id <= 0) {
    return { success: false, message: "Invalid expense ID." };
  }

  const result = db
    .prepare(`DELETE FROM expenses WHERE id = ?`)
    .run(id);

  if (result.changes === 0) {
    return { success: false, message: `No expense found with ID ${id}.` };
  }

  return { success: true, message: `Expense #${id} deleted.` };
}

/**
 * Look up a single expense by ID.
 * Returns the expense or null if not found.
 */
export function getExpenseById(id: number): Expense | null {
  return (
    (db
      .prepare(`SELECT * FROM expenses WHERE id = ?`)
      .get(id) as Expense | undefined) ?? null
  );
}

/**
 * Return the N most recently created expenses (by created_at).
 * Defaults to the last 5.
 */
export function getRecentExpenses(count: number = 5): Expense[] {
  return db
    .prepare(`SELECT * FROM expenses ORDER BY created_at DESC LIMIT ?`)
    .all(count) as Expense[];
}

/**
 * Return day-by-day spending totals, optionally filtered by date range.
 * Ordered newest first.
 */
export function getDailySummary(options?: {
  startDate?: string;
  endDate?: string;
}): Array<{ date: string; total: number; count: number }> {
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

  return db
    .prepare(
      `SELECT date, SUM(amount) as total, COUNT(*) as count
       FROM expenses ${where}
       GROUP BY date
       ORDER BY date DESC`
    )
    .all(...params) as Array<{ date: string; total: number; count: number }>;
}

/**
 * Return the total spending for a specific year/month.
 * Calculates daily average based on days elapsed so far this month
 * (not the full month length), so mid-month figures are realistic.
 */
export function getMonthlyTotal(
  year: number,
  month: number
): { total: number; count: number; dailyAverage: number } {
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;

  const row = db
    .prepare(
      `SELECT SUM(amount) as total, COUNT(*) as count
       FROM expenses
       WHERE date LIKE ?`
    )
    .get(`${monthStr}-%`) as { total: number | null; count: number };

  const total = row.total ?? 0;
  const count = row.count ?? 0;

  // Days elapsed: if current month, use today's date; otherwise use full month
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

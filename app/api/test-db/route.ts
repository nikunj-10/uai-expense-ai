import { NextResponse } from "next/server";
import { addExpense, getExpenses, getSummaryByCategory } from "@/lib/expenses";

/** Temporary test route — verifies the SQLite database is working. Delete after Phase 1. */
export async function GET() {
  const today = new Date().toISOString().split("T")[0];

  const added = addExpense(100, "food", "test lunch", today);
  const expenses = getExpenses();
  const summary = getSummaryByCategory();

  return NextResponse.json({ added, expenses, summary });
}

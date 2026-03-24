import { getRecentExpenses } from "@/lib/expenses";
import { NextResponse } from "next/server";

export async function GET() {
  const expenses = getRecentExpenses(20);
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  return NextResponse.json({ expenses, total });
}

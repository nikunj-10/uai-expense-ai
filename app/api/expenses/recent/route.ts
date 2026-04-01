import { getRecentExpenses } from "@/lib/expenses";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const expenses = await getRecentExpenses(20);
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    return NextResponse.json({ expenses, total });
  } catch (error) {
    console.error("Recent expenses API error:", error);
    return NextResponse.json(
      { expenses: [], total: 0, error: "Could not load recent expenses." },
      { status: 500 }
    );
  }
}

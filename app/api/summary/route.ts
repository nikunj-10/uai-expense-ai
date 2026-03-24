import { getSummaryByCategory } from "@/lib/expenses";
import { NextResponse } from "next/server";

export async function GET() {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  // Monday of this week
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const mondayStr = monday.toISOString().split("T")[0];

  // First of this month
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];

  const todaySummary = getSummaryByCategory({ startDate: today, endDate: today });
  const weekSummary = getSummaryByCategory({ startDate: mondayStr, endDate: today });
  const monthSummary = getSummaryByCategory({ startDate: firstOfMonth, endDate: today });

  const daysInMonth = now.getDate();
  const dailyAvg =
    daysInMonth > 0 ? Math.round(monthSummary.total / daysInMonth) : 0;

  const topCategory = monthSummary.summary[0]?.category ?? null;
  const topCategoryTotal = monthSummary.summary[0]?.total ?? 0;

  return NextResponse.json({
    today: { total: todaySummary.total, count: todaySummary.count },
    week: { total: weekSummary.total, count: weekSummary.count },
    month: { total: monthSummary.total, count: monthSummary.count },
    topCategory,
    topCategoryTotal,
    dailyAvg,
  });
}

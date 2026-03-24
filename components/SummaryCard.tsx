"use client";

/**
 * SummaryCard — renders a spending summary with category breakdown and progress bars.
 * Uses pure CSS for bars — no chart library required.
 */

import { CATEGORY_CONFIG, formatAmount } from "./ExpenseCard";

type SummaryCardProps = {
  data: {
    summary: Array<{ category: string; total: number; count: number }>;
    total: number;
    count: number;
    avgPerExpense?: number;
    topCategory?: string | null;
  };
};

// Maps category key → Tailwind bg color class for progress bars
const BAR_COLORS: Record<string, string> = {
  food: "bg-orange-400",
  transport: "bg-blue-400",
  shopping: "bg-pink-400",
  bills: "bg-yellow-400",
  entertainment: "bg-purple-400",
  health: "bg-green-400",
  education: "bg-indigo-400",
  groceries: "bg-emerald-400",
  rent: "bg-red-400",
  salary: "bg-teal-400",
  other: "bg-gray-400",
};

export default function SummaryCard({ data }: SummaryCardProps) {
  if (!data.summary || data.summary.length === 0) {
    return (
      <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-4">
        <p className="text-sm font-medium text-gray-300 mb-2">📊 Spending Summary</p>
        <p className="text-sm text-gray-500">No spending data yet. Start tracking!</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-4">
      {/* Header */}
      <p className="text-sm font-medium text-gray-300 mb-3">📊 Spending Summary</p>

      {/* Big total */}
      <div className="mb-4">
        <p className="text-2xl font-bold text-white">{formatAmount(data.total)}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          Total · {data.count} expense{data.count !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Category bars */}
      <div className="space-y-2.5">
        {data.summary.map((item) => {
          const config = CATEGORY_CONFIG[item.category] ?? CATEGORY_CONFIG.other;
          const barColor = BAR_COLORS[item.category] ?? "bg-gray-400";
          const pct = data.total > 0 ? (item.total / data.total) * 100 : 0;

          return (
            <div key={item.category}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm w-4 shrink-0">{config.emoji}</span>
                <span className="text-xs text-gray-300 w-20 shrink-0 truncate">
                  {config.label}
                </span>
                <span className="text-xs font-medium text-white flex-1 text-right">
                  {formatAmount(item.total)}
                </span>
                <span className="text-[10px] text-gray-500 w-8 text-right shrink-0">
                  {Math.round(pct)}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-700 overflow-hidden">
                <div
                  className={`h-full rounded-full ${barColor} transition-all duration-500`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      {data.avgPerExpense !== undefined && data.avgPerExpense > 0 && (
        <p className="text-xs text-gray-500 mt-4">
          Avg per expense: {formatAmount(data.avgPerExpense)}
        </p>
      )}
    </div>
  );
}

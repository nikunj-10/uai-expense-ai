"use client";

/**
 * ExpenseList — renders a scrollable list of ExpenseCards inside a container.
 * Shows header with count, compact cards, footer total, and optional expand/collapse.
 */

import { useState } from "react";
import ExpenseCard, { type ExpenseData } from "./ExpenseCard";
import { formatAmount } from "@/lib/categoryConfig";

type Props = {
  expenses: ExpenseData[];
  onDelete?: (id: number) => void;
  deletedIds?: Set<number>;
};

const INITIAL_LIMIT = 5;

export default function ExpenseList({ expenses, onDelete, deletedIds }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (expenses.length === 0) {
    return (
      <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 px-3.5 py-3">
        <p className="text-sm text-gray-500">No expenses found.</p>
      </div>
    );
  }

  const visible = expanded ? expenses : expenses.slice(0, INITIAL_LIMIT);
  const hiddenCount = expenses.length - INITIAL_LIMIT;
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 overflow-hidden">
      {/* Header */}
      <div className="px-3.5 py-2.5 border-b border-gray-700/30">
        <p className="text-xs font-medium text-gray-300">
          📋 {expenses.length} expense{expenses.length !== 1 ? "s" : ""} found
        </p>
      </div>

      {/* Cards */}
      <div className="divide-y divide-gray-700/20">
        {visible.map((expense) => {
          const isDeleted = deletedIds?.has(expense.id);
          return (
            <div
              key={expense.id}
              className={`px-2 py-1.5 transition-opacity ${isDeleted ? "opacity-40 pointer-events-none" : ""}`}
            >
              <ExpenseCard
                expense={expense}
                variant="compact"
                showDelete={!isDeleted}
                onDelete={onDelete}
              />
            </div>
          );
        })}
      </div>

      {/* Expand button */}
      {!expanded && hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full px-3.5 py-2 text-xs text-blue-400 hover:text-blue-300 hover:bg-gray-700/30 transition-colors text-left border-t border-gray-700/30"
        >
          Show {hiddenCount} more expense{hiddenCount !== 1 ? "s" : ""} ↓
        </button>
      )}

      {/* Footer total */}
      <div className="px-3.5 py-2.5 border-t border-gray-700/30 bg-gray-800/70 flex items-center justify-between">
        <span className="text-xs text-gray-400">Total</span>
        <span className="text-sm font-semibold text-white">
          {formatAmount(total)}
        </span>
      </div>
    </div>
  );
}

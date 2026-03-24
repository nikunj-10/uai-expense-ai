"use client";

/**
 * ExpenseCard — displays a single expense in one of three visual variants.
 * - "inline": full card shown in chat after logging an expense
 * - "compact": smaller card for lists (ExpenseList, RecentExpenses)
 * - "list-item": single-row dense view for sidebars
 */

import { useEffect, useRef, useState } from "react";
import {
  CATEGORY_CONFIG,
  getCategoryConfig,
  formatAmount,
  formatDate,
} from "@/lib/categoryConfig";

export type ExpenseData = {
  id: number;
  amount: number;
  category: string;
  description: string;
  date: string; // YYYY-MM-DD
  created_at?: string;
};

type ExpenseCardProps = {
  expense: ExpenseData;
  onDelete?: (id: number) => void;
  variant?: "inline" | "compact" | "list-item";
  showDelete?: boolean;
  isNew?: boolean;
};

export default function ExpenseCard({
  expense,
  onDelete,
  variant = "inline",
  showDelete = false,
  isNew = false,
}: ExpenseCardProps) {
  const config = getCategoryConfig(expense.category);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleDeleteClick = () => {
    if (confirmingDelete) {
      onDelete?.(expense.id);
      setConfirmingDelete(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    } else {
      setConfirmingDelete(true);
      timerRef.current = setTimeout(() => {
        setConfirmingDelete(false);
      }, 3000);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (variant === "list-item") {
    return (
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg ${config.bgColor} border ${config.borderColor} ${isNew ? "animate-card-in" : ""}`}
      >
        <span className="text-base shrink-0">{config.emoji}</span>
        <span className="text-xs text-white flex-1 truncate">
          {expense.description}
        </span>
        <span className={`text-xs font-semibold shrink-0 ${config.accentColor}`}>
          {formatAmount(expense.amount)}
        </span>
        <span className="text-[10px] text-gray-500 shrink-0">
          {formatDate(expense.date)}
        </span>
        {showDelete && (
          <button
            onClick={handleDeleteClick}
            className="shrink-0 text-[10px] text-red-400 hover:text-red-300 transition-colors ml-1"
          >
            {confirmingDelete ? "Sure?" : "×"}
          </button>
        )}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div
        className={`flex items-center gap-2.5 p-2.5 rounded-xl border ${config.bgColor} ${config.borderColor} ${isNew ? "animate-card-in" : ""}`}
      >
        <span className="text-lg shrink-0">{config.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white truncate">
            {expense.description}
          </p>
          <p className="text-[10px] text-gray-400">
            {config.label} · {formatDate(expense.date)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-sm font-bold ${config.accentColor}`}>
            {formatAmount(expense.amount)}
          </span>
          {showDelete && (
            <button
              onClick={handleDeleteClick}
              className="text-[11px] text-red-400 hover:text-red-300 transition-colors font-medium"
            >
              {confirmingDelete ? "Sure?" : "×"}
            </button>
          )}
        </div>
      </div>
    );
  }

  // "inline" variant (default)
  return (
    <div
      className={`flex items-start justify-between gap-3 rounded-xl border p-3.5 ${config.bgColor} ${config.borderColor} ${isNew ? "animate-card-in" : ""}`}
    >
      {/* Left side */}
      <div className="flex items-start gap-2.5 flex-1 min-w-0">
        <span className="text-xl shrink-0 mt-0.5">{config.emoji}</span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-white leading-snug">
            {expense.description}
          </p>
          <p className={`text-xs mt-0.5 ${config.accentColor}`}>
            {config.label}
            <span className="text-gray-500"> · {formatDate(expense.date)}</span>
          </p>
        </div>
      </div>

      {/* Right side */}
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span className="text-lg font-bold text-white">
          {formatAmount(expense.amount)}
        </span>
        {showDelete && (
          <button
            onClick={handleDeleteClick}
            className={`text-xs transition-colors font-medium ${
              confirmingDelete
                ? "text-red-400 font-semibold"
                : "text-red-400/70 hover:text-red-300"
            }`}
          >
            {confirmingDelete ? "Sure?" : "Delete"}
          </button>
        )}
      </div>
    </div>
  );
}

// Re-export shared helpers so existing imports of these from ExpenseCard still work
export { CATEGORY_CONFIG, getCategoryConfig, formatAmount, formatDate };

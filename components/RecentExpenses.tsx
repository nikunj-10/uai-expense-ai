"use client";

/**
 * RecentExpenses — shows the 20 most recent expenses.
 * Desktop: right sidebar that slides in/out.
 * Mobile: bottom sheet overlay.
 */

import { useEffect, useState } from "react";
import ExpenseCard, { type ExpenseData } from "./ExpenseCard";
import { formatAmount } from "@/lib/categoryConfig";

type RecentExpensesProps = {
  isOpen: boolean;
  onToggle: () => void;
  onDelete: (id: number) => void;
  refreshKey: number;
  deletedIds: Set<number>;
};

type RecentData = {
  expenses: ExpenseData[];
  total: number;
};

function Skeleton() {
  return (
    <div className="space-y-2 p-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-12 rounded-xl bg-gray-800/50 animate-pulse" />
      ))}
    </div>
  );
}

function PanelContent({
  data,
  loading,
  onDelete,
  deletedIds,
  onClose,
}: {
  data: RecentData | null;
  loading: boolean;
  onDelete: (id: number) => void;
  deletedIds: Set<number>;
  onClose: () => void;
}) {
  const visibleExpenses = data?.expenses.filter((e) => !deletedIds.has(e.id)) ?? [];
  const visibleTotal = visibleExpenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="flex flex-col h-full bg-gray-900 border-l border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 shrink-0">
        <p className="text-sm font-semibold text-white">Recent Expenses</p>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors text-lg leading-none"
        >
          ×
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <Skeleton />
        ) : data?.expenses.length === 0 ? (
          <p className="text-sm text-gray-500 p-4">No expenses yet.</p>
        ) : (
          <div className="p-2 space-y-1.5">
            {data?.expenses.map((expense) => {
              const isDeleted = deletedIds.has(expense.id);
              return (
                <div
                  key={expense.id}
                  className={`transition-opacity ${isDeleted ? "opacity-30 pointer-events-none" : ""}`}
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
        )}
      </div>

      {/* Footer */}
      {!loading && visibleExpenses.length > 0 && (
        <div className="shrink-0 px-4 py-3 border-t border-gray-800 bg-gray-900 flex items-center justify-between">
          <span className="text-xs text-gray-400">Total</span>
          <span className="text-sm font-semibold text-white">
            {formatAmount(visibleTotal)}
          </span>
        </div>
      )}
    </div>
  );
}

export default function RecentExpenses({
  isOpen,
  onToggle,
  onDelete,
  refreshKey,
  deletedIds,
}: RecentExpensesProps) {
  const [data, setData] = useState<RecentData | null>(null);

  // data === null means initial loading; after first load, data updates in-place
  const loading = data === null;

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    fetch("/api/expenses/recent")
      .then((r) => r.json())
      .then((d) => { if (active) setData(d); })
      .catch(() => {});
    return () => { active = false; };
  }, [isOpen, refreshKey]);

  return (
    <>
      {/* Desktop sidebar */}
      <div
        className={`hidden lg:flex flex-col h-full transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen ? "w-72" : "w-0"
        }`}
      >
        {isOpen && (
          <PanelContent
            data={data}
            loading={loading}
            onDelete={onDelete}
            deletedIds={deletedIds}
            onClose={onToggle}
          />
        )}
      </div>

      {/* Mobile bottom sheet */}
      <div className="lg:hidden">
        {/* Backdrop */}
        {isOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onToggle}
          />
        )}

        {/* Sheet */}
        <div
          className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl overflow-hidden transition-transform duration-300 ease-in-out ${
            isOpen ? "translate-y-0" : "translate-y-full"
          }`}
          style={{ height: "65vh" }}
        >
          {/* Pull handle */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-gray-600 z-10" />
          <div className="h-full pt-5">
            <PanelContent
              data={data}
              loading={loading}
              onDelete={onDelete}
              deletedIds={deletedIds}
              onClose={onToggle}
            />
          </div>
        </div>
      </div>
    </>
  );
}

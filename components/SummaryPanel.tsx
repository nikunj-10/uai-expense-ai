"use client";

/**
 * SummaryPanel — a persistent collapsible panel at the top of the chat.
 * Collapsed: slim bar with key metrics.
 * Expanded: KPI cards for today/week/month + top category + daily avg.
 */

import { useEffect, useState } from "react";
import { CATEGORY_CONFIG, formatAmount } from "@/lib/categoryConfig";

type SummaryData = {
  today: { total: number; count: number };
  week: { total: number; count: number };
  month: { total: number; count: number };
  topCategory: string | null;
  topCategoryTotal: number;
  dailyAvg: number;
};

type SummaryPanelProps = {
  isOpen: boolean;
  onToggle: () => void;
  refreshKey: number;
};

function Skeleton() {
  return (
    <div className="h-3 w-16 rounded bg-gray-700/60 animate-pulse inline-block" />
  );
}

export default function SummaryPanel({
  isOpen,
  onToggle,
  refreshKey,
}: SummaryPanelProps) {
  const [data, setData] = useState<SummaryData | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // data === null means initial loading; after first load, data updates in-place
  const loading = data === null && fetchError === null;

  useEffect(() => {
    let active = true;
    fetch("/api/summary")
      .then((r) => r.json())
      .then((d: SummaryData & { error?: string }) => {
        if (!active) return;
        if (d.error) {
          setFetchError(d.error);
          setData(d);
        } else {
          setFetchError(null);
          setData(d);
        }
      })
      .catch(() => {
        if (active) setFetchError("Could not load summary.");
      });
    return () => { active = false; };
  }, [refreshKey]);

  const topConfig = data?.topCategory
    ? (CATEGORY_CONFIG[data.topCategory] ?? CATEGORY_CONFIG.other)
    : null;

  return (
    <div className="shrink-0 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800">
      {/* Collapsed bar — always visible */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-2.5 flex items-center gap-2 text-left hover:bg-gray-800/40 transition-colors"
      >
        <div className="flex-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          {fetchError ? (
            <span className="text-[11px] text-red-400 truncate">
              ⚠ {fetchError}
            </span>
          ) : loading ? (
            <Skeleton />
          ) : data?.month.count === 0 ? (
            <span className="text-[11px] text-gray-500 truncate">
              No expenses yet — start tracking by telling me what you spent!
            </span>
          ) : (
            <>
              <span className="text-[11px] text-gray-400 truncate">
                Today:{" "}
                <span className="text-white font-medium">
                  {formatAmount(data?.today.total ?? 0)}
                </span>
              </span>
              <span className="text-gray-700 hidden sm:inline">·</span>
              <span className="hidden sm:inline text-[11px] text-gray-400">
                Month:{" "}
                <span className="text-white font-medium">
                  {formatAmount(data?.month.total ?? 0)}
                </span>
              </span>
              <span className="text-gray-700 hidden sm:inline">·</span>
              <span className="hidden sm:inline text-[11px] text-gray-400">
                <span className="text-white font-medium">
                  {data?.month.count ?? 0}
                </span>{" "}
                expenses
              </span>
            </>
          )}
        </div>
        <span className="text-gray-500 text-xs shrink-0 select-none">
          {isOpen ? "▲" : "▼"}
        </span>
      </button>

      {/* Expanded content — smooth CSS grid expand */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 pt-1">
            {/* KPI cards */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4">
              {(
                [
                  { label: "TODAY", key: "today" },
                  { label: "THIS WEEK", key: "week" },
                  { label: "THIS MONTH", key: "month" },
                ] as const
              ).map(({ label, key }) => (
                <div
                  key={key}
                  className="flex-1 bg-gray-800/50 rounded-lg p-3 min-w-0"
                >
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">
                    {label}
                  </p>
                  {loading ? (
                    <>
                      <div className="h-5 w-14 rounded bg-gray-700/60 animate-pulse mb-1" />
                      <div className="h-3 w-10 rounded bg-gray-700/40 animate-pulse" />
                    </>
                  ) : (
                    <>
                      <p className="text-lg font-bold text-white truncate">
                        {formatAmount(data?.[key].total ?? 0)}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {data?.[key].count ?? 0} items
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Top category + daily avg */}
            {!loading && data && (
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {topConfig && data.topCategory && (
                  <p className="text-xs text-gray-400">
                    Top category:{" "}
                    <span className="text-white">
                      {topConfig.emoji} {topConfig.label}
                    </span>{" "}
                    <span className="text-gray-500">
                      ({formatAmount(data.topCategoryTotal)})
                    </span>
                  </p>
                )}
                {data.dailyAvg > 0 && (
                  <p className="text-xs text-gray-400">
                    Daily avg:{" "}
                    <span className="text-white">
                      {formatAmount(data.dailyAvg)}
                    </span>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

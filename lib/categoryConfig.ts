/** Shared category configuration, amount formatting, and date formatting used across all components */

export const CATEGORY_CONFIG: Record<
  string,
  {
    emoji: string;
    label: string;
    bgColor: string;
    borderColor: string;
    accentColor: string;
    barColor: string; // Tailwind bg class for progress bars
  }
> = {
  food: {
    emoji: "🍕",
    label: "Food",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/20",
    accentColor: "text-orange-400",
    barColor: "bg-orange-400",
  },
  transport: {
    emoji: "🚗",
    label: "Transport",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    accentColor: "text-blue-400",
    barColor: "bg-blue-400",
  },
  shopping: {
    emoji: "🛍️",
    label: "Shopping",
    bgColor: "bg-pink-500/10",
    borderColor: "border-pink-500/20",
    accentColor: "text-pink-400",
    barColor: "bg-pink-400",
  },
  bills: {
    emoji: "📄",
    label: "Bills",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/20",
    accentColor: "text-yellow-400",
    barColor: "bg-yellow-400",
  },
  entertainment: {
    emoji: "🎬",
    label: "Entertainment",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20",
    accentColor: "text-purple-400",
    barColor: "bg-purple-400",
  },
  health: {
    emoji: "💊",
    label: "Health",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20",
    accentColor: "text-green-400",
    barColor: "bg-green-400",
  },
  education: {
    emoji: "📚",
    label: "Education",
    bgColor: "bg-indigo-500/10",
    borderColor: "border-indigo-500/20",
    accentColor: "text-indigo-400",
    barColor: "bg-indigo-400",
  },
  groceries: {
    emoji: "🛒",
    label: "Groceries",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
    accentColor: "text-emerald-400",
    barColor: "bg-emerald-400",
  },
  rent: {
    emoji: "🏠",
    label: "Rent",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
    accentColor: "text-red-400",
    barColor: "bg-red-400",
  },
  salary: {
    emoji: "💰",
    label: "Salary",
    bgColor: "bg-teal-500/10",
    borderColor: "border-teal-500/20",
    accentColor: "text-teal-400",
    barColor: "bg-teal-400",
  },
  other: {
    emoji: "📌",
    label: "Other",
    bgColor: "bg-gray-500/10",
    borderColor: "border-gray-500/20",
    accentColor: "text-gray-400",
    barColor: "bg-gray-400",
  },
};

export function getCategoryConfig(category: string) {
  return CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.other;
}

export function formatAmount(amount: number): string {
  return (
    "₹" +
    amount.toLocaleString("en-IN", {
      minimumFractionDigits: amount % 1 !== 0 ? 2 : 0,
      maximumFractionDigits: 2,
    })
  );
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const todayStr = today.toISOString().split("T")[0];
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  if (dateStr === todayStr) return "Today";
  if (dateStr === yesterdayStr) return "Yesterday";

  return date.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year:
      date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

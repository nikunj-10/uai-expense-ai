"use client";

import ExpenseCard from "@/components/ExpenseCard";

const testExpenses = [
  {
    id: 1,
    amount: 500,
    category: "food",
    description: "lunch at restaurant",
    date: new Date().toISOString().split("T")[0], // today
  },
  {
    id: 2,
    amount: 150,
    category: "transport",
    description: "uber to office",
    date: new Date().toISOString().split("T")[0], // today
  },
  {
    id: 3,
    amount: 1200,
    category: "bills",
    description: "electricity bill",
    date: (() => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return d.toISOString().split("T")[0];
    })(), // yesterday
  },
  {
    id: 4,
    amount: 15000,
    category: "rent",
    description: "rent to landlord",
    date: "2026-03-01",
  },
  {
    id: 5,
    amount: 99.5,
    category: "food",
    description: "coffee and snacks",
    date: new Date().toISOString().split("T")[0], // today
  },
  {
    id: 6,
    amount: 350,
    category: "shopping",
    description: "book from Amazon",
    date: "2026-03-22",
  },
  {
    id: 7,
    amount: 45000,
    category: "shopping",
    description: "new laptop",
    date: "2026-03-20",
  },
];

export default function TestCards() {
  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <h1 className="text-2xl font-bold mb-8">ExpenseCard Visual Test</h1>

      {/* INLINE variant */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
          Inline variant — with delete, with entrance animation
        </h2>
        <div className="max-w-md space-y-3">
          {testExpenses.map((e) => (
            <ExpenseCard
              key={e.id}
              expense={e}
              variant="inline"
              showDelete={true}
              isNew={true}
              onDelete={(id) => alert(`Delete clicked for expense #${id}`)}
            />
          ))}
        </div>
      </section>

      {/* INLINE without delete */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
          Inline variant — no delete button
        </h2>
        <div className="max-w-md space-y-3">
          {testExpenses.slice(0, 3).map((e) => (
            <ExpenseCard key={e.id} expense={e} variant="inline" />
          ))}
        </div>
      </section>

      {/* COMPACT variant */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
          Compact variant — with delete
        </h2>
        <div className="max-w-md space-y-2">
          {testExpenses.map((e) => (
            <ExpenseCard
              key={e.id}
              expense={e}
              variant="compact"
              showDelete={true}
              onDelete={(id) => alert(`Delete #${id}`)}
            />
          ))}
        </div>
      </section>

      {/* LIST-ITEM variant */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
          List-item variant
        </h2>
        <div className="max-w-md space-y-1">
          {testExpenses.map((e) => (
            <ExpenseCard
              key={e.id}
              expense={e}
              variant="list-item"
              showDelete={true}
              onDelete={(id) => alert(`Delete #${id}`)}
            />
          ))}
        </div>
      </section>

      {/* Amount formatting check */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
          Amount formatting (₹ + Indian commas + decimals)
        </h2>
        <div className="max-w-md space-y-3">
          {[
            { id: 10, amount: 500, category: "food", description: "₹500 — no decimals", date: new Date().toISOString().split("T")[0] },
            { id: 11, amount: 99.5, category: "food", description: "₹99.50 — with decimals", date: new Date().toISOString().split("T")[0] },
            { id: 12, amount: 1200, category: "bills", description: "₹1,200 — thousands", date: new Date().toISOString().split("T")[0] },
            { id: 13, amount: 15000, category: "rent", description: "₹15,000 — lakhs format", date: new Date().toISOString().split("T")[0] },
            { id: 14, amount: 150000, category: "salary", description: "₹1,50,000 — Indian lakhs", date: new Date().toISOString().split("T")[0] },
            { id: 15, amount: 45000, category: "shopping", description: "₹45,000", date: new Date().toISOString().split("T")[0] },
          ].map((e) => (
            <ExpenseCard key={e.id} expense={e} variant="inline" />
          ))}
        </div>
      </section>

      {/* All categories */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
          All categories — colors and emojis
        </h2>
        <div className="max-w-md space-y-3">
          {[
            "food", "transport", "shopping", "bills", "entertainment",
            "health", "education", "groceries", "rent", "salary", "other",
          ].map((cat, i) => (
            <ExpenseCard
              key={cat}
              expense={{
                id: 100 + i,
                amount: 500,
                category: cat,
                description: `sample ${cat} expense`,
                date: new Date().toISOString().split("T")[0],
              }}
              variant="inline"
            />
          ))}
        </div>
      </section>
    </div>
  );
}

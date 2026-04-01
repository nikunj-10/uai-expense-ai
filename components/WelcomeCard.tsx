"use client";

type WelcomeCardProps = {
  onExampleClick: (text: string) => void;
};

const EXAMPLES = [
  { icon: "🛒", text: "I spent ₹500 on groceries" },
  { icon: "📊", text: "How much did I spend this week?" },
  { icon: "📋", text: "Show me my spending summary" },
  { icon: "💡", text: "I paid ₹1200 for electricity bill" },
];

export default function WelcomeCard({ onExampleClick }: WelcomeCardProps) {
  return (
    <div className="rounded-2xl border border-gray-700/50 bg-gradient-to-br from-gray-800/80 to-gray-900/80 p-6 max-w-md mx-auto animate-fade-in">
      <p className="text-xl font-bold text-center text-white">
        💰 Welcome to UAI Expense AI
      </p>
      <p className="text-sm text-gray-400 text-center mt-2">
        Track your spending just by telling me about it.
        <br />
        No forms, no buttons — just talk naturally.
      </p>

      <div className="mt-5 bg-gray-800/50 rounded-xl p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">
          Try saying:
        </p>
        <div className="space-y-1">
          {EXAMPLES.map(({ icon, text }) => (
            <button
              key={text}
              onClick={() => onExampleClick(text)}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-700/50 cursor-pointer transition-colors text-left"
            >
              <span className="text-base shrink-0">{icon}</span>
              <span className="text-sm text-gray-200">{text}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-600 text-center mt-4">
        Your data stays on this device. Start tracking!
      </p>
    </div>
  );
}

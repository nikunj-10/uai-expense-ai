/** Animated three-dot typing indicator shown while the AI is generating a response */
export default function TypingIndicator() {
  return (
    <div className="mb-4 flex flex-col items-start">
      <p className="text-xs text-gray-400 mb-1">💰 UAI Expense AI</p>
      <div className="inline-flex items-center gap-1 bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3">
        <div
          className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
          style={{ animationDelay: "-0.3s" }}
        />
        <div
          className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
          style={{ animationDelay: "-0.15s" }}
        />
        <div
          className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
          style={{ animationDelay: "0s" }}
        />
      </div>
    </div>
  );
}

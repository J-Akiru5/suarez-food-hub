"use client";

import { Search, Sparkles, X } from "lucide-react";
import * as React from "react";
import { cn } from "../lib/utils";

export interface AICravingMatcherProps {
  onFilter: (query: string) => void;
  className?: string;
}

const AICravingMatcher = React.forwardRef<HTMLDivElement, AICravingMatcherProps>(({ onFilter, className }, ref) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onFilter(query.trim());
    }
  };

  const handleClose = () => {
    setIsExpanded(false);
    setQuery("");
  };

  return (
    <div ref={ref} className={cn("fixed bottom-10 left-10 z-[999] flex flex-col items-start gap-3", className)}>
      {/* Expanded Card */}
      {isExpanded && (
        <div className="bg-white rounded-32 shadow-2xl border border-gray-100 w-[320px] overflow-hidden animate-slideUp">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#b1454a]/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#b1454a]" />
              </div>
              <span className="text-sm font-bold text-gray-900">AI Craving Matcher</span>
            </div>
            <button
              onClick={handleClose}
              className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-gray-500" />
            </button>
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="px-5 pb-5">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  onFilter(e.target.value);
                }}
                placeholder="I'm craving..."
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#b1454a] focus:ring-1 focus:ring-[#b1454a]/30 transition-all"
              />
            </div>
          </form>
        </div>
      )}

      {/* FAB Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-16 h-16 rounded-full bg-[#b1454a] text-white flex items-center justify-center shadow-xl shadow-[#b1454a]/30 transition-all duration-300 hover:scale-105 active:scale-95",
          isExpanded && "bg-gray-800 shadow-gray-800/30",
        )}
      >
        {isExpanded ? <X className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
      </button>
    </div>
  );
});
AICravingMatcher.displayName = "AICravingMatcher";

export { AICravingMatcher };

"use client";

import * as React from "react";
import { cn } from "../lib/utils";

export interface CategoryFilterProps {
  categories: string[];
  active: string;
  onChange: (category: string) => void;
  className?: string;
}

const CategoryFilter = React.forwardRef<HTMLDivElement, CategoryFilterProps>(
  ({ categories, active, onChange, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-wrap items-center justify-center gap-3",
          className
        )}
      >
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => onChange(category)}
            className={cn(
              "px-7 py-3 rounded-30 text-sm font-semibold transition-all duration-200",
              active === category
                ? "bg-[#b1454a] text-white shadow-lg shadow-[#b1454a]/25"
                : "bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 hover:-translate-y-0.5"
            )}
          >
            {category}
          </button>
        ))}
      </div>
    );
  }
);
CategoryFilter.displayName = "CategoryFilter";

export { CategoryFilter };
